# Feature Architecture — What exists, what changed, why

**Purpose:** Cursor (and humans) need a single place for “what exists now” and “what changed and why.” Update when a feature ships or an architectural change is made.

**Last updated:** Feb 2025 (pre-build; no code yet)

---

## What exists now

- **Stack (locked):** Supabase (DB, Auth, Storage) + Next.js on Vercel (API + web dashboard) + Expo (mobile). See docs/06-SIMPLE-COST-EFFECTIVE-RECOMMENDATIONS.md and docs/adr/ADR-002-simplest-stack.md.
- **web/** — Next.js 15, App Router, TypeScript, Tailwind.
  - API: `GET/POST /api/jobs`, `GET /api/jobs/[id]`, `POST /api/jobs/[id]/photos`, `POST /api/jobs/[id]/submit`, `POST /api/webhooks/stripe`.
  - Auth: Supabase Auth (server client + browser client); login page, dashboard (jobs list), job detail page.
  - Mock AI: lib/ai-mock.ts — after payment, sets edited_key = original_key and status = ready.
- **supabase/migrations/** — Schema: jobs, photos, payments; RLS for user-scoped access.
- **mobile/** — Not yet (Phase 2).
- **Data model:** docs/03-TECHNICAL-SPEC.md; implemented in Supabase (jobs, photos, payments; users = auth.users).

---

## What changed (per feature / release)

| Date | Change | Why |
|------|--------|-----|
| 2025-02-02 | Phase 1 foundation: web app, Supabase schema, API, mock AI, Stripe webhook, dashboard | 02 accepted; start Phase 1 (roadmap) |

---

## How to update this doc

When you ship a feature or change architecture:

1. Add a row under **What changed** with date, short description, and link to PRD or ADR.
2. If “what exists now” is no longer accurate (e.g. new top-level app or service), update that section.

Keep it short. Cursor uses this to avoid suggesting changes that conflict with current structure.
