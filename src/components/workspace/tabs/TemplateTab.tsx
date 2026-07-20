"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText, Plus, Search, Star, Trash2, Edit3, Copy, X,
  Grid3X3, List, MessageSquare, AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { MessageTemplate } from "@/lib/api";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useFocusTrap } from "@/hooks/useFocusTrap";

const CATEGORIES = [
  { value: "", label: "전체" },
  { value: "general", label: "일반" },
  { value: "promotion", label: "프로모션" },
  { value: "notice", label: "공지" },
  { value: "welcome", label: "환영" },
  { value: "follow_up", label: "후속" },
  { value: "alert", label: "알림" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  general: "bg-app-info-muted text-app-info",
  promotion: "bg-app-warning-muted text-app-warning",
  notice: "bg-app-primary-muted/30 text-app-primary",
  welcome: "bg-app-success-muted text-app-success",
  follow_up: "bg-app-card-hover text-app-text-secondary",
  alert: "bg-app-danger-muted text-app-danger",
};

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopyContent,
  onInsert,
}: {
  template: MessageTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onCopyContent: () => void;
  onInsert?: () => void;
}) {
  const parsedVars = useMemo(() => {
    try {
      return JSON.parse(template.variables) as string[];
    } catch {
      return [];
    }
  }, [template.variables]);

  const categoryColor = CATEGORY_COLORS[template.category] ?? "bg-app-card-hover text-app-text-muted";

  return (
    <div className="group relative rounded-xl border border-app-border bg-app-card p-4 transition-all hover:border-app-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-medium text-app-text">{template.name}</h3>
            {template.is_favorite && (
              <Star className="h-3.5 w-3.5 fill-app-warning text-app-warning shrink-0" aria-label="즐겨찾기" />
            )}
          </div>
          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium", categoryColor)}>
            {CATEGORIES.find(c => c.value === template.category)?.label ?? template.category}
          </span>
        </div>
        <span className="shrink-0 text-[10px] text-app-text-subtle tabular-nums">
          사용 {template.use_count}회
        </span>
      </div>

      <p className="line-clamp-3 text-xs text-app-text-secondary leading-relaxed">
        {template.content}
      </p>

      {parsedVars.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {parsedVars.map((v) => (
            <code key={v} className="rounded bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-info font-mono">
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t border-app-border/50 pt-2">
        <button
          onClick={onCopyContent}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
          title="내용 복사"
        >
          <Copy className="h-3 w-3" /> 복사
        </button>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
          title="수정"
        >
          <Edit3 className="h-3 w-3" /> 수정
        </button>
        <button
          onClick={onToggleFavorite}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors",
            template.is_favorite
              ? "text-app-warning hover:bg-app-warning-muted/30"
              : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
          )}
          title={template.is_favorite ? "즐겨찾기 해제" : "즐겨찾기"}
        >
          <Star className={cn("h-3 w-3", template.is_favorite && "fill-app-warning")} />
        </button>
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-app-text-muted hover:bg-app-danger-muted/30 hover:text-app-danger transition-colors"
          title="삭제"
        >
          <Trash2 className="h-3 w-3" />
        </button>
        {onInsert && (
          <button
            onClick={onInsert}
            className="flex items-center gap-1 rounded-lg bg-app-primary px-2 py-1 text-[11px] font-medium text-white hover:bg-app-primary-hover transition-colors"
            title="발송에 사용"
          >
            <MessageSquare className="h-3 w-3" /> 사용
          </button>
        )}
      </div>
    </div>
  );
}

function TemplateEditor({
  template,
  onSave,
  onCancel,
  saving,
}: {
  template?: MessageTemplate;
  onSave: (data: { name: string; category: string; content: string; variables: string[] }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? "general");
  const [content, setContent] = useState(template?.content ?? "");
  const [variablesStr, setVariablesStr] = useState(() => {
    if (!template?.variables) return "";
    try {
      return (JSON.parse(template.variables) as string[]).join(", ");
    } catch {
      return "";
    }
  });

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;
    const variables = variablesStr
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    onSave({ name: name.trim(), category, content: content.trim(), variables });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-app-text">템플릿 이름</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 프로모션 안내"
          className="w-full"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-app-text">카테고리</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus-ring"
        >
          {CATEGORIES.filter((c) => c.value).map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-app-text">
          메시지 내용
          <span className="ml-1 text-app-text-muted font-normal">
            (변수는 {'{{변수명}}'} 형식으로 입력)
          </span>
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-text-subtle focus-ring resize-y"
          placeholder="메시지 내용을 입력하세요..."
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-app-text">
          변수 목록
          <span className="ml-1 text-app-text-muted font-normal">(쉼표로 구분)</span>
        </label>
        <Input
          value={variablesStr}
          onChange={(e) => setVariablesStr(e.target.value)}
          placeholder="예: 이름, 연락처, 날짜"
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !content.trim() || saving}
          className="flex items-center gap-1.5 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : template ? "수정 완료" : "템플릿 생성"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-xl border border-app-border px-4 py-2 text-xs font-medium text-app-text hover:bg-app-card-hover transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}

export function TemplateTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | undefined>();
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useFocusTrap(editorRef, showEditor, () => setShowEditor(false));

  // Get tenant_id from accounts (first account's association)
  const tenantId = useMemo(() => {
    // Use a global tenant ID resolution; fallback to "default"
    return "default";
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.fetchTemplates(tenantId, {
        search: search || undefined,
        category: categoryFilter || undefined,
        favorite_only: favoriteOnly,
        limit: 100,
      });
      setTemplates(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "템플릿을 불러오지 못했습니다.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, search, categoryFilter, favoriteOnly]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreate = () => {
    setEditingTemplate(undefined);
    setShowEditor(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSave = async (data: { name: string; category: string; content: string; variables: string[] }) => {
    setSaving(true);
    try {
      if (editingTemplate) {
        const updated = await api.updateTemplate(tenantId, editingTemplate.id, data);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        toast("success", "템플릿이 수정되었습니다.");
      } else {
        const created = await api.createTemplate(tenantId, data);
        setTemplates((prev) => [created, ...prev]);
        toast("success", "템플릿이 생성되었습니다.");
      }
      setShowEditor(false);
      setEditingTemplate(undefined);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteTemplate(tenantId, deleteTarget.id);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      toast("success", "템플릿이 삭제되었습니다.");
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleToggleFavorite = async (template: MessageTemplate) => {
    try {
      const updated = await api.updateTemplate(tenantId, template.id, { is_favorite: !template.is_favorite });
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      toast("error", "즐겨찾기 변경에 실패했습니다.");
    }
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast("success", "내용이 복사되었습니다.");
    }).catch(() => {
      toast("error", "복사에 실패했습니다.");
    });
  };

  const handleInsertIntoBroadcast = (template: MessageTemplate) => {
    const store = useDashboardStore.getState();
    store.setSendMessage(template.content);
    store.setActiveTab("send");
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-app-text">메시지 템플릿</h1>
          <p className="text-xs text-app-text-muted">자주 사용하는 메시지를 템플릿으로 관리하세요</p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-1.5 rounded-xl bg-app-primary px-3.5 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> 새 템플릿
        </button>
      </header>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEditor(false)} aria-hidden="true">
          <div
            ref={editorRef}
            role="dialog"
            aria-modal="true"
            aria-label={editingTemplate ? "템플릿 수정" : "새 템플릿"}
            className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-6 shadow-xl mx-auto max-h-[85dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-app-text">
                {editingTemplate ? "템플릿 수정" : "새 템플릿"}
              </h2>
              <button onClick={() => setShowEditor(false)} aria-label="닫기" className="text-app-text-muted hover:text-app-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSave}
              onCancel={() => setShowEditor(false)}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-text-subtle" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="템플릿 검색..."
            aria-label="템플릿 검색"
            className="w-full rounded-xl border border-app-border bg-app-surface py-2 pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-subtle focus-ring"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="검색 지우기" className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-subtle hover:text-app-text">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="카테고리 필터"
          className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-text focus-ring"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <button
          onClick={() => setFavoriteOnly(!favoriteOnly)}
          className={cn(
            "flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            favoriteOnly
              ? "border-app-warning/30 bg-app-warning-muted/20 text-app-warning"
              : "border-app-border text-app-text-muted hover:text-app-text"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", favoriteOnly && "fill-app-warning")} />
          즐겨찾기
        </button>

        <div className="flex items-center rounded-xl border border-app-border overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-app-card-hover text-app-text" : "text-app-text-muted hover:text-app-text")}
            title="그리드 보기"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("p-2 transition-colors", viewMode === "list" ? "bg-app-card-hover text-app-text" : "text-app-text-muted hover:text-app-text")}
            title="리스트 보기"
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-app-danger" />
          <p className="text-sm font-medium text-app-danger">템플릿을 불러올 수 없습니다</p>
          <p className="mt-1 text-xs text-app-text-muted">{error}</p>
          <button onClick={loadTemplates} className="mt-3 rounded-xl bg-app-primary px-4 py-2 text-xs font-medium text-white hover:bg-app-primary-hover transition-colors">
            다시 시도
          </button>
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="템플릿이 없습니다"
          description={search || categoryFilter ? "검색 조건에 맞는 템플릿이 없습니다." : "첫 번째 템플릿을 만들어보세요."}
          action={search || categoryFilter ? undefined : { label: "새 템플릿", onClick: handleCreate }}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => handleEdit(t)}
              onDelete={() => setDeleteTarget(t)}
              onToggleFavorite={() => handleToggleFavorite(t)}
              onCopyContent={() => handleCopyContent(t.content)}
              onInsert={() => handleInsertIntoBroadcast(t)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl border border-app-border px-4 py-3 hover:border-app-border-strong transition-colors"
            >
              <button
                onClick={() => handleToggleFavorite(t)}
                className="shrink-0"
                title={t.is_favorite ? "즐겨찾기 해제" : "즐겨찾기"}
              >
                <Star className={cn("h-4 w-4", t.is_favorite ? "fill-app-warning text-app-warning" : "text-app-text-subtle")} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-app-text">{t.name}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-medium", CATEGORY_COLORS[t.category] ?? "bg-app-card-hover text-app-text-muted")}>
                    {CATEGORIES.find(c => c.value === t.category)?.label ?? t.category}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-app-text-muted">{t.content}</p>
              </div>
              <span className="shrink-0 text-[10px] text-app-text-subtle tabular-nums">{t.use_count}회</span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => handleCopyContent(t.content)} className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" title="복사">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleEdit(t)} className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" title="수정">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(t)} className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-danger-muted/30 hover:text-app-danger transition-colors" title="삭제">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <p className="text-center text-[11px] text-app-text-muted">
          총 {total}개 템플릿
        </p>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="템플릿 삭제"
          description={`"${deleteTarget.name}" 템플릿을 삭제하시겠습니까?`}
          confirmLabel="삭제"
          cancelLabel="취소"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}