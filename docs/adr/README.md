# Architecture Decision Records (ADR)

**Purpose:** Cursor doesn't remember why choices were made. Each ADR records a decision in 5–10 lines so Cursor stops suggesting improvements you already rejected.

**Format:** One file per decision. Numbered: `ADR-001-short-name.md`.

---

## Index

| ADR | Title | Date |
|-----|--------|------|
| 001 | [Template](./ADR-001-template.md) | — |
| 002 | [Simplest stack (Supabase + Next.js + Expo)](./ADR-002-simplest-stack.md) | 2025-02-02 |

---

## When to add an ADR

- Choosing stack, database, auth, or storage
- Rejecting an alternative (e.g. "we use X not Y because …")
- Design choices that affect multiple parts of the system

Keep each ADR short (5–10 lines). Reference from PRDs or tech spec when relevant.
