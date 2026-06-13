-- Extended agent profiles: type (agent vs individual), photo, license, LinkedIn.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_type TEXT NOT NULL DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS photo_key TEXT,
  ADD COLUMN IF NOT EXISTS share_profile_photo_url TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_profile_type_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_profile_type_check
  CHECK (profile_type IN ('agent', 'individual'));

-- Include extended agent profile on public share payload.
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
  v_profile JSON;
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

  SELECT json_build_object(
    'profile_type', p.profile_type,
    'full_name', p.full_name,
    'business_name', p.business_name,
    'role_title', p.role_title,
    'phone', p.phone,
    'business_url', p.business_url,
    'linkedin_url', p.linkedin_url,
    'license_number', p.license_number,
    'business_address', p.business_address,
    'photo_key', p.photo_key,
    'share_profile_photo_url', p.share_profile_photo_url
  )
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_job.user_id;

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
    'agent_profile', v_profile,
    'share_photo_urls', v_job.share_photo_urls,
    'photos', v_photos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_share(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(TEXT) TO anon, authenticated;
