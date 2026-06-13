# Wiselista — Next steps plan

**Goal:** Pilot-ready V1 — one reliable happy path on web and mobile: capture → submit → pay → AI edit → download.

**Principle:** Verify before building. Each phase ends with a concrete checklist.

---

## Phase 0 — Stabilise (1–2 days)

**Objective:** Deploy fixes already in code and confirm mobile ↔ API works.

| Task | Done when |
|------|-----------|
| Deploy `main` to Amplify (middleware + CORS fixes) | Build green at wiselista.com |
| Smoke test web login → dashboard → job detail | Session persists across refresh |
| Expo Web: Test API button | `ok: true, status: 200` |
| Expo Web + native: add/list/delete photos | Works against production API |

**Exit:** Web session works. Mobile can add, list, and delete photos against production API.

---

## Phase 1 — Web happy path (3–5 days)

**Objective:** Desktop end-to-end: create job → add photos → pay → receive edited photos → download.

| Task | Status |
|------|--------|
| Restore Stripe Checkout in submit route | **Done** — `POST /api/jobs/[id]/submit` returns `{ url }` |
| Add Stripe webhook | **Done** — `POST /api/webhooks/stripe` on `checkout.session.completed` |
| Pricing | NZD $29 per job (fixed) |
| Verify download flow when job is `ready` | Pending |
| Failed-job UX (`failure_message` in UI) | Partial |

**Deploy checklist for Stripe:**

1. Set Amplify env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
2. Stripe Dashboard → Webhook → `https://wiselista.com/api/webhooks/stripe` → event `checkout.session.completed`
3. Test with card `4242 4242 4242 4242`

**Exit:** A user on desktop completes the full loop with a test card.

---

## Phase 2 — Mobile happy path (1–2 weeks)

| Task | Notes |
|------|-------|
| Mobile submit opens Stripe Checkout | **Done** — `JobDetailScreen` opens `data.url` via `Linking` |
| Return after payment | User refreshes job detail; status moves to `processing` → `ready` |
| Framing guide + tips | Static overlay/copy per room type |
| Mobile download when `ready` | Signed URLs, save/share |

**Exit:** One tester completes full flow on iPhone/Android without the web dashboard.

---

## Phase 3 — Harden for pilot (1 week)

| Task | Command / notes |
|------|-----------------|
| GitHub Action on push | `cd web && npm ci && npm run lint && npm run build` |
| Targeted tests | Bearer auth, submit validation, webhook idempotency, RLS |
| Observability | Log prefixes per route; support one-pager from `VIEW-API-LOGS-AMPLIFY.md` |

---

## Phase 4 — Pilot prep (1–2 weeks)

| Task | Notes |
|------|-------|
| Enable Claid in production | Set `CLAID_API_KEY` in Amplify |
| Pilot onboarding | Invite-only accounts |
| Soft launch | 1–2 agencies |

**Defer:** Push notifications, offline queue, Apple/Google SSO, virtual tour.

---

## Immediate actions (this week)

1. **Deploy** current branch (middleware + CORS + Stripe restore)
2. **Configure Stripe** webhook in Dashboard
3. **Run Phase 0 verification** — Test API, remove photo, web session
4. **Run one full web test** — create job → 2 photos → submit → pay → download edited
5. **Then** mobile framing/tips

---

## Decisions (locked for pilot)

| Decision | Choice |
|----------|--------|
| Pricing | Fixed NZD $29 per job |
| AI for first test | Mock (no `CLAID_API_KEY`) |
| Mobile payment | External browser (Stripe Checkout) |
| Stripe API version | `2025-02-24.acacia` (matches `stripe@^17.x`) |
