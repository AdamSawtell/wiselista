-- Store short failure reason when job status is 'failed' (e.g. Claid error) for support and UI
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS failure_message TEXT;
