"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanSearch, Users, MessageCircle, UserPlus, CheckCircle, AlertCircle,
  RefreshCw, ExternalLink, EyeOff, Ban, Clock,
} from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { useDashboardStore } from "@/store/useDashboardStore";
import * as api from "@/lib/api_link_inspector";
import type { LinkInspectionItem, LinkJoinResultItem, LinkStatus } from "@/lib/api_link_inspector";

const CHAT_TYPE_LABEL: Record<string, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};

const CHAT_TYPE_ICON: Record<string, typeof Users> = {
  group: Users,
  megagroup: Users,
  channel: MessageCircle,
};

const STATUS_LABEL: Record<LinkStatus, string> = {
  active: "활성",
  private: "비공개",
  dead: "죽은 링크",
  flood_wait: "속도 제한",
  error: "오류",
};

const STATUS_TONE: Record<LinkStatus, "success" | "warning" | "danger"> = {
  active: "success",
  private: "warning",
  dead: "danger",
  flood_wait: "warning",
  error: "danger",
};

function MemberCount({ count }: { count: number | null }) {
  if (count == null) return <span className="text-app-text-subtle">-</span>;
  return <span className="tabular-nums">{count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString()}</span>;
}

/** Splits a pasted blob of links on newlines/commas/whitespace and drops empties. */
function parsePastedLinks(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Client-side dedupe purely for the "N개 붙여넣음" count shown before submit —
 * the backend is authoritative and re-dedupes on its own normalized parse. */
function countUnique(links: string[]): number {
  return new Set(links.map((l) => l.trim().toLowerCase())).size;
}

export function LinkInspectorTab() {
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const [linksText, setLinksText] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [items, setItems] = useState<LinkInspectionItem[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hideDead, setHideDead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinResults, setJoinResults] = useState<LinkJoinResultItem[] | null>(null);

  const pastedLinks = parsePastedLinks(linksText);
  const uniquePastedCount = countUnique(pastedLinks);

  async function handleInspect() {
    if (!selectedAccountId || pastedLinks.length === 0 || inspecting) return;
    setInspecting(true);
    setError(null);
    setJoinResults(null);
    setSelected(new Set());
    try {
      const result = await api.inspectLinks(selectedAccountId, pastedLinks);
      setItems(result.items);
      setDuplicatesRemoved(result.duplicatesRemoved);
      if (result.items.length === 0) setError("검사할 유효한 링크가 없습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "링크 검사에 실패했습니다.");
    } finally {
      setInspecting(false);
    }
  }

  function toggleSelect(rawLink: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rawLink)) next.delete(rawLink); else next.add(rawLink);
      return next;
    });
  }

  function selectAllActive() {
    setSelected(new Set(items.filter((i) => i.accessible).map((i) => i.rawLink)));
  }
  function deselectAll() {
    setSelected(new Set());
  }

  async function handleAddToGroupManagement() {
    if (!selectedAccountId || selected.size === 0 || joining) return;
    const targets = items
      .filter((i) => selected.has(i.rawLink))
      .map((i) => ({ rawLink: i.rawLink, title: i.title || i.rawLink }));
    setJoining(true);
    setError(null);
    try {
      const results = await api.joinInspectedLinks(selectedAccountId, targets);
      setJoinResults(results);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 관리에 추가하지 못했습니다.");
    } finally {
      setJoining(false);
    }
  }

  const visibleItems = items.filter((i) => !(hideDead && i.status === "dead"));
  const deadCount = items.filter((i) => i.status === "dead").length;
  const selectableCount = items.filter((i) => i.accessible).length;

  const successCount = joinResults?.filter((r) => r.success).length ?? 0;
  const failCount = joinResults?.filter((r) => !r.success).length ?? 0;

  if (!selectedAccountId) {
    return (
      <Panel title="벌크 링크 검사" description="여러 t.me 링크를 한 번에 검사하고 그룹 관리에 추가합니다.">
        <div className="flex flex-col items-center justify-center py-12 text-app-text-muted">
          <ScanSearch className="mb-3 h-10 w-10" />
          <p className="text-sm">사이드바에서 계정을 먼저 선택해주세요.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Paste Panel */}
      <Panel
        title={<div className="flex items-center gap-2"><ScanSearch className="h-4 w-4 text-app-primary" /> 벌크 링크 검사</div>}
        description={`${selectedAccount?.name || selectedAccount?.phone} 계정으로 t.me 링크를 검사합니다.`}
      >
        <div className="space-y-3">
          <Field
            label="검사할 링크"
            hint="한 줄에 하나씩, 또는 쉼표로 구분해서 붙여넣으세요. (예: https://t.me/example, @example)"
          >
            <Textarea
              rows={6}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder={"https://t.me/example1\nhttps://t.me/+AbCdEfGhIj\n@example3"}
            />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-xs text-app-text-muted">
              {pastedLinks.length > 0 && `${pastedLinks.length}개 붙여넣음${uniquePastedCount !== pastedLinks.length ? ` (고유 ${uniquePastedCount}개)` : ""}`}
            </span>
            <Button variant="primary" onClick={handleInspect} disabled={inspecting || pastedLinks.length === 0}>
              {inspecting ? <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> 검사 중...</>
                : <><ScanSearch className="mr-1.5 h-4 w-4" /> 검사하기</>}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-app-danger/20 bg-app-danger-muted px-4 py-2.5 text-xs text-app-danger flex items-start gap-2"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Results */}
      <AnimatePresence>
        {joinResults && joinResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <Panel title={<div className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-app-primary" /> 그룹 관리 추가 결과</div>}>
              <div className="space-y-1.5">
                {joinResults.map((r, i) => (
                  <motion.div
                    key={r.chatId ?? i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs",
                      r.success ? "bg-app-success-muted/50 border border-app-success/10" : "bg-app-danger-muted/30 border border-app-danger/10"
                    )}
                  >
                    <span className="font-medium text-app-text truncate min-w-0 flex-1">{r.title}</span>
                    {r.success
                      ? <Badge tone="success"><CheckCircle className="mr-1 h-3 w-3" /> 추가 완료</Badge>
                      : <Badge tone="danger" className="max-w-[200px] text-right"><span className="truncate">{r.error || "실패"}</span></Badge>}
                  </motion.div>
                ))}
              </div>
              {(successCount > 0 || failCount > 0) && (
                <p className="mt-3 border-t border-app-border pt-3 text-xs text-app-text-muted">
                  {successCount > 0 && `${successCount}개 그룹 관리에 추가 완료`}
                  {successCount > 0 && failCount > 0 && " · "}
                  {failCount > 0 && `${failCount}개 실패`}
                </p>
              )}
            </Panel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {items.length > 0 && (
        <Panel
          title={<div className="flex items-center gap-2"><Users className="h-4 w-4 text-app-primary" /> 검사 결과 ({items.length})</div>}
          description={`제출 ${items.length + duplicatesRemoved}개 중 중복 ${duplicatesRemoved}개 제거됨. 활성 링크를 선택해 그룹 관리에 추가하세요.`}
        >
          {/* Filter bar */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setHideDead(!hideDead)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1",
                  hideDead ? "bg-app-primary text-white" : "bg-app-card-hover text-app-text-muted hover:text-app-text"
                )}
              >
                <EyeOff className="h-3 w-3" /> 죽은 링크 숨기기{deadCount > 0 ? ` (${deadCount})` : ""}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant="ghost" onClick={selectAllActive} disabled={selectableCount === 0} size="sm">전체 선택</Button>
              <Button variant="ghost" onClick={deselectAll} size="sm">선택 해제</Button>
              {selected.size > 0 && <span className="text-xs text-app-primary font-medium">{selected.size}개 선택됨</span>}
            </div>
          </div>

          {visibleItems.length === 0 && (
            <p className="py-6 text-center text-xs text-app-text-subtle">조건에 맞는 결과가 없습니다.</p>
          )}

          <div className="space-y-2">
            {visibleItems.map((item, i) => {
              const Icon = (item.chatType && CHAT_TYPE_ICON[item.chatType]) || ScanSearch;
              const disabled = !item.accessible;
              return (
                <motion.div key={item.rawLink} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <button
                    type="button"
                    onClick={() => !disabled && toggleSelect(item.rawLink)}
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200",
                      disabled
                        ? "cursor-not-allowed border-app-border/30 bg-app-card/30 opacity-60"
                        : selected.has(item.rawLink)
                          ? "border-app-primary bg-app-primary-muted shadow-sm shadow-app-primary/5"
                          : "border-app-border bg-app-card hover:border-app-primary/40 hover:bg-app-card-hover hover:shadow-sm"
                    )}
                  >
                    {/* Checkbox */}
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150",
                      selected.has(item.rawLink)
                        ? "border-app-primary bg-app-primary text-white scale-105"
                        : disabled ? "border-app-border/30 bg-app-bg/50" : "border-app-border bg-app-bg"
                    )}>
                      {selected.has(item.rawLink) && <CheckCircle className="h-3.5 w-3.5" />}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate text-sm font-medium text-app-text">{item.title || item.rawLink}</span>
                        {item.chatType && (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-app-card-hover px-1.5 py-0.5 text-[10px] font-medium text-app-text-muted">
                            <Icon className="h-3 w-3" /> {CHAT_TYPE_LABEL[item.chatType] ?? item.chatType}
                          </span>
                        )}
                        <Badge tone={STATUS_TONE[item.status]}>
                          {item.status === "flood_wait" && <Clock className="mr-1 h-3 w-3" />}
                          {item.status === "dead" && <Ban className="mr-1 h-3 w-3" />}
                          {STATUS_LABEL[item.status]}
                        </Badge>
                      </div>
                      {item.reason && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-app-text-muted">{item.reason}</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-app-text-subtle">
                        <span className="truncate max-w-[220px]">{item.rawLink}</span>
                        {item.username && (
                          <a
                            href={`https://t.me/${item.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-app-info hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> @{item.username}
                          </a>
                        )}
                        {item.participantsCount != null && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <MemberCount count={item.participantsCount} />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>

          {/* Add to Group Management button */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mt-4 flex items-center justify-between border-t border-app-border pt-4"
              >
                <span className="text-xs text-app-text-muted">{selected.size}개 링크 선택됨</span>
                <Button
                  variant="primary"
                  onClick={handleAddToGroupManagement}
                  disabled={joining}
                  className="shadow-lg shadow-app-primary/20"
                >
                  {joining ? (
                    <><RefreshCw className="mr-1.5 h-4 w-4 animate-spin" /> 추가 중...</>
                  ) : (
                    <><UserPlus className="mr-1.5 h-4 w-4" /> 선택한 링크를 그룹 관리에 추가 ({selected.size}개)</>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>
      )}

      {items.length === 0 && !inspecting && (
        <div className="flex flex-col items-center justify-center py-8 text-app-text-muted">
          <ScanSearch className="mb-2 h-8 w-8" />
          <p className="text-xs">링크를 붙여넣고 검사를 시작하세요.</p>
        </div>
      )}
    </div>
  );
}
