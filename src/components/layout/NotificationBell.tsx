import {
  BellOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useGetIdentity, useList } from "@refinedev/core";
import {
  Badge,
  Button,
  Empty,
  Flex,
  List,
  Popover,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type { AuthUser } from "@/providers/auth";
import type { TaskRecord } from "@/pages/projects/types";

type TaskWithProject = TaskRecord & {
  projects?: { name: string | null } | null;
};

type NotificationItem = {
  key: string;
  type: "overdue" | "due_soon";
  task: TaskWithProject;
};

const DUE_SOON_HOURS = 48;

const NotificationBell = () => {
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { result } = useList<TaskWithProject>({
    resource: "tasks",
    filters: currentUser?.id
      ? [
          { field: "assigned_to", operator: "eq", value: currentUser.id },
          { field: "status", operator: "ne", value: "DONE" },
        ]
      : [],
    pagination: { mode: "off" },
    meta: {
      select: "id,title,status,due_date,assigned_to,project_id,created_at,projects(name)",
    },
    queryOptions: { enabled: Boolean(currentUser?.id) },
  });

  const allNotifications = useMemo<NotificationItem[]>(() => {
    const tasks = result.data ?? [];
    const now = dayjs();
    const threshold = now.add(DUE_SOON_HOURS, "hour");
    const items: NotificationItem[] = [];

    for (const task of tasks) {
      if (!task.due_date) continue;
      const due = dayjs(task.due_date);
      if (due.isBefore(now)) {
        items.push({ key: `overdue-${task.id}`, type: "overdue", task });
      } else if (due.isBefore(threshold)) {
        items.push({ key: `due_soon-${task.id}`, type: "due_soon", task });
      }
    }

    return items.sort((a, b) => {
      if (a.type === "overdue" && b.type !== "overdue") return -1;
      if (b.type === "overdue" && a.type !== "overdue") return 1;
      return dayjs(a.task.due_date!).diff(dayjs(b.task.due_date!));
    });
  }, [result.data]);

  const notifications = allNotifications.filter((n) => !dismissed.has(n.key));

  const dismiss = (key: string) => {
    setDismissed((prev) => new Set(prev).add(key));
  };

  const dismissAll = () => {
    setDismissed(new Set(allNotifications.map((n) => n.key)));
  };

  const handleItemClick = () => {
    navigate("/kanban");
  };

  const content = (
    <div style={{ width: 320 }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Typography.Text strong>Notificaciones</Typography.Text>
        {notifications.length > 0 && (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={dismissAll}>
            Marcar todas como leidas
          </Button>
        )}
      </Flex>

      {notifications.length === 0 ? (
        <Empty
          description="Sin alertas activas"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: "16px 0" }}
        />
      ) : (
        <List
          dataSource={notifications}
          renderItem={(item) => (
            <List.Item
              key={item.key}
              style={{
                padding: "8px 0",
                alignItems: "flex-start",
                cursor: "pointer",
              }}
              onClick={handleItemClick}
              actions={[
                <Button
                  key="dismiss"
                  type="text"
                  size="small"
                  icon={<CloseOutlined style={{ fontSize: 11 }} />}
                  style={{ color: "#94a3b8", flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(item.key);
                  }}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  item.type === "overdue" ? (
                    <WarningOutlined
                      style={{ color: "#f5222d", fontSize: 18, marginTop: 2 }}
                    />
                  ) : (
                    <ClockCircleOutlined
                      style={{ color: "#fa8c16", fontSize: 18, marginTop: 2 }}
                    />
                  )
                }
                title={
                  <Typography.Text style={{ fontSize: 13 }}>
                    {item.task.title}
                  </Typography.Text>
                }
                description={
                  <div>
                    <Tag
                      color={item.type === "overdue" ? "red" : "orange"}
                      style={{ marginBottom: 4 }}
                    >
                      {item.type === "overdue" ? "Vencida" : "Vence en 48h"}
                    </Tag>
                    {item.task.projects?.name && (
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12, display: "block" }}
                      >
                        {item.task.projects.name}
                      </Typography.Text>
                    )}
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.task.due_date!).format("DD/MM/YYYY")}
                    </Typography.Text>
                  </div>
                }
              />
            </List.Item>
          )}
          style={{ maxHeight: 380, overflowY: "auto" }}
        />
      )}
    </div>
  );

  return (
    <Popover content={content} placement="bottomRight" trigger="click">
      <Badge count={notifications.length} size="small" offset={[-2, 2]}>
        <Button
          icon={<BellOutlined />}
          shape="circle"
          style={{
            background: "rgba(255,255,255,0.72)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        />
      </Badge>
    </Popover>
  );
};

export default NotificationBell;
