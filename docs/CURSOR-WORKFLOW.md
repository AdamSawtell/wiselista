# Cursor-Native Workflow — Wiselista

**Purpose:** How to use Cursor with this project so builds stay on scope and rework is minimised.

---

## 1. PRD (per feature)

Use **docs/PRD-TEMPLATE.md** for every feature:

- **Problem** — What we’re solving
- **Scope** — What’s in
- **Acceptance criteria** — Cursor’s termination condition (don’t stop until these pass)
- **Out of scope** — Stops Cursor from overbuilding (no UI polish, perf, extra edge cases, refactors unless required)
- **Test intent** — What must be tested vs nice-to-have

---

## 2. AI_DEV_CONTRACT.md

**Location:** Project root.

Guardrails for Cursor:

- Do not change architecture unless instructed
- No new dependencies without approval
- Clarity over cleverness; maintainability first
- Ask before expanding scope; if uncertain, stop and ask
- Stability > novelty
- Use acceptance criteria as done; respect out of scope; check ADRs; follow test intent; for bugs: root cause before fix

---

## 3. Cursor build loop

1. **Read docs** — PRD, tech spec (03), user stories (04), ADRs
2. **Plan** — Summarise requirements, constraints, acceptance criteria in your own words; call out ambiguities
3. **Implement** — Code against the PRD; no scope creep
4. **Test** — Against acceptance criteria and test intent
5. **Stop** at acceptance criteria — Do not add “improvements” that are out of scope

---

## 4. FEATURE_ARCH.md

**Location:** docs/FEATURE_ARCH.md

- **What exists now** — Current structure, key modules
- **What changed** — Per feature or release
- **Why it changed** — Link to PRD or ADR

Update when a feature ships or an architectural change is made. Keeps Cursor (and humans) aligned on current state.

---

## 5. ADRs (when decisions matter)

**Location:** docs/adr/

- One file per decision (e.g. ADR-002-simplest-stack.md)
- 5–10 lines: Decision, Reason, Rejected
- Cursor checks here before suggesting architectural “improvements” you already rejected

---

## 6. Bug loop

1. **Structured input** — Use docs/BUG-TEMPLATE.md (summary, expected, actual, steps, environment, logs, correlation ID)
2. **Logs + context** — Paste into chat with the template
3. **Root cause → fix → regression test** — Instruct Cursor: “Act as a debugging engineer. Identify root cause before proposing a fix.” Then add or run a regression test.

---

## Pre-build prompt (run in Cursor before coding)

> Summarise the requirements, constraints, and acceptance criteria in your own words. Identify any ambiguities before coding.

If Cursor misunderstands here, it would have misunderstood the code later.
