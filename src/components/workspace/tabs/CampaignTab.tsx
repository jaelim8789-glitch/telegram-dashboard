"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText, Plus, Search, X, Edit3, Trash2, Play, PauseCircle,
  CheckCircle2, XCircle, Clock, Target, BarChart3, MessageSquare,
  AlertCircle, RefreshCw, ExternalLink, TrendingUp, Users,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { Campaign } from "@/lib/api";
import { useDashboardStore } from "@/store/useDashboardStore";

const STATUS_CONFIG: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  draft: { label: "초안", tone: "neutral" },
  active: { label: "진행 중", tone: "info" },
  paused: { label: "일시 정지", tone: "warning" },
  completed: { label: "완료", tone: "success" },
  cancelled: { label: "취소됨", tone: "danger" },
};

const GOAL_LABELS: Record<string, string> = {
  awareness: "인지도",
  engagement: "참여",
  conversion: "전환",
  retention: "유지",
};

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onStatusChange,
  onViewBroadcasts,
}: {
  campaign: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
  onViewBroadcasts: () => void;
}) {
  const statusCfg = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft;
  const successRate = campaign.total_sent + campaign.total_failed > 0
    ? (campaign.total_sent / (campaign.total_sent + campaign.total_failed)) * 100
    : 0;

  return (
    <div className="rounded-xl border border-app-border bg-app-card p-4 transition-all hover:border-app-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-app-text">{campaign.name}</h3>
            <Badge tone={statusCfg.tone} className="shrink-0 text-[10px] px-1.5 py-0">
              {statusCfg.label}
            </Badge>
          </div>
          {campaign.description && (
            <p className="mt-0.5 text-xs text-app-text-muted line-clamp-1">{campaign.description}</p>
          )}
        </div>
        {campaign.goal && (
          <span className="shrink-0 rounded-full bg-app-card-hover px-2 py-0.5 text-[10px] font-medium text-app-text-secondary">
            {GOAL_LABELS[campaign.goal] ?? campaign.goal}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-app-bg p-2 text-center">
          <div className="text-sm font-bold tabular-nums text-app-text">{campaign.total_broadcasts}</div>
          <div className="text-[9px] text-app-text-muted">발송</div>
        </div>
        <div className="rounded-lg bg-app-bg p-2 text-center">
          <div className="text-sm font-bold tabular-nums text-app-success">{campaign.total_sent}</div>
          <div className="text-[9px] text-app-text-muted">성공</div>
        </div>
        <div className="rounded-lg bg-app-bg p-2 text-center">
          <div className="text-sm font-bold tabular-nums text-app-danger">{campaign.total_failed}</div>
          <div className="text-[9px] text-app-text-muted">실패</div>
        </div>
      </div>

      {/* Success rate bar */}
      {campaign.total_broadcasts > 0 && (
        <div className="mb-3">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-app-border">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                successRate >= 90 ? "bg-app-success" : successRate >= 70 ? "bg-app-warning" : "bg-app-danger"
              )}
              style={{ width: `${Math.max(successRate, 4)}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-app-text-muted">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-app-success" />
              {successRate.toFixed(0)}% 성공률
            </span>
            <span>{campaign.total_recipients}명 대상</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-app-border/50 pt-2">
        {campaign.status === "draft" && (
          <button onClick={() => onStatusChange("active")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-info hover:bg-app-info-muted/30 transition-colors">
            <Play className="h-3 w-3" /> 시작
          </button>
        )}
        {campaign.status === "active" && (
          <button onClick={() => onStatusChange("paused")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-warning hover:bg-app-warning-muted/30 transition-colors">
            <PauseCircle className="h-3 w-3" /> 일시 정지
          </button>
        )}
        {campaign.status === "paused" && (
          <button onClick={() => onStatusChange("active")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-info hover:bg-app-info-muted/30 transition-colors">
            <Play className="h-3 w-3" /> 재개
          </button>
        )}
        {(campaign.status === "active" || campaign.status === "paused") && (
          <button onClick={() => onStatusChange("completed")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-success hover:bg-app-success-muted/30 transition-colors">
            <CheckCircle2 className="h-3 w-3" /> 완료
          </button>
        )}
        <button onClick={onEdit}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">
          <Edit3 className="h-3 w-3" /> 수정
        </button>
        <button onClick={onViewBroadcasts}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover transition-colors">
          <MessageSquare className="h-3 w-3" /> 발송
        </button>
        <button onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-danger-muted/30 hover:text-app-danger transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function CampaignTab() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | undefined>();
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const tenantId = "default";

  const loadCampaigns = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await api.fetchCampaigns(tenantId, {
        search: search || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setCampaigns(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "캠페인을 불러오지 못했습니다.");
      setCampaigns([]);
    } finally { setLoading(false); }
  }, [tenantId, search, statusFilter]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const openCreate = () => {
    setEditingCampaign(undefined);
    setEditName(""); setEditDesc(""); setEditGoal("");
    setShowEditor(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setEditName(c.name); setEditDesc(c.description ?? ""); setEditGoal(c.goal ?? "");
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      if (editingCampaign) {
        const updated = await api.updateCampaign(tenantId, editingCampaign.id, {
          name: editName.trim(), description: editDesc.trim() || undefined, goal: editGoal || undefined,
        });
        setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast("success", "캠페인이 수정되었습니다.");
      } else {
        const created = await api.createCampaign(tenantId, {
          name: editName.trim(), description: editDesc.trim() || undefined, goal: editGoal || undefined,
        });
        setCampaigns((prev) => [created, ...prev]);
        toast("success", "캠페인이 생성되었습니다.");
      }
      setShowEditor(false);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCampaign(tenantId, deleteTarget.id);
      setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      toast("success", "캠페인이 삭제되었습니다.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally { setDeleteTarget(null); }
  };

  const handleStatusChange = async (campaign: Campaign, status: string) => {
    try {
      const updated = await api.updateCampaign(tenantId, campaign.id, { status });
      setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast("success", `캠페인 상태가 "${STATUS_CONFIG[status]?.label ?? status}(으)로 변경되었습니다."`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "상태 변경에 실패했습니다.");
    }
  };

  const handleViewBroadcasts = (campaign: Campaign) => {
    useDashboardStore.getState().setActiveTab("log");
  };

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === "active").length;
    const completed = campaigns.filter((c) => c.status === "completed").length;
    const totalSent = campaigns.reduce((s, c) => s + c.total_sent, 0);
    const totalFailed = campaigns.reduce((s, c) => s + c.total_failed, 0);
    return { active, completed, totalSent, totalFailed };
  }, [campaigns]);

  return (
    <div className="space-y-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">캠페인</h1>
          <p className="text-xs text-app-text-muted">발송 캠페인을 관리하고 성과를 추적하세요</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3.5 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">
          <Plus className="h-3.5 w-3.5" /> 새 캠페인
        </button>
      </header>

      {/* Stats bar */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="text-[11px] font-medium text-app-text-muted">전체</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{total}</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="text-[11px] font-medium text-app-text-muted">진행 중</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-info">{stats.active}</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="text-[11px] font-medium text-app-text-muted">완료</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-success">{stats.completed}</div>
          </div>
          <div className="rounded-xl border border-app-border bg-app-card p-3">
            <div className="text-[11px] font-medium text-app-text-muted">총 발송</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-app-text">{stats.totalSent}</div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEditor(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-app-text">{editingCampaign ? "캠페인 수정" : "새 캠페인"}</h2>
              <button onClick={() => setShowEditor(false)} className="text-app-text-muted hover:text-app-text"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-app-text">캠페인 이름</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="예: 7월 프로모션" className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-app-text">설명</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                  className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus-ring resize-none"
                  placeholder="캠페인에 대한 설명을 입력하세요..." />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-app-text">목표</label>
                <select value={editGoal} onChange={(e) => setEditGoal(e.target.value)}
                  className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus-ring">
                  <option value="">선택 안함</option>
                  <option value="awareness">인지도</option>
                  <option value="engagement">참여</option>
                  <option value="conversion">전환</option>
                  <option value="retention">유지</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} disabled={!editName.trim() || saving}
                  className="flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors">
                  {saving ? "저장 중..." : editingCampaign ? "수정 완료" : "캠페인 생성"}
                </button>
                <button onClick={() => setShowEditor(false)}
                  className="flex items-center gap-1.5 rounded-xl border border-app-border px-4 py-2 text-xs font-medium text-app-text hover:bg-app-card-hover transition-colors">취소</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="캠페인 검색..."
            className="w-full rounded-xl border border-app-border bg-app-surface py-2 pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-subtle focus-ring" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-subtle hover:text-app-text"><X className="h-3 w-3" /></button>}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text focus-ring">
          <option value="">전체 상태</option>
          <option value="draft">초안</option>
          <option value="active">진행 중</option>
          <option value="paused">일시 정지</option>
          <option value="completed">완료</option>
          <option value="cancelled">취소됨</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-app-danger" />
          <p className="text-sm font-medium text-app-danger">캠페인을 불러올 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted">{error}</p>
          <button onClick={loadCampaigns} className="mt-3 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">다시 시도</button>
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState icon={Target} title="캠페인이 없습니다"
          description={search || statusFilter ? "검색 조건에 맞는 캠페인이 없습니다." : "첫 번째 캠페인을 만들어보세요."}
          action={search || statusFilter ? undefined : { label: "새 캠페인", onClick: openCreate }} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteTarget(c)}
              onStatusChange={(status) => handleStatusChange(c, status)}
              onViewBroadcasts={() => handleViewBroadcasts(c)}
            />
          ))}
        </div>
      )}

      {total > 0 && <p className="text-center text-[11px] text-app-text-muted">총 {total}개 캠페인</p>}

      {deleteTarget && (
        <ConfirmDialog open title="캠페인 삭제" description={`"${deleteTarget.name}" 캠페인을 삭제하시겠습니까?`}
          confirmLabel="삭제" cancelLabel="취소" variant="danger"
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}