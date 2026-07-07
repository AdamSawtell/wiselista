-- Tighten storage RLS: authenticated users may only access objects under their user_id/ prefix.
-- Paths: user_id/job_id/uuid.jpg (job photos), user_id/profile/avatar.ext (profile photos).
-- Anon share reads remain via wiselista_photos_select_shared (20250613120000_public_share.sql).

DROP POLICY IF EXISTS "wiselista_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "wiselista_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "wiselista_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "wiselista_photos_delete" ON storage.objects;

CREATE POLICY "wiselista_photos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wiselista-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "wiselista_photos_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wiselista-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "wiselista_photos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wiselista-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "wiselista_photos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wiselista-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
