import { ThemedLayout, ThemedTitle } from "@refinedev/antd";

import Header from "./Header";

const Layout = ({ children }: React.PropsWithChildren) => {
  return (
    <ThemedLayout
      Header={Header}
      Title={(titleProps) => (
        <ThemedTitle {...titleProps} text="BrosValley CRM" />
      )}
    >
      {children}
    </ThemedLayout>
  );
};

export default Layout;
