-- Property capture brief: agent-defined shot list drives customer link + guided shoot.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS capture_brief JSONB;

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS brief_slot_id TEXT;

CREATE INDEX IF NOT EXISTS photos_job_brief_slot_idx ON public.photos(job_id, brief_slot_id);

-- Extend public capture session with brief slots for customer mobile flow.
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
  v_filled_slots JSON;
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

  SELECT COALESCE(json_agg(DISTINCT p.brief_slot_id), '[]'::json)
  INTO v_filled_slots
  FROM public.photos p
  WHERE p.job_id = v_job.id
    AND p.brief_slot_id IS NOT NULL;

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
    'already_submitted', v_job.capture_status = 'submitted',
    'capture_brief', v_job.capture_brief,
    'filled_slot_ids', v_filled_slots
  );
END;
$$;
