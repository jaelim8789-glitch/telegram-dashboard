"use client";

import { useState } from "react";
import { Layers, Plus, Pencil, Trash2, X, Check, Users, Save } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useAccountGroups, useCreateGroup, useUpdateGroup, useDeleteGroup, GROUP_COLORS } from "@/lib/accountGroups";
import { useDashboardStore } from "@/store/useDashboardStore";
import { getAccountDisplayName } from "@/types";

interface GroupManagementModalProps {
  open: boolean;
  onClose: () => void;
}

type EditState = {
  id: string | null;
  name: string;
  description: string;
  color: string;
};

const EMPTY_EDIT: EditState = { id: null, name: "", description: "", color: "#6366f1" };

export function GroupManagementModal({ open, onClose }: GroupManagementModalProps) {
  const groups = useAccountGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const accounts = useDashboardStore((s) => s.accounts);

  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);
  const [editing, setEditing] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);


  function handleStartCreate() {
    setEdit(EMPTY_EDIT);
    setEditing(true);
  }

  function handleStartEdit(g: typeof groups[number]) {
    setEdit({ id: g.id, name: g.name, description: g.description, color: g.color });
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEdit(EMPTY_EDIT);
  }

  function handleSave() {
    if (!edit.name.trim()) return;
    if (edit.id) {
      updateGroup(edit.id, { name: edit.name.trim(), description: edit.description.trim(), color: edit.color });
    } else {
      createGroup(edit.name.trim(), edit.description.trim(), edit.color);
    }
    handleCancelEdit();
  }

  function handleDelete(id: string) {
    deleteGroup(id);
    setDeleteConfirmId(null);
    if (expandedGroupId === id) setExpandedGroupId(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="계정 그룹 관리" size="lg"
      description="그룹을 만들어 계정을 팀/프로젝트 단위로 관리하세요."
    >
      {/* ── Edit form ── */}
      {editing && (
        <div className="mb-4 rounded-xl border border-app-border bg-app-bg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-app-text">
              {edit.id ? "그룹 수정" : "새 그룹"}
            </h3>
            <button type="button" onClick={handleCancelEdit}
              className="flex h-6 w-6 items-center justify-center rounded-md text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-app-text-muted">그룹 이름 *</label>
            <input
              type="text" value={edit.name}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="예: 영업팀, CS팀, 프로젝트A"
              className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-xs text-app-text placeholder:text-app-text-subtle outline-none focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-app-text-muted">설명 (선택)</label>
            <input
              type="text" value={edit.description}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              placeholder="그룹에 대한 설명"
              className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2 text-xs text-app-text placeholder:text-app-text-subtle outline-none focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-app-text-muted">색상</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setEdit({ ...edit, color: c.value })}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                    edit.color === c.value ? "ring-2 ring-offset-2 ring-app-border-strong scale-110" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                >
                  {edit.color === c.value && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={!edit.name.trim()}>
              <Save className="h-3.5 w-3.5" />
              {edit.id ? "수정" : "생성"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Group list ── */}
      <div className="space-y-2">
        {groups.length === 0 && !editing && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Layers className="mb-3 h-10 w-10 text-app-text-subtle" />
            <p className="text-sm font-medium text-app-text">아직 그룹이 없습니다</p>
            <p className="mt-1 text-xs text-app-text-muted">계정을 그룹으로 묶어 팀/프로젝트별로 관리하세요.</p>
            <Button variant="primary" size="sm" className="mt-4" onClick={handleStartCreate}>
              <Plus className="h-3.5 w-3.5" /> 첫 그룹 만들기
            </Button>
          </div>
        )}

        {groups.map((g) => {
          const isExpanded = expandedGroupId === g.id;
          const groupAccounts = accounts.filter((a) => g.accountIds.includes(a.id));
          return (
            <div key={g.id} className="rounded-xl border border-app-border overflow-hidden transition-colors hover:border-app-border-strong">
              {/* Group header */}
              <div
                role="button" tabIndex={0}
                onClick={() => setExpandedGroupId(isExpanded ? null : g.id)}
                onKeyDown={(e) => e.key === "Enter" && setExpandedGroupId(isExpanded ? null : g.id)}
                className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:bg-app-card-hover transition-colors"
              >
                <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-app-text">{g.name}</span>
                    <Badge tone="neutral" className="text-[9px] px-1.5 py-0">
                      {g.accountIds.length}개
                    </Badge>
                  </div>
                  {g.description && (
                    <p className="truncate text-[11px] text-app-text-muted">{g.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(g)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-text hover:bg-app-card transition-colors"
                    title="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  {deleteConfirmId === g.id ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-app-danger hover:bg-app-danger-muted transition-colors"
                        title="삭제 확인"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card transition-colors"
                        title="취소"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(g.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-app-text-muted hover:text-app-danger hover:bg-app-danger-muted transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: members */}
              {isExpanded && (
                <div className="border-t border-app-border bg-app-bg/50 px-3.5 py-3 space-y-2">
                  {groupAccounts.length === 0 ? (
                    <p className="py-3 text-center text-xs text-app-text-muted italic">그룹에 속한 계정이 없습니다.</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {groupAccounts.map((a) => (
                        <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-app-card-hover transition-colors">
                          <Users className="h-3.5 w-3.5 text-app-text-muted shrink-0" />
                          <span className="text-xs text-app-text truncate flex-1">{getAccountDisplayName(a)}</span>
                          <span className="text-[10px] text-app-text-muted">{a.phone}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {groups.length > 0 && !editing && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-border py-2.5 text-xs font-medium text-app-text-muted hover:border-app-border-strong hover:text-app-text transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> 새 그룹 추가
          </button>
        )}
      </div>
    </Modal>
  );
}
