-- =============================================
-- PROJECT MANAGEMENT APP - FULL SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- 0. PROFILES (for user email resolution on client side)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_admin boolean DEFAULT false,
  is_banned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)
  );

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 1. PROJECTS
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read projects"
  ON projects FOR SELECT
  USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update projects"
  ON projects FOR UPDATE
  USING (
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can read all projects"
  ON projects FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all projects"
  ON projects FOR UPDATE
  USING (public.is_admin());

-- 2. PROJECT MEMBERS
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read project members"
  ON project_members FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert invites"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
    OR
    user_id = auth.uid()
  );

CREATE POLICY "Owner can delete members"
  ON project_members FOR DELETE
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role = 'owner')
  );

CREATE POLICY "Admins can read all members"
  ON project_members FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can delete members"
  ON project_members FOR DELETE
  USING (public.is_admin());

-- 3. TASKS
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read tasks"
  ON tasks FOR SELECT
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update tasks"
  ON tasks FOR UPDATE
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete tasks"
  ON tasks FOR DELETE
  USING (
    project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can read all tasks"
  ON tasks FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  USING (public.is_admin());

-- 4. COMMENTS
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read comments"
  ON comments FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Members can insert comments"
  ON comments FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all comments"
  ON comments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can delete comments"
  ON comments FOR DELETE
  USING (public.is_admin());

-- 5. FILES
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read files"
  ON files FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Members can insert files"
  ON files FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all files"
  ON files FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can delete files"
  ON files FOR DELETE
  USING (public.is_admin());

-- 6. NOTIFICATIONS
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system' CHECK (type IN ('task', 'team', 'system')),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 7. STORAGE BUCKET
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Members can read project files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files');

CREATE POLICY "Members can upload project files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files');

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND owner = auth.uid());

-- 8. NOTIFICATION TRIGGERS

-- Trigger: new task
CREATE OR REPLACE FUNCTION notify_new_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type)
  SELECT pm.user_id, 'New task created: ' || NEW.title, 'task'
  FROM public.project_members pm
  WHERE pm.project_id = NEW.project_id AND pm.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_created
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_task();

-- Trigger: task status changed
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO public.notifications (user_id, message, type)
    SELECT pm.user_id, 'Task "' || NEW.title || '" moved to ' || NEW.status, 'task'
    FROM public.project_members pm
    WHERE pm.project_id = NEW.project_id AND pm.user_id != NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_updated
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_update();

-- Trigger: new comment
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type)
  SELECT pm.user_id, 'New comment on task', 'task'
  FROM public.project_members pm
  WHERE pm.project_id IN (
    SELECT t.project_id FROM public.tasks t WHERE t.id = NEW.task_id
  ) AND pm.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();

-- Trigger: added to project
CREATE OR REPLACE FUNCTION notify_project_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, type)
  VALUES (NEW.user_id, 'You were added to a project', 'team');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_member_added
  AFTER INSERT ON project_members
  FOR EACH ROW
  WHEN (NEW.role = 'member')
  EXECUTE FUNCTION notify_project_member_added();

-- Backfill: create profiles for existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
