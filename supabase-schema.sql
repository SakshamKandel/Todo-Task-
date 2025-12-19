-- =============================================
-- Asinify Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (extends auth.users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'normal' CHECK (role IN ('superadmin', 'admin', 'normal')),
  created_by UUID REFERENCES public.profiles(id),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
    OR auth.uid() = id
  );

-- =============================================
-- TEAMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  institution TEXT,
  admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are viewable by members" ON public.teams;
CREATE POLICY "Teams are viewable by members" ON public.teams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage teams" ON public.teams;
CREATE POLICY "Admins can manage teams" ON public.teams
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- =============================================
-- TEAM MEMBERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members viewable by team" ON public.team_members;
CREATE POLICY "Team members viewable by team" ON public.team_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- =============================================
-- PROJECTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f97316',
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects viewable by owner or team" ON public.projects;
CREATE POLICY "Projects viewable by owner or team" ON public.projects
  FOR SELECT USING (
    created_by = auth.uid()
    OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owners can manage projects" ON public.projects;
CREATE POLICY "Owners can manage projects" ON public.projects
  FOR ALL USING (created_by = auth.uid() OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin')));

-- =============================================
-- TAGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#f97316',
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags viewable by owner or team" ON public.tags;
CREATE POLICY "Tags viewable by owner or team" ON public.tags
  FOR SELECT USING (
    created_by = auth.uid()
    OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Users can manage own tags" ON public.tags;
CREATE POLICY "Users can manage own tags" ON public.tags
  FOR ALL USING (created_by = auth.uid());

-- =============================================
-- TASKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  "order" INTEGER DEFAULT 0,
  subtasks JSONB DEFAULT '[]',
  attachments TEXT[] DEFAULT '{}',
  recurrence TEXT CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  -- Amazon task tracking
  is_amazon BOOLEAN DEFAULT false,
  amazon_tasks JSONB DEFAULT '[]', -- [{type: 'listing', quantity: 2}, {type: 'premium_a_plus', quantity: 1}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can see: their own tasks, assigned tasks, team tasks
DROP POLICY IF EXISTS "Tasks viewable by owner, assignee, or team" ON public.tasks;
CREATE POLICY "Tasks viewable by owner, assignee, or team" ON public.tasks
  FOR SELECT USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own/assigned tasks" ON public.tasks;
CREATE POLICY "Users can update own/assigned tasks" ON public.tasks
  FOR UPDATE USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (
    created_by = auth.uid()
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- =============================================
-- FUNCTION: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Determine role based on email
  IF NEW.email = 'admin@asinify.com' THEN
    user_role := 'superadmin';
  ELSIF NEW.email LIKE '%@asinify.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'normal';
  END IF;

  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    user_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TEAM INVITATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Anyone can view invitations to join
DROP POLICY IF EXISTS "Invitations are viewable" ON public.team_invitations;
CREATE POLICY "Invitations are viewable" ON public.team_invitations
  FOR SELECT USING (true);

-- Team admins can create/manage invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.team_invitations;
CREATE POLICY "Admins can manage invitations" ON public.team_invitations
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
    OR auth.uid() = created_by
  );

-- =============================================
-- TASK RATINGS TABLE (for leaderboard)
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  rated_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, rated_by)
);

ALTER TABLE public.task_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings
DROP POLICY IF EXISTS "Ratings are viewable by all" ON public.task_ratings;
CREATE POLICY "Ratings are viewable by all" ON public.task_ratings
  FOR SELECT USING (true);

-- Assigners and admins can rate tasks
DROP POLICY IF EXISTS "Assigners and admins can rate" ON public.task_ratings;
CREATE POLICY "Assigners and admins can rate" ON public.task_ratings
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT created_by FROM public.tasks WHERE id = task_id)
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Users can update their own ratings
DROP POLICY IF EXISTS "Users can update own ratings" ON public.task_ratings;
CREATE POLICY "Users can update own ratings" ON public.task_ratings
  FOR UPDATE USING (auth.uid() = rated_by);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_team_id ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_amazon ON public.tasks(is_amazon);
CREATE INDEX IF NOT EXISTS idx_task_ratings_task ON public.task_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_created ON public.task_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.team_invitations(code);

-- Copy and Run this in your Supabase SQL Editor to setup the storage bucket

-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable Row Level Security
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy: Allow Public Access to View Files
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'task-attachments' );

-- 4. Create Policy: Allow Authenticated Users to Upload Files
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments' 
  AND auth.role() = 'authenticated'
);

-- 5. Create Policy: Allow Users to Update their own files (optional)
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update" ON storage.objects;
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid() = owner
);

-- 6. Create Policy: Allow Users to Delete their own files
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments' 
  AND auth.uid() = owner
);

-- =============================================
-- ADMIN DELETE POLICIES (for user management)
-- =============================================

-- Allow admins to delete other users' profiles (but not their own)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    auth.uid() != id
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Allow admins to delete any task (for cleanup purposes)
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

-- Allow admins to delete any attachment from storage
DROP POLICY IF EXISTS "Admins can delete any attachment" ON storage.objects;
CREATE POLICY "Admins can delete any attachment" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'task-attachments'
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );
