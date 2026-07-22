"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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

function CustomLegend({
  payload,
  activeIndex,
  onHover,
}: {
  payload?: Array<{ value: string; color: string; payload: DonutSegment }>;
  activeIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-col gap-2 mt-2">
      {payload.map((entry, i) => {
        const percent = `${entry.payload.value}%`;
        const isActive = activeIndex === null || activeIndex === i;
        return (
          <button
            key={entry.value}
            className={`flex items-center gap-2 text-xs text-app-text-muted text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
              isActive ? "opacity-100" : "opacity-40"
            }`}
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onHover(activeIndex === i ? null : i)}
          >
            <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="flex-1">{entry.value}</span>
            <span className="font-medium text-app-text tabular-nums">{percent}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DonutChartCard({ data, total }: DonutChartCardProps) {
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const innerRadius = isMobile ? 40 : 55;
  const outerRadius = isMobile ? 65 : 90;

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-app-card p-5">
      <h3 className="text-sm font-bold tracking-tight text-app-text">채팅방 분포</h3>
      <div className="mt-4" style={{ height: 280, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              dataKey="value"
              nameKey="name"
              strokeWidth={0}
              paddingAngle={3}
              activeIndex={activeIndex !== null ? activeIndex : undefined}
              activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }: {
                cx: number; cy: number; innerRadius: number; outerRadius: number; startAngle: number; endAngle: number; fill: string;
              }) => (
                <g>
                  <path
                    d={`M ${cx},${cy} L ${cx + (outerRadius + 6) * Math.cos(-startAngle * Math.PI / 180)},${cy + (outerRadius + 6) * Math.sin(-startAngle * Math.PI / 180)} A ${outerRadius + 6},${outerRadius + 6} 0 ${endAngle - startAngle > 180 ? 1 : 0},0 ${cx + (outerRadius + 6) * Math.cos(-endAngle * Math.PI / 180)},${cy + (outerRadius + 6) * Math.sin(-endAngle * Math.PI / 180)} Z`}
                    fill={fill}
                    opacity={0.3}
                  />
                  <path
                    d={`M ${cx + innerRadius * Math.cos((-startAngle - endAngle) / 2 * Math.PI / 180)},${cy + innerRadius * Math.sin((-startAngle - endAngle) / 2 * Math.PI / 180)} L ${cx + (outerRadius + 2) * Math.cos((-startAngle - endAngle) / 2 * Math.PI / 180)},${cy + (outerRadius + 2) * Math.sin((-startAngle - endAngle) / 2 * Math.PI / 180)}`}
                    stroke={fill}
                    strokeWidth={2}
                  />
                </g>
              )}
              onMouseEnter={(_: unknown, index: number) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={<CustomLegend activeIndex={activeIndex} onHover={setActiveIndex} />}
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
