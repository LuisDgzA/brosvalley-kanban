import { Space, Tag, Typography } from "antd";

type AuthShellProps = {
  title: string;
  subtitle: string;
  eyebrow: string;
  children: React.ReactNode;
};

export const AuthShell = ({
  title,
  subtitle,
  eyebrow,
  children,
}: AuthShellProps) => {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <Space direction="vertical" size={24} style={{ maxWidth: 520 }}>
          <Tag
            style={{
              width: "fit-content",
              margin: 0,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#f8fafc",
            }}
          >
            {eyebrow}
          </Tag>

          <div>
            <Typography.Title
              level={1}
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: "clamp(2rem, 4vw, 3.6rem)",
                lineHeight: 1.05,
              }}
            >
              Control de proyectos para equipos pequenos con ambicion grande.
            </Typography.Title>
            <Typography.Paragraph
              style={{
                marginTop: 16,
                marginBottom: 0,
                color: "rgba(248,250,252,0.82)",
                fontSize: 16,
                maxWidth: 460,
              }}
            >
              BrosValley CRM centraliza proyectos, responsables y prioridades en
              una vista clara para operar con orden, velocidad y foco.
            </Typography.Paragraph>
          </div>

          <Space className="auth-bullets" direction="vertical" size={10}>
            <Typography.Text style={{ color: "#dbeafe" }}>
              1. Dashboard ejecutivo con contexto inmediato
            </Typography.Text>
            <Typography.Text style={{ color: "#d1fae5" }}>
              2. Proyectos con responsables y fechas visibles
            </Typography.Text>
            <Typography.Text style={{ color: "#fef3c7" }}>
              3. Kanban operativo para el trabajo del dia a dia
            </Typography.Text>
          </Space>
        </Space>
      </div>

      <div className="auth-card">
        <Space className="auth-card-inner" direction="vertical" size={24}>
          <div>
            <Typography.Text
              style={{
                color: "#0f766e",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: 12,
              }}
            >
              {eyebrow}
            </Typography.Text>
            <Typography.Title level={2} style={{ margin: "8px 0 8px" }}>
              {title}
            </Typography.Title>
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          </div>
          {children}
        </Space>
      </div>
    </div>
  );
};
