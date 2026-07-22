"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { Send, MessageSquare, Users, UserPlus, RefreshCw, PackageOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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

const REFRESH_INTERVAL_MS = 30000;

function formatDateDisplay(start: Date, end: Date): string {
  return `${format(start, "yyyy.MM.dd")} - ${format(end, "yyyy.MM.dd")}`;
}

function formatLastUpdated(date: Date): string {
  return format(date, "HH:mm:ss");
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
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dataKey, setDataKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transformData = useCallback((result: Awaited<ReturnType<typeof api.fetchAnalyticsDashboard>>) => {
    if (!result) return null;
    return {
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
    };
  }, []);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const periodDays = dateRange === "custom" ? null : String(getPeriodDays(dateRange));
      const result = await api.fetchAnalyticsDashboard(periodDays ?? undefined);
      if (result) {
        setApiData(transformData(result));
        setLastUpdated(new Date());
        setIsLive(true);
        setDataKey((k) => k + 1);
      } else if (showLoading) {
        setApiData(null);
        setIsLive(false);
      }
    } catch (err) {
      if (showLoading) {
        setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
        setIsLive(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, customStart, customEnd, transformData]);

  useEffect(() => {
    load(true);
    intervalRef.current = setInterval(() => load(false), REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "r":
          e.preventDefault();
          load(false);
          break;
        case "e":
          e.preventDefault();
          document.querySelector<HTMLButtonElement>('[data-export-trigger]')?.click();
          break;
        case "1": e.preventDefault(); handleDateRangeChange("today"); break;
        case "2": e.preventDefault(); handleDateRangeChange("7days"); break;
        case "3": e.preventDefault(); handleDateRangeChange("30days"); break;
        case "4": e.preventDefault(); handleDateRangeChange("thisMonth"); break;
        case "5": e.preventDefault(); handleDateRangeChange("custom"); break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [load, handleDateRangeChange]);

  const statCards = useMemo(() => apiData?.statCards ?? (loading ? MOCK_STAT_CARDS : []), [apiData, loading]);
  const lineData = useMemo(() => apiData?.lineData ?? (loading ? MOCK_LINE_CHART_DATA : []), [apiData, loading]);
  const donutData = useMemo(() => apiData?.donutData ?? (loading ? MOCK_DONUT_DATA : []), [apiData, loading]);
  const donutTotal = useMemo(() => apiData?.donutTotal ?? (loading ? MOCK_DONUT_TOTAL : 0), [apiData, loading]);
  const topChatRooms = useMemo(() => apiData?.topChatRooms ?? (loading ? MOCK_TOP_CHAT_ROOMS : []), [apiData, loading]);

  const isEmpty = !loading && !error && !apiData;

  const dateDisplay = dateRange === "custom"
    ? formatDateDisplay(customStart, customEnd)
    : formatDateDisplay(
        (() => { const d = new Date(); d.setDate(d.getDate() - getPeriodDays(dateRange)); return d; })(),
        new Date()
      );

  const exportData = useMemo(() => ({ statCards, lineData, donutData, topChatRooms, dateDisplay }), [statCards, lineData, donutData, topChatRooms, dateDisplay]);

  if (loading && !apiData) {
    return (
      <div className="flex flex-col gap-5 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 bg-app-bg/80 backdrop-blur-sm -mx-4 px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-app-text">분석 리포트</h1>
            <p className="text-xs font-normal text-app-text-muted">{dateDisplay}</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
            <ExportDropdown {...exportData} />
          </div>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><LineChartSkeleton /></div>
          <DonutChartSkeleton />
        </div>
        <Top5TableSkeleton />
      </div>
    );
  }

  if (error && !apiData) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 bg-app-bg/80 backdrop-blur-sm -mx-4 px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-app-text">분석 리포트</h1>
            <p className="text-xs font-normal text-app-text-muted">{dateDisplay}</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
            <ExportDropdown {...exportData} />
          </div>
        </header>
        <InlineError title="데이터를 불러오지 못했습니다" action={<button onClick={() => load(true)} className="px-3 py-1.5 text-xs bg-violet-500 text-white rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-transform">다시 시도</button>}>
          {error}
        </InlineError>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <header className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 bg-app-bg/80 backdrop-blur-sm -mx-4 px-4 py-3">
          <div>
            <h1 className="text-base font-bold tracking-tight text-app-text">분석 리포트</h1>
            <p className="text-xs font-normal text-app-text-muted">{dateDisplay}</p>
          </div>
          <div className="flex items-center gap-3">
            <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
            <ExportDropdown {...exportData} />
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-violet-500/15 bg-app-card">
          <PackageOpen className="h-10 w-10 text-app-text-muted" />
          <div className="text-center space-y-1">
            <p className="text-sm font-normal text-app-text-muted">아직 수집된 분석 데이터가 없습니다</p>
            <p className="text-xs font-normal text-app-text-muted/60">메시지를 발송하면 데이터가 자동으로 집계됩니다</p>
          </div>
          <button
            onClick={() => load(true)}
            className="px-4 py-2 text-xs font-medium bg-violet-500 text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 bg-app-bg/80 backdrop-blur-sm -mx-4 px-4 py-3 -mt-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-app-text">분석 리포트</h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isLive
                  ? "bg-green-500/10 text-green-400"
                  : "bg-amber-500/10 text-amber-400"
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${isLive ? "bg-green-400 animate-pulse" : "bg-amber-400"}`} />
              {isLive ? "실시간" : "샘플"}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs font-normal text-app-text-muted">{dateDisplay}</p>
            {lastUpdated && (
              <span className="text-xs text-app-text-muted/60">
                · 업데이트: {formatLastUpdated(lastUpdated)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 relative">
          <DateRangeSelector active={dateRange} onChange={handleDateRangeChange} />
          <button
            onClick={() => load(false)}
            disabled={refreshing}
            className={`p-1.5 rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-all hover:scale-[1.02] active:scale-[0.98] ${refreshing ? "animate-spin" : ""}`}
            title="새로고침 (R)"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <ExportDropdown {...exportData} />
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <AnimatePresence mode="wait">
        <motion.div
          key={dataKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <div className="lg:col-span-2">
            <LineChartCard data={lineData} />
          </div>
          <DonutChartCard data={donutData} total={donutTotal} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={dataKey}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <Top5Table data={topChatRooms} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
