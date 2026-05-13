import { supabaseClient } from "@/providers/supabase";
import { AuthShell } from "@/components/ui/AuthShell";
import { Alert, Button, Form, Input, Typography, message } from "antd";
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
    <AuthShell
      eyebrow="Recuperacion"
      subtitle="Enviaremos un enlace para recuperar el acceso de forma segura."
      title="Recuperar password"
    >
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
    </AuthShell>
  );
};
