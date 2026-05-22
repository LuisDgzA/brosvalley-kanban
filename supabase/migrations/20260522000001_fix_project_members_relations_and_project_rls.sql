BEGIN;

DROP POLICY IF EXISTS projects_select_member_or_admin ON public.projects;

CREATE POLICY projects_select_member_or_admin
  ON public.projects FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      created_by = auth.uid()
      OR public.is_project_member(id)
    )
  );

DROP POLICY IF EXISTS project_members_insert_owner_or_admin ON public.project_members;

CREATE POLICY project_members_insert_owner_or_admin
  ON public.project_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      public.is_project_owner(project_id)
      OR (
        auth.uid() = user_id
        AND role = 'owner'
        AND COALESCE(added_by, auth.uid()) = auth.uid()
      )
    )
  );

COMMIT;
