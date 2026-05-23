import { supabaseClient } from "@/providers/supabase";

import type { ProfileRecord, TaskRecord } from "./types";

export const getTaskAssigneeProfiles = (task: TaskRecord) => {
  if ((task.task_assignees?.length ?? 0) > 0) {
    return (task.task_assignees ?? [])
      .map((assignee) => assignee.profiles ?? null)
      .filter(Boolean) as ProfileRecord[];
  }

  if (task.assigned_to) {
    return [{ id: task.assigned_to, name: null, email: null, avatar_url: null }];
  }

  return [];
};

export const getTaskAssigneeIds = (task: TaskRecord) => {
  const ids = (task.task_assignees ?? []).map((assignee) => assignee.user_id).filter(Boolean);

  if (ids.length > 0) {
    return [...new Set(ids)];
  }

  return task.assigned_to ? [task.assigned_to] : [];
};

export const getTaskAssigneeNames = (task: TaskRecord) => {
  const names = getTaskAssigneeProfiles(task)
    .map((profile) => profile.name || profile.email || profile.id)
    .filter(Boolean);

  if (names.length > 0) {
    return names;
  }

  return task.assigned_to ? [task.assigned_to] : [];
};

export const getTaskTagItems = (task: TaskRecord) =>
  (task.task_tags ?? [])
    .map((item) => item.project_tags)
    .filter(Boolean) as { id: string; label: string; color: string }[];

export const syncTaskTags = async (
  taskId: string,
  nextTagIds: string[],
  actorId?: string,
) => {
  const sanitizedTagIds = [...new Set(nextTagIds.filter(Boolean))];

  const { data: existing, error: existingError } = await supabaseClient
    .from("task_tags")
    .select("id, project_tag_id")
    .eq("task_id", taskId);

  if (existingError) {
    throw existingError;
  }

  const existingRows = existing ?? [];
  const existingIds = new Set(existingRows.map((row) => row.project_tag_id));
  const nextIds = new Set(sanitizedTagIds);

  const toInsert = sanitizedTagIds.filter((tagId) => !existingIds.has(tagId));
  const toDelete = existingRows
    .filter((row) => !nextIds.has(row.project_tag_id))
    .map((row) => row.id);

  if (toInsert.length > 0) {
    const { error } = await supabaseClient.from("task_tags").insert(
      toInsert.map((tagId) => ({
        task_id: taskId,
        project_tag_id: tagId,
        created_by: actorId ?? null,
      })),
    );

    if (error) {
      throw error;
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabaseClient
      .from("task_tags")
      .delete()
      .in("id", toDelete);

    if (error) {
      throw error;
    }
  }
};
