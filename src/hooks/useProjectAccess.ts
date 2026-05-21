import { type CrudFilters, usePermissions } from "@refinedev/core";

import type { AppPermissions, ProjectMemberRole } from "@/providers/auth";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export const useProjectAccess = () => {
  const { data, isLoading } = usePermissions({});
  const permissions = data as AppPermissions | null | undefined;

  const globalRole = permissions?.globalRole ?? "member";
  const isAdmin = globalRole === "admin";
  const projectIds = permissions?.projectIds ?? [];
  const projectRoles = permissions?.projectRoles ?? {};

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

  return {
    permissions,
    isLoading,
    globalRole,
    isAdmin,
    projectIds,
    projectRoles,
    buildProjectAccessFilters,
    canAccessProject,
    canManageProject,
    canDeleteProject: isAdmin,
  };
};
