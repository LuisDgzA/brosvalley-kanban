import type { AuthProvider } from "@refinedev/core";

import { supabaseClient } from "./supabase";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  job_title: string | null;
  global_role: GlobalRole;
};

export type GlobalRole = "admin" | "member";
export type ProjectMemberRole = "owner" | "collaborator";

export type AppPermissions = {
  globalRole: GlobalRole;
  projectIds: string[];
  projectRoles: Record<string, ProjectMemberRole>;
};

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: error.name,
        },
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  register: async ({ email, password, ...rest }) => {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: rest,
      },
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: error.name,
        },
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  forgotPassword: async ({ email }) => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/update-password`
        : undefined;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: error.name,
        },
      };
    }

    return {
      success: true,
    };
  },
  updatePassword: async ({ password }) => {
    const { error } = await supabaseClient.auth.updateUser({ password });

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: error.name,
        },
      };
    }

    return {
      success: true,
      redirectTo: "/",
    };
  },
  logout: async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: error.name,
        },
      };
    }

    return {
      success: true,
      redirectTo: "/login",
    };
  },
  check: async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (session) {
      return {
        authenticated: true,
      };
    }

    return {
      authenticated: false,
      logout: true,
      redirectTo: "/login",
    };
  },
  onError: async (error) => {
    if (error?.status === 401 || error?.statusCode === 401) {
      return {
        logout: true,
      };
    }

    return { error };
  },
  getIdentity: async () => {
    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("id, name, avatar_url, job_title, email, global_role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: profile?.email ?? user.email ?? null,
      name:
        profile?.name ??
        user.user_metadata?.name ??
        profile?.email ??
        user.email ??
        null,
      avatar_url: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      job_title: profile?.job_title ?? null,
      global_role: (profile?.global_role as GlobalRole | undefined) ?? "member",
    } satisfies AuthUser;
  },
  getPermissions: async () => {
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("global_role")
      .eq("id", user.id)
      .maybeSingle();

    const globalRole =
      !profileError && (profile?.global_role === "admin" || profile?.global_role === "member")
        ? (profile.global_role as GlobalRole)
        : "member";

    const { data: memberships, error: membershipsError } = await supabaseClient
      .from("project_members")
      .select("project_id, role")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    if (membershipsError) {
      return {
        globalRole,
        projectIds: [],
        projectRoles: {},
      } satisfies AppPermissions;
    }

    const projectIds: string[] = [];
    const projectRoles: Record<string, ProjectMemberRole> = {};

    for (const membership of memberships ?? []) {
      if (!membership.project_id) {
        continue;
      }

      projectIds.push(membership.project_id);
      projectRoles[membership.project_id] =
        membership.role === "owner" ? "owner" : "collaborator";
    }

    return {
      globalRole,
      projectIds,
      projectRoles,
    } satisfies AppPermissions;
  },
};
