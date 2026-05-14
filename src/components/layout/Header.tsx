import { CompassOutlined } from "@ant-design/icons";
import { Grid, Layout, Space, Typography, theme } from "antd";
import { useLocation } from "react-router";

import CurrentUser from "./CurrentUser";
import NotificationBell from "./NotificationBell";

const getHeaderCopy = (pathname: string) => {
  if (pathname.startsWith("/projects")) {
    return {
      title: "Proyectos",
      subtitle: "Responsables, fechas clave y seguimiento operativo",
    };
  }

  if (pathname.startsWith("/kanban")) {
    return {
      title: "Tablero de tareas",
      subtitle: "Prioridades activas, avance del equipo y flujo diario",
    };
  }

  if (pathname.startsWith("/operations")) {
    return {
      title: "Operacion visible",
      subtitle: "Resumen semanal por proyecto y carga por responsable",
    };
  }

  if (pathname.startsWith("/kpis")) {
    return {
      title: "KPIs del equipo",
      subtitle: "Completadas, atrasos y proyectos en riesgo por periodo",
    };
  }

  return {
    title: "Centro de operaciones",
    subtitle: "Proyectos, responsables y seguimiento diario",
  };
};

const Header = () => {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const { pathname } = useLocation();
  const copy = getHeaderCopy(pathname);

  return (
    <Layout.Header
      className="app-topbar"
      style={{
        display: "flex",
        alignItems: screens.md ? "center" : "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        position: "sticky",
        top: 0,
        zIndex: 30,
        flexShrink: 0,
        minHeight: 78,
        height: "auto",
        lineHeight: "normal",
        gap: 16,
        padding: screens.md ? "12px 24px" : "12px 16px 16px",
        background: "rgba(255,255,255,0.72)",
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        backdropFilter: "blur(14px)",
      }}
    >
      <Space align="start" size={12} style={{ minWidth: 0, flex: "1 1 320px" }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            background:
              "linear-gradient(135deg, rgba(15,118,110,0.18), rgba(29,78,216,0.16))",
            color: token.colorPrimary,
          }}
        >
          <CompassOutlined />
        </div>
        <div>
          <Typography.Text
            strong
            style={{
              display: "block",
              lineHeight: 1.2,
              marginBottom: 4,
              fontSize: screens.sm ? 16 : 15,
            }}
          >
            {copy.title}
          </Typography.Text>
          <Typography.Text
            type="secondary"
            style={{
              display: "block",
              lineHeight: 1.35,
              whiteSpace: "normal",
            }}
          >
            {copy.subtitle}
          </Typography.Text>
        </div>
      </Space>
      <Space size={8}>
        <NotificationBell />
        <CurrentUser />
      </Space>
    </Layout.Header>
  );
};

export default Header;
