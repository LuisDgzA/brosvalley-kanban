import { DateField } from "@refinedev/antd";
import { useGetIdentity, useList } from "@refinedev/core";
import {
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";

import type { AuthUser } from "@/providers/auth";

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
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
}) => {
  return (
    <Card>
      <Space direction="vertical" size={6}>
        <Typography.Text type="secondary">{title}</Typography.Text>
        {loading ? (
          <Spin size="small" />
        ) : (
          <Typography.Title level={2} style={{ margin: 0 }}>
            {value ?? 0}
          </Typography.Title>
        )}
      </Space>
    </Card>
  );
};

export const Home = () => {
  const { data: currentUser } = useGetIdentity<AuthUser>();

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
    filters: currentUser?.id
      ? [{ field: "assigned_to", operator: "eq", value: currentUser.id }]
      : [],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: {
      currentPage: 1,
      pageSize: 5,
    },
    meta: {
      select: "id,title,status,due_date,assigned_to,project_id,created_at,projects(name)",
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

  const myTasks = myTasksResult.data ?? [];
  const recentProjects = recentProjectsResult.data ?? [];

  return (
    <Space direction="vertical" size={24} style={{ width: "100%" }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 8 }}>
          Dashboard
        </Typography.Title>
        <Typography.Text type="secondary">
          Resumen rapido de proyectos y tareas del CRM.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col lg={8} md={12} xs={24}>
          <MetricCard
            loading={projectsQuery.isLoading}
            title="Total proyectos activos"
            value={projectsResult.total}
          />
        </Col>
        <Col lg={4} md={6} xs={12}>
          <MetricCard
            loading={todoQuery.isLoading}
            title="TODO"
            value={todoResult.total}
          />
        </Col>
        <Col lg={4} md={6} xs={12}>
          <MetricCard
            loading={inProgressQuery.isLoading}
            title="IN_PROGRESS"
            value={inProgressResult.total}
          />
        </Col>
        <Col lg={4} md={6} xs={12}>
          <MetricCard
            loading={inReviewQuery.isLoading}
            title="IN_REVIEW"
            value={inReviewResult.total}
          />
        </Col>
        <Col lg={4} md={6} xs={12}>
          <MetricCard
            loading={doneQuery.isLoading}
            title="DONE"
            value={doneResult.total}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col lg={14} xs={24}>
          <Card title="Mis tareas">
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
              size="small"
            >
              <Table.Column<TaskWithProject> dataIndex="title" title="Titulo" />
              <Table.Column<TaskWithProject>
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
                title="Fecha limite"
                render={(value: string | null) =>
                  value ? <DateField format="YYYY-MM-DD" value={value} /> : "Sin fecha"
                }
              />
            </Table>
          </Card>
        </Col>

        <Col lg={10} xs={24}>
          <Card title="Proyectos recientes">
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
                        <Space direction="vertical" size={2}>
                          <Typography.Text strong>{project.name}</Typography.Text>
                          <Typography.Text type="secondary">
                            {project.description || "Sin descripcion"}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            Creado:{" "}
                            <DateField
                              format="YYYY-MM-DD"
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
    </Space>
  );
};
