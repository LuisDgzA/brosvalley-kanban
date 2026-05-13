import { ThemedLayout, ThemedSider, ThemedTitle } from "@refinedev/antd";

import Header from "./Header";

const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <div className="app-shell">
      <ThemedLayout
        Header={Header}
        Sider={(siderProps) => <ThemedSider {...siderProps} fixed />}
        Title={(titleProps) => (
          <ThemedTitle
            {...titleProps}
            icon={null}
            text="BrosValley CRM"
            wrapperStyles={{
              fontSize: 18,
              fontWeight: 700,
              color: "#f8fafc",
              letterSpacing: "0.01em",
            }}
          />
        )}
      >
        <div className="app-content">{children}</div>
      </ThemedLayout>
    </div>
  );
};

export default Layout;
