import {
  FolderOpenOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useList } from "@refinedev/core";
import {
  Avatar,
  Card,
  Empty,
  Progress,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";

import { getTaskAssigneeIds } from "../projects/task-relations";
import type { ProfileRecord, ProjectRecord, TaskRecord } from "../projects/types";

type TaskFull = TaskRecord & {
  projects?: { name: string | null } | null;
};

type ProjectSummary = {
  project: ProjectRecord;
  total: number;
  done: number;
  overdue: number;
  dueSoon: number;
  inReview: number;
  progress: number;
  risk: "high" | "medium" | "low";
};

type ResponsableSummary = {
  profile: ProfileRecord;
  open: number;
  overdue: number;
  dueSoon: number;
  projectCount: number;
};

const riskLabel: Record<string, string> = {
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

const riskColor: Record<string, string> = {
  high: "red",
  medium: "orange",
  low: "green",
};

export const Operations = () => {
  const { result: projectsResult, query: projectsQuery } = useList<ProjectRecord>({
    resource: "projects",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { result: tasksResult, query: tasksQuery } = useList<TaskFull>({
    resource: "tasks",
    pagination: { mode: "off" },
    meta: {
      select:
        "id,title,status,due_date,assigned_to,project_id,created_at,task_assignees(id,user_id,profiles:profiles!task_assignees_user_id_fkey(id,name,email,avatar_url))",
    },
  });

  const { result: profilesResult, query: profilesQuery } = useList<ProfileRecord>({
    resource: "profiles",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });

  const projects = projectsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const isLoading =
    projectsQuery.isLoading || tasksQuery.isLoading || profilesQuery.isLoading;

  const projectSummaries = useMemo<ProjectSummary[]>(() => {
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");

    return projects.map((project) => {
      const pts = tasks.filter((t) => t.project_id === project.id);
      const total = pts.length;
      const done = pts.filter((t) => t.status === "DONE").length;
      const overdue = pts.filter(
        (t) =>
          t.due_date &&
          dayjs(t.due_date).isBefore(today) &&
          t.status !== "DONE",
      ).length;
      const dueSoon = pts.filter((t) => {
        if (!t.due_date || t.status === "DONE") return false;
        const d = dayjs(t.due_date);
        return (d.isSame(today) || d.isAfter(today)) && d.isBefore(weekEnd);
      }).length;
      const inReview = pts.filter((t) => t.status === "IN_REVIEW").length;
      const progress = total === 0 ? 0 : Math.round((done / total) * 100);

      let risk: "high" | "medium" | "low" = "low";
      if (overdue > 0 || dueSoon >= 3) risk = "high";
      else if (dueSoon > 0 || inReview > 0) risk = "medium";

      return { project, total, done, overdue, dueSoon, inReview, progress, risk };
    });
  }, [projects, tasks]);

  const responsableSummaries = useMemo<ResponsableSummary[]>(() => {
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");

    return profiles
      .map((profile) => {
        const assigned = tasks.filter((t) => getTaskAssigneeIds(t).includes(profile.id));
        const open = assigned.filter((t) => t.status !== "DONE").length;
        const overdue = assigned.filter(
          (t) =>
            t.due_date &&
            dayjs(t.due_date).isBefore(today) &&
            t.status !== "DONE",
        ).length;
        const dueSoon = assigned.filter((t) => {
          if (!t.due_date || t.status === "DONE") return false;
          const d = dayjs(t.due_date);
          return (d.isSame(today) || d.isAfter(today)) && d.isBefore(weekEnd);
        }).length;
        const projectIds = new Set(
          assigned.filter((t) => t.project_id).map((t) => t.project_id),
        );

        return { profile, open, overdue, dueSoon, projectCount: projectIds.size };
      })
      .sort((a, b) => b.open - a.open);
  }, [profiles, tasks]);

  if (isLoading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: 320 }}>
        <Spin size="large" />
      </div>
    );
  }

  const projectColumns = [
    {
      title: "Proyecto",
      key: "name",
      render: (_: unknown, record: ProjectSummary) => (
        <Typography.Text strong>{record.project.name}</Typography.Text>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 72,
    },
    {
      title: "Vencidas",
      dataIndex: "overdue",
      key: "overdue",
      width: 100,
      render: (value: number) => (
        <Tag
          color={value > 0 ? "red" : "default"}
          icon={value > 0 ? <WarningOutlined /> : undefined}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Por vencer",
      dataIndex: "dueSoon",
      key: "dueSoon",
      width: 110,
      render: (value: number) => (
        <Tag color={value > 0 ? "orange" : "default"}>{value}</Tag>
      ),
    },
    {
      title: "En revision",
      dataIndex: "inReview",
      key: "inReview",
      width: 110,
      render: (value: number) => (
        <Tag color={value > 0 ? "gold" : "default"}>{value}</Tag>
      ),
    },
    {
      title: "Avance",
      dataIndex: "progress",
      key: "progress",
      width: 140,
      render: (value: number) => (
        <Progress
          percent={value}
          size="small"
          strokeColor={value === 100 ? "#52c41a" : undefined}
        />
      ),
    },
    {
      title: "Riesgo",
      dataIndex: "risk",
      key: "risk",
      width: 90,
      render: (risk: string) => (
        <Tag color={riskColor[risk]}>{riskLabel[risk]}</Tag>
      ),
    },
  ];

  const responsableColumns = [
    {
      title: "Colaborador",
      key: "profile",
      render: (_: unknown, record: ResponsableSummary) => {
        const label =
          record.profile.name || record.profile.email || "Usuario";
        return (
          <Space>
            <Avatar src={record.profile.avatar_url ?? undefined}>
              {label.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography.Text strong>{label}</Typography.Text>
          </Space>
        );
      },
    },
    {
      title: "Abiertas",
      dataIndex: "open",
      key: "open",
      width: 96,
      render: (value: number) => (
        <Tag color={value > 5 ? "orange" : "default"}>{value}</Tag>
      ),
    },
    {
      title: "Vencidas",
      dataIndex: "overdue",
      key: "overdue",
      width: 96,
      render: (value: number) => (
        <Tag
          color={value > 0 ? "red" : "default"}
          icon={value > 0 ? <WarningOutlined /> : undefined}
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Por vencer",
      dataIndex: "dueSoon",
      key: "dueSoon",
      width: 110,
      render: (value: number) => (
        <Tag color={value > 0 ? "orange" : "default"}>{value}</Tag>
      ),
    },
    {
      title: "Proyectos activos",
      dataIndex: "projectCount",
      key: "projectCount",
      width: 150,
      render: (value: number) => (
        <Tag icon={<FolderOpenOutlined />}>{value}</Tag>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div className="section-heading-copy">
          <Typography.Text style={{ color: "rgba(248,250,252,0.72)" }}>
            Operacion visible
          </Typography.Text>
          <Typography.Title level={2} style={{ margin: 0, color: "#f8fafc" }}>
            Resumen operativo semanal
          </Typography.Title>
          <Typography.Text
            style={{ color: "rgba(248,250,252,0.82)", maxWidth: 680 }}
          >
            Detecta proyectos en riesgo, tareas vencidas y carga por
            colaborador sin navegar proyecto por proyecto.
          </Typography.Text>
        </div>
      </div>

      <Tabs
        defaultActiveKey="projects"
        items={[
          {
            key: "projects",
            label: (
              <Space>
                <FolderOpenOutlined />
                Resumen por proyecto
              </Space>
            ),
            children: (
              <Card className="glass-card">
                {projectSummaries.length === 0 ? (
                  <Empty description="No hay proyectos registrados." />
                ) : (
                  <div className="app-table-wrap">
                    <Table<ProjectSummary>
                      columns={projectColumns}
                      dataSource={projectSummaries}
                      pagination={false}
                      rowKey={(r) => r.project.id}
                      scroll={{ x: 720 }}
                      size="small"
                    />
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: "responsables",
            label: (
              <Space>
                <TeamOutlined />
                Vista de responsables
              </Space>
            ),
            children: (
              <Card className="glass-card">
                {responsableSummaries.length === 0 ? (
                  <Empty description="No hay colaboradores registrados." />
                ) : (
                  <div className="app-table-wrap">
                    <Table<ResponsableSummary>
                      columns={responsableColumns}
                      dataSource={responsableSummaries}
                      pagination={false}
                      rowKey={(r) => r.profile.id}
                      scroll={{ x: 600 }}
                      size="small"
                    />
                  </div>
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};
