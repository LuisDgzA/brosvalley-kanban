import type { ThemeConfig } from "antd";

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: "#0f766e",
    colorInfo: "#1d4ed8",
    colorSuccess: "#15803d",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    borderRadius: 16,
    colorBgLayout: "#f3f5f8",
    colorBgContainer: "rgba(255,255,255,0.82)",
    colorBorderSecondary: "rgba(15,23,42,0.08)",
    colorTextHeading: "#0f172a",
    colorTextSecondary: "#5f6b7a",
    fontFamily: '"Segoe UI", "Aptos", sans-serif',
    boxShadowSecondary: "0 18px 40px rgba(15, 23, 42, 0.08)",
  },
  components: {
    Layout: {
      bodyBg: "#f3f5f8",
      headerBg: "rgba(255,255,255,0.82)",
      siderBg: "#101828",
      triggerBg: "#101828",
      triggerColor: "#f8fafc",
    },
    Menu: {
      darkItemBg: "#101828",
      darkItemColor: "rgba(248,250,252,0.75)",
      darkItemHoverBg: "rgba(15,118,110,0.24)",
      darkItemSelectedBg: "linear-gradient(90deg, #0f766e, #115e59)",
      darkItemSelectedColor: "#ffffff",
      darkSubMenuItemBg: "#101828",
    },
    Card: {
      borderRadiusLG: 20,
    },
    Table: {
      headerBg: "#f8fafc",
      borderColor: "rgba(15,23,42,0.08)",
    },
    Button: {
      borderRadius: 14,
      controlHeight: 40,
      fontWeight: 600,
    },
    Input: {
      borderRadius: 14,
      controlHeight: 44,
    },
    Select: {
      borderRadius: 14,
      controlHeight: 44,
    },
    DatePicker: {
      borderRadius: 14,
      controlHeight: 44,
    },
    Tag: {
      borderRadiusSM: 999,
    },
  },
};
