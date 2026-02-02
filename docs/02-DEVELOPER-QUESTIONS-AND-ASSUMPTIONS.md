# Developer Questions & Assumptions

**Purpose:** Lock scope and technical decisions before build. Answer the questions or confirm/override the assumptions so we can proceed.

**Last updated:** Feb 2025

---

## 1. AI Edit Partner

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 1.1 | Who is the AI edit partner? (Named vendor, or “we integrate with an API”?) | Use a generic **AI edit API** (e.g. Replicate, Runway, or a dedicated real-estate photo API). Design backend so partner can be swapped. |
| 1.2 | Is there an existing contract/API spec? | No; we design for: **upload image → job ID → webhook or poll for result → download edited image**. |
| 1.3 | Edit SLA (e.g. “15–20 minutes”) — is that contractual or target? | **Target**; we show “usually ready in ~15–20 min” and support async status (pending / processing / ready). |
| 1.4 | Per-image cost from partner? (Affects pricing and batch limits.) | TBD; assume **per-image cost** and configurable max batch size per job. |

**Need from you:** Partner name/API (if any), or confirmation we proceed with “pluggable AI partner” and you’ll add details later.

---

## 2. “Frame by room”

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 2.1 | Is “frame” a **live camera overlay** (guide while shooting) or **post-capture crop/guide**? | **Live overlay** in camera view: user selects room type, sees framing guide, captures. |
| 2.2 | Which room types? | **Standard set:** Living room, Kitchen, Bedroom, Bathroom, Exterior, Other. Configurable list in backend. |
| 2.3 | One frame per room type, or multiple shots per room? | **Multiple shots per room** allowed; each shot tagged with room type. |
| 2.4 | Is framing only visual guidance, or does it crop/constrain the image sent to AI? | **Guidance only** for V1; image sent to AI is full capture (no mandatory crop). Optional crop in a later version. |

**Need from you:** Confirm overlay vs post-capture and room list.

---

## 3. Capture flow & tips

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 3.1 | Tips: static copy per room type, or dynamic (e.g. from CMS)? | **Static** per room type in V1 (stored in app or config). |
| 3.2 | “Book & Capture” — is “Book” a calendar/scheduling feature? | **Out of V1.** V1 = open app → capture → submit. “Book” = later. |
| 3.3 | Offline capture? (Shoot first, submit when online.) | **Yes for V1:** store photos locally, queue submit when online; show “pending upload” state. |

**Need from you:** Confirm “Book” is post-V1 and whether offline capture is required for launch.

---

## 4. Submit → Edit → Return

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 4.1 | Submit **one image at a time** or **batch per “listing”**? | **Batch per listing/session:** user finishes capture for one property, then “Submit for edit” for that set. |
| 4.2 | Max images per batch? | **Configurable** (e.g. 20); UI warns above limit. |
| 4.3 | Return: **in-app only** (download/gallery) or **also push to CMS/portal**? | **V1: in-app only.** User gets notification → opens app → reviews and downloads. “Disperse to CMS” = later. |
| 4.4 | Notification: push, email, or both? | **Push + in-app.** Email optional in V1 if quick to add. |

**Need from you:** Confirm batch-per-listing and “disperse = in-app download only” for V1.

---

## 5. User identification (auth)

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 5.1 | Login: email/password only, or also Google/Apple SSO? | **Email/password + Apple Sign-In (iOS) + Google Sign-In** for better conversion. |
| 5.2 | Any B2B: “Agency” or “Team” with multiple users? | **V1: single user only.** No org/team/agency model in V1. |
| 5.3 | Roles (e.g. admin vs photographer)? | **V1: one role.** All logged-in users can capture and submit. |

**Need from you:** Confirm SSO and “no teams in V1”.

---

## 6. Payments (“Pay now — client direct”)

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 6.1 | Payment flow: **per job** (per batch), **per image**, or **subscription**? | **Per job (batch)** for V1: user submits batch → sees price → pays → edit starts. |
| 6.2 | Who pays? End user (agent/RPM/homeowner) or agency billing? | **End user (client) direct** as per brief. |
| 6.3 | Stripe (or other)? | **Stripe** (Cards + optional Apple/Google Pay). |
| 6.4 | Invoices/receipts? | **Stripe receipt + optional PDF invoice** (simple, generated on payment). |

**Need from you:** Confirm per-job pricing and Stripe.

---

## 7. Platform & tech

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 7.1 | **Mobile-first, web, or both** for V1? | **Mobile-first (iOS + Android)** with a **simple web dashboard** for “review & download” only. Capture on mobile. |
| 7.2 | Preferred stack? | **Mobile:** React Native (or Flutter if you prefer). **Backend:** Node.js (or .NET/Python if you prefer). **DB:** PostgreSQL. |
| 7.3 | Hosting? | **Backend + DB** on a single cloud (e.g. AWS, GCP, or Vercel + Supabase). You choose. |

**Need from you:** Confirm platforms (mobile + web dashboard) and any stack preferences.

---

## 8. Data & security

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 8.1 | Geographic focus: NZ only, AU+NZ, or global? | **NZ first** (Barfoot, Harcourts); data residency **NZ or AU** for DB/storage. |
| 8.2 | Photo retention: how long to keep originals and edited? | **Configurable:** e.g. 90 days then delete; or “keep until user deletes”. We’ll implement soft delete and a retention job. |
| 8.3 | PII: any extra compliance (e.g. NZ Privacy Act, GDPR)? | **NZ Privacy Act** compliant; optional GDPR if we go EU later. |

**Need from you:** Confirm region and retention policy.

---

## 9. “Secure”

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 9.1 | Any specific “secure” requirements (e.g. SOC2, encryption at rest)? | **Baseline:** HTTPS, auth tokens, passwords hashed (bcrypt/Argon2), secrets in env vault. Encryption at rest for DB and object storage. |
| 9.2 | Photo access: only owner, or shareable links? | **V1: only owner** (logged-in user). No shareable links in V1. |

**Need from you:** Confirm baseline is enough for pilots.

---

## 10. Support (“Email/call team”)

| # | Question | Assumption if unanswered |
|---|----------|---------------------------|
| 10.1 | In-app support? | **V1: link to email + support phone number;** optional “Contact support” form that sends email. |
| 10.2 | Status page / known issues? | **Later.** Not in V1. |

**Need from you:** Confirm support is “email + phone + optional form” for V1.

---

## Summary: what we need from you

1. **AI partner:** Name/API if available; else we proceed with pluggable “AI edit API” and you add partner later.  
2. **Framing:** Live overlay + room list (Living, Kitchen, Bedroom, Bathroom, Exterior, Other) — confirm or change.  
3. **Book & Capture:** “Book” is post-V1; confirm. Offline capture required for V1?  
4. **Submit/return:** Batch per listing; return in-app only (download); push + in-app notification — confirm.  
5. **Auth:** Email/password + Apple + Google; no teams in V1 — confirm.  
6. **Payments:** Per job (batch), Stripe, client direct — confirm.  
7. **Platform:** Mobile (iOS + Android) + simple web dashboard for review/download — confirm. Stack preference?  
8. **Region/retention:** NZ first, data NZ/AU; retention policy (e.g. 90 days or until delete) — confirm.  

Once these are confirmed (or assumptions accepted), we can treat **03-TECHNICAL-SPEC.md** and **04-USER-STORIES-V1.md** as the build spec.
