# PRD Template — [Feature name]

**Purpose:** Use this template for every feature or PRD. Cursor uses Acceptance Criteria as a termination condition and Out of Scope to avoid overbuilding.

**Last updated:** [Date]

---

## Problem

[What problem does this feature solve? 1–3 sentences.]

---

## Scope

[What is in scope for this feature? Bullet list.]

---

## Acceptance Criteria

Cursor uses this as the termination condition. Do not mark the feature "done" until all are satisfied.

- [ ] Feature works for scenario A [describe]
- [ ] Feature fails safely for scenario B [describe]
- [ ] Errors are logged with context
- [ ] Tests cover core paths
- [ ] No breaking changes introduced

[Add scenario-specific checkboxes as needed.]

---

## Out of Scope

AI will helpfully overbuild. Explicitly exclude:

- UI polish
- Performance optimisation
- Edge-case handling beyond listed scenarios
- Refactors not required for this feature

[Add feature-specific exclusions.]

---

## Test Intent

Cursor needs to know what matters.

**Must test:**

- Happy path
- Invalid input
- Permissions
- Failure rollback

**Nice to have:**

- Performance
- Stress

[Add feature-specific test intent.]

---

## Notes / References

- [Links to ADRs, user stories, or tech spec]
