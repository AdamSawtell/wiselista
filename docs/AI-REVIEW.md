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
4. **Real AI path (Claid, when `CLAID_API_KEY` set):**
   - Submit API calls **processJobWithRealAI(jobId)** (fire-and-forget).
   - **buildAIRequests(jobId)** gives per photo: `photoId`, `originalUrl` (signed), etc.
   - For each photo: POST to Claid `/v1/image/edit` with `input: originalUrl` and property-enhancement operations → get `tmp_url` → download → upload to `wiselista-photos` as `{user_id}/{job_id}/edited/{photo_id}.jpg` → set `photo.edited_key`.
   - When all done, set job `status: "ready"`, `completed_at`.

---

## 3. Real AI wired (Claid)

1. **processJobWithRealAI(jobId)** in `web/src/lib/ai-adapter.ts` is implemented:
   - Uses **buildAIRequests(jobId)**; for each photo calls Claid `/v1/image/edit` with signed URL and property-enhancement operations (HDR, upscale photo).
   - Downloads result from `tmp_url`, uploads to `wiselista-photos` as `{user_id}/{job_id}/edited/{photo_id}.jpg`, updates `photos.edited_key`.
   - When all photos are done, sets `jobs.status = 'ready'`, `jobs.completed_at`.
2. Submit API calls **processJobWithRealAI** when **CLAID_API_KEY** is set; otherwise calls **triggerMockAI**. Set `CLAID_API_KEY` in `.env.local` (or Amplify env) to enable. Get key at [Claid](https://claid.ai/login) → Create API key.
3. **Prompts:** `prompts.ts` is used for future prompt-based APIs; Claid uses operations (no text prompt per request).

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
