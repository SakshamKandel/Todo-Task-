-- =============================================
-- COMPLETE SUPABASE SCHEMA FOR TODO TASK APP
-- Run this ENTIRE script in Supabase SQL Editor
-- NOTE: Storage policies must be set via Dashboard
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    auth.uid() != id
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
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

-- Admins can manage all team members
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
CREATE POLICY "Admins can manage team members" ON public.team_members
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- Leaders can add members to their team
DROP POLICY IF EXISTS "Leaders can add team members" ON public.team_members;
CREATE POLICY "Leaders can add team members" ON public.team_members
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.team_members 
      WHERE team_id = team_members.team_id AND role = 'leader'
    )
  );

-- Leaders can remove members from their team (but not themselves)
DROP POLICY IF EXISTS "Leaders can remove team members" ON public.team_members;
CREATE POLICY "Leaders can remove team members" ON public.team_members
  FOR DELETE USING (
    user_id != auth.uid() AND
    auth.uid() IN (
      SELECT user_id FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id AND tm.role = 'leader'
    )
  );

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

DROP POLICY IF EXISTS "Invitations are viewable" ON public.team_invitations;
CREATE POLICY "Invitations are viewable" ON public.team_invitations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.team_invitations;
CREATE POLICY "Admins can manage invitations" ON public.team_invitations
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
    OR auth.uid() = created_by
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
  FOR ALL USING (
    created_by = auth.uid() 
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Admins can delete any project" ON public.projects;
CREATE POLICY "Admins can delete any project" ON public.projects
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

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

DROP POLICY IF EXISTS "Admins can delete any tag" ON public.tags;
CREATE POLICY "Admins can delete any tag" ON public.tags
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

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
  is_amazon BOOLEAN DEFAULT false,
  amazon_tasks JSONB DEFAULT '[]',
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

DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;
CREATE POLICY "Admins can delete any task" ON public.tasks
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
CREATE POLICY "Admins can update any task" ON public.tasks
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

-- =============================================
-- TASK COMMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by task viewers" ON public.task_comments;
CREATE POLICY "Comments viewable by task viewers" ON public.task_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.task_comments;
CREATE POLICY "Authenticated users can create comments" ON public.task_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.task_comments;
CREATE POLICY "Users can delete own comments" ON public.task_comments
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- TASK RATINGS TABLE
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

DROP POLICY IF EXISTS "Ratings are viewable by all" ON public.task_ratings;
CREATE POLICY "Ratings are viewable by all" ON public.task_ratings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Assigners and admins can rate" ON public.task_ratings;
CREATE POLICY "Assigners and admins can rate" ON public.task_ratings
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT created_by FROM public.tasks WHERE id = task_id)
    OR auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "Users can update own ratings" ON public.task_ratings;
CREATE POLICY "Users can update own ratings" ON public.task_ratings
  FOR UPDATE USING (auth.uid() = rated_by);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES FOR PERFORMANCE
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
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);

-- =============================================
-- ENABLE REALTIME FOR NOTIFICATIONS
-- =============================================
DO $$
BEGIN
  -- Check if tasks is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
END $$;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT 'Schema setup complete! All tables and policies created.' as status;

-- =============================================
-- STORAGE SETUP (Run separately in Storage tab)
-- =============================================
-- NOTE: Storage bucket policies must be configured via 
-- Supabase Dashboard > Storage > Policies
-- 
-- Create bucket: task-attachments (public)
-- Add policies:
-- 1. SELECT: Allow public access
-- 2. INSERT: Allow authenticated users
-- 3. UPDATE: Allow owner
-- 4. DELETE: Allow owner or admins
