# AI review — sending jobs for edit and prompts

How jobs are sent for AI review and how prompts are managed so you **don’t code a new prompt every time**.

---

## 1. Prompts in one place

- **File:** `web/src/lib/prompts.ts`
- **Default:** `DEFAULT_EDIT_PROMPT` — used for any photo when no room-specific prompt exists.
- **Per room:** `ROOM_EDIT_PROMPTS` — optional prompts for living_room, kitchen, bedroom, bathroom, exterior, other.
- **Helper:** `getEditPrompt(roomType)` returns the prompt for that room (or the default).

You **do not** need a new coded prompt per job. Tune wording in `prompts.ts`; the adapter uses it for every submit.

---

## 2. Sending a job for AI review (flow)

1. User taps **Submit for edit** (web or mobile).
2. **Submit API** (`POST /api/jobs/[id]/submit`):
   - Validates job is draft, user owns it, has ≥1 photo.
   - Sets job status to `submitted`.
   - Calls **triggerMockAI(jobId)** (or real AI when wired).
3. **Mock path (current):**
   - After a short delay, `submitJobToMockAI` copies each photo’s `original_key` to `edited_key` and sets job to `ready`.
4. **Real AI path (when wired):**
   - Use **buildAIRequests(jobId)** from `web/src/lib/ai-adapter.ts` to get, per photo:
     - `photoId`, `originalKey`, `originalUrl` (signed), `roomType`, **`prompt`** (from `getEditPrompt(roomType)`).
   - For each request: call your AI partner with `originalUrl` + `prompt` → get edited image → upload to storage → set `photo.edited_key`.
   - Mark job `ready` (and optionally notify user).

---

## 3. Wiring real AI (no prompt coded per job)

1. In `web/src/lib/ai-adapter.ts`, implement **processJobWithRealAI(jobId)**:
   - `const requests = await buildAIRequests(jobId);`
   - For each `r`: call your partner API with `r.originalUrl` and `r.prompt`.
   - Upload the returned image to `wiselista-photos` (e.g. `{user_id}/{job_id}/edited/{photo_id}.jpg`), then update `photos.edited_key`.
   - When all photos are done, set `jobs.status = 'ready'`, `jobs.completed_at = now()`.
2. In the submit API (or a small config), call **processJobWithRealAI** instead of **triggerMockAI** when real AI is enabled (e.g. env `USE_REAL_AI=true`).
3. **Prompts:** Change behaviour by editing `web/src/lib/prompts.ts` only — add/change default or room prompts; no per-job code.

---

## 4. Optional: processing status

- Submit API can set job to `processing` when it hands off to AI (mock or real), then set `ready` when done.
- UI already supports statuses `submitted`, `processing`, `ready` — use them so users see “Processing” while the AI runs.

---

## Summary

| Question | Answer |
|----------|--------|
| Do we need a coded prompt every time? | **No.** One default + optional per-room prompts in `prompts.ts`; `getEditPrompt(roomType)` picks the right one per photo. |
| Where do we send for AI review? | Submit API calls mock (or real) adapter; real path uses `buildAIRequests(jobId)` then your AI partner API. |
| How to tidy up? | Prompts in `prompts.ts`, send-off logic in `ai-adapter.ts` and `ai-mock.ts`; submit route stays thin. |
