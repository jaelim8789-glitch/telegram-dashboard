"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, FileText, RefreshCw,
  Loader2, CheckCircle2, AlertTriangle, Settings2, History, Shield,
  Clock, Trash2,
} from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import * as api from "@/lib/api";
import { exportCSV, exportJSON, importJSON, backupData, restoreData } from "@/lib/exportUtils";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export default function DataSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [retentionDays, setRetentionDays] = useState(90);
  const [snapshots, setSnapshots] = useState<{ id: string; label: string; created_at: string }[]>([]);
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exportStatus, setExportStatus] = useState("");

  useEffect(() => {
    setRetentionDays(Number(localStorage.getItem("telemon-retention") || "90"));
    // Load snapshots from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("telemon-snapshots") || "[]");
      setSnapshots(saved);
    } catch {}
  }, []);

  function exportLogsCSV() {
    setExporting(true);
    api.fetchLogs({ days: 7 }).then((logs) => {
      const headers = ["ID", "메시지", "상태", "계정", "생성일"];
      const rows = logs.slice(0, 1000).map((l) => [
        l.id, l.message.slice(0, 50), l.status, l.accountId || "", l.createdAt,
      ]);
      exportCSV(headers, rows, `telemon-logs-${new Date().toISOString().slice(0, 10)}`);
      toast("success", `${rows.length}건 CSV 내보내기 완료`);
    }).catch(() => toast("error", "내보내기 실패")).finally(() => setExporting(false));
  }

  function exportLogsJSON() {
    setExporting(true);
    api.fetchLogs({ days: 7 }).then((logs) => {
      exportJSON(logs.slice(0, 1000), `telemon-logs-${new Date().toISOString().slice(0, 10)}`);
      toast("success", `${Math.min(logs.length, 1000)}건 JSON 내보내기 완료`);
    }).catch(() => toast("error", "내보내기 실패")).finally(() => setExporting(false));
  }

  async function importGroupsExcel() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      // Parse CSV and import groups
      try {
        const text = await file.text();
        const lines = text.split("\n").filter(Boolean);
        const groups = lines.slice(1).map((line) => {
          const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          return { title: cols[0] || "Imported Group", externalLink: cols[1] || "" };
        });
        void groups;
        toast("error", "그룹 가져오기 API가 아직 준비되지 않았습니다.");
      } catch {
        toast("error", "파일을 읽을 수 없습니다. CSV 형식이어야 합니다.");
      } finally { setImporting(false); }
    };
    input.click();
  }

  function saveRetention() {
    try { localStorage.setItem("telemon-retention", String(retentionDays)); } catch {}
    toast("success", `데이터 보존 기간이 ${retentionDays}일로 설정되었습니다.`);
  }

  function exportAllSettings() {
    backupData("telemon-", `telemon-backup-${new Date().toISOString().slice(0, 10)}`)
      .then((count) => toast("success", `${count}개 설정 내보내기 완료`))
      .catch(() => toast("error", "내보내기 실패"));
  }

  async function importAllSettings() {
    const count = await restoreData("telemon-");
    if (count > 0) {
      toast("success", `${count}개 설정 복원 완료. 페이지를 새로고침합니다.`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast("error", "복원할 데이터가 없습니다.");
    }
  }

  function createSnapshot() {
    const label = prompt("스냅샷 이름을 입력하세요:", `백업 ${new Date().toLocaleDateString("ko-KR")}`);
    if (!label) return;
    const snapshot = { id: Date.now().toString(), label, created_at: new Date().toISOString(), data: {} as Record<string, string> };
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("telemon-"));
      for (const k of keys) {
        const v = localStorage.getItem(k);
        if (v) snapshot.data[k] = v;
      }
      const updated = [snapshot, ...snapshots].slice(0, 20);
      localStorage.setItem("telemon-snapshots", JSON.stringify(updated));
      setSnapshots(updated);
      toast("success", `"${label}" 스냅샷 저장 완료 (${Object.keys(snapshot.data).length}개 설정)`);
    } catch {
      toast("error", "스냅샷 저장 실패");
    }
  }

  function restoreSnapshot(id: string) {
    const snap = snapshots.find((s: any) => s.id === id) as any;
    if (!snap || !snap.data) return;
    if (!confirm(`"${snap.label}" (${new Date(snap.created_at).toLocaleDateString("ko-KR")}) 스냅샷으로 복원하시겠습니까?`)) return;
    try {
      for (const [k, v] of Object.entries(snap.data)) {
        localStorage.setItem(k, v as string);
      }
      toast("success", `"${snap.label}" 복원 완료. 새로고침합니다.`);
      setTimeout(() => window.location.reload(), 1500);
    } catch { toast("error", "복원 실패"); }
  }

  function deleteSnapshot(id: string) {
    const updated = snapshots.filter((s: any) => s.id !== id);
    localStorage.setItem("telemon-snapshots", JSON.stringify(updated));
    setSnapshots(updated);
    toast("success", "스냅샷이 삭제되었습니다.");
  }

  return (
    <AdminGuard>
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-xs text-app-text-muted hover:text-app-text">
          <ArrowLeft className="h-3.5 w-3.5" /> 대시보드로
        </Link>
        <h1 className="text-lg font-bold text-app-text">데이터 관리</h1>

        {/* CSV/JSON Export */}
        <Panel title={<div className="flex items-center gap-2"><Download className="h-4 w-4 text-app-primary" />발송 내역 내보내기</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">최근 7일 발송 내역을 CSV 또는 JSON으로 내보냅니다 (최대 1,000건).</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={exportLogsCSV} loading={exporting} disabled={exporting}>
                <FileText className="h-4 w-4" /> CSV 내보내기
              </Button>
              <Button variant="secondary" onClick={exportLogsJSON} loading={exporting} disabled={exporting}>
                <FileText className="h-4 w-4" /> JSON 내보내기
              </Button>
            </div>
          </div>
        </Panel>

        {/* Excel Import */}
        <Panel title={<div className="flex items-center gap-2"><Upload className="h-4 w-4 text-app-primary" />그룹 멤버 가져오기</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">CSV 파일을 업로드하여 그룹을 일괄 등록합니다. 첫 번째 열=그룹명, 두 번째 열=링크(선택).</p>
            <Button variant="primary" onClick={importGroupsExcel} loading={importing} disabled={importing}>
              <FileSpreadsheet className="h-4 w-4" /> CSV 파일 선택
            </Button>
          </div>
        </Panel>

        {/* Data Retention */}
        <Panel title={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-app-primary" />데이터 보존 정책</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">자동 삭제 기간을 설정합니다. 설정된 기간이 지난 로그는 자동 정리됩니다.</p>
            <div className="flex items-center gap-2">
              <select value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text">
                <option value={30}>30일</option>
                <option value={90}>90일</option>
                <option value={180}>180일</option>
                <option value={365}>1년</option>
              </select>
              <Button variant="primary" onClick={saveRetention}>
                <Shield className="h-4 w-4" /> 저장
              </Button>
            </div>
          </div>
        </Panel>

        {/* Full Backup/Restore */}
        <Panel title={<div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-app-primary" />전체 설정 백업/복원</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">모든 계정 설정·템플릿·규칙을 JSON 파일로 백업하거나 복원합니다.</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={exportAllSettings}>
                <Download className="h-4 w-4" /> 설정 내보내기
              </Button>
              <Button variant="secondary" onClick={importAllSettings}>
                <Upload className="h-4 w-4" /> 설정 가져오기
              </Button>
            </div>
          </div>
        </Panel>

        {/* Time Machine */}
        <Panel title={<div className="flex items-center gap-2"><History className="h-4 w-4 text-app-primary" />변경 이력 타임머신</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">설정 상태를 스냅샷으로 저장하고, 과거 상태로 되돌릴 수 있습니다. 스냅샷은 기기에 로컬 저장됩니다.</p>
            <Button variant="primary" onClick={createSnapshot}>
              <RefreshCw className="h-4 w-4" /> 지금 스냅샷 저장
            </Button>
            {snapshots.length > 0 ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {snapshots.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border border-app-border bg-app-card px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-app-text truncate">{s.label}</p>
                      <p className="text-[10px] text-app-text-muted">{new Date(s.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => restoreSnapshot(s.id)} className="rounded-lg px-2 py-1 text-[10px] text-app-primary hover:bg-app-primary/10 transition-colors">복원</button>
                      <button onClick={() => deleteSnapshot(s.id)} className="rounded-lg px-2 py-1 text-[10px] text-app-danger hover:bg-app-danger/10 transition-colors">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-app-text-muted py-2">저장된 스냅샷이 없습니다. &quot;지금 스냅샷 저장&quot;을 눌러주세요.</p>
            )}
          </div>
        </Panel>
      </div>
    </AdminGuard>
  );
}
