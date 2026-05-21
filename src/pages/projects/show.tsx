import { DateField, EditButton, ListButton, Show } from "@refinedev/antd";
import { useList, useOne } from "@refinedev/core";
import {
  Avatar,
  Badge,
  Card,
  Col,
  Descriptions,
  Empty,
  Grid,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useParams } from "react-router";

import { useProjectAccess } from "@/hooks/useProjectAccess";

import type { ProjectMemberRecord, ProjectRecord, TaskRecord } from "./types";

const statusColorMap: Record<string, string> = {
  TODO: "default",
  IN_PROGRESS: "blue",
  IN_REVIEW: "gold",
  DONE: "green",
};

export const ProjectsShow = () => {
  const { id } = useParams();
  const screens = Grid.useBreakpoint();
  const { canManageProject } = useProjectAccess();

  const { result: project, query: projectQuery } = useOne<ProjectRecord>({
    resource: "projects",
    id: id ?? "",
    queryOptions: {
      enabled: !!id,
    },
  });

  const { result: membersResult, query: membersQuery } =
    useList<ProjectMemberRecord>({
      resource: "project_members",
      filters: id ? [{ field: "project_id", operator: "eq", value: id }] : [],
      pagination: { mode: "off" },
      meta: {
        select: "id,project_id,user_id,role,profiles(id,name,email,avatar_url)",
      },
      queryOptions: {
        enabled: !!id,
      },
    });

  const { result: tasksResult, query: tasksQuery } = useList<TaskRecord>({
    resource: "tasks",
    filters: id ? [{ field: "project_id", operator: "eq", value: id }] : [],
    pagination: { mode: "off" },
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: {
      enabled: !!id,
    },
  });

  const projectLoading = projectQuery.isLoading;
  const members = membersResult.data ?? [];
  const membersLoading = membersQuery.isLoading;
  const tasks = tasksResult.data ?? [];
  const tasksLoading = tasksQuery.isLoading;
  const doneTasks = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <Show
      headerButtons={() => (
        <Space>
          <ListButton resource="projects" />
          {id && canManageProject(id) ? <EditButton recordItemId={id} /> : null}
        </Space>
      )}
      isLoading={projectLoading}
      title={project?.name || "Proyecto"}
    >
      <div className="page-stack">
        <div className="page-hero">
          <div className="page-hero-content">
            <div className="page-hero-main section-heading-copy">
              <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
                Ficha del proyecto
              </Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
                {project?.name || "Proyecto"}
              </Typography.Title>
              <Typography.Text style={{ color: "rgba(248,250,252,0.82)", maxWidth: 720 }}>
                {project?.description || "Este proyecto aun no tiene descripcion cargada."}
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
                Avance estimado
              </Typography.Text>
              <Typography.Title level={3} style={{ margin: "8px 0", color: "#f8fafc" }}>
                {progress}%
              </Typography.Title>
              <Typography.Text style={{ color: "rgba(248,250,252,0.82)" }}>
                {doneTasks} de {tasks.length} tareas completadas
              </Typography.Text>
            </div>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col lg={16} xs={24}>
            <Card className="glass-card" title="Resumen">
              <Descriptions column={1} size={screens.sm ? "default" : "small"}>
                <Descriptions.Item label="Nombre">
                  {project?.name || "Sin nombre"}
                </Descriptions.Item>
                <Descriptions.Item label="Descripcion">
                  {project?.description || "Sin descripcion"}
                </Descriptions.Item>
                <Descriptions.Item label="Fecha limite">
                  {project?.due_date ? (
                    <DateField format="YYYY-MM-DD" value={project.due_date} />
                  ) : (
                    "Sin fecha"
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col lg={8} xs={24}>
            <Card className="glass-card" loading={membersLoading} title="Miembros">
              {members.length === 0 ? (
                <Empty
                  description="No hay miembros asignados"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Space direction="vertical" size={12} style={{ width: "100%" }}>
                  {members.map((member) => {
                    const label =
                      member.profiles?.name || member.profiles?.email || member.user_id;

                    return (
                      <div
                        key={member.id}
                        className="member-row"
                        style={{
                          padding: 12,
                          borderRadius: 16,
                          background: "#f8fafc",
                        }}
                      >
                        <div className="member-row-main">
                          <Avatar src={member.profiles?.avatar_url ?? undefined}>
                            {label.slice(0, 1).toUpperCase()}
                          </Avatar>
                          <Typography.Text>{label}</Typography.Text>
                        </div>
                        <Badge
                          color={member.role === "owner" ? "#1677ff" : "#0f766e"}
                          text={member.role === "owner" ? "Owner" : "Activo"}
                        />
                      </div>
                    );
                  })}
                </Space>
              )}
            </Card>
          </Col>

          <Col span={24}>
            <Card className="glass-card" loading={tasksLoading} title="Tareas del proyecto">
              <div className="app-table-wrap">
                <Table<TaskRecord>
                  dataSource={tasks}
                  locale={{
                    emptyText: "Este proyecto todavia no tiene tareas.",
                  }}
                  pagination={false}
                  rowKey="id"
                  scroll={{ x: 560 }}
                >
                  <Table.Column<TaskRecord> dataIndex="title" title="Titulo" />
                  <Table.Column<TaskRecord>
                    dataIndex="status"
                    title="Status"
                    render={(value: string) => (
                      <Tag color={statusColorMap[value] || "default"}>{value}</Tag>
                    )}
                  />
                  <Table.Column<TaskRecord>
                    dataIndex="due_date"
                    responsive={["sm"]}
                    title="Fecha limite"
                    render={(value: string | null) =>
                      value ? <DateField format="YYYY-MM-DD" value={value} /> : "Sin fecha"
                    }
                  />
                </Table>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Show>
  );
};
