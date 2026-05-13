import { supabaseClient } from "@/providers/supabase";
import { AuthShell } from "@/components/ui/AuthShell";
import { Button, Form, Input, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";

type UpdatePasswordFormValues = {
  password: string;
  confirmPassword: string;
};

export const UpdatePassword = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFinish = async ({ password }: UpdatePasswordFormValues) => {
    setIsSubmitting(true);

    const { error } = await supabaseClient.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      message.error(error.message);
      return;
    }

    message.success("Tu password fue actualizada.");
    navigate("/login", { replace: true });
  };

  return (
    <AuthShell
      eyebrow="Seguridad"
      subtitle="Define una nueva clave para proteger el acceso del equipo."
      title="Nueva password"
    >
      <Form<UpdatePasswordFormValues> layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Nueva password"
          name="password"
          rules={[
            { required: true, message: "Ingresa tu nueva password" },
            { min: 6, message: "Usa al menos 6 caracteres" },
          ]}
        >
          <Input.Password placeholder="Nueva password" size="large" />
        </Form.Item>

        <Form.Item
          dependencies={["password"]}
          label="Confirmar password"
          name="confirmPassword"
          rules={[
            { required: true, message: "Confirma tu password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) {
                  return Promise.resolve();
                }

                return Promise.reject(
                  new Error("Las passwords no coinciden"),
                );
              },
            }),
          ]}
        >
          <Input.Password placeholder="Confirma tu password" size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button block htmlType="submit" loading={isSubmitting} type="primary">
            Actualizar password
          </Button>
        </Form.Item>
      </Form>
    </AuthShell>
  );
};
