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
    } catch (e) { console.warn('Unhandled error in page', e) }
  }, []);

  function exportLogsCSV() {
    setExporting(true);
    api.fetchLogs({ days: 7 }).then((logs) => {
      const headers = ["ID", "ë©”ì‹œì§€", "?íƒœ", "ê³„ì •", "?ì„±??];
      const rows = logs.slice(0, 1000).map((l) => [
        l.id, l.message.slice(0, 50), l.status, l.accountId || "", l.createdAt,
      ]);
      exportCSV(headers, rows, `telemon-logs-${new Date().toISOString().slice(0, 10)}`);
      toast("success", `${rows.length}ê±?CSV ?´ë³´?´ê¸° ?„ë£Œ`);
    }).catch(() => toast("error", "?´ë³´?´ê¸° ?¤íŒ¨")).finally(() => setExporting(false));
  }

  function exportLogsJSON() {
    setExporting(true);
    api.fetchLogs({ days: 7 }).then((logs) => {
      exportJSON(logs.slice(0, 1000), `telemon-logs-${new Date().toISOString().slice(0, 10)}`);
      toast("success", `${Math.min(logs.length, 1000)}ê±?JSON ?´ë³´?´ê¸° ?„ë£Œ`);
    }).catch(() => toast("error", "?´ë³´?´ê¸° ?¤íŒ¨")).finally(() => setExporting(false));
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
        toast("error", "ê·¸ë£¹ ê°€?¸ì˜¤ê¸?APIê°€ ?„ì§ ì¤€ë¹„ë˜ì§€ ?Šì•˜?µë‹ˆ??");
      } catch {
        toast("error", "?Œì¼???½ì„ ???†ìŠµ?ˆë‹¤. CSV ?•ì‹?´ì–´???©ë‹ˆ??");
      } finally { setImporting(false); }
    };
    input.click();
  }

  function saveRetention() {
    try { localStorage.setItem("telemon-retention", String(retentionDays)); } catch (e) { console.warn('Unhandled error in page', e) }
    toast("success", `?°ì´??ë³´ì¡´ ê¸°ê°„??${retentionDays}?¼ë¡œ ?¤ì •?˜ì—ˆ?µë‹ˆ??`);
  }

  function exportAllSettings() {
    backupData("telemon-", `telemon-backup-${new Date().toISOString().slice(0, 10)}`)
      .then((count) => toast("success", `${count}ê°??¤ì • ?´ë³´?´ê¸° ?„ë£Œ`))
      .catch(() => toast("error", "?´ë³´?´ê¸° ?¤íŒ¨"));
  }

  async function importAllSettings() {
    const count = await restoreData("telemon-");
    if (count > 0) {
      toast("success", `${count}ê°??¤ì • ë³µì› ?„ë£Œ. ?˜ì´ì§€ë¥??ˆë¡œê³ ì¹¨?©ë‹ˆ??`);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      toast("error", "ë³µì›???°ì´?°ê? ?†ìŠµ?ˆë‹¤.");
    }
  }

  function createSnapshot() {
    const label = prompt("?¤ëƒ…???´ë¦„???…ë ¥?˜ì„¸??", `ë°±ì—… ${new Date().toLocaleDateString("ko-KR")}`);
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
      toast("success", `"${label}" ?¤ëƒ…???€???„ë£Œ (${Object.keys(snapshot.data).length}ê°??¤ì •)`);
    } catch {
      toast("error", "?¤ëƒ…???€???¤íŒ¨");
    }
  }

  function restoreSnapshot(id: string) {
    const snap = snapshots.find((s: any) => s.id === id) as any;
    if (!snap || !snap.data) return;
    if (!confirm(`"${snap.label}" (${new Date(snap.created_at).toLocaleDateString("ko-KR")}) ?¤ëƒ…?·ìœ¼ë¡?ë³µì›?˜ì‹œê² ìŠµ?ˆê¹Œ?`)) return;
    try {
      for (const [k, v] of Object.entries(snap.data)) {
        localStorage.setItem(k, v as string);
      }
      toast("success", `"${snap.label}" ë³µì› ?„ë£Œ. ?ˆë¡œê³ ì¹¨?©ë‹ˆ??`);
      setTimeout(() => window.location.reload(), 1500);
    } catch { toast("error", "ë³µì› ?¤íŒ¨"); }
  }

  function deleteSnapshot(id: string) {
    const updated = snapshots.filter((s: any) => s.id !== id);
    localStorage.setItem("telemon-snapshots", JSON.stringify(updated));
    setSnapshots(updated);
    toast("success", "?¤ëƒ…?·ì´ ?? œ?˜ì—ˆ?µë‹ˆ??");
  }

  return (
    <AdminGuard>
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1.5 text-xs text-app-text-muted hover:text-app-text">
          <ArrowLeft className="h-3.5 w-3.5" /> ?€?œë³´?œë¡œ
        </Link>
        <h1 className="text-lg font-bold text-app-text">?°ì´??ê´€ë¦?/h1>

        {/* CSV/JSON Export */}
        <Panel title={<div className="flex items-center gap-2"><Download className="h-4 w-4 text-app-primary" />ë°œì†¡ ?´ì—­ ?´ë³´?´ê¸°</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">ìµœê·¼ 7??ë°œì†¡ ?´ì—­??CSV ?ëŠ” JSON?¼ë¡œ ?´ë³´?…ë‹ˆ??(ìµœë? 1,000ê±?.</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={exportLogsCSV} loading={exporting} disabled={exporting}>
                <FileText className="h-4 w-4" /> CSV ?´ë³´?´ê¸°
              </Button>
              <Button variant="secondary" onClick={exportLogsJSON} loading={exporting} disabled={exporting}>
                <FileText className="h-4 w-4" /> JSON ?´ë³´?´ê¸°
              </Button>
            </div>
          </div>
        </Panel>

        {/* Excel Import */}
        <Panel title={<div className="flex items-center gap-2"><Upload className="h-4 w-4 text-app-primary" />ê·¸ë£¹ ë©¤ë²„ ê°€?¸ì˜¤ê¸?/div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">CSV ?Œì¼???…ë¡œ?œí•˜??ê·¸ë£¹???¼ê´„ ?±ë¡?©ë‹ˆ?? ì²?ë²ˆì§¸ ??ê·¸ë£¹ëª? ??ë²ˆì§¸ ??ë§í¬(? íƒ).</p>
            <Button variant="primary" onClick={importGroupsExcel} loading={importing} disabled={importing}>
              <FileSpreadsheet className="h-4 w-4" /> CSV ?Œì¼ ? íƒ
            </Button>
          </div>
        </Panel>

        {/* Data Retention */}
        <Panel title={<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-app-primary" />?°ì´??ë³´ì¡´ ?•ì±…</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">?ë™ ?? œ ê¸°ê°„???¤ì •?©ë‹ˆ?? ?¤ì •??ê¸°ê°„??ì§€??ë¡œê·¸???ë™ ?•ë¦¬?©ë‹ˆ??</p>
            <div className="flex items-center gap-2">
              <select value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="rounded-lg border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text">
                <option value={30}>30??/option>
                <option value={90}>90??/option>
                <option value={180}>180??/option>
                <option value={365}>1??/option>
              </select>
              <Button variant="primary" onClick={saveRetention}>
                <Shield className="h-4 w-4" /> ?€??
              </Button>
            </div>
          </div>
        </Panel>

        {/* Full Backup/Restore */}
        <Panel title={<div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-app-primary" />?„ì²´ ?¤ì • ë°±ì—…/ë³µì›</div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">ëª¨ë“  ê³„ì • ?¤ì •Â·?œí”Œë¦¿Â·ê·œì¹™ì„ JSON ?Œì¼ë¡?ë°±ì—…?˜ê±°??ë³µì›?©ë‹ˆ??</p>
            <div className="flex gap-2">
              <Button variant="primary" onClick={exportAllSettings}>
                <Download className="h-4 w-4" /> ?¤ì • ?´ë³´?´ê¸°
              </Button>
              <Button variant="secondary" onClick={importAllSettings}>
                <Upload className="h-4 w-4" /> ?¤ì • ê°€?¸ì˜¤ê¸?
              </Button>
            </div>
          </div>
        </Panel>

        {/* Time Machine */}
        <Panel title={<div className="flex items-center gap-2"><History className="h-4 w-4 text-app-primary" />ë³€ê²??´ë ¥ ?€?„ë¨¸??/div>}>
          <div className="space-y-3">
            <p className="text-xs text-app-text-muted">?¤ì • ?íƒœë¥??¤ëƒ…?·ìœ¼ë¡??€?¥í•˜ê³? ê³¼ê±° ?íƒœë¡??˜ëŒë¦????ˆìŠµ?ˆë‹¤. ?¤ëƒ…?·ì? ê¸°ê¸°??ë¡œì»¬ ?€?¥ë©?ˆë‹¤.</p>
            <Button variant="primary" onClick={createSnapshot}>
              <RefreshCw className="h-4 w-4" /> ì§€ê¸??¤ëƒ…???€??
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
                      <button onClick={() => restoreSnapshot(s.id)} className="rounded-lg px-2 py-1 text-[10px] text-app-primary hover:bg-app-primary/10 transition-colors">ë³µì›</button>
                      <button onClick={() => deleteSnapshot(s.id)} className="rounded-lg px-2 py-1 text-[10px] text-app-danger hover:bg-app-danger/10 transition-colors">?? œ</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-app-text-muted py-2">?€?¥ëœ ?¤ëƒ…?·ì´ ?†ìŠµ?ˆë‹¤. &quot;ì§€ê¸??¤ëƒ…???€??quot;???ŒëŸ¬ì£¼ì„¸??</p>
            )}
          </div>
        </Panel>
      </div>
    </AdminGuard>
  );
}
