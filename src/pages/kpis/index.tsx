import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useList } from "@refinedev/core";
import {
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import type { ProjectRecord, TaskRecord } from "../projects/types";

type DelayedProject = {
  project: ProjectRecord;
  overdue: number;
  dueSoon: number;
  total: number;
  done: number;
  progress: number;
};

const KpiCard = ({
  title,
  value,
  loading,
  accent,
  icon,
  subtitle,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
  accent: string;
  icon: ReactNode;
  subtitle?: string;
}) => (
  <Card className="metric-card">
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <Flex align="center" justify="space-between">
        <Typography.Text type="secondary">{title}</Typography.Text>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: accent,
            color: "#0f172a",
          }}
        >
          {icon}
        </div>
      </Flex>
      {loading ? (
        <Spin size="small" />
      ) : (
        <>
          <Typography.Title level={2} style={{ margin: 0, fontSize: 34 }}>
            {value ?? 0}
          </Typography.Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {subtitle}
            </Typography.Text>
          )}
        </>
      )}
    </Space>
  </Card>
);

const PERIOD_OPTIONS = [
  { label: "Ultimos 7 dias", value: 7 },
  { label: "Ultimos 14 dias", value: 14 },
  { label: "Ultimos 30 dias", value: 30 },
];

export const Kpis = () => {
  const [periodDays, setPeriodDays] = useState(7);

  const periodStart = useMemo(
    () => dayjs().subtract(periodDays, "day").startOf("day"),
    [periodDays],
  );

  const { result: projectsResult, query: projectsQuery } = useList<ProjectRecord>({
    resource: "projects",
    pagination: { mode: "off" },
    sorters: [{ field: "name", order: "asc" }],
  });

  const { result: tasksResult, query: tasksQuery } = useList<TaskRecord>({
    resource: "tasks",
    pagination: { mode: "off" },
    meta: {
      select: "id,title,status,due_date,assigned_to,project_id,created_at,completed_at",
    },
  });

  const projects = projectsResult.data ?? [];
  const tasks = tasksResult.data ?? [];

  const isLoading = projectsQuery.isLoading || tasksQuery.isLoading;

  const stats = useMemo(() => {
    const today = dayjs().startOf("day");
    const threshold48h = dayjs().add(48, "hour");

    const completedInPeriod = tasks.filter(
      (t) =>
        t.completed_at &&
        dayjs(t.completed_at).isAfter(periodStart),
    ).length;

    const overdue = tasks.filter(
      (t) =>
        t.due_date &&
        dayjs(t.due_date).isBefore(today) &&
        t.status !== "DONE",
    ).length;

    const dueSoon = tasks.filter((t) => {
      if (!t.due_date || t.status === "DONE") return false;
      const d = dayjs(t.due_date);
      return (d.isSame(today) || d.isAfter(today)) && d.isBefore(threshold48h);
    }).length;

    return { completedInPeriod, overdue, dueSoon };
  }, [tasks, periodStart]);

  const delayedProjects = useMemo<DelayedProject[]>(() => {
    const today = dayjs().startOf("day");
    const weekEnd = today.add(7, "day");

    return projects
      .map((project) => {
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
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);
        return { project, overdue, dueSoon, total, done, progress };
      })
      .filter((p) => p.overdue > 0 || p.dueSoon > 0)
      .sort((a, b) => b.overdue - a.overdue || b.dueSoon - a.dueSoon);
  }, [projects, tasks]);

  const columns = [
    {
      title: "Proyecto",
      key: "name",
      render: (_: unknown, record: DelayedProject) => (
        <Typography.Text strong>{record.project.name}</Typography.Text>
      ),
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
      title: "Por vencer (7d)",
      dataIndex: "dueSoon",
      key: "dueSoon",
      width: 130,
      render: (value: number) => (
        <Tag color={value > 0 ? "orange" : "default"}>{value}</Tag>
      ),
    },
    {
      title: "Avance",
      key: "progress",
      width: 150,
      render: (_: unknown, record: DelayedProject) => (
        <Progress
          percent={record.progress}
          size="small"
          strokeColor={record.progress === 100 ? "#52c41a" : undefined}
        />
      ),
    },
    {
      title: "Tareas",
      key: "tasks",
      width: 90,
      render: (_: unknown, record: DelayedProject) => (
        <Typography.Text type="secondary">
          {record.done}/{record.total}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-main section-heading-copy">
            <Typography.Title
              level={2}
              style={{ margin: 0, color: "#f8fafc", fontSize: 30 }}
            >
              KPIs del equipo
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(248,250,252,0.82)", maxWidth: 680 }}>
              Completadas, atrasos y proyectos en riesgo. Cambia el periodo
              para comparar ritmo entre semanas.
            </Typography.Text>
          </div>
          <div style={{ flexShrink: 0 }}>
            <Select
              options={PERIOD_OPTIONS}
              value={periodDays}
              onChange={setPeriodDays}
              style={{ width: 180 }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col lg={8} md={12} xs={24}>
              <KpiCard
                accent="linear-gradient(135deg, #d1fae5, #bfdbfe)"
                loading={false}
                icon={<CheckCircleOutlined />}
                title="Completadas en el periodo"
                value={stats.completedInPeriod}
                subtitle={`Ultimos ${periodDays} dias`}
              />
            </Col>
            <Col lg={8} md={12} xs={24}>
              <KpiCard
                accent="#fee2e2"
                loading={false}
                icon={<WarningOutlined />}
                title="Tareas vencidas"
                value={stats.overdue}
                subtitle="Sin fecha limite cumplida"
              />
            </Col>
            <Col lg={8} md={12} xs={24}>
              <KpiCard
                accent="#fef3c7"
                loading={false}
                icon={<ClockCircleOutlined />}
                title="Por vencer en 48h"
                value={stats.dueSoon}
                subtitle="Requieren atencion inmediata"
              />
            </Col>
          </Row>

          <Card
            className="glass-card"
            title={
              <div className="section-heading-copy">
                <Flex align="center" gap={8}>
                  <RiseOutlined style={{ color: "#f5222d" }} />
                  <Typography.Text strong>
                    Proyectos con mayor retraso
                  </Typography.Text>
                </Flex>
                <Typography.Text type="secondary">
                  Ordenados por tareas vencidas. Solo muestra proyectos con
                  atraso o vencimiento proximo.
                </Typography.Text>
              </div>
            }
          >
            {delayedProjects.length === 0 ? (
              <Flex
                align="center"
                justify="center"
                style={{ minHeight: 120 }}
                vertical
                gap={8}
              >
                <CheckCircleOutlined style={{ fontSize: 32, color: "#52c41a" }} />
                <Typography.Text type="secondary">
                  Sin proyectos con atraso. Buen ritmo.
                </Typography.Text>
              </Flex>
            ) : (
              <div className="app-table-wrap">
                <Table<DelayedProject>
                  columns={columns}
                  dataSource={delayedProjects}
                  pagination={false}
                  rowKey={(r) => r.project.id}
                  scroll={{ x: 600 }}
                  size="small"
                />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};
