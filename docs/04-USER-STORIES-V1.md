# User Stories — Wiselista V1

**Purpose:** Must-have user stories for first release. Ordered by flow. Cursor uses **Acceptance Criteria** below as the termination condition; **Out of Scope** and **Test Intent** to avoid overbuilding.

**Last updated:** Feb 2025

---

## Acceptance Criteria (V1 — Cursor termination condition)

Do not mark V1 "done" until all are satisfied:

- [ ] Feature works for scenario A (happy path: register → capture → submit → pay → receive edited photos)
- [ ] Feature fails safely for scenario B (invalid input, payment failure, AI failure — user sees clear message and can retry or contact support)
- [ ] Errors are logged with context (request/user/job id where applicable)
- [ ] Tests cover core paths (auth, job create/submit, payment webhook, AI callback)
- [ ] No breaking changes introduced to existing APIs or clients

---

## Out of Scope (Cursor: do not overbuild)

- UI polish beyond what’s needed for the flows above
- Performance optimisation beyond "works for pilot volume"
- Edge-case handling beyond the listed scenarios (e.g. partial batch failure, network blips — fail safely and log; no custom retry UI)
- Refactors not required for this feature
- Virtual tour, CMS/portal, teams/agencies, shareable links, Book/scheduling (see Summary)

---

## Test Intent

**Must test:**

- Happy path (full flow: auth → capture → submit → pay → ready → download)
- Invalid input (bad email, empty job, invalid payment)
- Permissions (user cannot see or download another user’s jobs/photos)
- Failure rollback (payment fails → job stays unpaid; AI fails → job marked failed, user notified)

**Nice to have:**

- Performance (submit latency, download URL latency)
- Stress (many photos per job, many jobs per user)

---

## Epic: Onboarding & identity

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U1.1 | As a **new user**, I can **register with email and password** so that I have an account. | Form: email, password, confirm password, name (optional). Validation; no duplicate email. On success: logged in, redirect to capture or dashboard. |
| U1.2 | As a **user**, I can **log in with email and password** so that I can use the app. | Form: email, password. On success: access + refresh token; redirect. On fail: clear error. |
| U1.3 | As a **user**, I can **log in with Apple** (iOS) so that I can use the app without a password. | Apple Sign-In; create or link account; same session as email login. |
| U1.4 | As a **user**, I can **log in with Google** so that I can use the app without a password. | Google Sign-In; create or link account; same session. |
| U1.5 | As a **user**, I can **log out** so that my session is ended on this device. | Logout clears tokens; redirect to login/landing. |

---

## Epic: Capture (mobile)

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U2.1 | As a **user**, I can **open the camera** and see a **framing guide by room type** so that I compose shots correctly. | Room selector (Living room, Kitchen, Bedroom, Bathroom, Exterior, Other). Overlay shows framing guide for selected room. |
| U2.2 | As a **user**, I can **see capture tips** for the selected room so that I take better photos. | Tips displayed (text ± image) per room type; dismissible; available before/during capture. |
| U2.3 | As a **user**, I can **take a photo** and have it **added to the current job** so that I build a set for one property. | Capture stores image; tagged with room type and sequence; shown in “current job” list. |
| U2.4 | As a **user**, I can **review photos in my current job** (by room, order) and **remove or reorder** so that I only submit what I want. | List/grid of photos in draft job; delete single photo; reorder (optional). |
| U2.5 | As a **user**, I can **start a new job** (new property) so that I don’t mix properties. | “New property” or “New job” clears current draft and starts a new one. |
| U2.6 | As a **user**, I can **capture offline** and **submit when back online** so that I can shoot in low-connectivity areas. | Photos stored locally; queue upload when online; UI shows “pending upload” and retries. |

---

## Epic: Submit & pay

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U3.1 | As a **user**, I can **submit my current job for edit** so that the AI partner processes my photos. | “Submit for edit” only when job has ≥1 photo. If unpaid: go to payment. If paid: job status → processing; confirmation message. |
| U3.2 | As a **user**, I am **shown the price** before payment (per job) so that I know what I’ll pay. | Price displayed (e.g. “NZD 29 for this set”); based on photo count or fixed per job; clear and visible before pay. |
| U3.3 | As a **user**, I can **pay with card** (Stripe) so that my job is sent for editing. | Stripe Checkout or Payment Element; on success: job status → processing; receipt by email (Stripe). |
| U3.4 | As a **user**, I get a **receipt** after payment so that I have a record. | Stripe receipt email; optional in-app “Receipt” view with amount and date. |

---

## Epic: Notifications & review

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U4.1 | As a **user**, I receive a **notification when my edited content is ready** so that I don’t have to keep checking. | Push notification: “Your [property] photos are ready.” Tapping opens app to that job. |
| U4.2 | As a **user**, I can **see when my job is still processing** so that I know to wait. | Job list and detail show status: Pending upload, Processing, Ready, Failed. Processing shows “Usually ready in ~15–20 min” (or similar). |
| U4.3 | As a **user**, I can **review my edited photos** (in app or web) so that I can check quality before use. | Thumbnails or full-size view of edited images; per job; in app gallery or web dashboard. |
| U4.4 | As a **user**, I can **download my edited photos** so that I can use them in listings. | “Download” per photo or “Download all” for job; file(s) download (e.g. ZIP for “all”). Web: signed link; mobile: save to device or share. |

---

## Epic: Web dashboard (review & download)

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U5.1 | As a **user**, I can **log in to the web dashboard** with the same account so that I can use it on desktop. | Same auth (email/password, Google, Apple if supported on web). |
| U5.2 | As a **user**, I can **see a list of my jobs** (date, status, photo count) so that I can find a property. | Table or cards; sort by date; filter by status; pagination if many. |
| U5.3 | As a **user**, I can **open a job** and **see all photos** (original vs edited when ready) so that I can review. | Job detail: list of photos with room type; show edited thumbnails when ready. |
| U5.4 | As a **user**, I can **download edited photos** from the web so that I can use them on my computer. | Per-photo “Download” and/or “Download all as ZIP”. |

---

## Epic: Security & reliability

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U6.1 | As a **user**, I can **only see and download my own jobs and photos** so that my data is private. | All API scoped by user_id; no access to other users’ jobs/photos. |
| U6.2 | As a **user**, my **password is stored securely** so that a breach doesn’t expose it. | Passwords hashed (bcrypt/Argon2); never logged or returned in API. |
| U6.3 | As a **user**, my **session expires** after inactivity so that a lost device is less risky. | Access token TTL (e.g. 15 min); refresh token for renewal; optional “remember me” longer TTL. |

---

## Epic: Support

| ID | Story | Acceptance criteria |
|----|--------|---------------------|
| U7.1 | As a **user**, I can **contact support** (email or phone) so that I can get help. | In-app and web: visible support email and phone; optional “Contact support” form that sends email. |
| U7.2 | As a **user**, I see a **clear message if my job fails** so that I know what to do. | If job status = failed: message “Something went wrong; please contact support with job ID.” Show job ID. |

---

## Summary: V1 scope

- **Auth:** Register, login (email + Apple + Google), logout.
- **Capture:** Camera, framing by room, tips, add to job, review/reorder/delete, new job, offline capture.
- **Submit & pay:** Submit for edit, see price, pay with Stripe, receipt.
- **Notifications:** Push when ready; in-app status (processing/ready/failed).
- **Review & download:** View edited photos; download per photo or all (app + web).
- **Web:** Login, job list, job detail, download.
- **Security:** User-scoped data, hashed passwords, token expiry.
- **Support:** Email/phone + optional form; failed job message with job ID.

**Out of scope for V1:** Virtual tour, CMS/portal, teams/agencies, shareable links, Book/scheduling.
