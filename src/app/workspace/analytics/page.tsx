"use client";

import { useState } from "react";
import { Send, MessageSquare, Users, UserPlus } from "lucide-react";
import type { DateRangeKey } from "@/components/analytics/mockData";
import {
  STAT_CARDS,
  LINE_CHART_DATA,
  DONUT_DATA,
  DONUT_TOTAL,
  TOP_CHAT_ROOMS,
} from "@/components/analytics/mockData";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { StatCard } from "@/components/analytics/StatCard";
import { LineChartCard } from "@/components/analytics/LineChartCard";
import { DonutChartCard } from "@/components/analytics/DonutChartCard";
import { Top5Table } from "@/components/analytics/Top5Table";
import { ExportDropdown } from "@/components/analytics/ExportDropdown";

const STAT_ICONS = [Send, MessageSquare, Users, UserPlus] as const;

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeKey>("7days");

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">분석 리포트</h1>
          <p className="text-xs text-app-text-muted">2026.07.15 - 2026.07.22</p>
        </div>
        <DateRangeSelector active={dateRange} onChange={setDateRange} />
        <ExportDropdown />
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            change={card.change}
            positive={card.positive}
            icon={STAT_ICONS[i]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LineChartCard data={LINE_CHART_DATA} />
        </div>
        <DonutChartCard data={DONUT_DATA} total={DONUT_TOTAL} />
      </div>

      <Top5Table data={TOP_CHAT_ROOMS} />
    </div>
  );
}
