import { DateField, EditButton, ListButton, Show } from "@refinedev/antd";
import { useInvalidate, useList, useOne } from "@refinedev/core";
import {
  Avatar,
  Badge,
  Button,
  Card,
  ColorPicker,
  Col,
  Descriptions,
  Empty,
  Form,
  Grid,
  Input,
  Modal,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { useParams } from "react-router";

import { useProjectAccess } from "@/hooks/useProjectAccess";
import { supabaseClient } from "@/providers/supabase";

import { DeleteProjectButton } from "./DeleteProjectButton";
import { getTaskAssigneeNames, getTaskTagItems } from "./task-relations";
import type { ProjectMemberRecord, ProjectRecord, ProjectTagRecord, TaskRecord } from "./types";

const statusColorMap: Record<string, string> = {
  TODO: "default",
  IN_PROGRESS: "blue",
  IN_REVIEW: "gold",
  DONE: "green",
};

export const ProjectsShow = () => {
  const { id } = useParams();
  const screens = Grid.useBreakpoint();
  const { canAccessProject, canDeleteProject, canManageProject } = useProjectAccess();
  const invalidate = useInvalidate();
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isSubmittingTag, setIsSubmittingTag] = useState(false);
  const [tagForm] = Form.useForm<{ label: string; color: string }>();
  const canManageTags = id ? canAccessProject(id) : false;

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
        select:
          "id,project_id,user_id,role,profiles:profiles!project_members_user_id_fkey(id,name,email,avatar_url)",
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
    meta: {
      select:
        "id,title,status,due_date,assigned_to,project_id,created_at,task_assignees(id,user_id,profiles:profiles!task_assignees_user_id_fkey(id,name,email,avatar_url)),task_tags(id,project_tags(id,label,color))",
    },
    queryOptions: {
      enabled: !!id,
    },
  });

  const { result: tagsResult, query: tagsQuery } = useList<ProjectTagRecord>({
    resource: "project_tags",
    filters: id ? [{ field: "project_id", operator: "eq", value: id }] : [],
    pagination: { mode: "off" },
    sorters: [{ field: "label", order: "asc" }],
    queryOptions: {
      enabled: !!id,
    },
  });

  const projectLoading = projectQuery.isLoading;
  const members = membersResult.data ?? [];
  const membersLoading = membersQuery.isLoading;
  const tasks = tasksResult.data ?? [];
  const tags = tagsResult.data ?? [];
  const tasksLoading = tasksQuery.isLoading;
  const tagsLoading = tagsQuery.isLoading;
  const doneTasks = tasks.filter((task) => task.status === "DONE").length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const handleCreateTag = async () => {
    if (!id) return;

    try {
      const values = await tagForm.validateFields();
      setIsSubmittingTag(true);

      const { error } = await supabaseClient.from("project_tags").insert({
        project_id: id,
        label: values.label.trim(),
        color: values.color,
      });

      if (error) {
        throw error;
      }

      await Promise.all([
        invalidate({ resource: "project_tags", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_tags", invalidates: ["list", "many", "detail"] }),
      ]);

      tagForm.resetFields();
      tagForm.setFieldValue("color", "#1677ff");
      setIsTagModalOpen(false);
    } finally {
      setIsSubmittingTag(false);
    }
  };

  const archiveTag = async (tagId: string) => {
    await supabaseClient
      .from("project_tags")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", tagId);

    await Promise.all([
      invalidate({ resource: "project_tags", invalidates: ["list", "many", "detail"] }),
      invalidate({ resource: "task_tags", invalidates: ["list", "many", "detail"] }),
      invalidate({ resource: "tasks", invalidates: ["list", "many", "detail"] }),
    ]);
  };

  return (
    <Show
      headerButtons={() => (
        <Space>
          <ListButton resource="projects" />
          {id && canManageProject(id) ? <EditButton recordItemId={id} /> : null}
          {id && project?.name && canDeleteProject(id) ? (
            <DeleteProjectButton
              projectId={id}
              projectName={project.name}
              redirectToListOnSuccess
            />
          ) : null}
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
                    <DateField format="DD/MM/YYYY" value={project.due_date} />
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
            <Card
              className="glass-card"
              extra={
                canManageTags ? (
                  <Button
                    type="primary"
                    onClick={() => {
                      tagForm.setFieldsValue({ color: "#1677ff" });
                      setIsTagModalOpen(true);
                    }}
                  >
                    Nuevo tag
                  </Button>
                ) : null
              }
              loading={tagsLoading}
              title="Tags del proyecto"
            >
              {tags.length === 0 ? (
                <Empty
                  description="Todavia no hay tags creados."
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <Space size={[8, 8]} wrap>
                  {tags.map((tag) => (
                    <Space key={tag.id} size={6}>
                      <Tag color={tag.color}>{tag.label}</Tag>
                      {canManageTags ? (
                        <Button size="small" type="link" danger onClick={() => void archiveTag(tag.id)}>
                          Archivar
                        </Button>
                      ) : null}
                    </Space>
                  ))}
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
                    title="Responsables"
                    render={(_: unknown, record) => {
                      const names = getTaskAssigneeNames(record);
                      return names.length > 0 ? names.join(", ") : "Sin responsables";
                    }}
                  />
                  <Table.Column<TaskRecord>
                    title="Tags"
                    render={(_: unknown, record) => {
                      const taskTags = getTaskTagItems(record);
                      return taskTags.length > 0 ? (
                        <Space size={[4, 4]} wrap>
                          {taskTags.map((tag) => (
                            <Tag key={tag.id} color={tag.color}>
                              {tag.label}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        "Sin tags"
                      );
                    }}
                  />
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
                      value ? <DateField format="DD/MM/YYYY" value={value} /> : "Sin fecha"
                    }
                  />
                </Table>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        confirmLoading={isSubmittingTag}
        okText="Guardar tag"
        onCancel={() => setIsTagModalOpen(false)}
        onOk={() => void handleCreateTag()}
        open={isTagModalOpen}
        title="Nuevo tag del proyecto"
      >
        <Form form={tagForm} layout="vertical">
          <Form.Item
            label="Texto"
            name="label"
            rules={[{ required: true, message: "Ingresa el nombre del tag" }]}
          >
            <Input placeholder="Backend, Cliente A, Sprint 1" />
          </Form.Item>
          <Form.Item
            initialValue="#1677ff"
            label="Color"
            name="color"
            rules={[{ required: true, message: "Selecciona un color" }]}
          >
            <ColorPicker
              format="hex"
              onChangeComplete={(value) => tagForm.setFieldValue("color", value.toHexString())}
              showText
            />
          </Form.Item>
          <Tag color={tagForm.getFieldValue("color") || "#1677ff"}>
            {tagForm.getFieldValue("label") || "Preview"}
          </Tag>
        </Form>
      </Modal>
    </Show>
  );
};
