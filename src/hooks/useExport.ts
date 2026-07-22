"use client";

import { useState, useCallback, useEffect } from "react";
import { useToastStore } from "@/components/ui/GlobalToast";

export function useExport() {
  const toast = useToastStore(s => s.add);
  const [exporting, setExporting] = useState(false);

  const exportCSV = useCallback(async (data: Record<string, any>[], filename: string) => {
    setExporting(true);
    try {
      const headers = Object.keys(data[0] || {});
      const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast({ type: "success", title: `내보내기 완료`, message: `${data.length}행` });
    } catch { toast({ type: "error", title: "내보내기 실패" }); }
    setExporting(false);
  }, [toast]);

  const exportJSON = useCallback(async (data: any, filename: string) => {
    setExporting(true);
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast({ type: "success", title: "내보내기 완료" });
    } catch { toast({ type: "error", title: "내보내기 실패" }); }
    setExporting(false);
  }, [toast]);

  return { exportCSV, exportJSON, exporting };
}
