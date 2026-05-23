BEGIN;

CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_tag_id UUID NOT NULL REFERENCES public.project_tags(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, project_tag_id)
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id
  ON public.task_assignees(task_id);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user_id
  ON public.task_assignees(user_id);

CREATE INDEX IF NOT EXISTS idx_project_tags_project_id
  ON public.project_tags(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_tags_project_label_active
  ON public.project_tags(project_id, lower(label))
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id
  ON public.task_tags(task_id);

CREATE INDEX IF NOT EXISTS idx_task_tags_project_tag_id
  ON public.task_tags(project_tag_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created_at
  ON public.user_notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_read_at
  ON public.user_notifications(recipient_user_id, read_at);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_task_assignee_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_project_id UUID;
BEGIN
  SELECT t.project_id
  INTO target_project_id
  FROM public.tasks t
  WHERE t.id = NEW.task_id
    AND t.deleted_at IS NULL;

  IF target_project_id IS NULL THEN
    RAISE EXCEPTION 'La tarea no existe o ya fue eliminada.';
  END IF;

  IF NOT public.can_assign_user_to_project(target_project_id, NEW.user_id) THEN
    RAISE EXCEPTION 'El responsable debe pertenecer al proyecto.';
  END IF;

  NEW.assigned_by := COALESCE(NEW.assigned_by, auth.uid());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_task_assignment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  actor_id := COALESCE(auth.uid(), NEW.assigned_by, OLD.assigned_by);

  IF actor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value, metadata)
    VALUES (
      NEW.task_id,
      actor_id,
      'task_assignee_added',
      NULL,
      NEW.user_id::TEXT,
      jsonb_build_object('user_id', NEW.user_id)
    );

    IF NEW.user_id IS DISTINCT FROM actor_id THEN
      INSERT INTO public.user_notifications (
        recipient_user_id,
        type,
        title,
        body,
        project_id,
        task_id,
        payload
      )
      SELECT
        NEW.user_id,
        'task_assigned',
        COALESCE(t.title, 'Tarea asignada'),
        COALESCE(p.name, 'Proyecto') || ' / Nueva asignacion',
        t.project_id,
        NEW.task_id,
        jsonb_build_object(
          'assigned_by', actor_id,
          'project_id', t.project_id,
          'task_id', NEW.task_id
        )
      FROM public.tasks t
      LEFT JOIN public.projects p
        ON p.id = t.project_id
      WHERE t.id = NEW.task_id
        AND t.deleted_at IS NULL;
    END IF;

    RETURN NEW;
  END IF;

  INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value, metadata)
  VALUES (
    OLD.task_id,
    actor_id,
    'task_assignee_removed',
    OLD.user_id::TEXT,
    NULL,
    jsonb_build_object('user_id', OLD.user_id)
  );

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_legacy_task_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
    VALUES (NEW.id, NEW.assigned_to, COALESCE(auth.uid(), NEW.created_by, NEW.assigned_to))
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_task_tag_project_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_project_id UUID;
  tag_project_id UUID;
BEGIN
  SELECT t.project_id
  INTO task_project_id
  FROM public.tasks t
  WHERE t.id = NEW.task_id
    AND t.deleted_at IS NULL;

  SELECT pt.project_id
  INTO tag_project_id
  FROM public.project_tags pt
  WHERE pt.id = NEW.project_tag_id
    AND pt.archived_at IS NULL;

  IF task_project_id IS NULL THEN
    RAISE EXCEPTION 'La tarea no existe o ya fue eliminada.';
  END IF;

  IF tag_project_id IS NULL THEN
    RAISE EXCEPTION 'El tag no existe o esta archivado.';
  END IF;

  IF task_project_id <> tag_project_id THEN
    RAISE EXCEPTION 'La tarea solo puede usar tags de su propio proyecto.';
  END IF;

  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_task_assignees(
  target_task_id UUID,
  next_user_ids UUID[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_project_id UUID;
  normalized_user_ids UUID[];
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Solo usuarios autenticados pueden asignar tareas.';
  END IF;

  SELECT t.project_id
  INTO target_project_id
  FROM public.tasks t
  WHERE t.id = target_task_id
    AND t.deleted_at IS NULL
  FOR UPDATE;

  IF target_project_id IS NULL THEN
    RAISE EXCEPTION 'La tarea no existe o ya fue eliminada.';
  END IF;

  IF NOT public.can_access_task(target_task_id) THEN
    RAISE EXCEPTION 'No tienes acceso a esta tarea.';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT user_id), '{}'::UUID[])
  INTO normalized_user_ids
  FROM unnest(COALESCE(next_user_ids, '{}'::UUID[])) AS user_id
  WHERE user_id IS NOT NULL;

  IF EXISTS (
    SELECT 1
    FROM unnest(normalized_user_ids) AS user_id
    WHERE NOT public.can_assign_user_to_project(target_project_id, user_id)
  ) THEN
    RAISE EXCEPTION 'Todos los responsables deben pertenecer al proyecto.';
  END IF;

  DELETE FROM public.task_assignees ta
  WHERE ta.task_id = target_task_id
    AND NOT (ta.user_id = ANY(normalized_user_ids));

  INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
  SELECT target_task_id, user_id, auth.uid()
  FROM unnest(normalized_user_ids) AS user_id
  ON CONFLICT (task_id, user_id) DO NOTHING;

  UPDATE public.tasks t
  SET assigned_to = (
        SELECT ta.user_id
        FROM public.task_assignees ta
        WHERE ta.task_id = target_task_id
        ORDER BY ta.assigned_at ASC, ta.created_at ASC, ta.id ASC
        LIMIT 1
      ),
      updated_at = now()
  WHERE t.id = target_task_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_assignee_membership ON public.task_assignees;
CREATE TRIGGER trg_validate_task_assignee_membership
  BEFORE INSERT OR UPDATE ON public.task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_assignee_membership();

DROP TRIGGER IF EXISTS trg_log_task_assignment_change ON public.task_assignees;
CREATE TRIGGER trg_log_task_assignment_change
  AFTER INSERT OR DELETE ON public.task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_assignment_change();

DROP TRIGGER IF EXISTS trg_ensure_legacy_task_assignee ON public.tasks;
CREATE TRIGGER trg_ensure_legacy_task_assignee
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_legacy_task_assignee();

DROP TRIGGER IF EXISTS trg_validate_task_tag_project_scope ON public.task_tags;
CREATE TRIGGER trg_validate_task_tag_project_scope
  BEFORE INSERT OR UPDATE ON public.task_tags
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_tag_project_scope();

INSERT INTO public.task_assignees (task_id, user_id, assigned_by, assigned_at, created_at)
SELECT
  t.id,
  t.assigned_to,
  COALESCE(t.created_by, t.assigned_to),
  COALESCE(t.updated_at, t.created_at, now()),
  COALESCE(t.created_at, now())
FROM public.tasks t
WHERE t.assigned_to IS NOT NULL
  AND t.deleted_at IS NULL
  AND public.can_assign_user_to_project(t.project_id, t.assigned_to)
ON CONFLICT (task_id, user_id) DO NOTHING;

UPDATE public.tasks t
SET assigned_to = NULL,
    updated_at = now()
WHERE t.assigned_to IS NOT NULL
  AND t.deleted_at IS NULL
  AND NOT public.can_assign_user_to_project(t.project_id, t.assigned_to);

DROP POLICY IF EXISTS task_assignees_select_member_or_admin ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_insert_member_or_admin ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_update_member_or_admin ON public.task_assignees;
DROP POLICY IF EXISTS task_assignees_delete_member_or_admin ON public.task_assignees;
DROP POLICY IF EXISTS project_tags_select_member_or_admin ON public.project_tags;
DROP POLICY IF EXISTS project_tags_insert_member_or_admin ON public.project_tags;
DROP POLICY IF EXISTS project_tags_update_member_or_admin ON public.project_tags;
DROP POLICY IF EXISTS task_tags_select_member_or_admin ON public.task_tags;
DROP POLICY IF EXISTS task_tags_insert_member_or_admin ON public.task_tags;
DROP POLICY IF EXISTS task_tags_delete_member_or_admin ON public.task_tags;
DROP POLICY IF EXISTS user_notifications_select_recipient_only ON public.user_notifications;
DROP POLICY IF EXISTS user_notifications_update_recipient_only ON public.user_notifications;

CREATE POLICY task_assignees_select_member_or_admin
  ON public.task_assignees FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_assignees_insert_member_or_admin
  ON public.task_assignees FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
    AND public.can_assign_user_to_project(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = task_id),
      user_id
    )
  );

CREATE POLICY task_assignees_update_member_or_admin
  ON public.task_assignees FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
    AND public.can_assign_user_to_project(
      (SELECT t.project_id FROM public.tasks t WHERE t.id = task_id),
      user_id
    )
  );

CREATE POLICY task_assignees_delete_member_or_admin
  ON public.task_assignees FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  );

CREATE POLICY project_tags_select_member_or_admin
  ON public.project_tags FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND archived_at IS NULL
    AND public.is_project_member(project_id)
  );

CREATE POLICY project_tags_insert_member_or_admin
  ON public.project_tags FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND archived_at IS NULL
    AND public.is_project_member(project_id)
    AND COALESCE(created_by, auth.uid()) = auth.uid()
  );

CREATE POLICY project_tags_update_member_or_admin
  ON public.project_tags FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_project_member(project_id)
  );

CREATE POLICY task_tags_select_member_or_admin
  ON public.task_tags FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  );

CREATE POLICY task_tags_insert_member_or_admin
  ON public.task_tags FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
    AND COALESCE(created_by, auth.uid()) = auth.uid()
  );

CREATE POLICY task_tags_delete_member_or_admin
  ON public.task_tags FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.can_access_task(task_id)
  );

CREATE POLICY user_notifications_select_recipient_only
  ON public.user_notifications FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND recipient_user_id = auth.uid()
    AND (
      task_id IS NULL
      OR public.can_access_task(task_id)
    )
  );

CREATE POLICY user_notifications_update_recipient_only
  ON public.user_notifications FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND recipient_user_id = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND recipient_user_id = auth.uid()
  );

COMMIT;
