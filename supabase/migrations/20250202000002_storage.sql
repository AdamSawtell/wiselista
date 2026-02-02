-- Wiselista storage policies (Phase 1)
-- Run after 20250202000001_schema.sql
-- Create bucket "wiselista-photos" in Dashboard (Storage → New bucket, private) first, then run this.

-- Authenticated users can upload, read, and update objects in wiselista-photos
-- (Paths in app: user_id/job_id/uuid.jpg; for stricter RLS add (storage.foldername(name))[1] = auth.uid()::text later)

CREATE POLICY "wiselista_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wiselista-photos');

CREATE POLICY "wiselista_photos_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wiselista-photos');

CREATE POLICY "wiselista_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wiselista-photos');
