BEGIN;

CREATE OR REPLACE FUNCTION public.log_task_activity_from_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  activity_actor_id UUID;
BEGIN
  activity_actor_id := COALESCE(
    auth.uid(),
    NEW.created_by,
    NEW.assigned_to,
    OLD.created_by,
    OLD.assigned_to
  );

  IF TG_OP = 'INSERT' THEN
    IF activity_actor_id IS NOT NULL THEN
      INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value, metadata)
      VALUES (
        NEW.id,
        activity_actor_id,
        'task_created',
        NULL,
        NULL,
        jsonb_build_object('project_id', NEW.project_id, 'status', NEW.status)
      );
    END IF;

    RETURN NEW;
  END IF;

  IF activity_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (NEW.id, activity_actor_id, 'task_status_changed', OLD.status, NEW.status);
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      activity_actor_id,
      'task_assignee_changed',
      OLD.assigned_to::TEXT,
      NEW.assigned_to::TEXT
    );
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (NEW.id, activity_actor_id, 'task_priority_changed', OLD.priority, NEW.priority);
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      activity_actor_id,
      'task_due_date_changed',
      OLD.due_date::TEXT,
      NEW.due_date::TEXT
    );
  END IF;

  IF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    INSERT INTO public.task_activity (task_id, actor_id, event_type, old_value, new_value)
    VALUES (
      NEW.id,
      activity_actor_id,
      'task_project_changed',
      OLD.project_id::TEXT,
      NEW.project_id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS task_activity_insert_member_or_admin ON public.task_activity;

CREATE POLICY task_activity_insert_member_or_admin
  ON public.task_activity FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.task_activity.deleted_at IS NULL
    AND public.task_activity.actor_id = auth.uid()
    AND public.can_access_task(task_id)
  );

COMMIT;
