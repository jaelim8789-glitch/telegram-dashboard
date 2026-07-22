"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Send, MessageSquare, Users, UserPlus } from "lucide-react";
import * as api from "@/lib/api";
import { InlineError } from "@/components/ui/InlineError";
import type { DateRangeKey, StatCardData, LineChartPoint, DonutSegment, TopChatRoom } from "@/components/analytics/mockData";
import {
  STAT_CARDS as MOCK_STAT_CARDS,
  LINE_CHART_DATA as MOCK_LINE_CHART_DATA,
  DONUT_DATA as MOCK_DONUT_DATA,
  DONUT_TOTAL as MOCK_DONUT_TOTAL,
  TOP_CHAT_ROOMS as MOCK_TOP_CHAT_ROOMS,
} from "@/components/analytics/mockData";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { StatCard } from "@/components/analytics/StatCard";
import { LineChartCard } from "@/components/analytics/LineChartCard";
import { DonutChartCard } from "@/components/analytics/DonutChartCard";
import { Top5Table } from "@/components/analytics/Top5Table";
import { ExportDropdown } from "@/components/analytics/ExportDropdown";
import { CustomDatePicker } from "@/components/analytics/CustomDatePicker";
import {
  StatCardSkeleton,
  LineChartSkeleton,
  DonutChartSkeleton,
  Top5TableSkeleton,
} from "@/components/analytics/AnalyticsSkeleton";

const DONUT_COLORS = ["#8b5cf6", "#3b82f6", "#a855f7"];
const DONUT_LABELS = ["개인", "그룹", "채널"];

const STAT_ICONS = [Send, MessageSquare, Users, UserPlus] as const;

function formatDateDisplay(start: Date, end: Date): string {
  return `${format(start, "yyyy.MM.dd")} - ${format(end, "yyyy.MM.dd")}`;
}

function getPeriodDays(key: DateRangeKey): number {
  switch (key) {
    case "today": return 1;
    case "7days": return 7;
    case "30days": return 30;
    case "thisMonth": return 0;
    default: return 7;
  }
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRangeKey>("7days");
  const [customStart, setCustomStart] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<{
    statCards: StatCardData[];
    lineData: LineChartPoint[];
    donutData: DonutSegment[];
    donutTotal: number;
    topChatRooms: TopChatRoom[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodDays = dateRange === "custom" ? null : String(getPeriodDays(dateRange));
      const result = await api.fetchAnalyticsDashboard(periodDays ?? undefined);
      if (result) {
        setApiData({
          statCards: [
            { label: "총 발송", value: result.stat_cards.total_sent.toLocaleString(), change: result.stat_cards.total_sent_change, positive: result.stat_cards.total_sent_change >= 0 },
            { label: "응답률", value: `${result.stat_cards.response_rate}%`, change: result.stat_cards.response_rate_change, positive: result.stat_cards.response_rate_change >= 0 },
            { label: "활성 채팅방", value: result.stat_cards.active_chat_rooms.toLocaleString(), change: result.stat_cards.active_chat_rooms_change, positive: result.stat_cards.active_chat_rooms_change >= 0 },
            { label: "신규 가입자", value: result.stat_cards.new_subscribers.toLocaleString(), change: result.stat_cards.new_subscribers_change, positive: result.stat_cards.new_subscribers_change >= 0 },
          ],
          lineData: result.timeline.map((p) => ({ date: p.date, 발송: p.sent, 응답: p.responses })),
          donutData: result.distribution.map((s, i) => ({ name: DONUT_LABELS[i] ?? s.name, value: s.value, color: DONUT_COLORS[i] ?? "#8b5cf6" })),
          donutTotal: result.total_chat_rooms,
          topChatRooms: result.top_chat_rooms,
        });
      } else {
        setApiData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDateRangeChange = useCallback((key: DateRangeKey) => {
    setDateRange(key);
    if (key === "custom") {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
    }
  }, []);

  const handleCustomDate = useCallback((start: Date, end: Date) => {
    setCustomStart(start);
    setCustomEnd(end);
    setShowDatePicker(false);
  }, []);

  const statCards = useMemo(() => apiData?.statCards ?? MOCK_STAT_CARDS, [apiData]);
  const lineData = useMemo(() => apiData?.lineData ?? MOCK_LINE_CHART_DATA, [apiData]);
  const donutData = useMemo(() => apiData?.donutData ?? MOCK_DONUT_DATA, [apiData]);
  const donutTotal = useMemo(() => apiData?.donutTotal ?? MOCK_DONUT_TOTAL, [apiData]);
  const topChatRooms = useMemo(() => apiData?.topChatRooms ?? MOCK_TOP_CHAT_ROOMS, [apiData]);

  const dateDisplay = dateRange === "custom"
    ? formatDateDisplay(customStart, customEnd)
    : formatDateDisplay(
        (() => { const d = new Date(); d.setDate(d.getDate() - getPeriodDays(dateRange)); return d; })(),
        new Date()
      );

  if (loading && !apiData) {
    return (
      <div className="flex flex-col gap-5 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-app-text">분석 리포트</h1>
            <p className="text-xs text-app-text-muted">{dateDisplay}</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
            <ExportDropdown />
          </div>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><LineChartSkeleton /></div>
          <DonutChartSkeleton />
        </div>
        <Top5TableSkeleton />
      </div>
    );
  }

  if (error && !apiData) {
    return (
      <div className="flex flex-col gap-5 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-app-text">분석 리포트</h1>
            <p className="text-xs text-app-text-muted">{dateDisplay}</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
            <ExportDropdown />
          </div>
        </header>
        <InlineError title="데이터를 불러오지 못했습니다" action={<button onClick={load} className="px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg">다시 시도</button>}>
          {error}
        </InlineError>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">분석 리포트</h1>
          <p className="text-xs text-app-text-muted">{dateDisplay}</p>
        </div>
        <div className="flex items-center gap-3 relative">
          <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
          <ExportDropdown />
          {showDatePicker && (
            <CustomDatePicker
              startDate={customStart}
              endDate={customEnd}
              onChange={handleCustomDate}
              onClose={() => setShowDatePicker(false)}
            />
          )}
        </div>
      </header>

      {error && (
        <InlineError title="실시간 데이터 동기화 실패" className="mb-0">
          저장된 데이터를 표시합니다.
        </InlineError>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
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
          <LineChartCard data={lineData} />
        </div>
        <DonutChartCard data={donutData} total={donutTotal} />
      </div>

      <Top5Table data={topChatRooms} />
    </div>
  );
}
