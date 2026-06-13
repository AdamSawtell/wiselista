-- Per-job plan tier: Core ($29, 15 photos, 60 days) vs Pro ($49, 25 photos, 90 days, share).

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_plan_tier_check;

ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_plan_tier_check
  CHECK (plan_tier IN ('core', 'pro'));
