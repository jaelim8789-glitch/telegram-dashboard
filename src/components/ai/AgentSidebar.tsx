"use client";

import { Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import type { Agent, AgentChat } from "@/lib/agent-api";

interface AgentSidebarProps {
  agents: Agent[];
  agentsLoading?: boolean;
  agentsError?: string | null;
  onRetryAgents?: () => void;
  activeAgentId: string | null;
  onSelectAgent: (id: string) => void;
  chats: AgentChat[];
  chatsLoading?: boolean;
  chatsError?: string | null;
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewAgent: () => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onDeleteAgent: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const ROLE_EMOJI: Record<string, string> = {
  marketing: "\u{1F4CA}",
  web_search: "\u{1F50D}",
  coding: "\u{1F4BB}",
  scheduler: "\u{23F0}",
};

function agentEmoji(role: string): string {
  return ROLE_EMOJI[role] || "\u{1F916}";
}

function expForLevel(level: number): number {
  return level * 100;
}

function ExpBar({ exp, level }: { exp: number; level: number }) {
  const needed = expForLevel(level);
  const pct = Math.min(100, Math.round((exp / needed) * 100));
  return (
    <div className="group relative flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-app-card-hover overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <Zap className="h-2.5 w-2.5 shrink-0 text-amber-500" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10">
        <div className="whitespace-nowrap rounded-lg bg-app-text px-2 py-1 text-[10px] text-app-card shadow-lg">
          Lv.{level} · EXP {exp}/{needed}
        </div>
      </div>
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  const colors: Record<number, string> = {
    1: "text-app-text-muted border-app-border",
    2: "text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/30",
    3: "text-blue-600 border-blue-300 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950/30",
    4: "text-violet-600 border-violet-300 bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:bg-violet-950/30",
    5: "text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-950/30",
  };
  const cls = colors[level] || colors[5];
  return (
    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}>
      Lv.{level}
    </span>
  );
}

export function AgentSidebar({
  agents,
  agentsLoading = false,
  agentsError = null,
  onRetryAgents,
  activeAgentId,
  onSelectAgent,
  chats,
  chatsLoading = false,
  chatsError = null,
  activeChatId,
  onSelectChat,
  onNewAgent,
  onNewChat,
  onDeleteChat,
  onDeleteAgent,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: AgentSidebarProps) {
  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-app-border bg-app-card py-3 min-h-0">
        <button
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
          title="사이드바 펼치기"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelectAgent(a.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs transition-colors ${
              activeAgentId === a.id
                ? "bg-app-primary/10 text-app-primary"
                : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
            }`}
            title={`${a.name} (Lv.${a.level})`}
          >
            {agentEmoji(a.role)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-[85vw] sm:w-64 max-w-[320px] sm:max-w-none shrink-0 flex-col border-r border-app-border bg-app-card h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-border px-3 py-2.5 min-h-[44px]">
        <span className="text-sm font-semibold text-app-text">AI Agent Hub</span>
        <div className="flex items-center gap-1">
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
              aria-label="사이드바 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors hidden sm:flex"
            title="사이드바 접기"
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </button>
        </div>
      </div>

      {/* Agent list */}
      <div className="border-b border-app-border px-2 py-2">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-app-text-muted">
            내 Agent
          </span>
          <button
            onClick={onNewAgent}
            className="flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
            aria-label="새 Agent"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-1 max-h-[40vh] overflow-y-auto scrollbar-thin">
          {agentsLoading ? (
            <div className="space-y-1.5 px-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : agentsError ? (
            <div className="px-2 py-2">
              <InlineError>{agentsError}</InlineError>
              {onRetryAgents && (
                <button
                  onClick={onRetryAgents}
                  className="mt-1.5 flex items-center gap-1 text-xs text-app-primary hover:underline"
                >
                  <Loader2 className="h-3 w-3" /> 다시 시도
                </button>
              )}
            </div>
          ) : agents.length === 0 ? (
            <div className="px-2 py-4 text-center">
              <Bot className="mx-auto h-6 w-6 text-app-text-subtle mb-1.5" />
              <p className="text-[11px] text-app-text-muted">Agent가 없습니다.</p>
              <button onClick={onNewAgent} className="mt-1 text-[11px] text-app-primary hover:underline font-medium">
                새로 만들기
              </button>
            </div>
          ) : (
            agents.map((a) => (
              <div key={a.id}>
                <div
                  className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer text-xs transition-colors ${
                    activeAgentId === a.id
                      ? "bg-app-primary/10 text-app-primary"
                      : "text-app-text hover:bg-app-card-hover"
                  }`}
                  onClick={() => onSelectAgent(a.id)}
                >
                  <span className="shrink-0 text-sm">{agentEmoji(a.role)}</span>
                  <span className="flex-1 truncate">{a.name}</span>
                  <LevelBadge level={a.level} />
                  <span className="shrink-0 rounded bg-app-card-hover px-1 py-0.5 text-[10px] text-app-text-muted">
                    {a.totalMessages}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteAgent(a.id); }}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-app-danger hover:bg-app-danger-muted transition-opacity"
                    aria-label={`${a.name} 삭제`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {activeAgentId === a.id && (
                  <div className="px-2 pb-1">
                    <ExpBar exp={a.exp} level={a.level} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat rooms */}
      <div className="flex flex-1 flex-col overflow-hidden px-2 py-2 min-h-0">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-app-text-muted">
            채팅방
          </span>
          {activeAgentId && (
            <button
              onClick={onNewChat}
              className="flex h-7 w-7 items-center justify-center rounded-md text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors"
              aria-label="새 채팅"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
          {chatsLoading ? (
            <div className="space-y-1.5 px-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : chatsError ? (
            <div className="px-2 py-2">
              <p className="text-[11px] text-app-text-muted">채팅을 불러올 수 없습니다.</p>
            </div>
          ) : chats.length === 0 ? (
            !activeAgentId ? (
              <div className="px-2 py-4 text-center">
                <p className="text-[11px] text-app-text-muted">Agent를 선택하세요</p>
              </div>
            ) : (
              <div className="px-2 py-4 text-center">
                <MessageSquare className="mx-auto h-5 w-5 text-app-text-subtle mb-1.5" />
                <p className="text-[11px] text-app-text-muted">채팅방이 없습니다.</p>
                <button onClick={onNewChat} className="mt-1 text-[11px] text-app-primary hover:underline font-medium">
                  새로 만들기
                </button>
              </div>
            )
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-1.5 rounded-lg px-2 py-2 cursor-pointer text-xs transition-colors ${
                  activeChatId === c.id
                    ? "bg-app-primary/10 text-app-primary"
                    : "text-app-text hover:bg-app-card-hover"
                }`}
                onClick={() => onSelectChat(c.id)}
              >
                <MessageSquare className="h-3 w-3 shrink-0 text-app-text-muted" />
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id); }}
                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-app-danger hover:bg-app-danger-muted transition-opacity"
                  aria-label={`${c.title} 삭제`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom settings */}
      <div className="border-t border-app-border px-3 py-2">
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]">
          <Settings className="h-3.5 w-3.5 shrink-0" />
          템플릿 마켓
        </button>
      </div>
    </div>
  );
}
