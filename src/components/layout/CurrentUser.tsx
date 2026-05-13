import { LogoutOutlined } from "@ant-design/icons";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { Button, Flex, Grid, Popover, Space, Typography } from "antd";

import type { AuthUser } from "@/providers/auth";

import CustomAvatar from "../CustomAvatar";

const CurrentUser = () => {
  const { data: user } = useGetIdentity<AuthUser>();
  const { mutate: logout, isPending } = useLogout();
  const screens = Grid.useBreakpoint();

  const displayName = user?.name?.trim() || user?.email || "User";
  const initials = displayName.slice(0, 2).toUpperCase();
  const subtitle = user?.job_title || user?.email || "Sesion activa";

  return (
    <Popover
      content={
        <Space direction="vertical" size={12}>
          <div>
            <Typography.Text strong>{displayName}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{subtitle}</Typography.Text>
          </div>
          <Button
            block
            danger
            icon={<LogoutOutlined />}
            loading={isPending}
            onClick={() => logout()}
          >
            Cerrar sesion
          </Button>
        </Space>
      }
      placement="bottomRight"
      trigger="click"
      overlayStyle={{ maxWidth: screens.sm ? 280 : "calc(100vw - 24px)" }}
    >
      <Flex
        align="center"
        gap={12}
        style={{
          cursor: "pointer",
          padding: "8px 10px",
          borderRadius: 16,
          border: "1px solid rgba(15,23,42,0.08)",
          background: "rgba(255,255,255,0.72)",
          minWidth: 0,
          maxWidth: screens.md ? 320 : "100%",
        }}
      >
        {screens.sm ? (
          <div style={{ textAlign: "right", lineHeight: 1.2, minWidth: 0 }}>
            <Typography.Text
              strong
              style={{ display: "block", maxWidth: 220 }}
              ellipsis={{ tooltip: displayName }}
            >
              {displayName}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              style={{ display: "block", maxWidth: 220 }}
              ellipsis={{ tooltip: subtitle }}
            >
              {subtitle}
            </Typography.Text>
          </div>
        ) : null}
        <CustomAvatar
          name={initials}
          src={user?.avatar_url ?? undefined}
          style={{ width: 38, height: 38, fontWeight: 700 }}
        />
      </Flex>
    </Popover>
  );
};

export default CurrentUser;
