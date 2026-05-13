import { Edit, useForm } from "@refinedev/antd";
import {
  type HttpError,
  useGetIdentity,
  useList,
  useNavigation,
  useOne,
} from "@refinedev/core";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Grid,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";

import type { AuthUser } from "@/providers/auth";

import { Create } from "@refinedev/antd";

import type { ProjectMemberRecord, ProjectRecord, ProfileRecord } from "./types";
import {
  normalizeProjectPayload,
  type ProjectFormValues,
  syncProjectMembers,
} from "./utils";

type ProjectFormPageProps = {
  action: "create" | "edit";
  projectId?: string;
};

const PageWrapper = ({
  action,
  children,
  saveButtonProps,
  isLoading,
}: {
  action: "create" | "edit";
  children: React.ReactNode;
  saveButtonProps: any;
  isLoading?: boolean;
}) => {
  const Wrapper = action === "create" ? Create : Edit;

  return (
    <Wrapper
      headerButtons={() => null}
      saveButtonProps={{ ...saveButtonProps, style: { display: "none" } }}
      isLoading={isLoading}
    >
      {children}
    </Wrapper>
  );
};

export const ProjectFormPage = ({ action, projectId }: ProjectFormPageProps) => {
  const isEdit = action === "edit";
  const screens = Grid.useBreakpoint();
  const { list, show } = useNavigation();
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const [isSyncingMembers, setIsSyncingMembers] = useState(false);

  const { result: projectResult, query: projectQuery } = useOne<ProjectRecord>({
    resource: "projects",
    id: projectId ?? "",
    queryOptions: {
      enabled: isEdit && !!projectId,
    },
  });

  const { formProps, saveButtonProps, onFinish, formLoading, form } = useForm<
    ProjectRecord,
    HttpError,
    any
  >({
    action,
    id: projectId,
    resource: "projects",
    redirect: false,
  });

  const safeFormProps = {
    ...formProps,
    initialValues: undefined,
  };

  const { result: profilesResult, query: profilesQuery } = useList<ProfileRecord>({
    resource: "profiles",
    pagination: {
      mode: "off",
    },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { result: membersResult, query: membersQuery } =
    useList<ProjectMemberRecord>({
      resource: "project_members",
      filters: projectId
        ? [{ field: "project_id", operator: "eq", value: projectId }]
        : [],
      pagination: {
        mode: "off",
      },
      queryOptions: {
        enabled: isEdit && !!projectId,
      },
    });

  const profiles = profilesResult.data ?? [];
  const profilesLoading = profilesQuery.isLoading;
  const existingMembers = membersResult.data ?? [];
  const membersLoading = membersQuery.isLoading;

  useEffect(() => {
    if (!isEdit || !projectResult) {
      return;
    }

    if (membersQuery.isLoading || formLoading) {
      return;
    }

    form.setFieldsValue({
      name: projectResult.name,
      description: projectResult.description ?? undefined,
      due_date: projectResult.due_date ? dayjs(projectResult.due_date) : null,
      member_ids: existingMembers.map((member) => member.user_id),
    });
  }, [
    existingMembers,
    form,
    formLoading,
    isEdit,
    membersQuery.isLoading,
    projectResult,
  ]);

  const memberOptions = useMemo(
    () =>
      profiles.map((profile) => ({
        label: profile.name || profile.email || profile.id,
        value: profile.id,
      })),
    [profiles],
  );

  const handleSubmit = async (values: ProjectFormValues) => {
    try {
      setIsSyncingMembers(true);

      const projectPayload = normalizeProjectPayload(
        values,
        isEdit ? undefined : currentUser?.id,
      );

      const response = await onFinish(projectPayload as any);
      const savedProjectId = response?.data?.id ?? projectId;

      if (!savedProjectId) {
        throw new Error("No se pudo identificar el proyecto guardado.");
      }

      await syncProjectMembers(
        savedProjectId,
        values.member_ids ?? [],
        existingMembers,
      );

      message.success(
        isEdit
          ? "Proyecto actualizado correctamente."
          : "Proyecto creado correctamente.",
      );

      show("projects", savedProjectId);
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : "Ocurrio un error al guardar.";
      message.error(messageText);
    } finally {
      setIsSyncingMembers(false);
    }
  };

  return (
    <PageWrapper
      action={action}
      isLoading={formLoading || projectQuery.isLoading}
      saveButtonProps={{
        ...saveButtonProps,
        loading: Boolean(saveButtonProps.loading) || isSyncingMembers,
      }}
    >
      <div className="page-stack">
        <div className="page-hero">
          <div className="section-heading-copy">
            <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
              {isEdit ? "Editar proyecto" : "Nuevo proyecto"}
            </Typography.Text>
            <Typography.Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
              {isEdit
                ? "Ajusta alcance, fechas y participantes"
                : "Crea un proyecto con estructura clara"}
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(248,250,252,0.82)", maxWidth: 720 }}>
              Una buena configuracion inicial facilita seguimiento, priorizacion y
              responsabilidad compartida desde el primer dia.
            </Typography.Text>
          </div>
        </div>

        <Card className="glass-card">
          <Form<ProjectFormValues>
            {...safeFormProps}
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Row gutter={[16, 0]}>
              <Col lg={16} md={14} xs={24}>
                <Form.Item
                  label="Nombre"
                  name="name"
                  rules={[{ required: true, message: "Ingresa el nombre del proyecto" }]}
                >
                  <Input placeholder="Lanzamiento Q3" size="large" />
                </Form.Item>
              </Col>

              <Col lg={8} md={10} xs={24}>
                <Form.Item label="Fecha limite" name="due_date">
                  <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Descripcion" name="description">
                  <Input.TextArea
                    placeholder="Describe el alcance y objetivo del proyecto"
                    rows={screens.sm ? 5 : 4}
                  />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item label="Miembros" name="member_ids">
                  <Select
                    allowClear
                    loading={profilesLoading || membersLoading}
                    maxTagCount="responsive"
                    mode="multiple"
                    optionFilterProp="label"
                    options={memberOptions}
                    placeholder="Selecciona a los miembros del proyecto"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Alert
              message="Miembros del proyecto"
              description="Al guardar sincronizaremos la tabla `project_members` con la seleccion actual."
              showIcon
              style={{ marginBottom: 24 }}
              type="info"
            />

            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Typography.Text strong>Asignacion de miembros</Typography.Text>
              <Typography.Text type="secondary">
                Selecciona los perfiles que participaran en este proyecto.
              </Typography.Text>
            </Space>

            <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
              <div className="app-form-actions">
                <Button onClick={() => list("projects")}>
                  Volver al listado
                </Button>
                <Button
                  htmlType="submit"
                  loading={Boolean(saveButtonProps.loading) || isSyncingMembers}
                  type="primary"
                >
                  {isEdit ? "Guardar cambios" : "Crear proyecto"}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </PageWrapper>
  );
};
