-- Project page features: property context, share links, processing progress
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS listing_type TEXT
  CHECK (listing_type IS NULL OR listing_type IN ('rent', 'sale'));
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS target_portal TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS processing_photo_index INT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS processing_photo_total INT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_share_token ON public.jobs(share_token) WHERE share_token IS NOT NULL;
