-- Storage bucket for job photos (runs before schema/storage policies)
INSERT INTO storage.buckets (id, name, public)
VALUES ('wiselista-photos', 'wiselista-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow delete for remove-photo flow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'wiselista_photos_delete'
  ) THEN
    CREATE POLICY "wiselista_photos_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'wiselista-photos');
  END IF;
END $$;
