# Feature Architecture — What exists, what changed, why

**Purpose:** Cursor (and humans) need a single place for “what exists now” and “what changed and why.” Update when a feature ships or an architectural change is made.

**Last updated:** 15 Aug 2026

---

## What exists now

- **Stack (locked):** Supabase (DB, Auth, Storage) + Next.js (API + web dashboard, Amplify) + Expo (mobile web at mobile.wiselista.com). See docs/adr/ADR-002-simplest-stack.md.
- **web/** — Next.js 15, App Router, TypeScript, Tailwind.
  - API: jobs, photos, submit, Stripe webhook, customer capture links, Claid process/cron.
  - Capture: `lib/shot-recipes.ts` + `lib/capture-brief.ts` drive the customer magic-link flow.
- **mobile/** — Expo 54. Guided shoot, job list, submit, share. Same recipe logic in `src/lib/shotRecipes.ts` (duplicated, not a new package).
- **supabase/migrations/** — jobs, photos (`brief_slot_id`), payments, capture tokens.
- **Data model:** docs/03-TECHNICAL-SPEC.md.

---

## What changed (per feature / release)

| Date | Change | Why |
|------|--------|-----|
| 2025-02-02 | Phase 1 foundation: web app, Supabase schema, API, mock AI, Stripe webhook, dashboard | 02 accepted; start Phase 1 (roadmap) |
| 2026-08-15 | Shot recipes, brief resume, brightness hold before upload | [PRD-shot-recipes.md](./PRD-shot-recipes.md) — professional capture copy without a native rebuild |
| 2026-08-15 | Live capture coach on native CameraView | [PRD-live-capture-coach.md](./PRD-live-capture-coach.md) — one overlay line, tilt hold, landscape cue |

---

## How to update this doc

When you ship a feature or change architecture:

1. Add a row under **What changed** with date, short description, and link to PRD or ADR.
2. If “what exists now” is no longer accurate (e.g. new top-level app or service), update that section.

Keep it short. Cursor uses this to avoid suggesting changes that conflict with current structure.
