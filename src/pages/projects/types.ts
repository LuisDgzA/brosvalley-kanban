export type ProfileRecord = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

export type ProjectMemberRecord = {
  id: string;
  project_id: string;
  user_id: string;
  profiles?: ProfileRecord | null;
};

export type ProjectRecord = {
  id: string;
  name: string;
  description: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  project_members?: ProjectMemberRecord[];
};

export type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  assigned_to: string | null;
  project_id: string;
  created_at: string;
  completed_at: string | null;
};
