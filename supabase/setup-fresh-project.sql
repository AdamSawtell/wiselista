-- Wiselista — full fresh Supabase setup (run once on a new project)
-- 1. Supabase Dashboard → SQL Editor → New query → paste this entire file → Run
-- 2. Then create your login user: Authentication → Users → Add user

-- ========== Schema ==========
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'payment_pending', 'processing', 'ready', 'failed')),
  name TEXT,
  property_address TEXT,
  listing_type TEXT CHECK (listing_type IS NULL OR listing_type IN ('rent', 'sale')),
  target_portal TEXT,
  share_token TEXT UNIQUE,
  processing_photo_index INT,
  processing_photo_total INT,
  processing_started_at TIMESTAMPTZ,
  stripe_checkout_session_id TEXT,
  ai_job_id TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL CHECK (room_type IN ('living_room', 'kitchen', 'bedroom', 'bathroom', 'exterior', 'other')),
  sequence INT NOT NULL DEFAULT 0,
  original_key TEXT NOT NULL,
  edited_key TEXT,
  ai_photo_id TEXT,
  ai_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (ai_status IN ('pending', 'processing', 'ready', 'failed')),
  ai_attempts INT NOT NULL DEFAULT 0,
  ai_last_error TEXT,
  ai_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NZD',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_photos_job_id ON public.photos(job_id);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_select_own ON public.jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY jobs_insert_own ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY jobs_update_own ON public.jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY jobs_delete_own ON public.jobs FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY photos_select_via_job ON public.photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);
CREATE POLICY photos_insert_via_job ON public.photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);
CREATE POLICY photos_update_via_job ON public.photos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);
CREATE POLICY photos_delete_via_job ON public.photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);

CREATE POLICY payments_select_via_job ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = payments.job_id AND j.user_id = auth.uid())
);

-- ========== Storage bucket ==========
INSERT INTO storage.buckets (id, name, public)
VALUES ('wiselista-photos', 'wiselista-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "wiselista_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wiselista-photos');

CREATE POLICY "wiselista_photos_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wiselista-photos');

CREATE POLICY "wiselista_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wiselista-photos');

CREATE POLICY "wiselista_photos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wiselista-photos');

-- ========== Photo AI queue (durable processing) ==========
CREATE INDEX IF NOT EXISTS idx_photos_ai_queue
  ON public.photos (job_id, ai_status, sequence)
  WHERE edited_key IS NULL;

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
