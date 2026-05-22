import type { Dayjs } from "dayjs";

import { supabaseClient } from "@/providers/supabase";

import type { ProjectMemberRecord } from "./types";

export type ProjectFormValues = {
  name: string;
  description?: string;
  due_date?: Dayjs | null;
  member_ids?: string[];
};

export type ProjectMutationValues = {
  name: string;
  description: string | null;
  due_date: string | null;
  created_by?: string;
};

export const normalizeProjectPayload = (
  values: ProjectFormValues,
  createdBy?: string,
): ProjectMutationValues => {
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    due_date: values.due_date?.format("YYYY-MM-DD") ?? null,
    ...(createdBy ? { created_by: createdBy } : {}),
  };
};

export const syncProjectMembers = async (
  projectId: string,
  nextUserIds: string[],
  existingMembers: ProjectMemberRecord[] = [],
  actorId?: string,
) => {
  const sanitizedNextUserIds = [...new Set(nextUserIds.filter(Boolean))];
  const managedMembers = existingMembers.filter((member) => member.role !== "owner");
  const existingIds = new Set(existingMembers.map((member) => member.user_id));
  const nextIds = new Set(sanitizedNextUserIds);

  // New projects already create the author as owner via DB trigger.
  if (actorId && existingMembers.length === 0) {
    nextIds.delete(actorId);
  }

  const membersToCreate = [...nextIds].filter((userId) => !existingIds.has(userId));
  const membersToDelete = managedMembers
    .filter((member) => !nextIds.has(member.user_id))
    .map((member) => member.id);

  if (membersToCreate.length > 0) {
    const { error } = await supabaseClient.from("project_members").insert(
      membersToCreate.map((userId) => ({
        project_id: projectId,
        user_id: userId,
        role: "collaborator",
        added_by: actorId ?? null,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (membersToDelete.length > 0) {
    const { error } = await supabaseClient
      .from("project_members")
      .delete()
      .in("id", membersToDelete);

    if (error) {
      throw error;
    }
  }
};
