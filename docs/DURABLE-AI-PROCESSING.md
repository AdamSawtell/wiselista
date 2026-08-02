# Durable AI processing (up to 25 photos)

## Problem

Amplify HTTP requests time out around ~30s. Claid takes ~15–25s per photo. A Pro job with 25 photos needs several minutes and must not depend on an open browser tab.

## Design

1. **Photo-level queue** on `photos`: `ai_status`, `ai_attempts`, `ai_last_error`, `ai_claimed_at`
2. **One photo per `/api/jobs/:id/process` call** with atomic claim (`claim_next_photo_for_job`)
3. **Retries** — up to 3 attempts per photo on transient errors (`fetch failed`, 5xx)
4. **Cron pump** — `POST /api/cron/process-jobs` (Bearer `CRON_SECRET`) driven by GitHub Actions every minute
5. **UI** still nudges `/process` for snappy progress when the page is open

## Ops setup (required once)

1. Run migration: `supabase/migrations/20260802000000_photo_ai_queue.sql`  
   Or: `cd web && node scripts/apply-photo-ai-queue-migration.mjs`
2. Generate secret: `openssl rand -hex 32`
3. Set **Amplify** env var `CRON_SECRET` (same value) and redeploy
4. Set GitHub repo secrets:
   - `CRON_SECRET` — same value
   - `APP_URL` — `https://wiselista.com` (optional)
5. Confirm workflow **Process jobs cron** runs (Actions tab)

## Verify

```bash
curl -s -X POST https://wiselista.com/api/cron/process-jobs \
  -H "Authorization: Bearer $CRON_SECRET"
# {"ok":true,"processed":0,"remainingJobs":0,...}
```
