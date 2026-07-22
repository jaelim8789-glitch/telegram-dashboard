"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { StatCardData, LineChartPoint, DonutSegment, TopChatRoom } from "./mockData";

interface ExportDropdownProps {
  statCards: StatCardData[];
  lineData: LineChartPoint[];
  donutData: DonutSegment[];
  topChatRooms: TopChatRoom[];
  dateDisplay: string;
}

function toBOM(str: string): Blob {
  const BOM = "\uFEFF";
  return new Blob([BOM + str], { type: "text/csv;charset=utf-8" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateCsv(props: ExportDropdownProps): string {
  const { statCards, lineData, donutData, topChatRooms, dateDisplay } = props;
  const rows: string[] = [];

  rows.push(`TeleMon 분석 리포트 - ${dateDisplay}`);
  rows.push("");

  rows.push("--- 요약 ---");
  rows.push("항목,값,증감률");
  for (const c of statCards) {
    const sign = c.positive ? "+" : "-";
    rows.push(`${c.label},${c.value},${sign}${c.change}%`);
  }

  rows.push("");
  rows.push("--- 메시지 발송 추이 ---");
  rows.push("날짜,발송,응답");
  for (const p of lineData) {
    rows.push(`${p.date},${p.발송},${p.응답}`);
  }

  rows.push("");
  rows.push("--- 채팅방 분포 ---");
  rows.push("유형,비율");
  for (const s of donutData) {
    rows.push(`${s.name},${s.value}%`);
  }

  rows.push("");
  rows.push("--- 인기 채팅방 TOP5 ---");
  rows.push("순위,채팅방,메시지 수,참여자,응답률");
  for (const r of topChatRooms) {
    rows.push(`${r.rank},${r.name},${r.messages},${r.participants},${r.responseRate}%`);
  }

  return rows.join("\n");
}

export function ExportDropdown(props: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [csvDone, setCsvDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleCsv() {
    const blob = toBOM(generateCsv(props));
    const now = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `telemon-analytics-${now}.csv`);
    setCsvDone(true);
    setTimeout(() => { setCsvDone(false); setOpen(false); }, 800);
  }

  function handlePdf() {
    window.print();
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        data-export-trigger
        className="inline-flex items-center gap-1.5 rounded-lg bg-app-card px-3.5 py-1.5 text-xs font-medium text-app-text-muted hover:bg-app-card-hover transition-colors"
      >
        <FileDown className="h-3.5 w-3.5" />
        <span>내보내기</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-44 rounded-xl border border-app-border bg-app-card shadow-xl z-50 overflow-hidden"
          >
            <button
              onClick={handleCsv}
              className="w-full px-4 py-2.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover transition-colors flex items-center gap-2"
            >
              {csvDone ? <Check className="h-3.5 w-3.5 text-green-400" /> : <span className="w-3.5" />}
              CSV로 내보내기
            </button>
            <button
              onClick={handlePdf}
              className="w-full px-4 py-2.5 text-left text-xs text-app-text-muted hover:bg-app-card-hover transition-colors flex items-center gap-2"
            >
              <span className="w-3.5" />
              PDF로 인쇄
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
