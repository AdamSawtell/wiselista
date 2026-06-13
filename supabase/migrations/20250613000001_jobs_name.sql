-- Optional display name for jobs (projects)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS name TEXT;
