# Roadmap — Wiselista

**Purpose:** Phases and milestones from discovery through V1 and beyond.

**Last updated:** Feb 2025

---

## Phase 0: Planning & decisions — complete

- [x] Product brief (01-PRODUCT-BRIEF.md)
- [x] Developer questions & assumptions (02-DEVELOPER-QUESTIONS-AND-ASSUMPTIONS.md)
- [x] Technical spec (03-TECHNICAL-SPEC.md)
- [x] V1 user stories (04-USER-STORIES-V1.md)
- [x] Roadmap (05-ROADMAP.md)
- [x] **Your sign-off:** 02 accepted — scope and stack locked
- [x] **AI partner:** Pluggable + mock for build
- [x] **Stack choice:** Supabase + Next.js (Vercel) + Expo (ADR-002)

**Output:** Locked spec and stack; Phase 1 started.

---

## Current status & next steps (Feb 2025)

**Done:** Web deployed at wiselista.com (Amplify + custom domain, SSL). Login, dashboard, create job, add photos, error handling. Supabase + migrations. Submit button exists but **submit API and Stripe webhook were removed** (Stripe API version mismatch); re-adding them is the first priority.

**Recommended order:**

1. **Re-enable Submit + Stripe** — Restore `POST /api/jobs/[id]/submit` and `POST /api/webhooks/stripe` using a Stripe API version compatible with your SDK. Then: create job → add photos → Submit for edit → pay (Stripe Checkout) → webhook marks job paid → mock AI “processes” → job ready. Completes Phase 1 web happy path.
2. **Web: edited photos + download** — When job status is “ready,” show edited thumbnails on job detail and add “Download” (signed URLs from Supabase storage). Mock AI already sets `edited_key`; wire UI to display and download.
3. **CI: lint + test** — Add GitHub Actions (or use Amplify) to run `npm run lint` and basic tests on push.
4. **Phase 2: Mobile** — When ready, start Expo app: auth, camera, framing, build job, submit (same API).

**Out of scope for now:** Virtual tour, CMS, teams, Book & Capture (see Phase 5).

---

## Phase 1: Foundation (weeks 1–2)

**Goal:** Auth, backend API skeleton, DB, storage, and one end-to-end path (upload → “edit” → return) with mock or real AI.

- [x] Repo structure (web/ Next.js; mobile/ Phase 2)
- [x] PostgreSQL schema (jobs, photos, payments) — supabase/migrations/
- [x] Object storage (Supabase bucket wiselista-photos)
- [x] Auth: Supabase Auth; login page; dashboard uses session
- [x] API: POST/GET /api/jobs, GET /api/jobs/[id], POST /api/jobs/[id]/photos, submit
- [x] AI partner adapter: “submit” and “callback” mock (lib/ai-mock.ts)
- [x] Stripe: Checkout in submit; webhook POST /api/webhooks/stripe
- [x] Minimal web dashboard: login, jobs list, job detail
- [ ] CI: lint, test, deploy API to staging

**Output:** Backend and web can create a job, add photos, “pay,” and receive a mock “edited” result. No mobile yet.

---

## Phase 2: Mobile capture & submit (weeks 3–4)

**Goal:** Mobile app: auth, camera, framing, tips, build job, submit, pay.

- [ ] Mobile project (React Native/Expo or Flutter)
- [ ] Auth screens: register, login, (Apple/Google if in scope)
- [ ] Camera: room selector, framing overlay per room, capture
- [ ] Tips content per room (static)
- [ ] Draft job: add/remove/reorder photos; “New job”
- [ ] Upload: send photos to API (presigned or multipart); offline queue
- [ ] Submit: price display, Stripe flow, confirm → job status processing
- [ ] Job list and detail on mobile (status, thumbnails)
- [ ] Push: FCM/APNs setup; backend sends push when job ready (mock or real callback)

**Output:** User can capture on phone, submit, pay, and see “processing” then “ready” (with mock or real AI).

---

## Phase 3: Review, download, polish (weeks 5–6)

**Goal:** Review and download in app and web; notifications; edge cases; security pass.

- [ ] Download: in-app gallery for edited photos; save/share
- [ ] Web dashboard: job list filters, job detail, download single + “Download all” (ZIP)
- [ ] Signed URLs for edited assets; expiry
- [ ] Notifications: real push when AI callback marks job ready
- [ ] Failed job: status, message, job ID for support
- [ ] Support: in-app and web link (email/phone + optional form)
- [ ] Retention: configurable delete of old originals/edited (cron or serverless)
- [ ] Security review: auth, scoping, secrets, Stripe webhook verification, AI webhook secret

**Output:** V1 feature-complete; ready for internal QA and pilot prep.

---

## Phase 4: Pilot prep & launch (weeks 7–8)

**Goal:** Pilot-ready: real AI partner, billing, support, and soft launch.

- [ ] Integrate **real** AI edit partner (replace mock)
- [ ] Pricing: confirm per-job (or per-image) and Stripe config
- [ ] Invoices/receipts: Stripe receipt + optional PDF
- [ ] Pilot onboarding: invite-only or code; usage caps if needed
- [ ] Monitoring: errors, latency, payment failures; alerts
- [ ] Docs: one-pager for pilots (how to capture, submit, download)
- [ ] Soft launch: 1–2 pilot agencies (e.g. Barfoot, Harcourts contacts)

**Output:** Live pilots with real users and real AI editing.

---

## Phase 5: Post–V1 (backlog)

**Order TBD; not committed for V1.**

- **Virtual tour:** Capture and/or edit for 360 / virtual tour
- **CMS/portal integration:** “Disperse” to listing portals or CMS (API or export)
- **Agency/team:** Orgs, teams, bulk licensing
- **Book & Capture:** Scheduling (calendar, appointments)
- **Shareable links:** Time-limited link for client to download set
- **Analytics:** Dashboards for agencies (volume, usage)
- **Localisation:** AU, other regions; data residency
- **Quality/guidance:** More framing presets, advanced tips, or AI feedback on composition

---

## Milestone summary

| Milestone | Target | Outcome |
|-----------|--------|---------|
| **Planning done** | Now | Spec and assumptions agreed; stack chosen |
| **Foundation** | Week 2 | API + DB + storage + mock AI + Stripe stub; web login + job list |
| **Mobile E2E** | Week 4 | Capture → submit → pay → “ready” on device |
| **V1 complete** | Week 6 | Review, download, notifications, support, security pass |
| **Pilot live** | Week 8 | Real AI, real payments, 1–2 pilot agencies |

Timeline is indicative; adjust based on team size and AI partner readiness.
