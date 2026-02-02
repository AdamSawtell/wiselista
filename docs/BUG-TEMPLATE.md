# Bug Template — Structured intake for Cursor

**Purpose:** So Cursor can actually fix bugs. Use this template when reporting a bug. Then instruct Cursor: **"Act as a debugging engineer. Identify root cause before proposing a fix."** This prevents blind code changes.

---

## Bug

**Summary:**  
[One line: what went wrong.]

**Expected:**  
[What should have happened.]

**Actual:**  
[What happened instead.]

**Steps to reproduce:**  
1.  
2.  
3.  

**Environment:**  
- [e.g. iOS 17, Expo SDK 50, local / staging]

**Logs:**  
[Paste relevant logs. Redact secrets.]

**Correlation ID / Request ID:**  
[If available — from logs, Stripe, Supabase, etc.]

---

## Instructions for Cursor

When fixing a bug from this template:

1. **Act as a debugging engineer.**
2. **Identify root cause before proposing a fix.**
3. After fixing: add or run a **regression test** so the bug doesn’t return.

Do not change code outside the scope of the root cause unless explicitly asked.
