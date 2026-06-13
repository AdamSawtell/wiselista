-- Pre-signed photo URLs for client share links (signed when agent clicks Share).
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS share_photo_urls JSONB;

CREATE OR REPLACE FUNCTION public.get_public_share(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_email TEXT;
  v_meta JSONB;
  v_photos JSON;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE share_token = p_token AND status = 'ready';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT u.email, u.raw_user_meta_data
  INTO v_email, v_meta
  FROM auth.users u
  WHERE u.id = v_job.user_id;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', p.id,
        'room_type', p.room_type,
        'sequence', p.sequence,
        'edited_key', p.edited_key,
        'original_key', p.original_key
      )
      ORDER BY p.sequence
    ),
    '[]'::json
  )
  INTO v_photos
  FROM public.photos p
  WHERE p.job_id = v_job.id AND p.edited_key IS NOT NULL;

  RETURN json_build_object(
    'job_id', v_job.id,
    'property_name', v_job.name,
    'property_address', v_job.property_address,
    'listing_type', v_job.listing_type,
    'completed_at', v_job.completed_at,
    'agent_email', v_email,
    'agent_meta', v_meta,
    'share_photo_urls', v_job.share_photo_urls,
    'photos', v_photos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_share(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(TEXT) TO anon, authenticated;
