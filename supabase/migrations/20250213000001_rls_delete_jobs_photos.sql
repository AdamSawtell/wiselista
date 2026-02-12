-- Allow users to delete their own jobs and photos (for delete job / delete photo UI)
CREATE POLICY jobs_delete_own ON public.jobs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY photos_delete_via_job ON public.photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = photos.job_id AND j.user_id = auth.uid())
);
