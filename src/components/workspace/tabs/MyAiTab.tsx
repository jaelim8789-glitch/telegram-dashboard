"use client";



import { useState, useEffect, useCallback } from "react";

import { Bot, MessageSquare, MessageCircle, Megaphone, BarChart3, Cpu, Gauge, Sparkles, Loader2, ChevronRight, Users, Flame, Zap, ChevronDown, ChevronUp } from "lucide-react";

import Link from "next/link";

import { cn } from "@/lib/cn";

import { getTokenBalance, checkIn, getStreak, getQuests } from "@/lib/token-system";

import { AiReplyAssistantTab } from "@/components/workspace/tabs/AiReplyAssistantTab";

import { AiBroadcastAssistantTab } from "@/components/workspace/tabs/AiBroadcastAssistantTab";

import { AiOperationsReportTab } from "@/components/workspace/tabs/AiOperationsReportTab";

import { AiOperationsCenterTab } from "@/components/workspace/tabs/AiOperationsCenterTab";

import { AiUsageTab } from "@/components/workspace/tabs/AiUsageTab";

import { AiContentStudioTab } from "@/components/workspace/tabs/AiContentStudioTab";

import { AiEmployeeTab } from "@/components/workspace/tabs/AiEmployeeTab";

import { InlineAiChat } from "@/components/ai/InlineAiChat";

import * as agentApi from "@/lib/agent-api";

import { useToast } from "@/components/ui/Toast";



function AgentLevelBadge({ level, exp }: { level: number; exp: number }) {

  return (

    <span className="flex shrink-0 items-center gap-1 rounded-full bg-app-primary/10 px-2 py-0.5 text-[10px] font-semibold text-app-primary">

      Lv.{level}

      <span className="font-normal text-app-text-subtle">{exp} EXP</span>

    </span>

  );

}



const SUB_TABS = [

  { id: "chat", label: "AI ???, shortLabel: "???, icon: MessageSquare, desc: "AI ?영 비서? ?유? ??? },

  { id: "reply", label: "AI ?장", shortLabel: "?장", icon: MessageCircle, desc: "?마???장 추천" },

  { id: "broadcast", label: "AI 발송", shortLabel: "발송", icon: Megaphone, desc: "AI가 ?성??발송 메시지" },

  { id: "contentstudio", label: "콘텐??튜?오", shortLabel: "콘텐?, icon: Sparkles, desc: "AI 콘텐??성 & ?약 발송" },

  { id: "operations", label: "AI 리포??, shortLabel: "리포??, icon: BarChart3, desc: "?영 리포????사?트" },

  { id: "opscenter", label: "AI ?영 ?터", shortLabel: "?영", icon: Gauge, desc: "?합 ?영 ?황" },

  { id: "usage", label: "AI ?용??, shortLabel: "?용??, icon: Cpu, desc: "AI 기능 ?용 ?계" },

  { id: "employee", label: "Employee Mode", shortLabel: "직원", icon: Users, desc: "그룹 AI ?정 ??약 메시지" },

];



export function MyAiTab() {

  const [activeSub, setActiveSub] = useState("chat");

  const [streak, setStreak] = useState(0);

  const [streakReward, setStreakReward] = useState(0);

  const [showReward, setShowReward] = useState(false);

  const [balance, setBalance] = useState(0);

  const [quests, setQuests] = useState(getQuests());

  const [showInfoBar, setShowInfoBar] = useState(() => {

    try {

      return localStorage.getItem("telemon-ai-infobar-open") !== "false";

    } catch { return false; }

  });



  function toggleInfoBar() {

    const next = !showInfoBar;

    setShowInfoBar(next);

    try { localStorage.setItem("telemon-ai-infobar-open", String(next)); } catch (e) { console.warn('Unhandled error in MyAiTab', e) }

  }



  const refreshToken = useCallback(() => {

    setBalance(getTokenBalance());

    setQuests(getQuests());

  }, []);



  useEffect(() => {

    refreshToken();

    const s = getStreak();

    setStreak(s.current);

  }, [refreshToken]);



  function handleCheckIn() {

    const result = checkIn();

    if (result.reward > 0) {

      setStreak(result.streak);

      setStreakReward(result.reward);

      setShowReward(true);

      setTimeout(() => setShowReward(false), 2000);

    }

    setStreak(result.streak);

    refreshToken();

  }



  return (

    <div className="flex flex-col min-h-0 space-y-3">

      {/* ?단 ?보?(?을 ???음) */}

      <button

        type="button"

        onClick={toggleInfoBar}

        className="flex items-center justify-between rounded-xl border border-app-border/60 bg-app-card px-4 py-2.5 text-left transition-colors hover:bg-app-card-hover"

      >

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-1.5">

            <span className="text-lg font-bold text-amber-500">{balance}</span>

            <span className="text-xs text-app-text-muted">?큰</span>

          </div>

          <div className="h-4 w-px bg-app-border" />

          <div className="flex items-center gap-1.5">

            <Flame className={`h-4 w-4 ${streak >= 7 ? "text-orange-500" : "text-app-text-muted"}`} />

            <span className="text-sm font-semibold text-app-text">{streak}??/span>

          </div>

          {showReward && (

            <span className="text-xs font-bold text-app-success animate-pulse">+{streakReward}!</span>

          )}

        </div>

        <div className="flex items-center gap-2">

          {showInfoBar ? <ChevronUp className="h-4 w-4 text-app-text-muted" /> : <ChevronDown className="h-4 w-4 text-app-text-muted" />}

        </div>

      </button>



      {/* ?힌 ?보 ?널 */}

      {showInfoBar && (

        <div className="rounded-xl border border-app-border bg-app-card p-3 space-y-3 animate-scale-in">

          <button

            type="button"

            onClick={handleCheckIn}

            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"

          >

            <Flame className="h-4 w-4" />

            {streak > 0 ? `? 출석 체크??(${streak}?째)` : "? ?출석 체크??}

          </button>



          <div className="text-xs text-app-text-muted space-y-1">

            <p className="font-medium text-app-text flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" /> ?큰 ?용</p>

            <div className="grid grid-cols-2 gap-1">

              <span>AI 채팅/?장: 50?큰</span>

              <span>AI 발송/분석: 100?큰</span>

              <span>콘텐??튜?오: 200?큰</span>

              <span>출석 7?? +100?큰</span>

            </div>

          </div>



          {quests.map(q => (

            <div key={q.id} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs", q.completed ? "bg-app-success-muted/20" : "bg-app-bg")}>

              <span className={cn("h-2 w-2 rounded-full", q.completed ? "bg-app-success" : "bg-app-text-subtle/30")} />

              <span className={cn("flex-1", q.completed ? "text-app-text-muted line-through" : "text-app-text")}>{q.label}</span>

              <span className="text-app-text-muted">{q.progress}/{q.target}</span>

              <span className="font-medium text-amber-500">+{q.reward}</span>

            </div>

          ))}

        </div>

      )}



      {/* ?브???비게이????모바??가로스?롤 */}

      <div className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1">

        {SUB_TABS.map(tab => (

          <button key={tab.id} onClick={() => setActiveSub(tab.id)}

            className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${

              activeSub === tab.id

                ? "bg-app-primary text-white shadow-sm"

                : "bg-app-card border border-app-border text-app-text-muted hover:bg-app-card-hover"

            }`}>

            <tab.icon className="h-3.5 w-3.5 shrink-0" />

            <span className="hidden sm:inline">{tab.label}</span>

            <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>

          </button>

        ))}

      </div>



      {/* 콘텐?*/}

      <div className="flex-1 min-h-0">

        <ActiveContent sub={activeSub} />

      </div>

    </div>

  );

}



function ActiveContent({ sub }: { sub: string }) {

  switch (sub) {

    case "chat":

      return <InlineAiChat />;

    case "reply":

      return <AiReplyAssistantTab />;

    case "broadcast":

      return <AiBroadcastAssistantTab />;

    case "contentstudio":

      return <AiContentStudioTab />;

    case "operations":

      return <AiOperationsReportTab />;

    case "opscenter":

      return <AiOperationsCenterTab />;

    case "usage":

      return <AiUsageTab />;

    case "employee":

      return <AiEmployeeTab />;

    default:

      return <AiChatRedirect />;

  }

}



function AiChatRedirect() {

  const { toast } = useToast();

  const [agents, setAgents] = useState<agentApi.Agent[]>([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    let cancelled = false;

    agentApi.fetchAgents()

      .then(list => { if (!cancelled) setAgents(list); })

      .catch(() => { toast("error", "Agent 로드 ?패"); })

      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };

  }, []);



  const totalLevel = agents.reduce((sum, a) => sum + a.level, 0);

  const totalExp = agents.reduce((sum, a) => sum + a.exp, 0);

  const totalMessages = agents.reduce((sum, a) => sum + a.totalMessages, 0);



  return (

    <div className="space-y-3">

      <Link href="/app/chat"

        className="flex items-center gap-4 rounded-xl border border-app-border bg-app-card p-4 transition-all hover:border-app-primary/40 hover:bg-app-card-hover group">

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-primary/10">

          <MessageSquare className="h-6 w-6 text-app-primary" />

        </div>

        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-2">

            <h3 className="text-sm font-semibold text-app-text">AI Agent ??방</h3>

            <ChevronRight className="h-3.5 w-3.5 text-app-text-muted group-hover:translate-x-0.5 transition-transform" />

          </div>

          <p className="text-xs text-app-text-muted mt-0.5">Agent?만들???하??벨?하?요</p>

        </div>

      </Link>



      {loading ? (

        <div className="flex items-center justify-center py-8 text-app-text-muted">

          <Loader2 className="h-4 w-4 animate-spin mr-2" />

          <span className="text-xs">Agent 불러?는 ?..</span>

        </div>

      ) : agents.length === 0 ? (

        <div className="flex flex-col items-center gap-3 rounded-xl border border-app-border bg-app-card py-10 px-4 text-center">

          <Bot className="h-8 w-8 text-app-text-muted/30" />

          <p className="text-xs text-app-text-muted">?직 ?성??Agent가 ?습?다</p>

          <Link href="/app/chat"

            className="inline-flex items-center gap-1 rounded-lg bg-app-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">

            <Bot className="h-3.5 w-3.5" />

            ??Agent 만들?
          </Link>

        </div>

      ) : (

        <>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">

            <div className="rounded-lg border border-app-border bg-app-card px-2 py-2 text-center sm:px-3">

              <div className="text-base sm:text-lg font-bold text-app-text">{agents.length}</div>

              <div className="text-[9px] sm:text-[10px] text-app-text-muted">Agent</div>

            </div>

            <div className="rounded-lg border border-app-border bg-app-card px-2 py-2 text-center sm:px-3">

              <div className="text-base sm:text-lg font-bold text-app-primary">{totalLevel}</div>

              <div className="text-[9px] sm:text-[10px] text-app-text-muted">??벨</div>

            </div>

            <div className="rounded-lg border border-app-border bg-app-card px-2 py-2 text-center sm:px-3">

              <div className="text-base sm:text-lg font-bold text-app-text">{totalMessages}</div>

              <div className="text-[9px] sm:text-[10px] text-app-text-muted">?메시지</div>

            </div>

          </div>



          <div className="space-y-1">

            {agents.slice(0, 5).map(agent => (

              <Link key={agent.id} href="/app/chat"

                className="flex items-center justify-between rounded-lg border border-app-border bg-app-card px-3 py-2 transition-all hover:border-app-primary/30 hover:bg-app-card-hover">

                <div className="flex items-center gap-2 min-w-0">

                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-app-primary/10 text-[10px] font-bold text-app-primary">

                    {agent.name.charAt(0)}

                  </span>

                  <div className="min-w-0">

                    <p className="truncate text-xs font-medium text-app-text">{agent.name}</p>

                    <p className="text-[10px] text-app-text-muted capitalize">{agent.role}</p>

                  </div>

                </div>

                <AgentLevelBadge level={agent.level} exp={agent.exp} />

              </Link>

            ))}

            {agents.length > 5 && (

              <Link href="/app/chat"

                className="block rounded-lg border border-dashed border-app-border px-3 py-2 text-center text-[10px] text-app-text-muted transition-colors hover:border-app-primary/30 hover:text-app-primary">

                +{agents.length - 5}??보?
              </Link>

            )}

          </div>

        </>

      )}

    </div>

  );

}