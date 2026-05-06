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
import { PlusOutlined } from "@ant-design/icons";
import { DateField } from "@refinedev/antd";
import {
  type HttpError,
  useCreate,
  useGetIdentity,
  useList,
  useUpdate,
} from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useMemo, useState } from "react";

import type { AuthUser } from "@/providers/auth";

const KANBAN_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
] as const;

type KanbanStatus = (typeof KANBAN_STATUSES)[number];

type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: KanbanStatus;
  project_id: string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
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

type TaskCreateValues = {
  title: string;
  description?: string;
  assigned_to?: string;
  project_id?: string;
  due_date?: Dayjs | null;
};

type TaskMutationValues = {
  title: string;
  description: string | null;
  status: KanbanStatus;
  project_id: string;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string | null;
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

const KanbanCard = ({ task }: { task: KanbanTask }) => {
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

  const assigneeLabel =
    task.assigned_profile?.name || task.assigned_profile?.email || "Unassigned";

  return (
    <Card
      {...attributes}
      {...listeners}
      ref={setNodeRef}
      size="small"
      style={style}
      hoverable
      styles={{
        body: {
          padding: 14,
        },
      }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Text strong>{task.title}</Typography.Text>
          <Tag color={statusColorMap[task.status]}>{statusLabelMap[task.status]}</Tag>
        </Space>

        <Typography.Text type="secondary">
          {task.projects?.name || "Sin proyecto"}
        </Typography.Text>

        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Space>
            <Avatar src={task.assigned_profile?.avatar_url ?? undefined}>
              {assigneeLabel.slice(0, 1).toUpperCase()}
            </Avatar>
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
  const assigneeLabel =
    task.assigned_profile?.name || task.assigned_profile?.email || "Unassigned";

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
        <Space align="start" style={{ justifyContent: "space-between", width: "100%" }}>
          <Typography.Text strong>{task.title}</Typography.Text>
          <Tag color={statusColorMap[task.status]}>{statusLabelMap[task.status]}</Tag>
        </Space>

        <Typography.Text type="secondary">
          {task.projects?.name || "Sin proyecto"}
        </Typography.Text>

        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Space>
            <Avatar src={task.assigned_profile?.avatar_url ?? undefined}>
              {assigneeLabel.slice(0, 1).toUpperCase()}
            </Avatar>
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
}: {
  status: KanbanStatus;
  tasks: KanbanTask[];
  onAdd: (status: KanbanStatus) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
      type: "column",
      status,
    },
  });

  return (
    <Card
      ref={setNodeRef}
      size="small"
      style={{
        minHeight: 520,
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
            tasks.map((task) => <KanbanCard key={task.id} task={task} />)
          )}
        </Space>
      </SortableContext>
    </Card>
  );
};

export const Kanban = () => {
  const sensors = useSensors(useSensor(PointerSensor));
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<KanbanStatus>("TODO");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [taskForm] = Form.useForm<TaskCreateValues>();

  const { mutate: updateTask, mutation: updateMutation } = useUpdate<
    KanbanTask,
    HttpError,
    Partial<KanbanTask>
  >();

  const { mutate: createTask, mutation: createMutation } = useCreate<
    KanbanTask,
    HttpError,
    TaskMutationValues
  >();

  const { result: tasksResult, query: tasksQuery } = useList<KanbanTask>({
    resource: "tasks",
    filters: selectedProjectId
      ? [{ field: "project_id", operator: "eq", value: selectedProjectId }]
      : [],
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select:
        "id,title,description,status,project_id,assigned_to,due_date,created_by,created_at,updated_at,assigned_profile:profiles!tasks_assigned_to_fkey(id,name,email,avatar_url),projects(name)",
    },
  });

  const { result: profilesResult, query: profilesQuery } = useList<ProfileOption>({
    resource: "profiles",
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { result: projectsResult, query: projectsQuery } = useList<ProjectOption>({
    resource: "projects",
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "name", order: "asc" }],
  });

  const tasks = tasksResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const projects = projectsResult.data ?? [];

  const tasksByStatus = useMemo(() => {
    return KANBAN_STATUSES.reduce(
      (acc, status) => {
        acc[status] = tasks.filter((task) => task.status === status);
        return acc;
      },
      {} as Record<KanbanStatus, KanbanTask[]>,
    );
  }, [tasks]);

  const profileOptions = profiles.map((profile) => ({
    label: profile.name || profile.email || profile.id,
    value: profile.id,
  }));

  const projectOptions = projects.map((project) => ({
    label: project.name,
    value: project.id,
  }));

  const selectedProjectName =
    projects.find((project) => project.id === selectedProjectId)?.name ?? null;

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
          message.error(error.message || "No se pudo mover la tarea.");
        },
      },
    );
  };

  const handleCreateTask = async () => {
    try {
      const values = await taskForm.validateFields();

      createTask(
        {
          resource: "tasks",
          values: {
            title: values.title.trim(),
            description: values.description?.trim() || null,
            status: selectedStatus,
            project_id: values.project_id as string,
            assigned_to: values.assigned_to || null,
            due_date: values.due_date?.format("YYYY-MM-DD") ?? null,
            created_by: currentUser?.id ?? null,
          },
        },
        {
          onSuccess: () => {
            message.success("Tarea creada correctamente.");
            closeCreateModal();
          },
          onError: (error) => {
            message.error(error.message || "No se pudo crear la tarea.");
          },
        },
      );
    } catch {
      return;
    }
  };

  return (
    <>
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 8 }}>
            {selectedProjectName ? `Kanban / ${selectedProjectName}` : "Kanban"}
          </Typography.Title>
          <Typography.Text type="secondary">
            {selectedProjectName
              ? `Tablero filtrado para ${selectedProjectName}. Mueve tareas entre columnas y crea nuevas tarjetas por status.`
              : "Mueve tareas entre columnas y crea nuevas tarjetas por status."}
          </Typography.Text>
        </div>

        <Card size="small">
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong>Proyecto del tablero</Typography.Text>
            <Select
              allowClear
              options={projectOptions}
              placeholder="Todos los proyectos"
              style={{ maxWidth: 320, width: "100%" }}
              value={selectedProjectId}
              onChange={(value) => setSelectedProjectId(value)}
            />
            <Typography.Text type="secondary">
              Filtra el Kanban para ver un proyecto especifico o deja el selector vacio para ver todas las tareas.
            </Typography.Text>
          </Space>
        </Card>

        {tasksQuery.isLoading ? (
          <Spin />
        ) : (
          <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            sensors={sensors}
          >
            <Row gutter={[16, 16]}>
              {KANBAN_STATUSES.map((status) => (
                <Col key={status} lg={6} md={12} xs={24}>
                  <KanbanColumn
                    onAdd={openCreateModal}
                    status={status}
                    tasks={tasksByStatus[status]}
                  />
                </Col>
              ))}
            </Row>
            <DragOverlay>
              {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </Space>

      <Modal
        confirmLoading={createMutation.isPending}
        okText="Crear tarea"
        onCancel={closeCreateModal}
        onOk={handleCreateTask}
        open={isModalOpen}
        title={`Nueva tarea en ${statusLabelMap[selectedStatus]}`}
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

          <Form.Item label="Asignado a" name="assigned_to">
            <Select
              allowClear
              loading={profilesQuery.isLoading}
              options={profileOptions}
              placeholder="Selecciona a un colaborador"
            />
          </Form.Item>

          <Form.Item label="Fecha limite" name="due_date">
            <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
