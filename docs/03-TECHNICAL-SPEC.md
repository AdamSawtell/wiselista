# Technical Specification — Wiselista V1

**Purpose:** Architecture, data model, and API design for implementation. Assumes answers/assumptions from **02-DEVELOPER-QUESTIONS-AND-ASSUMPTIONS.md**.

**Last updated:** Feb 2025

---

## 1. High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                    │
├──────────────────────────────┬──────────────────────────────────────────┤
│  Mobile App (iOS / Android)  │  Web Dashboard (review & download)        │
│  - Auth                      │  - Auth                                   │
│  - Camera + framing overlay  │  - List jobs / galleries                  │
│  - Capture tips by room      │  - Download edited images                │
│  - Submit batch → pay        │  - Notifications (optional)              │
│  - Notifications             │                                           │
└──────────────────────────────┴──────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER (REST + Webhooks)                    │
│  - Auth (login, register, refresh, SSO)                                  │
│  - Users, Jobs, Photos, Payments                                         │
│  - Webhook: AI partner callback (edit complete)                          │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  PostgreSQL      │         │  Object Storage   │         │  AI Edit Partner  │
│  - users         │         │  - originals       │         │  - Submit images  │
│  - jobs          │         │  - edited          │         │  - Poll/webhook   │
│  - photos        │         │  (S3-compatible)   │         │  - Retrieve       │
│  - payments      │         │                   │         │                   │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

---

## 2. Stack (proposed)

| Layer | Technology | Notes |
|-------|------------|--------|
| **Mobile** | React Native (Expo) or Flutter | Cross-platform; camera, push, in-app purchase–friendly. |
| **Web dashboard** | Next.js or React SPA | Simple: auth, job list, download. |
| **API** | Node.js (Express/Fastify) or .NET Core | REST; webhooks; background jobs. |
| **DB** | PostgreSQL | Users, jobs, photos, payments. |
| **Storage** | S3-compatible (AWS S3, Cloudflare R2, MinIO) | Originals + edited images. |
| **Auth** | JWT + refresh tokens; optional Auth0/Supabase Auth | Email/password + Apple + Google. |
| **Payments** | Stripe | Checkout Session or Payment Intents; webhooks. |
| **Queue/Jobs** | In-process (Bull/BullMQ with Redis) or serverless queue | Submit to AI, process callbacks. |
| **Push** | FCM (Android) + APNs (iOS) | Via Expo or native. |
| **Hosting** | Vercel (web + API) or AWS/GCP | API + DB + storage in chosen region (NZ/AU). |

*Final stack to be confirmed after your preferences (see 02).*

---

## 3. Data model (core entities)

### 3.1 User

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| email | string | Unique, not null |
| password_hash | string | Nullable if SSO-only |
| name | string | Optional |
| created_at | timestamp | |
| updated_at | timestamp | |

*SSO: separate `user_identities` (provider, provider_user_id) if needed.*

### 3.2 Job (one per “submit for edit” batch)

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| status | enum | `draft` \| `submitted` \| `payment_pending` \| `processing` \| `ready` \| `failed` |
| payment_intent_id | string | Stripe (nullable until pay) |
| ai_job_id | string | Partner job ref (nullable until sent) |
| created_at | timestamp | |
| updated_at | timestamp | |
| completed_at | timestamp | When status = ready |

### 3.3 Photo (per image in a job)

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| job_id | UUID | FK → jobs |
| room_type | enum/string | living_room, kitchen, bedroom, bathroom, exterior, other |
| sequence | int | Order in room / job |
| original_key | string | Object storage key (original) |
| edited_key | string | Object storage key (edited); null until ready |
| ai_photo_id | string | Partner asset id (optional) |
| created_at | timestamp | |

### 3.4 Payment (audit / idempotency)

| Field | Type | Notes |
|-------|------|--------|
| id | UUID | PK |
| job_id | UUID | FK → jobs |
| stripe_payment_intent_id | string | |
| amount_cents | int | |
| currency | string | e.g. NZD |
| status | string | succeeded, failed, refunded |

---

## 4. API (REST) — main endpoints

### Auth

- `POST /auth/register` — email, password, name
- `POST /auth/login` — email, password → access + refresh token
- `POST /auth/refresh` — refresh token → new access token
- `POST /auth/sso/apple` | `/auth/sso/google` — id_token → register/login

### Users

- `GET /users/me` — current user profile
- `PATCH /users/me` — update name, etc.

### Jobs

- `POST /jobs` — create job (draft), attach photos (upload URLs or multipart)
- `GET /jobs` — list jobs for user (filter by status, pagination)
- `GET /jobs/:id` — job detail + photos
- `POST /jobs/:id/submit` — validate batch, create Stripe session/intent, return payment URL or client secret
- `POST /jobs/:id/confirm-payment` — after Stripe success; enqueue send to AI partner

### Photos (within job)

- `POST /jobs/:id/photos` — add photo (room_type, sequence, file upload or presigned URL)
- `DELETE /jobs/:id/photos/:photoId` — remove from draft job

### Downloads

- `GET /jobs/:id/photos/:photoId/download` — redirect to signed URL (edited) or 404 if not ready

### Webhooks (server-to-server)

- `POST /webhooks/stripe` — payment success/failure; update job, trigger AI submit
- `POST /webhooks/ai-partner` — edit complete; update photo edited_key, job status; trigger push

*Exact payloads to be defined when AI partner is chosen.*

---

## 5. Mobile app flows (technical)

1. **Login/Register** — Email/password or Apple/Google; store access + refresh token.
2. **Capture** — Camera view; select room type; show framing overlay + tips; capture; add to current job (draft).
3. **Draft job** — List photos by room; reorder/delete; “Submit for edit” → call `POST /jobs/:id/submit` → open Stripe Checkout or use Payment Element.
4. **After payment** — Back to app; poll `GET /jobs/:id` or listen for push; when `status === ready`, show “Ready” and link to web dashboard or in-app gallery for download.
5. **Notifications** — On `webhooks/ai-partner` completion, backend sends push; app can deep-link to job.

---

## 6. Web dashboard flows (technical)

1. **Login** — Same auth as mobile (email/password or SSO).
2. **Jobs list** — `GET /jobs`; filter by status; show created_at, status, photo count.
3. **Job detail** — `GET /jobs/:id`; list photos with thumbnails; “Download” per photo or “Download all” (signed URLs).

---

## 7. AI partner integration (pluggable)

- **Submit:** For each job in `processing`, upload originals to partner (or provide URLs); receive `ai_job_id` (and optionally per-photo `ai_photo_id`).
- **Callback:** Partner calls `POST /webhooks/ai-partner` with job/photo ids and edited asset URLs (or keys). Backend downloads to object storage, sets `edited_key`, updates job status to `ready`, sends push.
- **Fallback:** If no webhook, poll partner API on a schedule until ready.

---

## 8. Security (baseline)

- All API over **HTTPS**.
- **JWT** access token (short-lived); **refresh** token (stored securely; rotation optional).
- **Passwords:** bcrypt or Argon2; no plaintext.
- **Object storage:** Private buckets; signed URLs for download (short TTL).
- **Secrets:** Env vars or vault; no secrets in client.
- **Stripe webhook:** Verify signature.
- **AI webhook:** Shared secret or HMAC.

---

## 9. Non-functional (V1 targets)

- **Availability:** Best effort for pilots; target 99% uptime for API.
- **Latency:** Submit < 5 s; download URL < 2 s.
- **Retention:** Configurable; e.g. delete originals/edited after 90 days or on user delete.

---

## 10. Out of scope for V1

- Virtual tour capture/editing
- CMS/portal integrations
- Agency/team/organisation model
- Shareable links
- Advanced analytics (beyond “job count” for support)
