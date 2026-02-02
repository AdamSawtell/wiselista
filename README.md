# Wiselista

Property photo capture & AI edit app — for rental property managers, real estate agents, and homeowners.

**Elevator:** Capture property photos with guided framing and tips → submit for AI editing → get high-value content back in ~15–20 minutes.

---

## Cursor / AI

- **[AI_DEV_CONTRACT.md](./AI_DEV_CONTRACT.md)** — How Cursor is allowed to think and act (architecture, scope, stability, bugs). Read this before building.
- **docs/CURSOR-WORKFLOW.md** — Build loop, bug loop, pre-build prompt.
- **docs/PRD-TEMPLATE.md** — Use for every feature; Acceptance criteria = termination condition; Out of scope = no overbuilding.

---

## Planning (before build)

All planning lives in **[docs/](./docs/)**. Start here:

- **[docs/01-PRODUCT-BRIEF.md](./docs/01-PRODUCT-BRIEF.md)** — What we’re building and why  
- **[docs/02-DEVELOPER-QUESTIONS-AND-ASSUMPTIONS.md](./docs/02-DEVELOPER-QUESTIONS-AND-ASSUMPTIONS.md)** — What we need from you to lock scope  
- **[docs/README.md](./docs/README.md)** — Index of all planning docs  

**Next:** Answer or confirm the questions in **02** so we can lock scope and start Phase 1 (foundation).

---

## Repo structure

- `docs/` — Planning (product brief, tech spec, user stories, roadmap)
- `supabase/migrations/` — DB schema (jobs, photos, payments)
- `web/` — Next.js app: API + web dashboard (login, jobs list, job detail)
- `mobile/` — Phase 2 (Expo)

**Set up Supabase (required to sign in and use the app):** Follow **[docs/SUPABASE-SETUP.md](./docs/SUPABASE-SETUP.md)** — create project, run schema, create bucket, add test user, copy env vars to `web/.env.local`, restart dev server.

**Then:** Run `cd web && npm install && npm run dev`. Stripe setup is in `web/README.md` when you need payments.

**Deploy to AWS (build only from GitHub):** Follow **[docs/DEPLOY-AWS-GITHUB.md](./docs/DEPLOY-AWS-GITHUB.md)** — Amplify + GitHub; builds on push.
