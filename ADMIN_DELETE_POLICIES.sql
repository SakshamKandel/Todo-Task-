-- =============================================
-- Admin Delete Policy for Asinify
-- Run this in your Supabase SQL Editor
-- =============================================

-- Allow admins to delete other users' profiles (but not their own)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    auth.uid() != id
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Allow admins to delete tasks (for cleanup purposes)
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;
CREATE POLICY "Admins can delete any task" ON public.tasks
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Allow admins to update any task (for assigned_to cleanup)
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
CREATE POLICY "Admins can update any task" ON public.tasks
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Allow admins to delete any project
DROP POLICY IF EXISTS "Admins can delete any project" ON public.projects;
CREATE POLICY "Admins can delete any project" ON public.projects
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Allow admins to delete any tag
DROP POLICY IF EXISTS "Admins can delete any tag" ON public.tags;
CREATE POLICY "Admins can delete any tag" ON public.tags
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- =============================================
-- Storage policies for task-attachments bucket
-- =============================================

-- Allow admins to delete any file from task-attachments bucket
DROP POLICY IF EXISTS "Admins can delete any attachment" ON storage.objects;
CREATE POLICY "Admins can delete any attachment" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-attachments'
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- =============================================
-- Verification query - run to check policies
-- =============================================
-- SELECT schemaname, tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('profiles', 'tasks', 'projects', 'tags');
