import {
  CreateButton,
  DateField,
  DeleteButton,
  EditButton,
  List,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { Avatar, Space, Table, Tooltip, Typography } from "antd";

import type { ProjectMemberRecord, ProjectRecord } from "./types";

const getMemberDisplayName = (member: ProjectMemberRecord) =>
  member?.profiles?.name || member?.profiles?.email || "User";

export const ProjectsList = () => {
  const { tableProps } = useTable<ProjectRecord>({
    resource: "projects",
    meta: {
      select:
        "*, project_members(id,user_id,profiles(id,name,email,avatar_url))",
    },
    sorters: {
      initial: [{ field: "created_at", order: "desc" }],
    },
  });

  return (
    <List
      headerButtons={() => <CreateButton resource="projects" />}
      title="Proyectos"
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column<ProjectRecord>
          dataIndex="name"
          key="name"
          title="Nombre"
          render={(value: string) => <Typography.Text strong>{value}</Typography.Text>}
        />
        <Table.Column<ProjectRecord>
          dataIndex="description"
          key="description"
          title="Descripcion"
          render={(value: string | null) => value || "Sin descripcion"}
        />
        <Table.Column<ProjectRecord>
          dataIndex="due_date"
          key="due_date"
          title="Fecha limite"
          render={(value: string | null) =>
            value ? <DateField format="YYYY-MM-DD" value={value} /> : "Sin fecha"
          }
        />
        <Table.Column<ProjectRecord>
          key="members"
          title="Miembros"
          render={(_, record) => (
            <Avatar.Group max={{ count: 4 }}>
              {(record.project_members ?? []).map((member) => (
                <Tooltip key={member.id} title={getMemberDisplayName(member)}>
                  <Avatar src={member.profiles?.avatar_url ?? undefined}>
                    {getMemberDisplayName(member).slice(0, 1).toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          )}
        />
        <Table.Column<ProjectRecord>
          key="actions"
          title="Acciones"
          render={(_, record) => (
            <Space>
              <ShowButton hideText recordItemId={record.id} />
              <EditButton hideText recordItemId={record.id} />
              <DeleteButton hideText recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
