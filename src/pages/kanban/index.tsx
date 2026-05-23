import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarOutlined,
  FolderOpenOutlined,
  HolderOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { DateField, useForm } from "@refinedev/antd";
import {
  type CrudFilters,
  type HttpError,
  useCreate,
  useGetIdentity,
  useInvalidate,
  useList,
  useOne,
  useUpdate,
} from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ColorPicker,
  DatePicker,
  Divider,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Tabs,
  Timeline,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import type { AuthUser } from "@/providers/auth";
import { supabaseClient } from "@/providers/supabase";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import {
  getTaskAssigneeIds as getSharedTaskAssigneeIds,
  getTaskAssigneeNames as getSharedTaskAssigneeNames,
  getTaskTagItems,
  syncTaskTags,
} from "@/pages/projects/task-relations";
import type { ProjectMemberRecord, ProjectTagRecord } from "@/pages/projects/types";

const KANBAN_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const;

type KanbanStatus = (typeof KANBAN_STATUSES)[number];

const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type Priority = (typeof PRIORITY_LEVELS)[number];

const priorityColorMap: Record<Priority, string> = {
  LOW: "default",
  MEDIUM: "blue",
  HIGH: "orange",
  CRITICAL: "red",
};

const priorityLabelMap: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Critica",
};

type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: KanbanStatus;
  priority: Priority | null;
  project_id: string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
  assigned_profile?: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  task_assignees?: {
    id: string;
    user_id: string;
    profiles?: {
      id: string;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
  }[];
  task_tags?: {
    id: string;
    project_tags?: {
      id: string;
      label: string;
      color: string;
    } | null;
  }[];
  projects?: {
    name: string | null;
  } | null;
};

type ProfileOption = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type ProjectOption = {
  id: string;
  name: string;
};

type ProjectMemberOption = ProjectMemberRecord & {
  profiles?: ProfileOption | null;
};

type ProjectTagOption = ProjectTagRecord;

type TaskCreateValues = {
  title: string;
  description?: string;
  assignee_ids?: string[];
  tag_ids?: string[];
  project_id?: string;
  due_date?: Dayjs | null;
  priority?: Priority;
};

type TaskEditValues = {
  title: string;
  description?: string;
  assignee_ids?: string[];
  tag_ids?: string[];
  project_id?: string;
  due_date?: Dayjs | null;
  status: KanbanStatus;
  priority: Priority;
};

type NormalizedTaskEditValues = {
  title: string;
  description: string;
  assignee_ids: string[];
  tag_ids: string[];
  project_id: string;
  due_date: string;
  status: KanbanStatus;
  priority: Priority;
};

const statusColorMap: Record<KanbanStatus, string> = {
  TODO: "default",
  IN_PROGRESS: "blue",
  IN_REVIEW: "gold",
  DONE: "green",
};

const statusLabelMap: Record<KanbanStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

type TaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

type TaskActivityRecord = {
  id: string;
  task_id: string;
  actor_id: string;
  event_type: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

const activityLabel = (
  event_type: string,
  old_value: string | null,
  new_value: string | null,
): string => {
  switch (event_type) {
    case "task_created":
      return "Tarea creada";
    case "task_status_changed":
      return `Status: ${old_value ?? "—"} → ${new_value ?? "—"}`;
    case "task_assignee_changed":
      return `Responsable: ${old_value || "ninguno"} → ${new_value || "ninguno"}`;
    case "task_assignee_added":
      return `Responsable agregado: ${new_value || "sin usuario"}`;
    case "task_assignee_removed":
      return `Responsable removido: ${old_value || "sin usuario"}`;
    case "task_priority_changed":
      return `Prioridad: ${old_value ?? "—"} → ${new_value ?? "—"}`;
    case "task_due_date_changed":
      return `Fecha: ${old_value || "sin fecha"} → ${new_value || "sin fecha"}`;
    case "task_project_changed":
      return `Proyecto: ${old_value || "sin proyecto"} → ${new_value || "sin proyecto"}`;
    case "task_comment_added":
      return "Comentario agregado";
    default:
      return event_type;
  }
};

const buildProjectScopedFilters = (
  baseFilters: CrudFilters,
  projectId?: string,
): CrudFilters => {
  if (!projectId) {
    return baseFilters;
  }

  return [
    ...baseFilters,
    { field: "project_id", operator: "eq", value: projectId },
  ];
};

const mapMemberOptions = (members: ProjectMemberOption[]) =>
  members.map((member) => ({
    label:
      member.profiles?.name ||
      member.profiles?.email ||
    member.user_id,
    value: member.user_id,
  }));

const getTaskAssignees = (task: KanbanTask) => {
  if ((task.task_assignees?.length ?? 0) > 0) {
    return task.task_assignees ?? [];
  }

  if (task.assigned_to || task.assigned_profile) {
    return [
      {
        id: `legacy-${task.id}`,
        user_id: task.assigned_to ?? task.assigned_profile?.id ?? "",
        profiles: task.assigned_profile ?? null,
      },
    ];
  }

  return [];
};

const getTaskAssigneeIds = (task: KanbanTask) =>
  getSharedTaskAssigneeIds(task);

const getTaskAssigneeNames = (task: KanbanTask) =>
  getSharedTaskAssigneeNames(task);

const TaskDrawer = ({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) => {
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const initialValuesRef = useRef<NormalizedTaskEditValues | null>(null);
  const screens = Grid.useBreakpoint();

  const { data: currentUser } = useGetIdentity<AuthUser>();
  const invalidate = useInvalidate();
  const { buildProjectAccessFilters, isLoading: permissionsLoading } = useProjectAccess();

  const { mutate: createComment } = useCreate<TaskComment>();

  const { result: commentsResult, query: commentsQuery } = useList<TaskComment>({
    resource: "task_comments",
    filters: taskId ? [{ field: "task_id", operator: "eq", value: taskId }] : [],
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "asc" }],
    meta: {
      select:
        "id,task_id,author_id,body,created_at,author:profiles!task_comments_author_id_fkey(id,name,email,avatar_url)",
    },
    queryOptions: { enabled: Boolean(taskId) },
  });

  const { result: activityResult, query: activityQuery } = useList<TaskActivityRecord>({
    resource: "task_activity",
    filters: taskId ? [{ field: "task_id", operator: "eq", value: taskId }] : [],
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: { enabled: Boolean(taskId) },
  });

  const { result: taskResult, query: taskQuery } = useOne<KanbanTask>({
    resource: "tasks",
    id: taskId ?? "",
    meta: {
      select:
        "id,title,description,status,priority,project_id,assigned_to,due_date,created_by,created_at,updated_at,assigned_profile:profiles!tasks_assigned_to_fkey(id,name,email,avatar_url),task_assignees(id,user_id,profiles:profiles!task_assignees_user_id_fkey(id,name,email,avatar_url)),task_tags(id,project_tags(id,label,color))",
    },
    queryOptions: {
      enabled: Boolean(taskId) && !permissionsLoading,
    },
  });

  const { formProps, form, formLoading } = useForm<
    KanbanTask,
    HttpError,
    any
  >({
    action: "edit",
    id: taskId ?? undefined,
    resource: "tasks",
    redirect: false,
  });

  const safeFormProps = {
    ...formProps,
    initialValues: undefined,
  };
  const watchedProjectId = Form.useWatch("project_id", form);

  const normalizeTaskEditValues = (
    values: Partial<TaskEditValues> | null | undefined,
  ): NormalizedTaskEditValues => ({
    title: values?.title?.trim() ?? "",
    description: values?.description?.trim() ?? "",
    assignee_ids: [...(values?.assignee_ids ?? [])].sort(),
    tag_ids: [...(values?.tag_ids ?? [])].sort(),
    project_id: values?.project_id ?? "",
    due_date: values?.due_date ? values.due_date.format("YYYY-MM-DD") : "",
    status: values?.status ?? "TODO",
    priority: values?.priority ?? "MEDIUM",
  });

  const requestClose = () => {
    const currentValues = normalizeTaskEditValues(
      form.getFieldsValue(true) as Partial<TaskEditValues>,
    );

    if (
      !initialValuesRef.current ||
      JSON.stringify(currentValues) === JSON.stringify(initialValuesRef.current)
    ) {
      onClose();
      return;
    }

    setIsDiscardModalOpen(true);
  };

  const handleDiscardChanges = () => {
    setIsDiscardModalOpen(false);
    form.resetFields();
    onClose();
  };

  const { result: projectMembersResult, query: projectMembersQuery } = useList<ProjectMemberOption>({
    resource: "project_members",
    filters: buildProjectScopedFilters([], watchedProjectId),
    pagination: {
      mode: "off",
    },
    meta: {
      select:
        "id,project_id,user_id,role,profiles:profiles!project_members_user_id_fkey(id,name,email,avatar_url)",
    },
    queryOptions: {
      enabled: Boolean(taskId && watchedProjectId) && !permissionsLoading,
    },
  });

  const { result: projectsResult, query: projectsQuery } = useList<ProjectOption>({
    resource: "projects",
    filters: buildProjectAccessFilters("id"),
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: {
      enabled: Boolean(taskId) && !permissionsLoading,
    },
  });

  const { result: projectTagsResult, query: projectTagsQuery } = useList<ProjectTagOption>({
    resource: "project_tags",
    filters: buildProjectScopedFilters([], watchedProjectId),
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "label", order: "asc" }],
    queryOptions: {
      enabled: Boolean(taskId && watchedProjectId) && !permissionsLoading,
    },
  });

  const profileOptions = mapMemberOptions(projectMembersResult.data ?? []);
  const tagOptions = (projectTagsResult.data ?? []).map((tag) => ({
    label: tag.label,
    value: tag.id,
  }));

  const projectOptions = (projectsResult.data ?? []).map((project) => ({
    label: project.name,
    value: project.id,
  }));

  useEffect(() => {
    if (!taskResult || formLoading) {
      return;
    }

    const initialValues: TaskEditValues = {
      title: taskResult.title,
      description: taskResult.description ?? undefined,
      assignee_ids: getTaskAssigneeIds(taskResult),
      tag_ids: getTaskTagItems(taskResult).map((tag) => tag.id),
      project_id: taskResult.project_id,
      due_date: taskResult.due_date ? dayjs(taskResult.due_date) : null,
      status: taskResult.status,
      priority: (taskResult.priority as Priority) ?? "MEDIUM",
    };

    initialValuesRef.current = normalizeTaskEditValues(initialValues);
    form.setFieldsValue(initialValues);
  }, [form, formLoading, taskResult]);

  useEffect(() => {
    if (!taskId) {
      initialValuesRef.current = null;
      setIsDiscardModalOpen(false);
    }
  }, [taskId]);

  useEffect(() => {
    const selectedAssignees = (form.getFieldValue("assignee_ids") as string[] | undefined) ?? [];
    if (selectedAssignees.length === 0) {
      return;
    }

    const allowedAssignees = new Set(profileOptions.map((option) => option.value));
    const filteredAssignees = selectedAssignees.filter((assigneeId) =>
      allowedAssignees.has(assigneeId),
    );

    if (filteredAssignees.length !== selectedAssignees.length) {
      form.setFieldValue("assignee_ids", filteredAssignees);
    }
  }, [form, profileOptions]);

  useEffect(() => {
    const selectedTags = (form.getFieldValue("tag_ids") as string[] | undefined) ?? [];
    if (selectedTags.length === 0) {
      return;
    }

    const allowedTags = new Set((projectTagsResult.data ?? []).map((tag) => tag.id));
    const filteredTags = selectedTags.filter((tagId) => allowedTags.has(tagId));

    if (filteredTags.length !== selectedTags.length) {
      form.setFieldValue("tag_ids", filteredTags);
    }
  }, [form, projectTagsResult.data]);

  const handleSubmit = async (values: TaskEditValues) => {
    const normalizedAssigneeIds = [...new Set(values.assignee_ids ?? [])];
    const normalizedTagIds = [...new Set(values.tag_ids ?? [])];
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() || null,
      assigned_to: normalizedAssigneeIds[0] ?? null,
      project_id: values.project_id || null,
      due_date: values.due_date?.format("YYYY-MM-DD") ?? null,
      status: values.status,
      priority: values.priority ?? "MEDIUM",
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabaseClient
        .from("tasks")
        .update(payload)
        .eq("id", taskId ?? "");

      if (error) {
        throw error;
      }

      const { error: assigneesError } = await supabaseClient.rpc("set_task_assignees", {
        target_task_id: taskId,
        next_user_ids: normalizedAssigneeIds,
      });

      if (assigneesError) {
        throw assigneesError;
      }

      await syncTaskTags(taskId ?? "", normalizedTagIds, currentUser?.id);

      await Promise.all([
        invalidate({ resource: "tasks", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_assignees", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_activity", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_tags", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "user_notifications", invalidates: ["list", "many", "detail"] }),
      ]);

      message.success("Tarea actualizada correctamente.");
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo actualizar la tarea.";
      message.error(errorMessage);
    }
  };

  return (
    <>
      <Drawer
        destroyOnHidden
        extra={
          <Space wrap>
            <Button onClick={requestClose}>Cancelar</Button>
            <Button
              loading={formLoading}
              type="primary"
              onClick={() => form.submit()}
            >
              Guardar
            </Button>
          </Space>
        }
        onClose={requestClose}
        open={Boolean(taskId)}
        styles={{
          body: {
            padding: screens.sm ? 24 : 16,
          },
        }}
        title="Detalle de tarea"
        width={screens.md ? 420 : "100%"}
      >
        <Spin spinning={taskQuery.isLoading}>
          <Form<TaskEditValues>
            {...safeFormProps}
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              label="Titulo"
              name="title"
              rules={[{ required: true, message: "Ingresa el titulo" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Descripcion" name="description">
              <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item label="Responsables" name="assignee_ids">
              <Select
                disabled={!watchedProjectId}
                loading={projectMembersQuery.isLoading}
                mode="multiple"
                options={profileOptions}
                placeholder={
                  watchedProjectId
                    ? "Selecciona uno o varios miembros del proyecto"
                    : "Selecciona primero el proyecto"
                }
              />
            </Form.Item>

            <Form.Item label="Tags" name="tag_ids">
              <Select
                disabled={!watchedProjectId}
                loading={projectTagsQuery.isLoading}
                mode="multiple"
                options={tagOptions}
                placeholder={
                  watchedProjectId
                    ? "Selecciona tags del proyecto"
                    : "Selecciona primero el proyecto"
                }
              />
            </Form.Item>

            <Form.Item
              label="Proyecto"
              name="project_id"
              rules={[{ required: true, message: "Selecciona un proyecto" }]}
            >
              <Select
                loading={projectsQuery.isLoading}
                options={projectOptions}
                placeholder="Selecciona un proyecto"
              />
            </Form.Item>

            <Form.Item label="Fecha limite" name="due_date">
              <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Selecciona un status" }]}
            >
              <Select
                options={KANBAN_STATUSES.map((status) => ({
                  label: statusLabelMap[status],
                  value: status,
                }))}
              />
            </Form.Item>

            <Form.Item
              label="Prioridad"
              name="priority"
              rules={[{ required: true, message: "Selecciona una prioridad" }]}
            >
              <Select
                options={PRIORITY_LEVELS.map((p) => ({
                  label: priorityLabelMap[p],
                  value: p,
                }))}
              />
            </Form.Item>
          </Form>

          <Divider style={{ margin: "20px 0 12px" }} />

          <Tabs
            size="small"
            items={[
              {
                key: "comments",
                label: "Comentarios",
                children: (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <Space.Compact style={{ width: "100%" }}>
                      <Input.TextArea
                        autoSize={{ minRows: 2, maxRows: 4 }}
                        placeholder="Agrega un comentario..."
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        style={{ resize: "none" }}
                      />
                    </Space.Compact>
                    <Button
                      disabled={!commentBody.trim()}
                      loading={submittingComment}
                      size="small"
                      type="primary"
                      onClick={() => {
                        if (!commentBody.trim() || !taskId || !currentUser?.id) return;
                        setSubmittingComment(true);
                        createComment(
                          {
                            resource: "task_comments",
                            values: {
                              task_id: taskId,
                              author_id: currentUser.id,
                              body: commentBody.trim(),
                            },
                          },
                          {
                            onSuccess: () => {
                              setCommentBody("");
                              setSubmittingComment(false);
                            },
                            onError: () => setSubmittingComment(false),
                          },
                        );
                      }}
                    >
                      Comentar
                    </Button>

                    {commentsQuery.isLoading ? (
                      <Spin size="small" />
                    ) : (commentsResult.data ?? []).length === 0 ? (
                      <Empty
                        description="Sin comentarios aun."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        {(commentsResult.data ?? []).map((c) => {
                          const author =
                            (c as any).author?.name ||
                            (c as any).author?.email ||
                            "Usuario";
                          return (
                            <Space key={c.id} align="start" size={10}>
                              <Avatar size={28} src={(c as any).author?.avatar_url ?? undefined}>
                                {author.slice(0, 1).toUpperCase()}
                              </Avatar>
                              <Space direction="vertical" size={2}>
                                <Space size={8}>
                                  <Typography.Text strong style={{ fontSize: 13 }}>
                                    {author}
                                  </Typography.Text>
                                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                    {dayjs(c.created_at).format("DD/MM/YYYY HH:mm")}
                                  </Typography.Text>
                                </Space>
                                <Typography.Text style={{ fontSize: 13 }}>
                                  {c.body}
                                </Typography.Text>
                              </Space>
                            </Space>
                          );
                        })}
                      </Space>
                    )}
                  </Space>
                ),
              },
              {
                key: "activity",
                label: "Actividad",
                children: activityQuery.isLoading ? (
                  <Spin size="small" />
                ) : (activityResult.data ?? []).length === 0 ? (
                  <Empty
                    description="Sin actividad registrada."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Timeline
                    items={(activityResult.data ?? []).map((a) => ({
                      children: (
                        <Space direction="vertical" size={1}>
                          <Typography.Text style={{ fontSize: 13 }}>
                            {activityLabel(a.event_type, a.old_value, a.new_value)}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(a.created_at).format("DD/MM/YYYY HH:mm")}
                          </Typography.Text>
                        </Space>
                      ),
                    }))}
                  />
                ),
              },
            ]}
          />
        </Spin>
      </Drawer>

      <Modal
        cancelText="Seguir editando"
        centered
        okButtonProps={{ danger: true }}
        okText="Descartar"
        onCancel={() => setIsDiscardModalOpen(false)}
        onOk={handleDiscardChanges}
        open={isDiscardModalOpen}
        title="Descartar cambios"
        width={screens.sm ? 420 : "calc(100vw - 24px)"}
        zIndex={1400}
      >
        Tienes cambios sin guardar. Si cierras ahora, se perderan.
      </Modal>
    </>
  );
};

const KanbanCard = ({
  task,
  onOpen,
}: {
  task: KanbanTask;
  onOpen: (taskId: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      status: task.status,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.18 : 1,
    cursor: "grab",
    borderRadius: 12,
    boxShadow: isDragging
      ? "0 18px 40px rgba(15, 23, 42, 0.18)"
      : "0 6px 18px rgba(15, 23, 42, 0.06)",
  };

  const assigneeNames = getTaskAssigneeNames(task);
  const assigneeCount = assigneeNames.length;
  const assigneeLabel =
    assigneeCount === 0
      ? "Sin responsables"
      : assigneeCount === 1
        ? assigneeNames[0]
        : `${assigneeNames.slice(0, 2).join(", ")}${assigneeCount > 2 ? ` +${assigneeCount - 2}` : ""}`;
  const assignees = getTaskAssignees(task);

  return (
    <Card
      ref={setNodeRef}
      size="small"
      style={style}
      hoverable
      onClick={() => onOpen(task.id)}
      styles={{
        body: {
          padding: 14,
        },
      }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space
          align="start"
          size={[8, 8]}
          style={{ justifyContent: "space-between", width: "100%" }}
          wrap
        >
          <Typography.Text strong style={{ display: "block" }}>
            {task.title}
          </Typography.Text>
          <Space size={8} wrap>
            {task.priority && (
              <Tag color={priorityColorMap[task.priority as Priority]}>
                {priorityLabelMap[task.priority as Priority]}
              </Tag>
            )}
            <Tag color={statusColorMap[task.status]}>{statusLabelMap[task.status]}</Tag>
            <Button
              {...attributes}
              {...listeners}
              icon={<HolderOutlined />}
              size="small"
              type="text"
              onClick={(event) => event.stopPropagation()}
              style={{ cursor: "grab" }}
            />
          </Space>
        </Space>

        <Typography.Text type="secondary">
          {task.projects?.name || "Sin proyecto"}
        </Typography.Text>

        {getTaskTagItems(task).length > 0 && (
          <Space size={[6, 6]} wrap>
            {getTaskTagItems(task).map((tag) => (
              <Tag key={tag.id} color={tag.color}>
                {tag.label}
              </Tag>
            ))}
          </Space>
        )}

        <Space
          size={[10, 10]}
          style={{ justifyContent: "space-between", width: "100%" }}
          wrap
        >
          <Space size={10}>
            {assigneeCount === 0 ? (
              <Avatar>S</Avatar>
            ) : (
              <Avatar.Group max={{ count: 2 }}>
                {assignees.map((assignee) => {
                  const label =
                    assignee.profiles?.name ||
                    assignee.profiles?.email ||
                    assignee.user_id;

                  return (
                    <Avatar
                      key={assignee.id}
                      src={assignee.profiles?.avatar_url ?? undefined}
                    >
                      {label.slice(0, 1).toUpperCase()}
                    </Avatar>
                  );
                })}
              </Avatar.Group>
            )}
            <Typography.Text type="secondary">{assigneeLabel}</Typography.Text>
          </Space>

          {task.due_date ? (
            <DateField format="YYYY-MM-DD" value={task.due_date} />
          ) : (
            <Typography.Text type="secondary">Sin fecha</Typography.Text>
          )}
        </Space>
      </Space>
    </Card>
  );
};

const KanbanCardPreview = ({ task }: { task: KanbanTask }) => {
  const assigneeNames = getTaskAssigneeNames(task);
  const assigneeCount = assigneeNames.length;
  const assigneeLabel =
    assigneeCount === 0
      ? "Sin responsables"
      : assigneeCount === 1
        ? assigneeNames[0]
        : `${assigneeNames.slice(0, 2).join(", ")}${assigneeCount > 2 ? ` +${assigneeCount - 2}` : ""}`;
  const assignees = getTaskAssignees(task);

  return (
    <Card
      size="small"
      style={{
        width: 320,
        borderRadius: 12,
        boxShadow: "0 24px 56px rgba(15, 23, 42, 0.24)",
      }}
      styles={{
        body: {
          padding: 14,
        },
      }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space
          align="start"
          size={[8, 8]}
          style={{ justifyContent: "space-between", width: "100%" }}
          wrap
        >
          <Typography.Text strong style={{ display: "block" }}>
            {task.title}
          </Typography.Text>
          <Space size={8} wrap>
            {task.priority && (
              <Tag color={priorityColorMap[task.priority as Priority]}>
                {priorityLabelMap[task.priority as Priority]}
              </Tag>
            )}
            <Tag color={statusColorMap[task.status]}>{statusLabelMap[task.status]}</Tag>
          </Space>
        </Space>

        <Typography.Text type="secondary">
          {task.projects?.name || "Sin proyecto"}
        </Typography.Text>

        {getTaskTagItems(task).length > 0 && (
          <Space size={[6, 6]} wrap>
            {getTaskTagItems(task).map((tag) => (
              <Tag key={tag.id} color={tag.color}>
                {tag.label}
              </Tag>
            ))}
          </Space>
        )}

        <Space
          size={[10, 10]}
          style={{ justifyContent: "space-between", width: "100%" }}
          wrap
        >
          <Space size={10}>
            {assigneeCount === 0 ? (
              <Avatar>S</Avatar>
            ) : (
              <Avatar.Group max={{ count: 2 }}>
                {assignees.map((assignee) => {
                  const label =
                    assignee.profiles?.name ||
                    assignee.profiles?.email ||
                    assignee.user_id;

                  return (
                    <Avatar
                      key={assignee.id}
                      src={assignee.profiles?.avatar_url ?? undefined}
                    >
                      {label.slice(0, 1).toUpperCase()}
                    </Avatar>
                  );
                })}
              </Avatar.Group>
            )}
            <Typography.Text type="secondary">{assigneeLabel}</Typography.Text>
          </Space>

          {task.due_date ? (
            <DateField format="YYYY-MM-DD" value={task.due_date} />
          ) : (
            <Typography.Text type="secondary">Sin fecha</Typography.Text>
          )}
        </Space>
      </Space>
    </Card>
  );
};

const KanbanColumn = ({
  status,
  tasks,
  onAdd,
  onOpenTask,
}: {
  status: KanbanStatus;
  tasks: KanbanTask[];
  onAdd: (status: KanbanStatus) => void;
  onOpenTask: (taskId: string) => void;
}) => {
  const screens = Grid.useBreakpoint();
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "column",
      status,
    },
  });

  return (
    <Card
      className="kanban-column-card"
      ref={setNodeRef}
      size="small"
      style={{
        minHeight: screens.md ? 520 : 420,
        background: isOver
          ? "linear-gradient(180deg, #eef6ff 0%, #f8fbff 100%)"
          : "#fafafa",
        borderColor: isOver ? "#69b1ff" : undefined,
        boxShadow: isOver ? "0 0 0 2px rgba(22, 119, 255, 0.14)" : "none",
        transition: "all 180ms ease",
        borderRadius: 16,
      }}
      title={
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Space>
            <Typography.Text strong>{statusLabelMap[status]}</Typography.Text>
            <Badge
              count={tasks.length}
              style={{ backgroundColor: isOver ? "#1677ff" : "#d9d9d9" }}
            />
          </Space>
          <Button
            icon={<PlusOutlined />}
            size="small"
            type="text"
            onClick={() => onAdd(status)}
          />
        </Space>
      }
    >
      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          {tasks.length === 0 ? (
            <Empty
              description="Sin tareas"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            tasks.map((task) => (
              <KanbanCard key={task.id} onOpen={onOpenTask} task={task} />
            ))
          )}
        </Space>
      </SortableContext>
    </Card>
  );
};

export const Kanban = () => {
  const sensors = useSensors(useSensor(PointerSensor));
  const screens = Grid.useBreakpoint();
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const invalidate = useInvalidate();
  const {
    buildProjectAccessFilters,
    canAccessProject,
    isLoading: permissionsLoading,
  } = useProjectAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<KanbanStatus>("TODO");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    searchParams.get("projectId") ?? undefined,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    searchParams.get("taskId"),
  );
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<
    "vencidas" | "sin-asignar" | "esta-semana" | "por-revisar" | null
  >(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [taskForm] = Form.useForm<TaskCreateValues>();
  const watchedCreateProjectId = Form.useWatch("project_id", taskForm);

  const { mutate: updateTask, mutation: updateMutation } = useUpdate<
    KanbanTask,
    HttpError,
    Partial<KanbanTask>
  >();

  const { result: tasksResult, query: tasksQuery } = useList<KanbanTask>({
    resource: "tasks",
    filters: buildProjectScopedFilters(
      buildProjectAccessFilters("project_id"),
      selectedProjectId,
    ),
    pagination: {
      mode: "off",
    },
    liveMode: "auto",
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select:
        "id,title,description,status,priority,project_id,assigned_to,due_date,created_by,created_at,updated_at,assigned_profile:profiles!tasks_assigned_to_fkey(id,name,email,avatar_url),task_assignees(id,user_id,profiles:profiles!task_assignees_user_id_fkey(id,name,email,avatar_url)),task_tags(id,project_tags(id,label,color)),projects(name)",
    },
    queryOptions: {
      enabled: !permissionsLoading,
    },
  });

  const { result: projectMembersResult, query: projectMembersQuery } =
    useList<ProjectMemberOption>({
      resource: "project_members",
      filters: buildProjectScopedFilters([], watchedCreateProjectId),
      pagination: {
        mode: "off",
      },
      meta: {
        select:
          "id,project_id,user_id,role,profiles:profiles!project_members_user_id_fkey(id,name,email,avatar_url)",
      },
      queryOptions: {
        enabled: Boolean(watchedCreateProjectId) && !permissionsLoading,
      },
    });

  const { result: projectsResult, query: projectsQuery } = useList<ProjectOption>({
    resource: "projects",
    filters: buildProjectAccessFilters("id"),
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "name", order: "asc" }],
    queryOptions: {
      enabled: !permissionsLoading,
    },
  });

  const { result: boardProjectTagsResult, query: boardProjectTagsQuery } = useList<ProjectTagOption>({
    resource: "project_tags",
    filters: buildProjectScopedFilters([], watchedCreateProjectId || selectedProjectId),
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "label", order: "asc" }],
    queryOptions: {
      enabled: Boolean((watchedCreateProjectId || selectedProjectId) && !permissionsLoading),
    },
  });

  const tasks = tasksResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const boardTagOptions = (boardProjectTagsResult.data ?? []).map((tag) => ({
    label: tag.label,
    value: tag.id,
  }));

  const quickFilterCounts = useMemo(() => {
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");
    return {
      vencidas: tasks.filter(
        (t) => t.due_date && dayjs(t.due_date).isBefore(today) && t.status !== "DONE",
      ).length,
      "sin-asignar": tasks.filter((t) => getTaskAssigneeIds(t).length === 0).length,
      "esta-semana": tasks.filter((t) => {
        if (!t.due_date || t.status === "DONE") return false;
        const d = dayjs(t.due_date);
        return (d.isSame(today) || d.isAfter(today)) && d.isBefore(weekEnd);
      }).length,
      "por-revisar": tasks.filter((t) => t.status === "IN_REVIEW").length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let nextTasks = tasks;

    if (selectedTagIds.length > 0) {
      nextTasks = nextTasks.filter((task) => {
        const taskTagIds = new Set(getTaskTagItems(task).map((tag) => tag.id));
        return selectedTagIds.every((tagId) => taskTagIds.has(tagId));
      });
    }

    if (!activeQuickFilter) return nextTasks;
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");
    switch (activeQuickFilter) {
      case "vencidas":
        return nextTasks.filter(
          (t) => t.due_date && dayjs(t.due_date).isBefore(today) && t.status !== "DONE",
        );
      case "sin-asignar":
        return nextTasks.filter((t) => getTaskAssigneeIds(t).length === 0);
      case "esta-semana":
        return nextTasks.filter((t) => {
          if (!t.due_date || t.status === "DONE") return false;
          const d = dayjs(t.due_date);
          return (d.isSame(today) || d.isAfter(today)) && d.isBefore(weekEnd);
        });
      case "por-revisar":
        return nextTasks.filter((t) => t.status === "IN_REVIEW");
      default:
        return nextTasks;
    }
  }, [tasks, activeQuickFilter, selectedTagIds]);

  const tasksByStatus = useMemo(() => {
    return KANBAN_STATUSES.reduce(
      (acc, status) => {
        acc[status] = filteredTasks.filter((task) => task.status === status);
        return acc;
      },
      {} as Record<KanbanStatus, KanbanTask[]>,
    );
  }, [filteredTasks]);

  const profileOptions = mapMemberOptions(projectMembersResult.data ?? []);

  const projectOptions = projects.map((project) => ({
    label: project.name,
    value: project.id,
  }));

  const selectedProjectName =
    projects.find((project) => project.id === selectedProjectId)?.name ?? null;
  const unassignedTasks = tasks.filter((task) => getTaskAssigneeIds(task).length === 0).length;
  const dueTasks = tasks.filter((task) => task.due_date).length;

  useEffect(() => {
    const nextProjectId = searchParams.get("projectId") ?? undefined;
    const nextTaskId = searchParams.get("taskId");

    setSelectedProjectId((current) =>
      current === nextProjectId ? current : nextProjectId,
    );
    setSelectedTaskId((current) => (current === nextTaskId ? current : nextTaskId));
  }, [searchParams]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    if (projects.length > 0 && !canAccessProject(selectedProjectId)) {
      setSelectedProjectId(undefined);
      setSelectedTaskId(null);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("projectId");
        next.delete("taskId");
        return next;
      });
    }
  }, [canAccessProject, projects.length, selectedProjectId, setSearchParams]);

  useEffect(() => {
    const selectedAssignees = (taskForm.getFieldValue("assignee_ids") as string[] | undefined) ?? [];
    if (selectedAssignees.length === 0) {
      return;
    }

    const allowedAssignees = new Set(profileOptions.map((option) => option.value));
    const filteredAssignees = selectedAssignees.filter((assigneeId) =>
      allowedAssignees.has(assigneeId),
    );

    if (filteredAssignees.length !== selectedAssignees.length) {
      taskForm.setFieldValue("assignee_ids", filteredAssignees);
    }
  }, [profileOptions, taskForm]);

  useEffect(() => {
    const selectedTags = (taskForm.getFieldValue("tag_ids") as string[] | undefined) ?? [];
    if (selectedTags.length === 0) {
      return;
    }

    const allowedTags = new Set((boardProjectTagsResult.data ?? []).map((tag) => tag.id));
    const filteredTags = selectedTags.filter((tagId) => allowedTags.has(tagId));

    if (filteredTags.length !== selectedTags.length) {
      taskForm.setFieldValue("tag_ids", filteredTags);
    }
  }, [boardProjectTagsResult.data, taskForm]);

  const openCreateModal = (status: KanbanStatus) => {
    setSelectedStatus(status);
    taskForm.resetFields();
    taskForm.setFieldsValue({
      project_id: selectedProjectId,
    });
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    taskForm.resetFields();
  };

  const openTaskDrawer = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("taskId", taskId);
      if (selectedProjectId) {
        next.set("projectId", selectedProjectId);
      }
      return next;
    });
  };

  const closeTaskDrawer = () => {
    setSelectedTaskId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("taskId");
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeData = event.active.data.current as
      | { type?: string; task?: KanbanTask }
      | undefined;

    setActiveTask(activeData?.task ?? null);
  };

  const resolveDropStatus = (event: DragEndEvent): KanbanStatus | null => {
    const overData = event.over?.data.current as
      | { type?: string; status?: KanbanStatus; task?: KanbanTask }
      | undefined;

    if (!overData) {
      return null;
    }

    if (overData.type === "column" && overData.status) {
      return overData.status;
    }

    if (overData.type === "task" && overData.task) {
      return overData.task.status;
    }

    return null;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as
      | { type?: string; task?: KanbanTask }
      | undefined;

    if (!event.over || !activeData?.task) {
      setActiveTask(null);
      return;
    }

    const nextStatus = resolveDropStatus(event);

    if (!nextStatus || nextStatus === activeData.task.status) {
      setActiveTask(null);
      return;
    }

    if (!canAccessProject(activeData.task.project_id)) {
      setActiveTask(null);
      message.error("Solo puedes mover tareas de proyectos donde participas.");
      return;
    }

    updateTask(
      {
        resource: "tasks",
        id: activeData.task.id,
        values: {
          status: nextStatus,
          updated_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setActiveTask(null);
          message.success(`Tarea movida a ${statusLabelMap[nextStatus]}.`);
        },
        onError: (error) => {
          setActiveTask(null);
          message.error(
            error.message || "No se pudo mover la tarea en ese proyecto.",
          );
        },
      },
    );
  };

  const handleCreateTask = async () => {
    try {
      const values = await taskForm.validateFields();
      const assigneeIds = [...new Set(values.assignee_ids ?? [])];
      const tagIds = [...new Set(values.tag_ids ?? [])];

      if (!canAccessProject(values.project_id)) {
        message.error("Solo puedes crear tareas en proyectos donde participas.");
        return;
      }

      const { data, error } = await supabaseClient
        .from("tasks")
        .insert({
          title: values.title.trim(),
          description: values.description?.trim() || null,
          status: selectedStatus,
          priority: values.priority ?? "MEDIUM",
          project_id: values.project_id as string,
          assigned_to: assigneeIds[0] ?? null,
          due_date: values.due_date?.format("YYYY-MM-DD") ?? null,
          created_by: currentUser?.id ?? null,
        })
        .select("id")
        .single();

      if (error || !data?.id) {
        throw error ?? new Error("No se pudo crear la tarea.");
      }

      const { error: assigneesError } = await supabaseClient.rpc("set_task_assignees", {
        target_task_id: data.id,
        next_user_ids: assigneeIds,
      });

      if (assigneesError) {
        throw assigneesError;
      }

      await syncTaskTags(data.id, tagIds, currentUser?.id);

      await Promise.all([
        invalidate({ resource: "tasks", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_assignees", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_tags", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "user_notifications", invalidates: ["list", "many", "detail"] }),
      ]);

      message.success("Tarea creada correctamente.");
      closeCreateModal();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo crear la tarea.";
      message.error(errorMessage);
    }
  };

  return (
    <>
      <div className="page-stack">
        <div className="page-hero">
          <div className="page-hero-content">
            <div className="page-hero-main section-heading-copy">
              <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
                Flujo operativo
              </Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {selectedProjectName ? `Kanban / ${selectedProjectName}` : "Kanban"}
              </Typography.Title>
              <Typography.Text style={{ color: "rgba(248,250,252,0.82)", maxWidth: 720 }}>
                {selectedProjectName
                  ? `Tablero filtrado para ${selectedProjectName}. Mueve tareas entre columnas y crea nuevas tarjetas por status.`
                  : "Mueve tareas entre columnas, asigna responsables y detecta cuellos de botella rapidamente."}
              </Typography.Text>
            </div>

            <div
              style={{
                flex: "1 1 320px",
                display: "flex",
                justifyContent: screens.md ? "flex-end" : "flex-start",
              }}
            >
              <Space size={12} wrap>
                <Card
                  size="small"
                  style={{
                    minWidth: 160,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.12)",
                    borderColor: "rgba(255,255,255,0.14)",
                  }}
                >
                  <Space direction="vertical" size={4}>
                    <FolderOpenOutlined style={{ color: "#f8fafc" }} />
                    <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
                      Tareas totales
                    </Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                      {tasks.length}
                    </Typography.Title>
                  </Space>
                </Card>
                <Card
                  size="small"
                  style={{
                    minWidth: 160,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.12)",
                    borderColor: "rgba(255,255,255,0.14)",
                  }}
                >
                  <Space direction="vertical" size={4}>
                    <TeamOutlined style={{ color: "#f8fafc" }} />
                    <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
                      Sin asignar
                    </Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                      {unassignedTasks}
                    </Typography.Title>
                  </Space>
                </Card>
                <Card
                  size="small"
                  style={{
                    minWidth: 160,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.12)",
                    borderColor: "rgba(255,255,255,0.14)",
                  }}
                >
                  <Space direction="vertical" size={4}>
                    <CalendarOutlined style={{ color: "#f8fafc" }} />
                    <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
                      Con fecha
                    </Typography.Text>
                    <Typography.Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                      {dueTasks}
                    </Typography.Title>
                  </Space>
                </Card>
              </Space>
            </div>
          </div>
        </div>

        <Card className="glass-card" size="small">
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Space wrap size={[12, 8]} align="center">
              <div>
                <Typography.Text strong>Proyecto</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  <Select
                    allowClear
                    options={projectOptions}
                    placeholder="Todos los proyectos"
                    style={{ minWidth: 220, width: "100%" }}
                    value={selectedProjectId}
                    onChange={(value) => {
                      setSelectedProjectId(value);
                      setSearchParams((current) => {
                        const next = new URLSearchParams(current);
                        if (value) {
                          next.set("projectId", value);
                        } else {
                          next.delete("projectId");
                          next.delete("taskId");
                        }
                        return next;
                      });
                    }}
                  />
                </div>
              </div>
              <div>
                <Typography.Text strong>Filtros rapidos</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  <Space wrap size={[8, 8]}>
                    {(
                      [
                        { key: "vencidas", label: "Vencidas" },
                        { key: "sin-asignar", label: "Sin asignar" },
                        { key: "esta-semana", label: "Esta semana" },
                        { key: "por-revisar", label: "Por revisar" },
                      ] as const
                    ).map(({ key, label }) => {
                      const count = quickFilterCounts[key];
                      const isActive = activeQuickFilter === key;
                      return (
                        <Tag.CheckableTag
                          key={key}
                          checked={isActive}
                          onChange={(checked) =>
                            setActiveQuickFilter(checked ? key : null)
                          }
                          style={{
                            borderRadius: 20,
                            padding: "2px 10px",
                            cursor: "pointer",
                            border: "1px solid",
                            borderColor: isActive ? "#1677ff" : "#d9d9d9",
                          }}
                        >
                          {label}
                          {count > 0 && (
                            <span
                              style={{
                                marginLeft: 6,
                                background: isActive ? "#fff" : "#1677ff",
                                color: isActive ? "#1677ff" : "#fff",
                                borderRadius: 10,
                                padding: "0 6px",
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </Tag.CheckableTag>
                      );
                    })}
                  </Space>
                </div>
              </div>
              <div>
                <Typography.Text strong>Tags</Typography.Text>
                <div style={{ marginTop: 4 }}>
                  <Select
                    allowClear
                    disabled={!selectedProjectId}
                    loading={boardProjectTagsQuery.isLoading}
                    mode="multiple"
                    options={boardTagOptions}
                    placeholder={
                      selectedProjectId
                        ? "Filtrar por tags"
                        : "Selecciona un proyecto para usar tags"
                    }
                    style={{ minWidth: 260, width: "100%" }}
                    value={selectedTagIds}
                    onChange={(value) => setSelectedTagIds(value ?? [])}
                  />
                </div>
              </div>
            </Space>
          </Space>
        </Card>

        {tasksQuery.isLoading || permissionsLoading ? (
          <Spin />
        ) : (
          <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <div className="kanban-board-scroll">
              <div className="kanban-board">
                {KANBAN_STATUSES.map((status) => (
                  <div key={status} className="kanban-board-column">
                    <KanbanColumn
                      onAdd={openCreateModal}
                      onOpenTask={openTaskDrawer}
                      status={status}
                      tasks={tasksByStatus[status]}
                    />
                  </div>
                ))}
              </div>
            </div>
            <DragOverlay>
              {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Modal
        okText="Crear tarea"
        onCancel={closeCreateModal}
        onOk={handleCreateTask}
        open={isModalOpen}
        title={`Nueva tarea en ${statusLabelMap[selectedStatus]}`}
        width={screens.sm ? 560 : "calc(100vw - 24px)"}
      >
        <Form<TaskCreateValues> form={taskForm} layout="vertical">
          <Form.Item
            label="Titulo"
            name="title"
            rules={[{ required: true, message: "Ingresa el titulo de la tarea" }]}
          >
            <Input placeholder="Preparar propuesta comercial" />
          </Form.Item>

          <Form.Item label="Descripcion" name="description">
            <Input.TextArea placeholder="Detalles o contexto de la tarea" rows={4} />
          </Form.Item>

          <Form.Item
            label="Proyecto"
            name="project_id"
            rules={[{ required: true, message: "Selecciona un proyecto" }]}
          >
            <Select
              loading={projectsQuery.isLoading}
              options={projectOptions}
              placeholder="Selecciona un proyecto"
            />
          </Form.Item>

          <Form.Item label="Responsables" name="assignee_ids">
            <Select
              disabled={!watchedCreateProjectId}
              loading={projectMembersQuery.isLoading}
              mode="multiple"
              options={profileOptions}
              placeholder={
                watchedCreateProjectId
                  ? "Selecciona uno o varios miembros del proyecto"
                  : "Selecciona primero el proyecto"
              }
            />
          </Form.Item>

          <Form.Item label="Tags" name="tag_ids">
            <Select
              disabled={!watchedCreateProjectId}
              loading={boardProjectTagsQuery.isLoading}
              mode="multiple"
              options={boardTagOptions}
              placeholder={
                watchedCreateProjectId
                  ? "Selecciona tags del proyecto"
                  : "Selecciona primero el proyecto"
              }
            />
          </Form.Item>

          <Form.Item label="Fecha limite" name="due_date">
            <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Prioridad"
            name="priority"
            initialValue="MEDIUM"
          >
            <Select
              options={PRIORITY_LEVELS.map((p) => ({
                label: priorityLabelMap[p],
                value: p,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <TaskDrawer onClose={closeTaskDrawer} taskId={selectedTaskId} />
    </>
  );
};
