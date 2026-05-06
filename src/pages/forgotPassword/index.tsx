import { supabaseClient } from "@/providers/supabase";
import { Alert, Button, Card, Form, Input, Space, Typography, message } from "antd";
import { useState } from "react";
import { Link } from "react-router";

type ForgotPasswordFormValues = {
  email: string;
};

export const ForgotPassword = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onFinish = async ({ email }: ForgotPasswordFormValues) => {
    setIsSubmitting(true);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/update-password`
        : undefined;

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setIsSubmitting(false);

    if (error) {
      message.error(error.message);
      return;
    }

    setIsSuccess(true);
    message.success("Te enviamos el correo para restablecer tu password.");
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
              Recuperar password
            </Typography.Title>
            <Typography.Text type="secondary">
              Enviaremos un link para restablecer tu acceso.
            </Typography.Text>
          </div>

          {isSuccess ? (
            <Alert
              message="Correo enviado"
              description="Revisa tu bandeja de entrada y sigue el link de recuperacion."
              showIcon
              type="success"
            />
          ) : null}

          <Form<ForgotPasswordFormValues> layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Ingresa tu email" },
                { type: "email", message: "Ingresa un email valido" },
              ]}
            >
              <Input placeholder="tu@empresa.com" size="large" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button block htmlType="submit" loading={isSubmitting} type="primary">
                Enviar enlace
              </Button>
            </Form.Item>
          </Form>

          <Typography.Text style={{ textAlign: "center" }} type="secondary">
            Volver a <Link to="/login">iniciar sesion</Link>
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
};
