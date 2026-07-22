"use client";

// ─── 로컬스토리지 기반 토큰/보상 시스템 ─────────────────────────
// 백엔드 연동 전까지 로컬에서 동작하는 MVP 버전입니다.
// 차후 서버 API로 마이그레이션 예정.

const TOKEN_KEY = "telemon_tokens";
const STREAK_KEY = "telemon_streak";
const QUEST_KEY = "telemon_quests";
const DISCOVERED_GROUPS_KEY = "telemon_discovered_groups";
const FREE_TIER_TOKENS = 1000;

export interface TokenState {
  balance: number;
  lifetime_earned: number;
  last_updated: string;
}

export interface StreakState {
  current: number;
  longest: number;
  last_checkin: string;
}

export interface QuestState {
  id: string;
  label: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  expires_at: string;
}

// ── 토큰 ───────────────────────────────────────────────────────

function getTokenState(): TokenState {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: FREE_TIER_TOKENS, lifetime_earned: 0, last_updated: new Date().toISOString() };
}

function saveTokenState(state: TokenState) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(state));
}

export function getTokenBalance(): number {
  return getTokenState().balance;
}

export function spendTokens(amount: number): boolean {
  const state = getTokenState();
  if (state.balance < amount) return false;
  state.balance -= amount;
  state.last_updated = new Date().toISOString();
  saveTokenState(state);
  return true;
}

export function earnTokens(amount: number, reason: string) {
  const state = getTokenState();
  state.balance += amount;
  state.lifetime_earned += amount;
  state.last_updated = new Date().toISOString();
  saveTokenState(state);
  console.log(`[토큰] +${amount} (${reason})`);
}

// ── 출석 체인 ──────────────────────────────────────────────────

export function getStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { current: 0, longest: 0, last_checkin: "" };
}

export function checkIn(): { streak: number; reward: number } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const state = getStreak();
  const rewardMap: Record<number, number> = { 3: 30, 7: 100, 14: 300, 30: 1000, 365: 10000 };

  if (state.last_checkin === today) {
    return { streak: state.current, reward: 0 };
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (state.last_checkin === yesterdayStr) {
    state.current += 1;
  } else {
    state.current = 1;
  }

  state.longest = Math.max(state.longest, state.current);
  state.last_checkin = today;
  saveState(state);

  const reward = rewardMap[state.current] || 0;
  if (reward > 0) {
    earnTokens(reward, `출석 ${state.current}일 보상`);
  }

  return { streak: state.current, reward };
}

function saveState(state: StreakState) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(state));
}

// ── 주간 퀘스트 ────────────────────────────────────────────────

function generateWeeklyQuests(): QuestState[] {
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  const expires = weekEnd.toISOString();

  return [
    { id: "quest_success_rate", label: "모든 발송 100% 성공", progress: 0, target: 1, reward: 200, completed: false, expires_at: expires },
    { id: "quest_groups_30", label: "30개 그룹에 발송 완료", progress: 0, target: 30, reward: 500, completed: false, expires_at: expires },
    { id: "quest_ai_5", label: "AI 분석 5회 사용", progress: 0, target: 5, reward: 150, completed: false, expires_at: expires },
  ];
}

export function getQuests(): QuestState[] {
  try {
    const raw = localStorage.getItem(QUEST_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as QuestState[];
      // Check if expired
      if (saved[0] && new Date(saved[0].expires_at) > new Date()) return saved;
    }
  } catch {}
  const fresh = generateWeeklyQuests();
  localStorage.setItem(QUEST_KEY, JSON.stringify(fresh));
  return fresh;
}

export function updateQuestProgress(questId: string, amount: number = 1) {
  const quests = getQuests();
  const quest = quests.find(q => q.id === questId);
  if (!quest || quest.completed) return;
  quest.progress = Math.min(quest.target, quest.progress + amount);
  if (quest.progress >= quest.target) {
    quest.completed = true;
    earnTokens(quest.reward, `퀘스트 완료: ${quest.label}`);
  }
  localStorage.setItem(QUEST_KEY, JSON.stringify(quests));
}

// ── 그룹 발견 보상 ─────────────────────────────────────────────

export function rewardGroupDiscovery(groupTitle: string): number {
  try {
    const raw = localStorage.getItem(DISCOVERED_GROUPS_KEY);
    const discovered: string[] = raw ? JSON.parse(raw) : [];
    if (discovered.includes(groupTitle)) return 0;
    discovered.push(groupTitle);
    localStorage.setItem(DISCOVERED_GROUPS_KEY, JSON.stringify(discovered));
    earnTokens(50, `그룹 발견: ${groupTitle}`);
    return 50;
  } catch { return 0; }
}

// ── AI 호출 비용 ────────────────────────────────────────────────

const AI_COST: Record<string, number> = {
  chat: 50,
  reply: 50,
  broadcast: 100,
  operations: 100,
  content_studio: 200,
};

export function getAiCallCost(feature: string): number {
  return AI_COST[feature] || 50;
}

export function canAffordAiCall(feature: string): boolean {
  return getTokenBalance() >= getAiCallCost(feature);
}

export function deductAiCall(feature: string): boolean {
  const cost = getAiCallCost(feature);
  return spendTokens(cost);
}