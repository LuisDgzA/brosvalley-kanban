import { useRegister } from "@refinedev/core";
import { Button, Form, Input, Typography } from "antd";
import { Link } from "react-router";

import { AuthShell } from "@/components/ui/AuthShell";

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
    <AuthShell
      eyebrow="Alta de equipo"
      subtitle="Crea una cuenta y registra automaticamente el perfil operativo."
      title="Crear cuenta"
    >
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
    </AuthShell>
  );
};
