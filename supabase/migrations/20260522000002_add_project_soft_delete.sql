BEGIN;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.task_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.task_activity
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

CREATE OR REPLACE FUNCTION public.is_project_member(
  target_project_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      JOIN public.projects p
        ON p.id = pm.project_id
      WHERE pm.project_id = target_project_id
        AND pm.user_id = COALESCE(target_user_id, auth.uid())
        AND pm.deleted_at IS NULL
        AND p.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner(
  target_project_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin(target_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      JOIN public.projects p
        ON p.id = pm.project_id
      WHERE pm.project_id = target_project_id
        AND pm.user_id = COALESCE(target_user_id, auth.uid())
        AND pm.role = 'owner'
        AND pm.deleted_at IS NULL
        AND p.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.can_assign_user_to_project(
  target_project_id UUID,
  assignee_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    assignee_user_id IS NULL
    OR public.is_admin(assignee_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm
      JOIN public.projects p
        ON p.id = pm.project_id
      WHERE pm.project_id = target_project_id
        AND pm.user_id = assignee_user_id
        AND pm.deleted_at IS NULL
        AND p.deleted_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_task(
  target_task_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p
      ON p.id = t.project_id
    WHERE t.id = target_task_id
      AND t.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND public.is_project_member(t.project_id, target_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_project(
  target_project_id UUID,
  confirmation_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
  current_project public.projects%ROWTYPE;
  deletion_time TIMESTAMPTZ;
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Solo usuarios autenticados pueden eliminar proyectos.';
  END IF;

  actor_id := auth.uid();
  deletion_time := now();

  SELECT *
  INTO current_project
  FROM public.projects
  WHERE id = target_project_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El proyecto no existe o ya fue eliminado.';
  END IF;

  IF NOT public.is_project_owner(target_project_id, actor_id) THEN
    RAISE EXCEPTION 'No tienes permisos para eliminar este proyecto.';
  END IF;

  IF confirmation_name IS NOT NULL
     AND btrim(confirmation_name) <> current_project.name THEN
    RAISE EXCEPTION 'El nombre de confirmacion no coincide con el proyecto.';
  END IF;

  UPDATE public.task_comments
  SET deleted_at = deletion_time,
      deleted_by = actor_id
  WHERE deleted_at IS NULL
    AND task_id IN (
      SELECT t.id
      FROM public.tasks t
      WHERE t.project_id = target_project_id
        AND t.deleted_at IS NULL
    );

  UPDATE public.task_activity
  SET deleted_at = deletion_time,
      deleted_by = actor_id
  WHERE deleted_at IS NULL
    AND task_id IN (
      SELECT t.id
      FROM public.tasks t
      WHERE t.project_id = target_project_id
        AND t.deleted_at IS NULL
    );

  UPDATE public.tasks
  SET deleted_at = deletion_time,
      deleted_by = actor_id,
      updated_at = deletion_time
  WHERE project_id = target_project_id
    AND deleted_at IS NULL;

  UPDATE public.project_members
  SET deleted_at = deletion_time,
      deleted_by = actor_id
  WHERE project_id = target_project_id
    AND deleted_at IS NULL;

  UPDATE public.projects
  SET deleted_at = deletion_time,
      deleted_by = actor_id
  WHERE id = target_project_id
    AND deleted_at IS NULL;
END;
$$;

DROP POLICY IF EXISTS projects_select_member_or_admin ON public.projects;
DROP POLICY IF EXISTS projects_update_owner_or_admin ON public.projects;
DROP POLICY IF EXISTS projects_delete_admin_only ON public.projects;
DROP POLICY IF EXISTS project_members_select_member_or_admin ON public.project_members;
DROP POLICY IF EXISTS project_members_insert_owner_or_admin ON public.project_members;
DROP POLICY IF EXISTS project_members_update_owner_or_admin ON public.project_members;
DROP POLICY IF EXISTS project_members_delete_owner_or_admin ON public.project_members;
DROP POLICY IF EXISTS tasks_select_member_or_admin ON public.tasks;
DROP POLICY IF EXISTS tasks_insert_member_or_admin ON public.tasks;
DROP POLICY IF EXISTS tasks_update_member_or_admin ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_owner_or_admin ON public.tasks;
DROP POLICY IF EXISTS task_comments_select_member_or_admin ON public.task_comments;
DROP POLICY IF EXISTS task_comments_insert_member_or_admin ON public.task_comments;
DROP POLICY IF EXISTS task_activity_select_member_or_admin ON public.task_activity;
DROP POLICY IF EXISTS task_activity_insert_member_or_admin ON public.task_activity;

CREATE POLICY projects_select_member_or_admin
  ON public.projects FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR public.is_project_member(id)
    )
  );

CREATE POLICY projects_update_owner_or_admin
  ON public.projects FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_owner(id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_owner(id)
  );

CREATE POLICY projects_delete_admin_only
  ON public.projects FOR DELETE
  USING (false);

CREATE POLICY project_members_select_member_or_admin
  ON public.project_members FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_member(project_id)
  );

CREATE POLICY project_members_insert_owner_or_admin
  ON public.project_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND (
      public.is_project_owner(project_id)
      OR (
        auth.uid() = user_id
        AND role = 'owner'
        AND COALESCE(added_by, auth.uid()) = auth.uid()
      )
    )
  );

CREATE POLICY project_members_update_owner_or_admin
  ON public.project_members FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_owner(project_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_owner(project_id)
  );

CREATE POLICY project_members_delete_owner_or_admin
  ON public.project_members FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_owner(project_id)
  );

CREATE POLICY tasks_select_member_or_admin
  ON public.tasks FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_member(project_id)
  );

CREATE POLICY tasks_insert_member_or_admin
  ON public.tasks FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_member(project_id)
    AND public.can_assign_user_to_project(project_id, assigned_to)
  );

CREATE POLICY tasks_update_member_or_admin
  ON public.tasks FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_member(project_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_member(project_id)
    AND public.can_assign_user_to_project(project_id, assigned_to)
  );

CREATE POLICY tasks_delete_owner_or_admin
  ON public.tasks FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.is_project_owner(project_id)
  );

CREATE POLICY task_comments_select_member_or_admin
  ON public.task_comments FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_comments_insert_member_or_admin
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND author_id = auth.uid()
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_activity_select_member_or_admin
  ON public.task_activity FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_activity_insert_member_or_admin
  ON public.task_activity FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND actor_id = auth.uid()
    AND public.can_access_task(task_id)
  );

COMMIT;
