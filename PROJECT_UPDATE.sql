-- =============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Ensures projects table has team_id column for organization grouping
-- =============================================

-- Make sure projects table has team_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.projects ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure all policies are in place for projects
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

-- Refresh policies to ensure they work
SELECT 'Projects table and policies updated successfully!' as status;
