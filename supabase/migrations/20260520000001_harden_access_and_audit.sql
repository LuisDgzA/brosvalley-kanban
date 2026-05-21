-- improvement: 08-control-de-acceso-y-hardening-operativo
-- Endurece permisos por proyecto, agrega roles y centraliza auditoria.

BEGIN;

-- ── schema updates ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS global_role TEXT NOT NULL DEFAULT 'member';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_global_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_global_role_check
  CHECK (global_role IN ('admin', 'member'));

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'collaborator';

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.project_members
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner', 'collaborator'));

CREATE UNIQUE INDEX IF NOT EXISTS project_members_project_id_user_id_key
  ON public.project_members(project_id, user_id);

ALTER TABLE public.task_activity
  ADD COLUMN IF NOT EXISTS metadata JSONB;

UPDATE public.project_members
SET role = 'collaborator'
WHERE role IS NULL;

INSERT INTO public.project_members (project_id, user_id, role, added_by)
SELECT p.id, p.created_by, 'owner', p.created_by
FROM public.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.project_members pm
    WHERE pm.project_id = p.id
      AND pm.user_id = p.created_by
  )
ON CONFLICT (project_id, user_id) DO NOTHING;

UPDATE public.project_members pm
SET role = 'owner'
FROM public.projects p
WHERE p.id = pm.project_id
  AND p.created_by IS NOT NULL
  AND p.created_by = pm.user_id;

UPDATE public.task_activity
SET event_type = CASE event_type
  WHEN 'tarea_creada' THEN 'task_created'
  WHEN 'status_cambiado' THEN 'task_status_changed'
  WHEN 'responsable_cambiado' THEN 'task_assignee_changed'
  WHEN 'prioridad_cambiada' THEN 'task_priority_changed'
  WHEN 'fecha_limite_cambiada' THEN 'task_due_date_changed'
  ELSE event_type
END
WHERE event_type IN (
  'tarea_creada',
  'status_cambiado',
  'responsable_cambiado',
  'prioridad_cambiada',
  'fecha_limite_cambiada'
);

-- ── helper functions ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin(target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = COALESCE(target_user_id, auth.uid())
      AND global_role = 'admin'
  );
$$;

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
      WHERE pm.project_id = target_project_id
        AND pm.user_id = COALESCE(target_user_id, auth.uid())
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
      WHERE pm.project_id = target_project_id
        AND pm.user_id = COALESCE(target_user_id, auth.uid())
        AND pm.role = 'owner'
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
      WHERE pm.project_id = target_project_id
        AND pm.user_id = assignee_user_id
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
    WHERE t.id = target_task_id
      AND public.is_project_member(t.project_id, target_user_id)
  );
$$;

-- ── triggers: projects / members ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_project_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_creator ON public.projects;

CREATE TRIGGER trg_set_project_creator
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_project_creator();

CREATE OR REPLACE FUNCTION public.ensure_project_creator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_id UUID;
BEGIN
  creator_id := COALESCE(NEW.created_by, auth.uid());

  IF creator_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id, role, added_by)
    VALUES (NEW.id, creator_id, 'owner', creator_id)
    ON CONFLICT (project_id, user_id) DO UPDATE
      SET role = 'owner',
          added_by = COALESCE(public.project_members.added_by, EXCLUDED.added_by);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_creator_membership ON public.projects;

CREATE TRIGGER trg_project_creator_membership
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_project_creator_membership();

CREATE OR REPLACE FUNCTION public.prevent_last_project_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_owners INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' THEN
      SELECT COUNT(*)
      INTO remaining_owners
      FROM public.project_members pm
      WHERE pm.project_id = OLD.project_id
        AND pm.role = 'owner'
        AND pm.id <> OLD.id;

      IF remaining_owners = 0 THEN
        RAISE EXCEPTION 'No se puede eliminar el ultimo owner del proyecto.';
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.role = 'owner' AND NEW.role <> 'owner' THEN
    SELECT COUNT(*)
    INTO remaining_owners
    FROM public.project_members pm
    WHERE pm.project_id = OLD.project_id
      AND pm.role = 'owner'
      AND pm.id <> OLD.id;

    IF remaining_owners = 0 THEN
      RAISE EXCEPTION 'No se puede degradar al ultimo owner del proyecto.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_project_owner_removal ON public.project_members;

CREATE TRIGGER trg_prevent_last_project_owner_removal
  BEFORE UPDATE OR DELETE ON public.project_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_project_owner_removal();

-- ── triggers: tasks / comments ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_task_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_id IS NULL THEN
    RAISE EXCEPTION 'Toda tarea debe pertenecer a un proyecto.';
  END IF;

  IF NEW.assigned_to IS NOT NULL
     AND NOT public.can_assign_user_to_project(NEW.project_id, NEW.assigned_to) THEN
    RAISE EXCEPTION 'El responsable debe pertenecer al proyecto.';
  END IF;

  NEW.updated_at := COALESCE(NEW.updated_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_membership ON public.tasks;

CREATE TRIGGER trg_validate_task_membership
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_membership();

CREATE OR REPLACE FUNCTION public.log_task_activity_from_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  actor_id := COALESCE(auth.uid(), NEW.created_by, NEW.assigned_to, OLD.created_by, OLD.assigned_to);

  IF TG_OP = 'INSERT' THEN
    IF actor_id IS NOT NULL THEN
      INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value, metadata)
      VALUES (
        NEW.id,
        actor_id,
        'task_created',
        NULL,
        NULL,
        jsonb_build_object('project_id', NEW.project_id, 'status', NEW.status)
      );
    END IF;

    RETURN NEW;
  END IF;

  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (NEW.id, actor_id, 'task_status_changed', OLD.status, NEW.status);
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      actor_id,
      'task_assignee_changed',
      OLD.assigned_to::TEXT,
      NEW.assigned_to::TEXT
    );
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (NEW.id, actor_id, 'task_priority_changed', OLD.priority, NEW.priority);
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      actor_id,
      'task_due_date_changed',
      OLD.due_date::TEXT,
      NEW.due_date::TEXT
    );
  END IF;

  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      actor_id,
      'task_project_changed',
      OLD.project_id::TEXT,
      NEW.project_id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_activity ON public.tasks;

CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_activity_from_tasks();

CREATE OR REPLACE FUNCTION public.log_task_activity_from_comments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value, metadata)
  VALUES (
    NEW.task_id,
    NEW.author_id,
    'task_comment_added',
    NULL,
    NULL,
    jsonb_build_object('comment_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_comment_activity ON public.task_comments;

CREATE TRIGGER trg_log_task_comment_activity
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_activity_from_comments();

-- ── row level security ───────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated full access" ON public.profiles;
DROP POLICY IF EXISTS "authenticated full access" ON public.projects;
DROP POLICY IF EXISTS "authenticated full access" ON public.project_members;
DROP POLICY IF EXISTS "authenticated full access" ON public.tasks;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer comentarios" ON public.task_comments;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar comentarios" ON public.task_comments;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer actividad" ON public.task_activity;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar actividad" ON public.task_activity;

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
DROP POLICY IF EXISTS projects_select_member_or_admin ON public.projects;
DROP POLICY IF EXISTS projects_insert_authenticated ON public.projects;
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

CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY profiles_update_self_or_admin
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY projects_select_member_or_admin
  ON public.projects FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_member(id)
  );

CREATE POLICY projects_insert_authenticated
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND COALESCE(created_by, auth.uid()) = auth.uid()
  );

CREATE POLICY projects_update_owner_or_admin
  ON public.projects FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_owner(id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_project_owner(id)
  );

CREATE POLICY projects_delete_admin_only
  ON public.projects FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY project_members_select_member_or_admin
  ON public.project_members FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
  );

CREATE POLICY project_members_insert_owner_or_admin
  ON public.project_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_project_owner(project_id)
  );

CREATE POLICY project_members_update_owner_or_admin
  ON public.project_members FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_owner(project_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_project_owner(project_id)
  );

CREATE POLICY project_members_delete_owner_or_admin
  ON public.project_members FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_owner(project_id)
  );

CREATE POLICY tasks_select_member_or_admin
  ON public.tasks FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
  );

CREATE POLICY tasks_insert_member_or_admin
  ON public.tasks FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
    AND public.can_assign_user_to_project(project_id, assigned_to)
  );

CREATE POLICY tasks_update_member_or_admin
  ON public.tasks FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
    AND public.can_assign_user_to_project(project_id, assigned_to)
  );

CREATE POLICY tasks_delete_owner_or_admin
  ON public.tasks FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_owner(project_id)
  );

CREATE POLICY task_comments_select_member_or_admin
  ON public.task_comments FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_comments_insert_member_or_admin
  ON public.task_comments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND author_id = auth.uid()
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_activity_select_member_or_admin
  ON public.task_activity FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_activity_insert_member_or_admin
  ON public.task_activity FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND actor_id = auth.uid()
    AND public.can_access_task(task_id)
  );

COMMIT;
