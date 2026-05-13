import { useLogin } from "@refinedev/core";
import { Button, Form, Input, Space, Typography } from "antd";
import { Link } from "react-router";

import { AuthShell } from "@/components/ui/AuthShell";

type LoginFormValues = {
  email: string;
  password: string;
};

export const Login = () => {
  const { mutate: login, isPending } = useLogin<LoginFormValues>();

  const onFinish = (values: LoginFormValues) => {
    login(values);
  };

  return (
    <AuthShell
      eyebrow="Acceso seguro"
      subtitle="Entra con tu cuenta de Supabase para continuar con la operacion."
      title="Iniciar sesion"
    >
      <Form<LoginFormValues> layout="vertical" onFinish={onFinish}>
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

        <Form.Item
          label="Password"
          name="password"
          rules={[{ required: true, message: "Ingresa tu password" }]}
        >
          <Input.Password placeholder="Tu password" size="large" />
        </Form.Item>

        <Form.Item style={{ marginBottom: 12 }}>
          <Button block htmlType="submit" loading={isPending} type="primary">
            Entrar al dashboard
          </Button>
        </Form.Item>
      </Form>

      <Space
        direction="vertical"
        size={8}
        style={{ width: "100%", textAlign: "center" }}
      >
        <Typography.Text type="secondary">
          <Link to="/forgot-password">Olvide mi password</Link>
        </Typography.Text>
        <Typography.Text type="secondary">
          No tienes cuenta? <Link to="/register">Registrate</Link>
        </Typography.Text>
      </Space>
    </AuthShell>
  );
};
