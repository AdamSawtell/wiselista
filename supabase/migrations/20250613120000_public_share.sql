-- Public client share links: fetch job + photos by token without service role.
-- Also allow anon read of storage objects for photos on shared ready jobs.

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
    'photos', v_photos
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_share(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_share(TEXT) TO anon, authenticated;

-- Anon clients opening share links can read objects on shared ready jobs (backup path).
DROP POLICY IF EXISTS "wiselista_photos_select_shared" ON storage.objects;
CREATE POLICY "wiselista_photos_select_shared"
ON storage.objects FOR SELECT
TO anon
USING (
  bucket_id = 'wiselista-photos'
  AND EXISTS (
    SELECT 1
    FROM public.photos p
    INNER JOIN public.jobs j ON j.id = p.job_id
    WHERE j.status = 'ready'
      AND j.share_token IS NOT NULL
      AND (p.edited_key = name OR p.original_key = name)
  )
);
