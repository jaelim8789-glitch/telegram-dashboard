"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download, Loader2 } from "lucide-react";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api";
import { cn } from "@/lib/cn";

interface CsvRow {
  phone: string;
  name?: string;
}

interface ImportResult {
  phone: string;
  status: "success" | "error";
  message: string;
}

export function BulkAccountImport() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fetchAccounts = useDashboardStore((s) => s.fetchAccounts);

  const parseCsv = useCallback((text: string) => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setError("CSV에 헤더를 포함한 데이터가 필요합니다. (phone, name)");
      return;
    }

    const header = lines[0].toLowerCase().trim();
    const hasName = header.includes("name");

    const parsed: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
      const phone = parts[0]?.replace(/\D/g, "");
      if (!phone || phone.length < 8) continue;
      parsed.push({ phone: `+${phone}`, name: parts[1] || undefined });
    }

    if (parsed.length === 0) {
      setError("유효한 전화번호를 찾을 수 없습니다. 국가 코드를 포함한 CSV 파일을 업로드하세요.");
      return;
    }

    setRows(parsed);
    setResults([]);
    setError(null);
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (file.name.endsWith(".csv") || text.includes(",")) {
        parseCsv(text);
      } else {
        const phones = text.split("\n").filter((l) => l.trim());
        const parsed = phones.map((p) => ({
          phone: `+${p.trim().replace(/\D/g, "")}`,
          name: undefined,
        })).filter((p) => p.phone.length > 3);
        setRows(parsed);
        setResults([]);
        setError(null);
      }
    };
    reader.readAsText(file, "UTF-8");
  }, [parseCsv]);

  const handleImport = async () => {
    if (importing || rows.length === 0) return;
    setImporting(true);
    setResults([]);
    setError(null);

    const results: ImportResult[] = [];
    for (const row of rows) {
      try {
        await api.createAccount({
          phone: row.phone,
          name: row.name,
        });
        results.push({ phone: row.phone, status: "success", message: "계정 생성됨" });
      } catch (err) {
        results.push({
          phone: row.phone,
          status: "error",
          message: err instanceof Error ? err.message : "알 수 없는 오류",
        });
      }
    }

    setResults(results);
    setImporting(false);
    await fetchAccounts();
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-app-text-muted">CSV로 계정 일괄 등록</span>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const blob = new Blob(["\uFEFFphone,name\n+821012345678,내계정1\n+821098765432,내계정2"], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "telemon-bulk-import-sample.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1 text-xs text-app-primary hover:underline"
        >
          <Download className="h-3 w-3" /> 샘플 CSV 다운로드
        </a>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-app-border bg-app-card/30 px-4 py-6 transition-colors hover:border-app-primary/40 hover:bg-app-card/50"
      >
        <Upload className="h-6 w-6 text-app-text-muted" />
        <p className="text-xs font-medium text-app-text-muted">
          {rows.length > 0 ? `${rows.length}개 전화번호 로드됨` : "CSV 파일을 클릭하여 업로드"}
        </p>
        <p className="text-[10px] text-app-text-subtle">phone, name (선택) 형식의 CSV</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {rows.length > 0 && (
        <div className="max-h-32 overflow-y-auto rounded-xl border border-app-border bg-app-card/30">
          {rows.slice(0, 50).map((row, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-app-border/30 px-3 py-1.5 text-xs text-app-text-muted last:border-0">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="font-mono">{row.phone}</span>
              {row.name && <span className="truncate">({row.name})</span>}
            </div>
          ))}
          {rows.length > 50 && (
            <p className="px-3 py-1.5 text-[10px] text-app-text-subtle">
              ...외 {rows.length - 50}개
            </p>
          )}
        </div>
      )}

      {rows.length > 0 && !importing && results.length === 0 && (
        <button
          type="button"
          onClick={handleImport}
          className="w-full rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          {rows.length}개 계정 일괄 등록
        </button>
      )}

      {importing && (
        <div className="flex items-center justify-center gap-2 py-3 text-xs text-app-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          계정 등록 중... ({results.length}/{rows.length})
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded-xl border border-app-border bg-app-card/30 p-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="flex items-center gap-1 text-xs text-app-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> {successCount}개 성공
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-app-danger">
                <XCircle className="h-3.5 w-3.5" /> {errorCount}개 실패
              </span>
            )}
          </div>
          {errorCount > 0 && (
            <div className="max-h-24 overflow-y-auto space-y-0.5">
              {results.filter((r) => r.status === "error").map((r, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-app-danger-muted">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span className="font-mono">{r.phone}</span>
                  <span className="text-app-text-muted">{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-app-danger/20 bg-app-danger-muted/10 px-3 py-2 text-xs text-app-danger">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  );
}
