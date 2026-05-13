import { Space, Typography } from "antd";

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
