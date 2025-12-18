-- Copy and Run this in your Supabase SQL Editor to setup the storage bucket

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Allow Public Access to View Files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'task-attachments' );

-- 4. Create Policy: Allow Authenticated Users to Upload Files
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.role() = 'authenticated'
);

-- 5. Create Policy: Allow Users to Update their own files (optional)
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid() = owner
);

-- 6. Create Policy: Allow Users to Delete their own files
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid() = owner
);
