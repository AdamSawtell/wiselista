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

1. Run migration (if not already): `supabase/migrations/20260802000000_photo_ai_queue.sql`  
   Or: `cd web && node scripts/apply-photo-ai-queue-migration.mjs`
2. Set **Amplify → Environment variables → `CRON_SECRET`** to the same value as GitHub secret `CRON_SECRET` (also in local `web/.env.local`), then **Redeploy**
3. Push GitHub Actions workflow (needs `workflow` scope on the `gh` token):
   - Local files: `.github/workflows/process-jobs-cron.yml` (and optional `ci.yml`)
   - Or: `gh auth refresh -h github.com -s workflow` then commit + push `.github/`
4. Confirm workflow **Process jobs cron** runs (Actions tab), or hit the cron endpoint manually

Until Amplify has `CRON_SECRET`, the open job page still drives `/process`. Cron is the guarantee when the tab is closed.

## Verify

```bash
curl -s -X POST https://wiselista.com/api/cron/process-jobs \
  -H "Authorization: Bearer $CRON_SECRET"
# {"ok":true,"processed":0,"remainingJobs":0,...}
```
