-- Agent profiles for real estate professionals (shown on client share pages).

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  business_name TEXT NOT NULL DEFAULT '',
  role_title TEXT,
  phone TEXT,
  business_url TEXT,
  business_address TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create empty profile for new sign-ups.
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Include agent profile on public share payload.
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
    'full_name', p.full_name,
    'business_name', p.business_name,
    'role_title', p.role_title,
    'phone', p.phone,
    'business_url', p.business_url,
    'business_address', p.business_address
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
