-- =============================================
-- KEY MIGRATION FOR AMAZON FEATURES
-- Run this in Supabase SQL Editor to fix White Screen & Editing Issues
-- =============================================

-- 1. Add Amazon Tracking columns to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_amazon BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS amazon_tasks JSONB DEFAULT '[]';

-- 2. Create Task Ratings table
CREATE TABLE IF NOT EXISTS public.task_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  rated_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, rated_by)
);

-- 3. Enable RLS on ratings
ALTER TABLE public.task_ratings ENABLE ROW LEVEL SECURITY;

-- 4. Policies for ratings
-- Viewable by all
DROP POLICY IF EXISTS "Ratings are viewable by all" ON public.task_ratings;
CREATE POLICY "Ratings are viewable by all" ON public.task_ratings FOR SELECT USING (true);

-- Assigners and admins can rate
DROP POLICY IF EXISTS "Assigners and admins can rate" ON public.task_ratings;
CREATE POLICY "Assigners and admins can rate" ON public.task_ratings
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT created_by FROM public.tasks WHERE id = task_id)
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Users can update own ratings
DROP POLICY IF EXISTS "Users can update own ratings" ON public.task_ratings;
CREATE POLICY "Users can update own ratings" ON public.task_ratings
  FOR UPDATE USING (auth.uid() = rated_by);

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_is_amazon ON public.tasks(is_amazon);
CREATE INDEX IF NOT EXISTS idx_task_ratings_task ON public.task_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_created ON public.task_ratings(created_at);
