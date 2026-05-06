import type { AuthProvider } from "@refinedev/core";

import { supabaseClient } from "./supabase";

export type AuthUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  job_title: string | null;
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
      .select("id, name, avatar_url, job_title, email")
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
    } satisfies AuthUser;
  },
  getPermissions: async () => null,
};
