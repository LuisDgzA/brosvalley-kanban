import { LogoutOutlined } from "@ant-design/icons";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { Button, Flex, Popover, Space, Typography } from "antd";

import type { AuthUser } from "@/providers/auth";

import CustomAvatar from "../CustomAvatar";

const CurrentUser = () => {
  const { data: user } = useGetIdentity<AuthUser>();
  const { mutate: logout, isPending } = useLogout();

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
      overlayStyle={{ maxWidth: 280 }}
    >
      <Flex align="center" gap={12} style={{ cursor: "pointer" }}>
        <div style={{ textAlign: "right" }}>
          <Typography.Text strong>{displayName}</Typography.Text>
          <br />
          <Typography.Text type="secondary">{subtitle}</Typography.Text>
        </div>
        <CustomAvatar name={initials} src={user?.avatar_url ?? undefined} />
      </Flex>
    </Popover>
  );
};

export default CurrentUser;
