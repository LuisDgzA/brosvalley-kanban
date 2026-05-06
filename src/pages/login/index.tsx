import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Space, Typography } from "antd";
import { Link } from "react-router";

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
              Iniciar sesion
            </Typography.Title>
            <Typography.Text type="secondary">
              Entra con tu cuenta de Supabase para continuar.
            </Typography.Text>
          </div>

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
                Entrar
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
        </Space>
      </Card>
    </div>
  );
};
