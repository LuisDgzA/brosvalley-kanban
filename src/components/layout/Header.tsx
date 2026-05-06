import { Layout, theme } from "antd";

import CurrentUser from "./CurrentUser";

const Header = () => {
  const { token } = theme.useToken();

  return (
    <Layout.Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "0 24px",
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <CurrentUser />
    </Layout.Header>
  );
};

export default Header;
