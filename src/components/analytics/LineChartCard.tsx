"use client";

import { useId } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { LineChartPoint } from "./mockData";

interface LineChartCardProps {
  data: LineChartPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-app-border bg-app-card px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-app-text-muted">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm font-semibold tabular-nums" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

const LEGEND_LABELS: Record<string, string> = { 발송: "발송", 응답: "응답" };

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-1">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-app-text-muted">
          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span>{LEGEND_LABELS[entry.value] ?? entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function LineChartCard({ data }: LineChartCardProps) {
  const violetId = useId();
  const blueId = useId();

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card p-5">
      <h3 className="text-sm font-semibold text-app-text">메시지 발송 추이</h3>
      <div className="mt-4" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={violetId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={blueId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--color-app-border)"
              opacity={0.4}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--color-app-text-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--color-app-text-muted)" }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Line
              type="monotone"
              dataKey="발송"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#8b5cf6", strokeWidth: 2, fill: "#fff" }}
              fill={`url(#${violetId})`}
            />
            <Line
              type="monotone"
              dataKey="응답"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "#3b82f6", strokeWidth: 2, fill: "#fff" }}
              fill={`url(#${blueId})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
