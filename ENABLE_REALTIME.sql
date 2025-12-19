-- =============================================
-- ENABLE SUPABASE REALTIME FOR TASKS TABLE
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable realtime for tasks table
DO $$
BEGIN
  -- Check if tasks is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    RAISE NOTICE 'Realtime enabled for tasks table';
  ELSE
    RAISE NOTICE 'Realtime already enabled for tasks table';
  END IF;
END $$;

-- Verify realtime is enabled
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Also enable realtime for task_comments if you have it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    RAISE NOTICE 'Realtime enabled for task_comments table';
  END IF;
EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'task_comments table does not exist, skipping';
END $$;

SELECT 'Realtime configuration complete!' as status;
