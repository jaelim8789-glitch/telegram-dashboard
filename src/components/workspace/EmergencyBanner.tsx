"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Eye, FileText } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";

export function EmergencyBanner() {
  const accounts = useDashboardStore((s) => s.accounts);
  const accountsError = useDashboardStore((s) => s.accountsError);
  const setActiveTab = useDashboardStore((s) => s.setActiveTab);

  const failureRate = useMemo(() => {
    if (!accounts.length) return 0;
    return accounts.filter(a => a.status === "banned" || a.status === "suspended").length / accounts.length;
  }, [accounts]);

  const isCritical = failureRate > 0.2 || !!accountsError;
  const errorCount = accounts.filter(a => a.status === "banned" || a.status === "suspended").length;

  return (
    <AnimatePresence>
      {isCritical && (
        <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }} className="relative overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-b-2 border-yellow-400/60 shadow-lg">
          <div className="relative mx-auto flex items-center justify-between gap-3 px-4 py-2.5 max-w-7xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20"><AlertTriangle className="h-4 w-4 text-white" /></div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white drop-shadow-sm">⚠️ 비정상 상태 감지</p>
                <p className="text-[11px] text-red-100/90">{accountsError ? accountsError : `현재 ${errorCount}개 계정에 오류가 발생했습니다`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => setActiveTab("health" as any)} className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/25 transition-colors"><Eye className="h-3.5 w-3.5" />계정 확인</button>
              <button type="button" onClick={() => setActiveTab("log" as any)} className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/25 transition-colors"><FileText className="h-3.5 w-3.5" />로그 보기</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
