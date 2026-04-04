-- Create the attachments storage bucket (public reads)
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);

-- Users can upload files into their own folder
CREATE POLICY "Users can upload own files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for attachments (images shown in editor, shared links, etc.)
CREATE POLICY "Public read for attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'attachments');
