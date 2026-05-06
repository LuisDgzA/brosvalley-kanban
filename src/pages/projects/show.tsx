import { DateField, EditButton, ListButton, Show } from "@refinedev/antd";
import { useList, useOne } from "@refinedev/core";
import {
  Avatar,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useParams } from "react-router";

import type { ProjectMemberRecord, ProjectRecord, TaskRecord } from "./types";

const statusColorMap: Record<string, string> = {
  TODO: "default",
  IN_PROGRESS: "blue",
  IN_REVIEW: "gold",
  DONE: "green",
};

export const ProjectsShow = () => {
  const { id } = useParams();

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
        select: "id,project_id,user_id,profiles(id,name,email,avatar_url)",
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

  return (
    <Show
      headerButtons={() => (
        <Space>
          <ListButton resource="projects" />
          {id ? <EditButton recordItemId={id} /> : null}
        </Space>
      )}
      isLoading={projectLoading}
      title={project?.name || "Proyecto"}
    >
      <Row gutter={[16, 16]}>
        <Col lg={16} xs={24}>
          <Card title="Resumen">
            <Descriptions column={1} size="small">
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
          <Card loading={membersLoading} title="Miembros">
            {members.length === 0 ? (
              <Empty description="No hay miembros asignados" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {members.map((member) => {
                  const label =
                    member.profiles?.name || member.profiles?.email || member.user_id;

                  return (
                    <Space key={member.id}>
                      <Avatar src={member.profiles?.avatar_url ?? undefined}>
                        {label.slice(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography.Text>{label}</Typography.Text>
                    </Space>
                  );
                })}
              </Space>
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card loading={tasksLoading} title="Tareas del proyecto">
            <Table<TaskRecord>
              dataSource={tasks}
              locale={{
                emptyText: "Este proyecto todavia no tiene tareas.",
              }}
              pagination={false}
              rowKey="id"
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
                title="Fecha limite"
                render={(value: string | null) =>
                  value ? <DateField format="YYYY-MM-DD" value={value} /> : "Sin fecha"
                }
              />
            </Table>
          </Card>
        </Col>
      </Row>
    </Show>
  );
};
