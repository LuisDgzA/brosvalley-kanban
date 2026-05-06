import {
  Edit,
  useForm,
} from "@refinedev/antd";
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
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const { show } = useNavigation();
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const [isSyncingMembers, setIsSyncingMembers] = useState(false);

  const { result: projectResult, query: projectQuery } = useOne<ProjectRecord>({
    resource: "projects",
    id: projectId ?? "",
    queryOptions: {
      enabled: isEdit && !!projectId,
    },
  });

  const { formProps, saveButtonProps, onFinish, query, formLoading, form } =
    useForm<ProjectRecord, HttpError, any>({
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
    query?.data?.data,
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
      <Form<ProjectFormValues>
        {...safeFormProps}
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          label="Nombre"
          name="name"
          rules={[{ required: true, message: "Ingresa el nombre del proyecto" }]}
        >
          <Input placeholder="Lanzamiento Q3" size="large" />
        </Form.Item>

        <Form.Item label="Descripcion" name="description">
          <Input.TextArea
            placeholder="Describe el alcance y objetivo del proyecto"
            rows={5}
          />
        </Form.Item>

        <Form.Item label="Fecha limite" name="due_date">
          <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item label="Miembros" name="member_ids">
          <Select
            allowClear
            loading={profilesLoading || membersLoading}
            mode="multiple"
            optionFilterProp="label"
            options={memberOptions}
            placeholder="Selecciona a los miembros del proyecto"
            size="large"
          />
        </Form.Item>

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
          <Button
            htmlType="submit"
            loading={Boolean(saveButtonProps.loading) || isSyncingMembers}
            type="primary"
          >
            {isEdit ? "Guardar cambios" : "Crear proyecto"}
          </Button>
        </Form.Item>
      </Form>
    </PageWrapper>
  );
};
