-- Wiselista schema (Phase 1)
-- Run in Supabase SQL editor or via supabase db push

-- Jobs: one per "submit for edit" batch
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'payment_pending', 'processing', 'ready', 'failed')),
  stripe_checkout_session_id TEXT,
  ai_job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Photos: per image in a job
CREATE TABLE IF NOT EXISTS public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL CHECK (room_type IN ('living_room', 'kitchen', 'bedroom', 'bathroom', 'exterior', 'other')),
  sequence INT NOT NULL DEFAULT 0,
  original_key TEXT NOT NULL,
  edited_key TEXT,
  ai_photo_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments: audit / idempotency
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NZD',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_photos_job_id ON public.photos(job_id);

-- RLS: users see only their own jobs/photos
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY jobs_select_own ON public.jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY jobs_insert_own ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY jobs_update_own ON public.jobs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY photos_select_via_job ON public.photos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);
CREATE POLICY photos_insert_via_job ON public.photos FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);
CREATE POLICY photos_update_via_job ON public.photos FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);

CREATE POLICY payments_select_via_job ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = payments.job_id AND j.user_id = auth.uid())
);

-- Storage bucket: wiselista-photos (create in Supabase Dashboard, private, RLS by path)
-- Bucket: wiselista-photos, private, RLS by user_id in path or metadata
