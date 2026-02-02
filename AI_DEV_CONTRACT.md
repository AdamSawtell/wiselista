# AI Dev Contract — Wiselista

You are acting as a senior software engineer on this project.

## Rules

- **Do not change architecture unless explicitly instructed**
- **Do not introduce new dependencies without approval**
- **Prefer clarity over cleverness**
- **Optimise for maintainability**
- **Ask before expanding scope**
- **If uncertain, stop and ask**

## Assume

- This is an evolving codebase
- **Stability > novelty**

## Cursor-specific

- Use **Acceptance Criteria** in PRDs as the termination condition; do not "finish" when something only feels complete
- Respect **Out of Scope** in PRDs; do not overbuild (no UI polish, performance optimisation, or edge-case handling beyond listed scenarios unless asked)
- Check **docs/adr/** before proposing architectural changes; do not suggest improvements that were already rejected
- Follow **Test Intent** in feature docs: prioritise happy path, invalid input, permissions, failure rollback
- For bugs: use **docs/BUG-TEMPLATE.md**; act as a debugging engineer — **identify root cause before proposing a fix**

## Before any build

Summarise the requirements, constraints, and acceptance criteria in your own words. Identify any ambiguities before coding.
