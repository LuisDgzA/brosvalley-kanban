import { DeleteOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useInvalidate, useNavigation } from "@refinedev/core";
import { Alert, Button, Input, Modal, Space, Typography, message } from "antd";
import { useState } from "react";

import { supabaseClient } from "@/providers/supabase";

type DeleteProjectButtonProps = {
  projectId: string;
  projectName: string;
  block?: boolean;
  redirectToListOnSuccess?: boolean;
};

export const DeleteProjectButton = ({
  projectId,
  projectName,
  block,
  redirectToListOnSuccess = false,
}: DeleteProjectButtonProps) => {
  const invalidate = useInvalidate();
  const { list } = useNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationValue, setConfirmationValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const expectedName = projectName.trim();
  const normalizedConfirmation = confirmationValue.trim();
  const isConfirmationValid =
    normalizedConfirmation.length > 0 && normalizedConfirmation === expectedName;

  const closeModal = () => {
    if (isDeleting) {
      return;
    }

    setIsOpen(false);
    setConfirmationValue("");
  };

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      return;
    }

    try {
      setIsDeleting(true);

      const { error } = await supabaseClient.rpc("soft_delete_project", {
        target_project_id: projectId,
        confirmation_name: normalizedConfirmation,
      });

      if (error) {
        throw error;
      }

      await Promise.all([
        invalidate({ resource: "projects", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "project_members", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "tasks", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_comments", invalidates: ["list", "many", "detail"] }),
        invalidate({ resource: "task_activity", invalidates: ["list", "many", "detail"] }),
      ]);

      message.success("Proyecto eliminado logicamente.");
      closeModal();

      if (redirectToListOnSuccess) {
        list("projects", "replace");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "No se pudo eliminar el proyecto.";
      message.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        block={block}
        danger
        icon={<DeleteOutlined />}
        onClick={() => setIsOpen(true)}
        type="default"
      >
        {block ? "Eliminar proyecto" : null}
      </Button>

      <Modal
        confirmLoading={isDeleting}
        okButtonProps={{ danger: true, disabled: !isConfirmationValid }}
        okText="Eliminar proyecto"
        onCancel={closeModal}
        onOk={handleDelete}
        open={isOpen}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: "#dc2626" }} />
            <span>Eliminar proyecto</span>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Text>
            Esta accion hara un borrado logico del proyecto y de todos sus registros
            relacionados.
          </Typography.Text>

          <Alert
            message="Se ocultaran proyecto, miembros, tareas, comentarios y actividad."
            showIcon
            type="warning"
          />

          <Typography.Text>
            Para confirmar, escribe exactamente el nombre del proyecto:
          </Typography.Text>

          <Typography.Text code>{projectName}</Typography.Text>

          <Input
            autoFocus
            onChange={(event) => setConfirmationValue(event.target.value)}
            placeholder="Escribe el nombre del proyecto"
            value={confirmationValue}
          />
        </Space>
      </Modal>
    </>
  );
};
