import {
  BellOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useGetIdentity, useInvalidate, useList } from "@refinedev/core";
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
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import type { AuthUser } from "@/providers/auth";
import type { TaskRecord } from "@/pages/projects/types";
import { supabaseClient } from "@/providers/supabase";

type TaskWithProject = TaskRecord & {
  projects?: { name: string | null } | null;
};

type AssignmentNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  project_id: string | null;
  task_id: string | null;
  read_at: string | null;
  created_at: string;
  projects?: { name: string | null } | null;
};

type DueDateNotification = {
  key: string;
  type: "overdue" | "due_soon";
  task: TaskWithProject;
};

type NotificationItem =
  | {
      key: string;
      kind: "assignment";
      notification: AssignmentNotification;
    }
  | {
      key: string;
      kind: "due_date";
      notification: DueDateNotification;
    };

const DUE_SOON_HOURS = 48;
const STORAGE_KEY_PREFIX = "brosvalley-notification-dismissed";

const NotificationBell = () => {
  const { data: currentUser } = useGetIdentity<AuthUser>();
  const invalidate = useInvalidate();
  const navigate = useNavigate();
  const storageKey = currentUser?.id
    ? `${STORAGE_KEY_PREFIX}:${currentUser.id}`
    : STORAGE_KEY_PREFIX;
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

  const { result: assignmentNotificationsResult } = useList<AssignmentNotification>({
    resource: "user_notifications",
    filters: currentUser?.id ? [{ field: "recipient_user_id", operator: "eq", value: currentUser.id }] : [],
    pagination: {
      currentPage: 1,
      pageSize: 20,
    },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select: "id,type,title,body,project_id,task_id,read_at,created_at,projects(name)",
    },
    queryOptions: { enabled: Boolean(currentUser?.id) },
  });

  const allDueDateNotifications = useMemo<DueDateNotification[]>(() => {
    const tasks = result.data ?? [];
    const now = dayjs();
    const threshold = now.add(DUE_SOON_HOURS, "hour");
    const items: DueDateNotification[] = [];

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

  const notifications = useMemo<NotificationItem[]>(() => {
    const assignments = (assignmentNotificationsResult.data ?? [])
      .filter((item) => !item.read_at)
      .map((notification) => ({
        key: `assignment-${notification.id}`,
        kind: "assignment" as const,
        notification,
      }));

    const dueDateItems = allDueDateNotifications
      .filter((item) => !dismissed.has(item.key))
      .map((notification) => ({
        key: notification.key,
        kind: "due_date" as const,
        notification,
      }));

    return [...assignments, ...dueDateItems].sort((a, b) => {
      const aDate =
        a.kind === "assignment"
          ? dayjs(a.notification.created_at)
          : dayjs(a.notification.task.due_date!);
      const bDate =
        b.kind === "assignment"
          ? dayjs(b.notification.created_at)
          : dayjs(b.notification.task.due_date!);
      return bDate.valueOf() - aDate.valueOf();
    });
  }, [allDueDateNotifications, assignmentNotificationsResult.data, dismissed]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.id) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setDismissed(new Set());
        return;
      }

      const parsed = JSON.parse(raw) as string[];
      setDismissed(new Set(parsed));
    } catch {
      setDismissed(new Set());
    }
  }, [currentUser?.id, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUser?.id) {
      return;
    }

    const validKeys = new Set(allDueDateNotifications.map((item) => item.key));
    const nextDismissed = new Set([...dismissed].filter((key) => validKeys.has(key)));

    if (nextDismissed.size !== dismissed.size) {
      setDismissed(nextDismissed);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify([...nextDismissed]));
  }, [allDueDateNotifications, currentUser?.id, dismissed, storageKey]);

  const dismiss = (key: string) => {
    setDismissed((prev) => new Set(prev).add(key));
  };

  const markAssignmentAsRead = async (notificationId: string) => {
    const { error } = await supabaseClient
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .is("read_at", null);

    if (error) {
      throw error;
    }

    await invalidate({ resource: "user_notifications", invalidates: ["list", "many", "detail"] });
  };

  const dismissAll = async () => {
    setDismissed(new Set(allDueDateNotifications.map((n) => n.key)));

    if (!currentUser?.id) {
      return;
    }

    const unreadAssignments = (assignmentNotificationsResult.data ?? []).filter(
      (item) => !item.read_at,
    );

    if (unreadAssignments.length === 0) {
      return;
    }

    const { error } = await supabaseClient
      .from("user_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", currentUser.id)
      .is("read_at", null);

    if (!error) {
      await invalidate({ resource: "user_notifications", invalidates: ["list", "many", "detail"] });
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (item.kind === "assignment") {
      if (item.notification.task_id && item.notification.project_id) {
        await markAssignmentAsRead(item.notification.id);
        const params = new URLSearchParams();
        params.set("projectId", item.notification.project_id);
        params.set("taskId", item.notification.task_id);
        navigate(`/kanban?${params.toString()}`);
        return;
      }

      return;
    }

    const params = new URLSearchParams();
    params.set("projectId", item.notification.task.project_id);
    params.set("taskId", item.notification.task.id);
    navigate(`/kanban?${params.toString()}`);
  };

  const content = (
    <div style={{ width: 320 }}>
      <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
        <Typography.Text strong>Notificaciones</Typography.Text>
        {notifications.length > 0 && (
          <Button
            type="link"
            size="small"
            style={{ padding: 0 }}
            onClick={() => {
              void dismissAll();
            }}
          >
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
              onClick={() => {
                void handleItemClick(item);
              }}
              actions={[
                <Button
                  key="dismiss"
                  type="text"
                  size="small"
                  icon={<CloseOutlined style={{ fontSize: 11 }} />}
                  style={{ color: "#94a3b8", flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.kind === "assignment") {
                      void markAssignmentAsRead(item.notification.id);
                      return;
                    }

                    dismiss(item.key);
                  }}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  item.kind === "assignment" ? (
                    <TeamOutlined
                      style={{ color: "#1677ff", fontSize: 18, marginTop: 2 }}
                    />
                  ) : item.notification.type === "overdue" ? (
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
                    {item.kind === "assignment"
                      ? item.notification.title
                      : item.notification.task.title}
                  </Typography.Text>
                }
                description={
                  <div>
                    <Tag
                      color={
                        item.kind === "assignment"
                          ? "blue"
                          : item.notification.type === "overdue"
                            ? "red"
                            : "orange"
                      }
                      style={{ marginBottom: 4 }}
                    >
                      {item.kind === "assignment"
                        ? "Nueva asignacion"
                        : item.notification.type === "overdue"
                          ? "Vencida"
                          : "Vence en 48h"}
                    </Tag>
                    {(item.kind === "assignment"
                      ? item.notification.projects?.name
                      : item.notification.task.projects?.name) && (
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12, display: "block" }}
                      >
                        {item.kind === "assignment"
                          ? item.notification.projects?.name
                          : item.notification.task.projects?.name}
                      </Typography.Text>
                    )}
                    {item.kind === "assignment" ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {item.notification.body || dayjs(item.notification.created_at).format("DD/MM/YYYY HH:mm")}
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.notification.task.due_date!).format("DD/MM/YYYY")}
                      </Typography.Text>
                    )}
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
