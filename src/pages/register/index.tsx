import { useRegister } from "@refinedev/core";
import { Button, Card, Form, Input, Space, Typography } from "antd";
import { Link } from "react-router";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
};

export const Register = () => {
  const { mutate: register, isPending } = useRegister<RegisterFormValues>();

  const onFinish = (values: RegisterFormValues) => {
    register(values);
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
      <Card style={{ width: "100%", maxWidth: 460 }}>
        <Space direction="vertical" size={24} style={{ width: "100%" }}>
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8 }}>
              Crear cuenta
            </Typography.Title>
            <Typography.Text type="secondary">
              Registrate y guarda tu nombre en `profiles` automaticamente.
            </Typography.Text>
          </div>

          <Form<RegisterFormValues> layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Nombre"
              name="name"
              rules={[{ required: true, message: "Ingresa tu nombre" }]}
            >
              <Input placeholder="Tu nombre" size="large" />
            </Form.Item>

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
              rules={[
                { required: true, message: "Ingresa tu password" },
                { min: 6, message: "Usa al menos 6 caracteres" },
              ]}
            >
              <Input.Password placeholder="Crea un password" size="large" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button block htmlType="submit" loading={isPending} type="primary">
                Crear cuenta
              </Button>
            </Form.Item>
          </Form>

          <Typography.Text style={{ textAlign: "center" }} type="secondary">
            Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
};
