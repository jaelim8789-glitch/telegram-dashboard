"use client";

import { useId } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DonutSegment } from "./mockData";

interface DonutChartCardProps {
  data: DonutSegment[];
  total: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: DonutSegment }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-xl border border-app-border bg-app-card px-3 py-2 shadow-xl">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: entry.payload.color }} />
        <span className="text-xs text-app-text-muted">{entry.name}</span>
        <span className="text-sm font-semibold tabular-nums text-app-text">{entry.value}%</span>
      </div>
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2 text-xs text-app-text-muted">
          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="flex-1">{entry.value}</span>
          <span className="font-medium text-app-text tabular-nums">
            {entry.value === "개인" ? "45%" : entry.value === "그룹" ? "30%" : "25%"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonutChartCard({ data, total }: DonutChartCardProps) {
  const cxId = useId();

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card p-5">
      <h3 className="text-sm font-semibold text-app-text">채팅방 분포</h3>
      <div className="mt-4" style={{ height: 280, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={<CustomLegend />}
              layout="horizontal"
              verticalAlign="bottom"
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ bottom: 30 }}>
          <div className="text-center">
            <div className="text-2xl font-bold text-app-text tabular-nums">{total}</div>
            <div className="text-xs text-app-text-muted">총 채팅방</div>
          </div>
        </div>
      </div>
    </div>
  );
}
