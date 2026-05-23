import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { DateField } from "@refinedev/antd";
import { useGetIdentity, useList } from "@refinedev/core";
import {
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  List,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ReactNode } from "react";

import type { AuthUser } from "@/providers/auth";
import { getTaskAssigneeIds } from "@/pages/projects/task-relations";

import type { ProjectRecord, TaskRecord } from "../projects/types";

type TaskWithProject = TaskRecord & {
  projects?: {
    name: string | null;
  } | null;
};

const statusColorMap: Record<string, string> = {
  TODO: "default",
  IN_PROGRESS: "blue",
  IN_REVIEW: "gold",
  DONE: "green",
};

const MetricCard = ({
  title,
  value,
  loading,
  accent,
  icon,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
  accent: string;
  icon: ReactNode;
}) => {
  return (
    <Card className="metric-card">
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <Flex align="center" justify="space-between">
          <Typography.Text type="secondary">{title}</Typography.Text>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: accent,
              color: "#0f172a",
            }}
          >
            {icon}
          </div>
        </Flex>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Typography.Title level={2} style={{ margin: 0, fontSize: 34 }}>
            {value ?? 0}
          </Typography.Title>
        )}
      </Space>
    </Card>
  );
};

export const Home = () => {
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const screens = Grid.useBreakpoint();

  const commonCountPagination = {
    currentPage: 1,
    pageSize: 1,
  };

  const { result: projectsResult, query: projectsQuery } = useList<ProjectRecord>({
    resource: "projects",
    pagination: commonCountPagination,
  });

  const { result: todoResult, query: todoQuery } = useList<TaskRecord>({
    resource: "tasks",
    filters: [{ field: "status", operator: "eq", value: "TODO" }],
    pagination: commonCountPagination,
  });

  const { result: inProgressResult, query: inProgressQuery } = useList<TaskRecord>({
    resource: "tasks",
    filters: [{ field: "status", operator: "eq", value: "IN_PROGRESS" }],
    pagination: commonCountPagination,
  });

  const { result: inReviewResult, query: inReviewQuery } = useList<TaskRecord>({
    resource: "tasks",
    filters: [{ field: "status", operator: "eq", value: "IN_REVIEW" }],
    pagination: commonCountPagination,
  });

  const { result: doneResult, query: doneQuery } = useList<TaskRecord>({
    resource: "tasks",
    filters: [{ field: "status", operator: "eq", value: "DONE" }],
    pagination: commonCountPagination,
  });

  const { result: myTasksResult, query: myTasksQuery } = useList<TaskWithProject>({
    resource: "tasks",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: {
      mode: "off",
    },
    meta: {
      select:
        "id,title,status,due_date,assigned_to,project_id,created_at,task_assignees(id,user_id,profiles:profiles!task_assignees_user_id_fkey(id,name,email,avatar_url)),projects(name)",
    },
    queryOptions: {
      enabled: Boolean(currentUser?.id),
    },
  });

  const { result: recentProjectsResult, query: recentProjectsQuery } =
    useList<ProjectRecord>({
      resource: "projects",
      sorters: [{ field: "created_at", order: "desc" }],
      pagination: {
        currentPage: 1,
        pageSize: 5,
      },
    });

  const myTasks = (myTasksResult.data ?? [])
    .filter((task) => (currentUser?.id ? getTaskAssigneeIds(task).includes(currentUser.id) : false))
    .slice(0, 5);
  const recentProjects = recentProjectsResult.data ?? [];
  const dueSoonTasks = myTasks.filter((task) => task.due_date).length;

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-main section-heading-copy">
            <Typography.Title
              level={2}
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: screens.md ? 34 : 28,
              }}
            >
              {currentUser?.name ? `Hola, ${currentUser.name}` : "Centro de control"}
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(248,250,252,0.82)", maxWidth: 680 }}>
              Supervisa proyectos activos, prioridades del equipo y entregables
              cercanos desde una vista pensada para decisiones rapidas.
            </Typography.Text>
          </div>
          <div
            className="page-hero-aside"
            style={{
              padding: 18,
              borderRadius: 20,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
              Foco del dia
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: "8px 0", color: "#f8fafc" }}>
              {dueSoonTasks} tareas con fecha
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(248,250,252,0.82)" }}>
              Conviene revisar avance y bloqueos antes del siguiente standup.
            </Typography.Text>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col lg={12} md={24} xl={8} xs={24}>
          <MetricCard
            accent="linear-gradient(135deg, #d1fae5, #bfdbfe)"
            loading={projectsQuery.isLoading}
            icon={<FolderOpenOutlined />}
            title="Total proyectos activos"
            value={projectsResult.total}
          />
        </Col>
        <Col lg={6} md={12} xl={4} xs={12}>
          <MetricCard
            accent="#f5f5f5"
            loading={todoQuery.isLoading}
            icon={<ClockCircleOutlined />}
            title="TODO"
            value={todoResult.total}
          />
        </Col>
        <Col lg={6} md={12} xl={4} xs={12}>
          <MetricCard
            accent="#dbeafe"
            loading={inProgressQuery.isLoading}
            icon={<ArrowRightOutlined />}
            title="IN_PROGRESS"
            value={inProgressResult.total}
          />
        </Col>
        <Col lg={6} md={12} xl={4} xs={12}>
          <MetricCard
            accent="#fef3c7"
            loading={inReviewQuery.isLoading}
            icon={<ClockCircleOutlined />}
            title="IN_REVIEW"
            value={inReviewResult.total}
          />
        </Col>
        <Col lg={6} md={12} xl={4} xs={12}>
          <MetricCard
            accent="#dcfce7"
            loading={doneQuery.isLoading}
            icon={<CheckCircleOutlined />}
            title="DONE"
            value={doneResult.total}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col lg={14} xs={24}>
          <Card
            className="glass-card"
            title={
              <div className="section-heading-copy">
                <Typography.Text strong>Mis tareas</Typography.Text>
                <Typography.Text type="secondary">
                  Lo que necesita seguimiento personal hoy.
                </Typography.Text>
              </div>
            }
          >
            <div className="app-table-wrap">
              <Table<TaskWithProject>
                dataSource={myTasks}
                loading={myTasksQuery.isLoading}
                locale={{
                  emptyText: currentUser?.id
                    ? "No tienes tareas asignadas."
                    : "Inicia sesion para ver tus tareas.",
                }}
                pagination={false}
                rowKey="id"
                scroll={{ x: 640 }}
                size="small"
              >
                <Table.Column<TaskWithProject> dataIndex="title" title="Titulo" />
                <Table.Column<TaskWithProject>
                  responsive={["sm"]}
                  title="Proyecto"
                  render={(_, record) => record.projects?.name || "Sin proyecto"}
                />
                <Table.Column<TaskWithProject>
                  dataIndex="status"
                  title="Status"
                  render={(value: string) => (
                    <Tag color={statusColorMap[value] || "default"}>{value}</Tag>
                  )}
                />
                <Table.Column<TaskWithProject>
                  dataIndex="due_date"
                  responsive={["md"]}
                  title="Fecha limite"
                  render={(value: string | null) =>
                    value ? <DateField format="DD/MM/YYYY" value={value} /> : "Sin fecha"
                  }
                />
              </Table>
            </div>
          </Card>
        </Col>

        <Col lg={10} xs={24}>
          <Card
            className="glass-card"
            title={
              <div className="section-heading-copy">
                <Typography.Text strong>Proyectos recientes</Typography.Text>
                <Typography.Text type="secondary">
                  Nuevos frentes abiertos y contexto rapido.
                </Typography.Text>
              </div>
            }
          >
            {recentProjectsQuery.isLoading ? (
              <Spin />
            ) : recentProjects.length === 0 ? (
              <Empty
                description="Aun no hay proyectos creados."
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={recentProjects}
                renderItem={(project) => (
                  <List.Item key={project.id}>
                    <List.Item.Meta
                      description={
                        <Space direction="vertical" size={4}>
                          <Typography.Text strong style={{ fontSize: 16 }}>
                            {project.name}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {project.description || "Sin descripcion"}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            Creado:{" "}
                            <DateField
                              format="DD/MM/YYYY"
                              value={project.created_at}
                            />
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};
