"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle, Play, Square, Download, Upload, AlignJustify } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopBarProps {
  onTest: () => void;
  onSave: () => Promise<void>;
  onPreview: () => void;
  onExport: () => void;
  onImport: () => void;
  onAutoLayout: () => void;
  saving: boolean;
  saved: boolean;
  errorCount: number;
  isPreviewing: boolean;
  selectedCount: number;
}

export function TopBar({
  onTest, onSave, onPreview, onExport, onImport, onAutoLayout,
  saving, saved, errorCount, isPreviewing, selectedCount,
}: TopBarProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("새 매크로");
  const ir = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ir.current) { ir.current.focus(); ir.current.select(); }
  }, [editing]);

  const hb = useCallback(() => { router.back(); }, [router]);

  return (
    <div className="flex items-center justify-between border-b border-violet-500/20 bg-app-surface px-4 py-2 gap-2">
      <div className="flex items-center gap-2">
        <button onClick={hb} className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform"><ArrowLeft className="h-4 w-4" /></button>
        {editing ? (
          <input ref={ir} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setEditing(false)}
            onKeyDown={(e) => { if (e.key==="Enter") setEditing(false); if (e.key==="Escape") { setName("새 매크로"); setEditing(false); } }}
            className="rounded-lg border border-violet-500/30 bg-app-bg px-2 py-1 text-sm font-medium text-app-text outline-none focus:border-violet-500/60"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-sm font-bold tracking-tight text-app-text hover:bg-app-card-hover">{name}</button>
        )}
        <div className="ml-1 flex items-center gap-1.5">
          {saving ? <><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"/><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400"/></span><span className="tabular-nums text-[10px] font-normal text-amber-400">저장 중</span></>
          : saved ? <><CheckCircle2 className="h-3 w-3 text-green-400"/><span className="tabular-nums text-[10px] font-normal text-green-400">저장됨</span></>
          : errorCount>0 ? <><AlertTriangle className="h-3 w-3 text-red-400"/><span className="tabular-nums text-[10px] font-normal text-red-400">{errorCount}개 미완성</span></>
          : isPreviewing ? <span className="text-[10px] font-normal text-green-400">미리보기 중</span>
          : <span className="text-[10px] font-normal text-app-text-muted">편집</span>}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {errorCount>0 && <span className="tabular-nums text-[10px] font-normal text-red-400/80"><AlertTriangle className="inline h-3 w-3"/>{errorCount}개 오류</span>}
        {selectedCount>1 && <span className="tabular-nums text-[10px] font-normal text-app-text-muted">{selectedCount}개 선택</span>}
        <button onClick={onExport} title="JSON 내보내기 ⌘E"
          className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform"><Download className="h-4 w-4"/></button>
        <button onClick={onImport} title="JSON 가져오기"
          className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform"><Upload className="h-4 w-4"/></button>
        <button onClick={onAutoLayout} title="자동 정렬"
          className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text hover:scale-[1.02] active:scale-[0.98] transition-transform"><AlignJustify className="h-4 w-4"/></button>
        <div className="w-px h-5 bg-violet-500/20 ml-1"/>
        <button onClick={onPreview}
          className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
            isPreviewing ? "border border-green-500 text-green-400 hover:bg-green-500/10" : "border border-violet-500/20 text-app-text-muted hover:border-violet-500/50"}`}
        >
          {isPreviewing ? <><Square className="inline h-3 w-3 mr-1"/>정지</> : <><Play className="inline h-3 w-3 mr-1"/>실행</>}
        </button>
        <button onClick={onTest}
          className="rounded-lg border border-violet-500/50 px-2.5 py-1.5 text-[11px] font-medium text-violet-400 hover:bg-violet-500/10 hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >테스트</button>
        <button onClick={onSave} disabled={saving}
          className="rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 px-3 py-1.5 text-[11px] font-medium text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
        >{saving?"저장 중":"저장"}</button>
      </div>
    </div>
  );
}
