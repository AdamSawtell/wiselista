# Simplest & Most Cost-Effective — Recommendations

**Purpose:** One clear stack and vendor set to minimise complexity and cost for V1. Optimised for speed to market and low monthly burn.

**Last updated:** Feb 2025

---

## TL;DR

| Layer | Recommendation | Why |
|-------|----------------|-----|
| **DB + Auth + Storage** | **Supabase** | One vendor, PostgreSQL + Auth + S3-style storage, generous free tier. |
| **API + Web dashboard** | **Next.js on Vercel** | One repo: API routes + web app; free tier, serverless, no servers to manage. |
| **Mobile** | **Expo (React Native)** | One codebase for iOS + Android; camera, push; EAS free tier. |
| **Payments** | **Stripe** (Checkout) | Redirect to Stripe Checkout = no custom payment UI; pay per transaction. |
| **AI editing** | **Single API** (e.g. Replicate or dedicated real-estate API) | Pay per image; no infra to run; swap later if needed. |
| **Background jobs** | **No Redis** — Vercel cron or in-request async | Avoid extra service; use DB + cron or serverless background. |
| **Push** | **Expo Push** (EAS) | Free tier; works with FCM/APNs. |

**Rough V1 monthly cost (low volume):** Supabase free tier + Vercel free tier + Expo free tier + Stripe/AI per use ≈ **$0–50** until you exceed free tiers, then scale with usage.

---

## 1. Backend: DB, Auth, Storage — Supabase

- **What:** PostgreSQL, built-in Auth (email/password, magic link, Google; Apple configurable), Storage (S3-compatible buckets), optional Realtime.
- **Why simplest:** One dashboard, one SDK, no separate DB host + auth provider + S3. Your API talks to Supabase for users, jobs, photos metadata, and file URLs.
- **Why cost-effective:** Free tier: 500MB DB, 1GB storage, 50K monthly active users. Pro ~\$25/mo when you outgrow it.
- **Trade-off:** Auth is Supabase-shaped (JWT, RLS). If you need fine-grained API logic, you still run your own API (e.g. Next.js API routes) and use Supabase as data + auth backend.

**Recommendation:** Use **Supabase for DB + Auth + Storage**. Build your API in **Next.js API routes** (or a small Node app) that reads/writes Supabase and handles Stripe + AI partner. No separate PostgreSQL host or S3 account for V1.

---

## 2. API + Web dashboard — Next.js on Vercel

- **What:** Next.js app: `/app` or `/pages` for the web dashboard (login, job list, job detail, download); `/app/api` or `/pages/api` for REST endpoints (auth proxy, jobs, photos, Stripe webhook, AI webhook).
- **Why simplest:** One repo, one deploy. Web dashboard and API share auth and types. No separate “backend repo” unless you prefer it.
- **Why cost-effective:** Vercel free tier is generous; pay for usage as you scale. No always-on server.
- **Trade-off:** Serverless cold starts; for a pilot, negligible. If you later need long-running workers, add a small worker (e.g. Railway) or Vercel background functions.

**Recommendation:** **Next.js on Vercel** for API + web dashboard. Use Supabase client in API routes (with service role for server-side). Mobile app calls the same API (e.g. `https://yourapp.vercel.app/api/...`).

---

## 3. Mobile — Expo (React Native)

- **What:** Expo SDK on React Native: one codebase for iOS and Android; Expo Camera, Expo Notifications, EAS Build and Submit.
- **Why simplest:** No Xcode/Android Studio required for basic builds; OTA updates; camera and push are first-class. Good for “capture + framing + upload” flow.
- **Why cost-effective:** Free to start; EAS Build has a free tier; you pay for app store accounts (Apple \$99/yr, Google one-off).
- **Trade-off:** If you need heavy native modules later, you can eject or use dev builds; for V1, managed workflow is enough.

**Recommendation:** **Expo (React Native)** for mobile. Use Expo Camera for capture, Expo Image Picker if you want “choose from library” as well. Push via Expo Push (EAS).

---

## 4. Payments — Stripe Checkout (redirect)

- **What:** Create a Stripe Checkout Session when user taps “Pay”; redirect to Stripe-hosted page; on success, Stripe redirects back to your app and sends a webhook to your API. API marks job paid and triggers “send to AI.”
- **Why simplest:** No custom payment form, no PCI scope on your side. One integration: create session + handle webhook.
- **Why cost-effective:** Pay per transaction (Stripe fees); no monthly minimum for standard account.
- **Trade-off:** User leaves your app briefly; for V1 this is acceptable and reduces risk and dev time.

**Recommendation:** **Stripe Checkout** for “pay for this job.” No Payment Element, no subscriptions, until you need them.

---

## 5. AI editing — One API, pay per image

- **What:** Integrate a single “upload image → get edited image” API. Options: **Replicate** (e.g. real-estate or enhancement models), or a dedicated **real-estate photo API** (search “real estate photo editing API” for vendors). Contract: upload → job/id → webhook or poll → download URL.
- **Why simplest:** No model hosting, no GPU. You call their API from your API route or background; store result URL in Supabase Storage (or their URL if they host).
- **Why cost-effective:** Pay per image; no fixed monthly AI infra cost. Replicate and similar are usage-based.
- **Trade-off:** You depend on their SLA and pricing; design your “AI adapter” so you can swap providers later.

**Recommendation:** Pick **one** provider (e.g. Replicate + a property-enhancement model, or a niche real-estate API). Implement a thin “AI partner” module in your API that submits and handles callback/polling. No custom ML in V1.

---

## 6. Background jobs — No Redis

- **What:** When Stripe webhook says “paid,” you need to: (1) mark job paid, (2) upload originals to AI partner, (3) later receive callback and save edited assets. Options: (a) do (1)+(2) inside the webhook handler (sync; risk timeout if many images), (b) trigger a Vercel cron that processes “paid, not yet sent” jobs, (c) use Vercel background function or a tiny worker on Railway that polls the DB.
- **Why simplest:** No Redis, no Celery, no separate queue service. Use **Supabase as source of truth** (e.g. `jobs.status = 'processing'`, `ai_job_id`); one background path that “processes pending work.”
- **Why cost-effective:** Vercel cron is on free tier; Railway worker is low cost. No ElastiCache or Redis Cloud.
- **Trade-off:** Not ideal for thousands of jobs per minute; for pilot and early scale, sufficient.

**Recommendation:** **Option (b) or (c):** Either a **Vercel cron** hitting an API route that processes N “paid, not sent” jobs per run, or a **small Node script on Railway** that polls every 30s and submits to AI. Store AI job id and callback URL in DB; when AI partner calls your webhook, update job and photos, then send push (e.g. via Expo Push API).

---

## 7. Push notifications — Expo Push (EAS)

- **What:** Expo Push Notifications: mobile app registers with EAS; your API calls Expo’s push API with the token and message when a job is ready.
- **Why simplest:** No direct FCM/APNs setup; Expo handles delivery. Works with EAS Build.
- **Why cost-effective:** Free tier for reasonable volume.
- **Trade-off:** Dependency on Expo’s push pipeline; for V1, acceptable.

**Recommendation:** Use **Expo Push** for “Your photos are ready.” When AI webhook completes, API updates Supabase and calls Expo Push API.

---

## 8. Auth — Supabase Auth (email + Google first)

- **What:** Supabase Auth: sign up / sign in with email+password or Google. Optional magic link. Apple Sign-In requires Apple Developer account + config in Supabase; add when you need it for iOS.
- **Why simplest:** No Auth0 or custom JWT server; Supabase issues JWTs. Your API verifies Supabase JWT or uses Supabase RLS if you call from client.
- **Why cost-effective:** Included in Supabase free tier.
- **Trade-off:** Apple later; for V1, **email + Google** is enough to test with most users.

**Recommendation:** **Supabase Auth** with **email/password + Google**. Add Apple when you submit to App Store. Mobile and web both use Supabase client for login; API receives Bearer token and validates with Supabase.

---

## 9. Summary: “Simplest stack” in one sentence

**Supabase (DB + Auth + Storage) + Next.js on Vercel (API + web dashboard) + Expo (mobile) + Stripe Checkout + one AI API + Vercel cron or Railway worker for “submit to AI” — no Redis, no separate S3, no custom auth server.**

---

## 10. Rough cost (V1 / pilot)

| Item | Low volume (pilot) | When it grows |
|------|--------------------|----------------|
| Supabase | Free | ~\$25/mo Pro |
| Vercel | Free | Usage-based |
| Expo EAS | Free tier | Paid builds if many |
| Stripe | Per transaction | Same |
| AI API | Per image | Same |
| Domain + SSL | ~\$10–15/yr | Same |
| Apple Developer | \$99/yr (when you ship iOS) | Same |
| **Total** | **~\$0–50/mo** (+ one-off Apple) | Scales with usage |

---

## 11. What we’re avoiding (for simplicity and cost)

- **No Redis** — use DB + cron or one small worker.
- **No separate S3** — Supabase Storage.
- **No Auth0/Clerk** — Supabase Auth (unless you later need more identity features).
- **No Kubernetes / EC2** — serverless + managed DB.
- **No custom payment UI** — Stripe Checkout redirect.
- **No in-house ML** — one external AI API only.

You can add any of these later when the product or scale justifies it.
