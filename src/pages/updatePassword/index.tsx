import { supabaseClient } from "@/providers/supabase";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "linear-gradient(135deg, rgba(245,247,250,1) 0%, rgba(230,236,243,1) 100%)",
      }}
    >
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8 }}>
              Nueva password
            </Typography.Title>
            <Typography.Text type="secondary">
              Define una nueva password para tu cuenta.
            </Typography.Text>
          </div>

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
        </Space>
      </Card>
    </div>
  );
};
