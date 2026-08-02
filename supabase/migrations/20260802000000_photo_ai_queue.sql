-- Photo-level AI queue: claim/retry so Amplify can process one photo per request
-- and a cron pump can finish up to 25 photos without an open browser tab.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS ai_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ai_status IN ('pending', 'processing', 'ready', 'failed')),
  ADD COLUMN IF NOT EXISTS ai_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_last_error TEXT,
  ADD COLUMN IF NOT EXISTS ai_claimed_at TIMESTAMPTZ;

-- Backfill from existing edited_key
UPDATE public.photos
SET ai_status = 'ready',
    ai_attempts = GREATEST(ai_attempts, 1)
WHERE edited_key IS NOT NULL
  AND ai_status IS DISTINCT FROM 'ready';

UPDATE public.photos
SET ai_status = 'pending'
WHERE edited_key IS NULL
  AND ai_status = 'ready';

CREATE INDEX IF NOT EXISTS idx_photos_ai_queue
  ON public.photos (job_id, ai_status, sequence)
  WHERE edited_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_processing_updated
  ON public.jobs (status, updated_at)
  WHERE status IN ('processing', 'failed');

/**
 * Atomically claim the next retryable photo for a job.
 * Stale "processing" claims older than p_stale_seconds are reclaimable.
 */
CREATE OR REPLACE FUNCTION public.claim_next_photo_for_job(
  p_job_id uuid,
  p_max_attempts int DEFAULT 3,
  p_stale_seconds int DEFAULT 120
)
RETURNS SETOF public.photos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photo public.photos;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = p_job_id AND j.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'not allowed';
    END IF;
  END IF;

  SELECT p.*
  INTO v_photo
  FROM public.photos p
  WHERE p.job_id = p_job_id
    AND p.edited_key IS NULL
    AND p.ai_attempts < p_max_attempts
    AND (
      p.ai_status IN ('pending', 'failed')
      OR (
        p.ai_status = 'processing'
        AND (p.ai_claimed_at IS NULL OR p.ai_claimed_at < now() - make_interval(secs => p_stale_seconds))
      )
    )
  ORDER BY p.sequence ASC, p.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.photos
  SET
    ai_status = 'processing',
    ai_claimed_at = now(),
    ai_attempts = ai_attempts + 1,
    ai_last_error = NULL
  WHERE id = v_photo.id
  RETURNING * INTO v_photo;

  RETURN NEXT v_photo;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_next_photo_for_job(uuid, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_next_photo_for_job(uuid, int, int) TO authenticated, service_role;

/**
 * Jobs that still need AI work (processing, or failed with retryable photos).
 */
CREATE OR REPLACE FUNCTION public.jobs_needing_ai_processing(p_limit int DEFAULT 10)
RETURNS TABLE (job_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT j.id AS job_id
  FROM public.jobs j
  WHERE j.status IN ('processing', 'failed')
    AND EXISTS (
      SELECT 1
      FROM public.photos p
      WHERE p.job_id = j.id
        AND p.edited_key IS NULL
        AND p.ai_attempts < 3
        AND (
          p.ai_status IN ('pending', 'failed')
          OR (
            p.ai_status = 'processing'
            AND (p.ai_claimed_at IS NULL OR p.ai_claimed_at < now() - interval '2 minutes')
          )
        )
    )
  ORDER BY j.updated_at ASC
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

REVOKE ALL ON FUNCTION public.jobs_needing_ai_processing(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jobs_needing_ai_processing(int) TO service_role;
