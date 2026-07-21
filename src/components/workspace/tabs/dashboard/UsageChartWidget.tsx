"use client";

import { useMemo, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChartTooltip } from "@/components/ui/ChartTooltip";
import { cn } from "@/lib/cn";
import type { TimelineItem } from "@/types";

interface UsageChartWidgetProps {
  timeline: TimelineItem[];
  loading?: boolean;
}

const COLORS: Record<string, string> = {
  successful: "#22c55e",
  failed: "#ef4444",
};

const BAR_RADIUS: [number, number, number, number] = [3, 3, 0, 0];

interface LegendPayloadItem {
  value: string;
  color: string;
}

function CustomLegend({ payload }: { payload?: LegendPayloadItem[] }) {
  if (!payload?.length) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-2">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs text-app-text-muted">
          <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="capitalize">{entry.value === "successful" ? "성공" : "실패"}</span>
        </div>
      ))}
    </div>
  );
}

export function UsageChartWidget({ timeline, loading }: UsageChartWidgetProps) {
  const chartData = useMemo(() => {
    if (!timeline?.length) return [];
    return timeline.slice(-14).map((t) => ({
      date: t.period.length > 10 ? t.period.slice(5, 10) : t.period,
      successful: t.successful,
      failed: t.failed,
    }));
  }, [timeline]);

  const totalAttempted = useMemo(
    () => timeline.reduce((sum, t) => sum + t.attempted, 0),
    [timeline]
  );

  const trendDirection = useMemo(() => {
    if (chartData.length < 2) return "neutral";
    const recent = chartData.slice(-3);
    const prev = chartData.slice(-6, -3);
    if (prev.length < 2) return "neutral";
    const recentAvg = recent.reduce((s, d) => s + d.successful, 0) / recent.length;
    const prevAvg = prev.reduce((s, d) => s + d.successful, 0) / prev.length;
    if (recentAvg > prevAvg * 1.1) return "up";
    if (recentAvg < prevAvg * 0.9) return "down";
    return "neutral";
  }, [chartData]);

  if (loading && !chartData.length) {
    return (
      <Panel
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-app-primary" aria-hidden="true" />
            사용량 추이
          </div>
        }
      >
        <div className="flex items-center justify-center py-12" aria-busy="true">
          <div className="flex flex-col items-center gap-2">
            <div className="h-32 w-full max-w-[300px] rounded-xl bg-app-card-hover animate-pulse" />
            <p className="text-xs text-app-text-muted">차트 로딩 중...</p>
          </div>
        </div>
      </Panel>
    );
  }

  if (!chartData.length) {
    return (
      <Panel
        title={
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-app-primary" aria-hidden="true" />
            사용량 추이
          </div>
        }
      >
        <EmptyState
          icon={TrendingUp}
          title="사용량 데이터 없음"
          description="메시지를 발송하면 사용량 차트가 자동으로 생성됩니다."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title={
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-app-primary" aria-hidden="true" />
          사용량 추이
        </div>
      }
      description={`최근 ${chartData.length}일 · 총 ${totalAttempted.toLocaleString()}건${trendDirection !== "neutral" ? ` · ${trendDirection === "up" ? "▲" : "▼"} ${trendDirection === "up" ? "상승" : "하락"}` : ""}`}
    >
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            barGap={2}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--app-border, #e5e7eb)"
              opacity={0.4}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "var(--app-text-muted, #9ca3af)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--app-text-muted, #9ca3af)" }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "var(--app-card-hover, #f3f4f6)", opacity: 0.5 }}
              wrapperStyle={{ touchAction: "auto" }}
            />
            <Legend content={<CustomLegend />} />
            <Bar
              dataKey="successful"
              name="successful"
              fill={COLORS.successful}
              radius={BAR_RADIUS}
              maxBarSize={24}
            />
            <Bar
              dataKey="failed"
              name="failed"
              fill={COLORS.failed}
              radius={BAR_RADIUS}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
