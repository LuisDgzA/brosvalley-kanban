import { type CrudFilters, useGetIdentity, useList, usePermissions } from "@refinedev/core";

import type { AuthUser } from "@/providers/auth";
import type { AppPermissions, ProjectMemberRole } from "@/providers/auth";
import type { ProjectMemberRecord } from "@/pages/projects/types";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export const useProjectAccess = () => {
  const { data, isLoading } = usePermissions({});
  const permissions = data as AppPermissions | null | undefined;
  const { data: currentUser, isLoading: identityLoading } = useGetIdentity<AuthUser>();

  const { result: membershipsResult, query: membershipsQuery } = useList<ProjectMemberRecord>({
    resource: "project_members",
    filters: currentUser?.id
      ? [{ field: "user_id", operator: "eq", value: currentUser.id }]
      : [],
    pagination: {
      mode: "off",
    },
    meta: {
      select: "project_id,role",
    },
    queryOptions: {
      enabled: Boolean(currentUser?.id),
      refetchInterval: 15000,
      refetchOnWindowFocus: true,
    },
  });

  const globalRole = currentUser?.global_role ?? permissions?.globalRole ?? "member";
  const isAdmin = globalRole === "admin";
  const membershipRows = membershipsResult.data ?? [];
  const projectIds =
    membershipRows.length > 0
      ? [...new Set(membershipRows.map((membership) => membership.project_id))]
      : (permissions?.projectIds ?? []);
  const projectRoles =
    membershipRows.length > 0
      ? (Object.fromEntries(
          membershipRows.map((membership) => [
            membership.project_id,
            membership.role === "owner" ? "owner" : "collaborator",
          ]),
        ) as Record<string, ProjectMemberRole>)
      : (permissions?.projectRoles ?? {});

  const buildProjectAccessFilters = (field: string): CrudFilters => {
    if (isAdmin) {
      return [];
    }

    if (projectIds.length === 0) {
      return [{ field, operator: "eq", value: EMPTY_UUID }];
    }

    return [{ field, operator: "in", value: projectIds }];
  };

  const canAccessProject = (projectId?: string | null) => {
    if (!projectId) {
      return false;
    }

    return isAdmin || projectIds.includes(projectId);
  };

  const getProjectRole = (projectId?: string | null): ProjectMemberRole | null => {
    if (!projectId) {
      return null;
    }

    if (isAdmin) {
      return "owner";
    }

    return projectRoles[projectId] ?? null;
  };

  const canManageProject = (projectId?: string | null) => {
    const role = getProjectRole(projectId);
    return role === "owner";
  };

  const canDeleteProject = (projectId?: string | null) => {
    if (!projectId) {
      return false;
    }

    return isAdmin || canManageProject(projectId);
  };

  return {
    permissions,
    isLoading: isLoading || identityLoading || membershipsQuery.isLoading,
    globalRole,
    isAdmin,
    projectIds,
    projectRoles,
    buildProjectAccessFilters,
    canAccessProject,
    canManageProject,
    canDeleteProject,
  };
};
