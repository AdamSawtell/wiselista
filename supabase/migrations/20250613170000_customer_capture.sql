-- Pro feature: customer capture via magic link (no account required).

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS capture_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capture_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS capture_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capture_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS capture_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capture_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capture_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capture_customer_name TEXT;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_capture_status_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_capture_status_check
  CHECK (capture_status IN ('idle', 'link_sent', 'viewed', 'in_progress', 'submitted'));

CREATE TABLE IF NOT EXISTS public.capture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS capture_events_job_id_idx ON public.capture_events(job_id);

ALTER TABLE public.capture_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capture_events_select_own ON public.capture_events;
CREATE POLICY capture_events_select_own ON public.capture_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.user_id = auth.uid())
  );

-- Public capture session for anonymous customers (token-scoped, draft jobs only).
CREATE OR REPLACE FUNCTION public.get_capture_session(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_profile JSON;
  v_photo_count INT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE capture_token = p_token
    AND capture_enabled = true
    AND status = 'draft';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_job.capture_expires_at IS NOT NULL AND v_job.capture_expires_at < now() THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::INT INTO v_photo_count
  FROM public.photos p
  WHERE p.job_id = v_job.id;

  SELECT json_build_object(
    'full_name', pr.full_name,
    'business_name', pr.business_name,
    'role_title', pr.role_title,
    'phone', pr.phone
  )
  INTO v_profile
  FROM public.profiles pr
  WHERE pr.id = v_job.user_id;

  RETURN json_build_object(
    'job_id', v_job.id,
    'property_name', v_job.name,
    'property_address', v_job.property_address,
    'plan_tier', v_job.plan_tier,
    'capture_status', v_job.capture_status,
    'photo_count', v_photo_count,
    'max_photos', CASE WHEN v_job.plan_tier = 'pro' THEN 25 ELSE 15 END,
    'agent_profile', v_profile,
    'already_submitted', v_job.capture_status = 'submitted'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_capture_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_capture_session(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS capture_events_insert_own ON public.capture_events;
CREATE POLICY capture_events_insert_own ON public.capture_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.user_id = auth.uid())
  );
