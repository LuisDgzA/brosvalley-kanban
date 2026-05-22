import {
  CreateButton,
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Grid,
  Row,
  Space,
  Tooltip,
  Typography,
} from "antd";
import { Link } from "react-router";

import { useProjectAccess } from "@/hooks/useProjectAccess";

import type { ProjectMemberRecord, ProjectRecord } from "./types";

const getMemberDisplayName = (member: ProjectMemberRecord) =>
  member?.profiles?.name || member?.profiles?.email || "User";

export const ProjectsList = () => {
  const screens = Grid.useBreakpoint();
  const {
    buildProjectAccessFilters,
    canDeleteProject,
    canManageProject,
    isLoading: permissionsLoading,
  } = useProjectAccess();
  const { tableProps } = useTable<ProjectRecord>({
    resource: "projects",
    liveMode: "auto",
    filters: {
      permanent: buildProjectAccessFilters("id"),
    },
    meta: {
      select:
        "*, project_members(id,user_id,role,profiles:profiles!project_members_user_id_fkey(id,name,email,avatar_url))",
    },
    sorters: {
      initial: [{ field: "created_at", order: "desc" }],
    },
    queryOptions: {
      enabled: !permissionsLoading,
    },
  });

  return (
    <List
      headerButtons={() => <CreateButton resource="projects" />}
      title="Proyectos"
    >
      <div className="page-stack">
        <div className="page-hero">
          <div className="section-heading-copy">
            <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
              Portfolio actual
            </Typography.Text>
            <Typography.Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
              Gestiona proyectos con lectura ejecutiva
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(248,250,252,0.82)", maxWidth: 680 }}>
              Cada tarjeta resalta alcance, responsables y fecha objetivo para
              decidir prioridades sin perder detalle operativo.
            </Typography.Text>
          </div>
        </div>

        {tableProps.loading ? (
          <Card className="glass-card" loading />
        ) : (tableProps.dataSource?.length ?? 0) === 0 ? (
          <Card className="glass-card">
            <Empty description="Todavia no hay proyectos creados." />
          </Card>
        ) : (
          <Row gutter={[18, 18]}>
            {(tableProps.dataSource ?? []).map((record) => (
              <Col key={record.id} lg={8} md={12} xs={24}>
                <Card className="project-card">
                  <Space direction="vertical" size={18} style={{ width: "100%" }}>
                    <div className="section-heading">
                      <div className="section-heading-copy">
                        <Typography.Title level={4} style={{ margin: 0 }}>
                          {record.name}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                          {record.description || "Sin descripcion"}
                        </Typography.Text>
                      </div>
                    </div>

                    <div className="project-card-meta">
                      <div className="project-card-stat">
                        <Typography.Text type="secondary">Fecha limite</Typography.Text>
                        <div>
                          {record.due_date ? (
                            <DateField format="YYYY-MM-DD" value={record.due_date} />
                          ) : (
                            <Typography.Text strong>Sin fecha</Typography.Text>
                          )}
                        </div>
                      </div>
                      <div className="project-card-stat">
                        <Typography.Text type="secondary">Equipo</Typography.Text>
                        <Typography.Text strong>
                          {(record.project_members ?? []).length} miembros
                        </Typography.Text>
                      </div>
                    </div>

                    <Space direction="vertical" size={10} style={{ width: "100%" }}>
                      <Typography.Text type="secondary">Responsables</Typography.Text>
                      <Avatar.Group max={{ count: 4 }}>
                        {(record.project_members ?? []).map((member) => (
                          <Tooltip key={member.id} title={getMemberDisplayName(member)}>
                            <Avatar src={member.profiles?.avatar_url ?? undefined}>
                              {getMemberDisplayName(member).slice(0, 1).toUpperCase()}
                            </Avatar>
                          </Tooltip>
                        ))}
                      </Avatar.Group>
                    </Space>

                    <Space style={{ width: "100%" }} wrap>
                      <ShowButton hideText recordItemId={record.id} />
                      {canManageProject(record.id) ? (
                        <EditButton hideText recordItemId={record.id} />
                      ) : null}
                      {canDeleteProject ? (
                        <DeleteButton hideText recordItemId={record.id} />
                      ) : null}
                      <Button block={!screens.sm} type="default">
                        <Link to={`/kanban?projectId=${record.id}`}>Ver tablero</Link>
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </List>
  );
};
