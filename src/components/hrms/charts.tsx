"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#ff385c", "#222222", "#717171", "#008a05", "#e07912", "#6f42c1", "#0d6efd", "#b56727"];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function AttendanceOverviewChart({
  data,
}: {
  data: { date: string; Present: number; Absent: number; Leave: number; Late: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} width={32} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Present" stroke="var(--status-ok)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Absent" stroke="var(--status-breach)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Leave" stroke="var(--status-warn)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Late" stroke="#0d6efd" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DepartmentEmployeesChart({
  data,
}: {
  data: { department: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="department"
          interval={0}
          angle={-25}
          textAnchor="end"
          height={50}
          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} width={28} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyPayrollChart({
  data,
}: {
  data: { month: string; Gross: number; Net: number; Deductions: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          width={56}
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) =>
            new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
              Number(value)
            )
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Gross" fill="#222222" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Net" fill="var(--primary)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Deductions" fill="var(--status-warn)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LeaveStatisticsChart({ data }: { data: { type: string; days: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="days" nameKey="type" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 10 }}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
