# Wiselista — Planning Documents

Planning docs for the property photo capture & AI edit app. Read in order when starting or onboarding.

---

## Documents

| # | Document | Purpose |
|---|----------|---------|
| **01** | [Product Brief](./01-PRODUCT-BRIEF.md) | Source of truth: idea, problem, who it’s for, value, flow, V1 scope, boundaries. |
| **02** | [Developer Questions & Assumptions](./02-DEVELOPER-QUESTIONS-AND-ASSUMPTIONS.md) | What we need from you to lock scope; proposed assumptions if unanswered. |
| **03** | [Technical Spec](./03-TECHNICAL-SPEC.md) | Architecture, stack, data model, API, security, non-functionals. |
| **04** | [User Stories V1](./04-USER-STORIES-V1.md) | Must-have user stories for first release. |
| **05** | [Roadmap](./05-ROADMAP.md) | Phases and milestones from planning through pilot. |
| **06** | [Simplest & Cost-Effective Recommendations](./06-SIMPLE-COST-EFFECTIVE-RECOMMENDATIONS.md) | Recommended stack and vendors for minimal complexity and cost. |
| — | **Cursor / process** | |
| | [PRD Template](./PRD-TEMPLATE.md) | Template for features: Problem, Scope, Acceptance criteria, Out of scope, Test intent. |
| | [Cursor Workflow](./CURSOR-WORKFLOW.md) | Build loop, bug loop, pre-build prompt. |
| | [Feature Architecture](./FEATURE_ARCH.md) | What exists now, what changed, why. |
| | [Bug Template](./BUG-TEMPLATE.md) | Structured bug intake for root-cause-first fixes. |
| | [ADR (Architecture Decision Records)](./adr/README.md) | Why we chose X; Cursor checks before suggesting rejected options. |

**Project root:** [AI_DEV_CONTRACT.md](../AI_DEV_CONTRACT.md) — Guardrails for Cursor (architecture, scope, stability).

---

## Next steps

1. **You:** Answer or confirm items in **02-DEVELOPER-QUESTIONS-AND-ASSUMPTIONS.md** (AI partner, framing, platform, payments, region, etc.).
2. **Dev:** Lock stack (mobile framework, backend, hosting) and update **03** if needed.
3. **Dev:** Start **Phase 1** from **05-ROADMAP.md** (foundation: API, DB, storage, auth, mock AI).

Once 02 is signed off, the build spec is **03** + **04** + **05**.
