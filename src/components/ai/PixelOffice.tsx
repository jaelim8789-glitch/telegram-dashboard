"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Coffee, Utensils, Bed, Users, MessageSquare, Cog,
  Sparkles, Cpu, Zap, Clock, Star, RefreshCw, MousePointerClick,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PixelClickGame } from "./PixelClickGame";
import { AttendanceSystem } from "./AttendanceSystem";
import { CharacterCustomizer } from "./CharacterCustomizer";
import { OfficePet } from "./OfficePet";
import { useToast } from "@/components/ui/Toast";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useStore as useWorkspaceStore } from "@/store/useWorkspaceStore";
import { OfficeWhiteboard } from "./OfficeWhiteboard";
import { OfficeTV } from "./OfficeTV";
import { useNightMode } from "@/lib/useNightMode";

// ─── Types ──────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  role: string;
  color: string;
  emoji: string;
  status: "working" | "eating" | "meeting" | "idle" | "coffee" | "thinking";
  deskX: number;
  deskY: number;
  taskProgress: number;  // 0-100
  efficiency: number;    // 1-5 stars
  level: number;
  exp: number;
  expToNext: number;
  totalMessages: number;
  stress: number;
}

type TileType = "floor" | "desk_blue" | "desk_green" | "desk_purple" | "desk_orange" | "table" | "cafeteria" | "coffee" | "plant" | "wall" | "door" | "window" | "manager";

interface TileDef {
  type: TileType;
  char: string;
  color: string;
  passable: boolean;
}

// ─── EXP System ──────────────────────────────────────────────────────────

const EXP_PER_BROADCAST = 10;
const EXP_PER_AUTO_REPLY = 5;
const EXP_PER_LEVEL = 100;

// ─── Map ─────────────────────────────────────────────────────────────────

const MAP_COLS = 28;
const MAP_ROWS = 20;

const TILE_DEFS: Record<TileType, TileDef> = {
  floor:     { type: "floor",     char: "·", color: "#2a2a3e", passable: true },
  desk_blue: { type: "desk_blue", char: "▦", color: "#3b82f6", passable: false },
  desk_green:{ type: "desk_green",char: "▦", color: "#22c55e", passable: false },
  desk_purple:{type: "desk_purple",char:"▦", color: "#a855f7", passable: false },
  desk_orange:{type: "desk_orange",char:"▦", color: "#f97316", passable: false },
  table:    { type: "table",    char: "▤", color: "#6366f1", passable: false },
  cafeteria:{ type: "cafeteria",char: "☕", color: "#d97706", passable: false },
  coffee:   { type: "coffee",  char: "⬡", color: "#06b6d4", passable: false },
  plant:    { type: "plant",   char: "♧", color: "#15803d", passable: false },
  wall:     { type: "wall",    char: "█", color: "#1e1e2e", passable: false },
  door:     { type: "door",    char: "🚪",color: "#4a4a6a", passable: true },
  window:   { type: "window",  char: "▬", color: "#3b3b5c", passable: false },
  manager:  { type: "manager", char: "▦", color: "#eab308", passable: false },
};

// 0=floor 1=desk_blue 2=desk_green 3=desk_purple 4=desk_orange 5=table
// 6=cafeteria 7=coffee 8=plant 9=wall 10=door 11=window 12=manager

const MAP_DATA: number[][] = [
  [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
  [9,8,0,0,0,0,0,10,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,8,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,8,0,0,8,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,1,0,0,0,0,2,0,8,0,8,0,3,0,0,0,0,4,0,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,11,11,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,0,11,11,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,9],
  [9,8,0,0,0,0,0,0,0,0,5,5,5,5,5,5,5,5,0,0,0,0,0,0,0,0,8,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,8,0,6,6,6,6,0,0,0,0,0,0,0,0,0,0,7,0,8,0,0,0,0,0,9],
  [9,0,0,0,0,6,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,6,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,0,0,0,0,0,8,0,0,8,0,0,0,0,0,0,0,0,0,0,0,9],
  [9,0,0,0,0,0,0,10,0,0,0,0,0,0,0,0,0,0,10,0,0,0,0,0,0,0,0,9],
  [9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9,9],
];

const TILE_SIZE = 20;
const TYPES: TileType[] = ["floor","desk_blue","desk_green","desk_purple","desk_orange","table","cafeteria","coffee","plant","wall","door","window","manager"];

// ─── Employee data factory ──────────────────────────────────────────────

function createEmployees(): Employee[] {
  return [
    { id: "e1", name: "티나", role: "📨 브로드캐스트", color: "#3b82f6", emoji: "👩‍💻", status: "working", deskX: 6, deskY: 4, taskProgress: 67, efficiency: 5, level: 5, exp: 340, expToNext: 500, totalMessages: 1247, stress: 15 },
    { id: "e2", name: "레오", role: "🤖 자동응답", color: "#22c55e", emoji: "🧑‍💼", status: "working", deskX: 11, deskY: 4, taskProgress: 42, efficiency: 4, level: 4, exp: 220, expToNext: 400, totalMessages: 893, stress: 42 },
    { id: "e3", name: "아라", role: "📊 분석리포트", color: "#a855f7", emoji: "👩‍🔬", status: "meeting", deskX: 17, deskY: 4, taskProgress: 88, efficiency: 5, level: 5, exp: 410, expToNext: 500, totalMessages: 1562, stress: 8 },
    { id: "e4", name: "마크", role: "🔗 링크검사", color: "#f97316", emoji: "🧑‍💻", status: "coffee", deskX: 23, deskY: 4, taskProgress: 23, efficiency: 3, level: 3, exp: 150, expToNext: 300, totalMessages: 534, stress: 67 },
    { id: "e5", name: "루나", role: "📈 성장루프", color: "#ec4899", emoji: "👩‍🎨", status: "eating", deskX: 7, deskY: 11, taskProgress: 55, efficiency: 4, level: 4, exp: 280, expToNext: 400, totalMessages: 1023, stress: 55 },
    { id: "e6", name: "제이", role: "🤝 팀관리", color: "#14b8a6", emoji: "🧑‍💼", status: "working", deskX: 21, deskY: 11, taskProgress: 91, efficiency: 5, level: 6, exp: 120, expToNext: 600, totalMessages: 2104, stress: 23 },
  ];
}

// ─── Movement helpers ───────────────────────────────────────────────────

const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  e1: { x: 6, y: 4 }, e2: { x: 11, y: 4 }, e3: { x: 17, y: 4 }, e4: { x: 23, y: 4 },
  e5: { x: 7, y: 11 }, e6: { x: 21, y: 11 },
};

const ACTIVITY_SPOTS: Record<string, { x: number; y: number }> = {
  cafeteria: { x: 5, y: 14 },
  coffee: { x: 19, y: 13 },
  meeting: { x: 12, y: 7 },
  manager: { x: 7, y: 11 },
  idle_1: { x: 2, y: 3 }, idle_2: { x: 25, y: 3 },
};

function findPath(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let cx = fromX, cy = fromY;
  const maxSteps = 50;
  while ((cx !== toX || cy !== toY) && path.length < maxSteps) {
    const dx = Math.sign(toX - cx);
    const dy = Math.sign(toY - cy);
    if (dx !== 0) {
      const nx = cx + dx;
      if (nx >= 0 && nx < MAP_COLS && cy >= 0 && cy < MAP_ROWS) {
        const tileIdx = MAP_DATA[cy]?.[nx] ?? 9;
        const tileType = TYPES[tileIdx] ?? "wall";
        if (tileIdx === 0 || tileIdx === 10) { cx = nx; }
        else if (dy !== 0) {
          const ny = cy + dy;
          if (ny >= 0 && ny < MAP_ROWS) {
            const tileIdx2 = MAP_DATA[ny]?.[cx] ?? 9;
            if (tileIdx2 === 0 || tileIdx2 === 10) { cy = ny; }
            else break;
          } else break;
        } else break;
      } else break;
    } else if (dy !== 0) {
      const ny = cy + dy;
      if (ny >= 0 && ny < MAP_ROWS) {
        const tileIdx = MAP_DATA[ny]?.[cx] ?? 9;
        if (tileIdx === 0 || tileIdx === 10) { cy = ny; }
        else break;
      } else break;
    } else break;
    path.push({ x: cx, y: cy });
  }
  return path;
}

// ─── Pixel Character Component ──────────────────────────────────────────

const BODY_COLORS = [
  "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6",
  "#eab308", "#ef4444", "#06b6d4", "#8b5cf6",
];

function PixelChar({ color, status, emoji, name, idx, level, stress }: { color: string; status: string; emoji: string; name: string; idx: number; level: number; stress: number }) {
  const isActive = status === "working";
  const isResting = status === "idle" || status === "coffee" || status === "eating";

  return (
    <div className="flex flex-col items-center gap-0.5">
      {/* Body */}
      <div className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-md border-2 transition-all duration-500",
        isActive ? "border-white/40 scale-110" : isResting ? "border-white/10 scale-90 opacity-70" : "border-white/30",
      )} style={{ backgroundColor: color }}>
        <span className="text-xs">{emoji}</span>
        {/* 고양이귀 데코 */}
        <div className="absolute -top-1.5 -left-1 h-2 w-2 rounded-tl-full bg-white/20" />
        <div className="absolute -top-1.5 -right-1 h-2 w-2 rounded-tr-full bg-white/20" />
        {/* 상태 표시 */}
        {status === "working" && <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1 w-3 bg-green-400 rounded-full animate-pulse" />}
        {status === "eating" && <span className="absolute -top-2 text-[8px]">🍜</span>}
        {status === "coffee" && <span className="absolute -top-2 text-[8px]">☕</span>}
        {status === "meeting" && <span className="absolute -top-2 text-[8px]">💬</span>}
        {status === "idle" && <span className="absolute -top-2 text-[8px]">💤</span>}
        {status === "thinking" && <span className="absolute -top-2 text-[8px]">🤔</span>}
        {/* Level badge */}
        <div className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-500 text-[7px] font-bold text-black">
          {level}
        </div>
        {/* Stress indicator */}
        {stress > 60 && (
          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2">
            <div className="h-1 w-6 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${stress > 80 ? "bg-red-400" : "bg-orange-400"}`}
                style={{ width: `${stress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Name + 역할 */}
      <div className="text-center">
        <p className="text-[9px] font-bold text-white leading-tight truncate max-w-[72px]">{name}</p>
        {/* <p className="text-[7px] text-white/50 truncate max-w-[72px]">{role}</p> */}
      </div>
    </div>
  );
}

// ─── Speech Bubble ──────────────────────────────────────────────────────

const STATUS_MESSAGES: Record<string, string[]> = {
  working: ["메시지 분석 중...", "발송 최적화 중...", "그룹 스캔 중...", "AI 학습 중...", "📨 발송 준비 중..."],
  eating: ["🍜 점심 맛있게 먹는 중", "🍣 초밥 먹는 중", "🥗 샐러드 먹는 중", "☕ 커피 한 잔..."],
  meeting: ["📋 전략 회의 중", "🤝 KPI 리뷰 중", "📊 실적 분석 중", "🎯 목표 설정 중"],
  coffee: ["☕ 커피 한 잔...", "🧋 쉬는 중...", "🤸 스트레칭 중..."],
  idle: ["💤 잠시 휴식...", "😴 졸린가보다...", "🧘 명상 중..."],
  thinking: ["🤔 고민 중...", "💡 아이디어 구상 중...", "🧠 문제 해결 중..."],
};

function SpeechBubble({ status, idx }: { status: string; idx: number }) {
  const msgs = STATUS_MESSAGES[status] ?? STATUS_MESSAGES.idle!;
  const msg = msgs[idx % msgs.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/70 border border-white/10 px-2 py-1 text-[8px] text-white/90 backdrop-blur-sm z-20"
    >
      {msg}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-black/70 border-r border-b border-white/10" />
    </motion.div>
  );
}

// ─── Conversations ───────────────────────────────────────────────────────

const CONVERSATIONS = [
  { emoji: "💬", lines: ["티나: 오늘 발송 200건 넘겼어!", "레오: 대단하다! 나도 열심히 해야지"] },
  { emoji: "💬", lines: ["아라: 분석 리포트 나왔어요", "제이: 오, 실시간으로 보여줘!"] },
  { emoji: "😂", lines: ["루나: 성장 루프 3개나 완료!", "마크: 미친... 너무 빠른데?"] },
  { emoji: "🤔", lines: ["레오: 이 패턴은 뭘까...", "티나: AI한테 물어봐!"] },
  { emoji: "☕", lines: ["마크: 커피 한 잔 할래?", "루나: 좋아! 같이 가자"] },
  { emoji: "🎉", lines: ["전체: 이번 달 목표 달성! 🎉", "모두: 와~ 수고했어!"] },
  { emoji: "💡", lines: ["제이: 이거 새 아이디어인데 들어볼래?", "아라: 오! 좋아 좋아"] },
  { emoji: "😴", lines: ["루나: 아... 졸려", "레오: 나도... 커피 마실래"] },
  { emoji: "📊", lines: ["아라: 전달율 98% 찍었어요!", "티나: 대박! 어떻게 했어?"] },
  { emoji: "🤝", lines: ["제이: 다들 수고했어요 오늘", "모두: 네! 수고하셨습니다"] },
];

// ─── Main Component ─────────────────────────────────────────────────────

export function PixelOffice() {
  const [employees, setEmployees] = useState<Employee[]>(() => createEmployees());
  const [employees2] = useState(() => createEmployees());
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [gameTick, setGameTick] = useState(0);
  const [officeTime, setOfficeTime] = useState(540); // 9:00 AM in minutes
  const [weather, setWeather] = useState<"sunny" | "rainy" | "snowy" | "cloudy">("sunny");
  const [showGame, setShowGame] = useState(false);
  const [levelUpNotif, setLevelUpNotif] = useState<string[]>([]);
  const [realStats, setRealStats] = useState<Record<string, { sent: number; replied: number }>>({});
  const [activeConversation, setActiveConversation] = useState<{ emoji: string; lines: string[] } | null>(null);
  const [convTimer, setConvTimer] = useState(0);
  const levelUpQueue = useRef<string[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);
  const [customizingEmployee, setCustomizingEmployee] = useState<string | null>(null);
  const { toast } = useToast();

  const user = useWorkspaceStore((s) => s.user);
  const accounts = useDashboardStore((s) => s.accounts);
  const totalSentToday = accounts?.reduce((sum, a) => sum + (a.todaySent || 0), 0) || 0;
  const userName = user?.phone || "나";
  const userEmoji = "🧑‍💼";

  // Random weather change
  useEffect(() => {
    const changeWeather = () => {
      const weathers = ["sunny", "cloudy", "rainy", "snowy", "sunny", "sunny", "cloudy"] as const;
      setWeather(weathers[Math.floor(Math.random() * weathers.length)]);
    };
    const interval = setInterval(changeWeather, 60000);
    return () => clearInterval(interval);
  }, []);

  const msgIdxRef = useRef<Record<string, number>>({});
  const charPositions = useRef<Record<string, { x: number; y: number }>>({});
  const charPaths = useRef<Record<string, { x: number; y: number }[]>>({});
  const charPathIdx = useRef<Record<string, number>>({});
  const charStatusDuration = useRef<Record<string, number>>({});

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      setGameTick((t) => t + 1);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Office time loop (1 tick = 1 minute)
  useEffect(() => {
    const interval = setInterval(() => {
      setOfficeTime((t) => (t + 1) % 1440);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Character behavior AI
  useEffect(() => {
    setEmployees((prev) => {
      return prev.map((emp) => {
        const newEmp = { ...emp };
        const hour = Math.floor(officeTime / 60);
        const min = officeTime % 60;

        // Schedule-based status
        if (hour >= 12 && hour < 13) {
          newEmp.status = "eating";
          newEmp.taskProgress = Math.max(0, emp.taskProgress - 2);
        } else if (hour === 10 || hour === 15 && min < 15) {
          if (emp.id === "e4") newEmp.status = "coffee";
          else newEmp.status = "working";
          newEmp.taskProgress = Math.min(100, emp.taskProgress + 1);
        } else if (hour >= 9 && hour < 18) {
          if (hour === 11 && min > 30 && emp.id === "e3") newEmp.status = "meeting";
          else if (Math.random() < 0.02) newEmp.status = "thinking";
          else newEmp.status = "working";
          newEmp.taskProgress = Math.min(100, emp.taskProgress + (emp.efficiency >= 4 ? 2 : 1));
        } else {
          newEmp.status = "idle";
        }

        // Random status switching
        if (Math.random() < 0.005) {
          const statuses: Employee["status"][] = ["working", "coffee", "thinking", "working", "working"];
          newEmp.status = statuses[Math.floor(Math.random() * statuses.length)];
        }

        // Reset task progress
        if (newEmp.taskProgress >= 100) {
          newEmp.taskProgress = 0;
        }

        // EXP gain while working
        if (emp.status === "working" && Math.random() < 0.1) {
          newEmp.exp = Math.min(emp.expToNext, emp.exp + 1);
          if (newEmp.exp >= emp.expToNext) {
            newEmp.level += 1;
            newEmp.exp = 0;
            newEmp.expToNext = EXP_PER_LEVEL * (newEmp.level + 1);
            levelUpQueue.current.push(emp.id);
          }
        }

        // Random conversations
        if (Math.random() < 0.008 && !activeConversation) {
          const conv = CONVERSATIONS[Math.floor(Math.random() * CONVERSATIONS.length)];
          setActiveConversation(conv);
          setConvTimer(0);
        }
        if (activeConversation) {
          setConvTimer((t) => t + 1);
          if (convTimer > 5) setActiveConversation(null);
        }

        // Stress increases while working, decreases while resting
        if (emp.status === "working") {
          newEmp.stress = Math.min(100, emp.stress + 1);
        } else if (["coffee", "eating", "idle"].includes(emp.status)) {
          newEmp.stress = Math.max(0, emp.stress - 2);
        }

        // High stress effects
        if (newEmp.stress > 80 && Math.random() < 0.05) {
          newEmp.status = "coffee"; // forced break
        }
        if (newEmp.stress >= 100) {
          newEmp.status = "idle"; // burnout - went home
        }

        return newEmp;
      });
    });
  }, [gameTick]);

  // Process level-up queue into notifications
  useEffect(() => {
    if (levelUpQueue.current.length > 0) {
      setLevelUpNotif((prev) => [...prev, ...levelUpQueue.current.map((id) => {
        const emp = employees.find((e) => e.id === id);
        return emp ? `${emp.name} 레벨업! Lv.${emp.level}` : "";
      })]);
      levelUpQueue.current = [];
    }
  }, [gameTick]);

  // Level-up notification dismissal
  useEffect(() => {
    if (levelUpNotif.length > 0) {
      const timer = setTimeout(() => setLevelUpNotif((prev) => prev.slice(1)), 3000);
      return () => clearTimeout(timer);
    }
  }, [levelUpNotif]);

  // Real stats fetch simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setEmployees((prev) => prev.map((emp) => {
        const base = Math.floor(Math.random() * 50) + 5;
        return {
          ...emp,
          totalMessages: emp.totalMessages + (emp.status === "working" ? Math.floor(Math.random() * 3) : 0),
        };
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Init positions
  useEffect(() => {
    employees.forEach((emp) => {
      const desk = DESK_POSITIONS[emp.id] || { x: 5, y: 5 };
      if (!charPositions.current[emp.id]) {
        charPositions.current[emp.id] = { x: desk.x, y: desk.y };
      }
    });
    if (!charPositions.current["user"]) {
      charPositions.current["user"] = { x: 10, y: 12 };
    }
  }, []);

  // Movement
  useEffect(() => {
    employees.forEach((emp) => {
      const desk = DESK_POSITIONS[emp.id] || { x: 5, y: 5 };
      let target = desk;
      if (emp.status === "eating") target = ACTIVITY_SPOTS.cafeteria;
      else if (emp.status === "coffee") target = ACTIVITY_SPOTS.coffee;
      else if (emp.status === "meeting") target = ACTIVITY_SPOTS.meeting;
      else if (emp.status === "idle") target = ACTIVITY_SPOTS.idle_1;

      const pos = charPositions.current[emp.id];
      if (!pos) return;

      // If close enough to target, stay
      const dist = Math.abs(pos.x - target.x) + Math.abs(pos.y - target.y);
      if (dist > 1) {
        const path = findPath(pos.x, pos.y, target.x, target.y);
        if (path.length > 0) {
          const next = path[0];
          pos.x = next.x;
          pos.y = next.y;
        }
      }
    });
  }, [gameTick]);

  const selected = employees.find((e) => e.id === selectedEmployee);
  const hour = Math.floor(officeTime / 60);
  const min = officeTime % 60;
  const timeStr = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
  const isNight = hour < 7 || hour >= 19;
  const isNightMode = useNightMode();
  const actualNight = isNightMode || isNight;

  // Night mode employee behavior
  useEffect(() => {
    if (!actualNight || hour < 21) return;
    setEmployees((prev) => prev.map((emp) => ({
      ...emp,
      status: Math.random() < 0.7 ? "working" : "coffee",
      stress: Math.min(100, emp.stress + 2),
    })));
  }, [actualNight, hour]);

  const weatherIcons: Record<string, string> = { sunny: "☀️", rainy: "🌧️", snowy: "❄️", cloudy: "☁️" };
  const weatherEffects: Record<string, string> = { sunny: "bg-yellow-500/10 text-yellow-400", rainy: "bg-blue-500/10 text-blue-400", snowy: "bg-white/10 text-white/60", cloudy: "bg-gray-500/10 text-gray-400" };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏢</span>
          <div>
            <h3 className="text-sm font-bold text-app-text">AI 직원 사무실</h3>
            <p className="text-[10px] text-app-text-muted">직원들이 열심히 일하고 있어요! 🚀</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-mono font-bold flex items-center gap-1",
            actualNight ? "bg-indigo-500/20 text-indigo-400" : "bg-yellow-500/20 text-yellow-500"
          )}>
            <Clock className="h-3 w-3" />
            {timeStr}
          </div>
          <div className={cn("rounded-full px-2 py-1 text-[10px] font-bold", weatherEffects[weather])}>
            {weatherIcons[weather]}
          </div>
          <button onClick={() => setShowAttendance(!showAttendance)} className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-1 text-[9px] text-yellow-300 hover:bg-yellow-500/20 transition-all">
            📅 출석
          </button>
          <button onClick={() => setGameTick((t) => t + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-app-card-hover text-app-text-muted transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 게임화면 컨테이너 */}
      <div className={cn("relative overflow-hidden rounded-2xl border border-app-border bg-[#1a1a2e] shadow-2xl", actualNight && "night-mode-screen")}>
        {/* Sky gradient */}
        <div className={cn(
          "absolute inset-0 transition-colors duration-1000",
          actualNight ? "bg-[#0f0f1a]" : "bg-gradient-to-b from-[#1a1a2e] via-[#1e1e35] to-[#252540]"
        )} />

        {/* Stars at night */}
        {actualNight && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute h-0.5 w-0.5 rounded-full bg-white/60 animate-pulse" style={{
            top: `${Math.random() * 40}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            opacity: Math.random() * 0.5 + 0.3,
          }} />
        ))}

        {/* Weather particles */}
        {weather === "rainy" && Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="absolute h-3 w-0.5 bg-blue-400/30 animate-rain"
            style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, animationDuration: `${0.5 + Math.random()}s` }} />
        ))}
        {weather === "snowy" && Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute h-1.5 w-1.5 rounded-full bg-white/40 animate-snow"
            style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s` }} />
        ))}

        {/* 야근모드 특수 효과 */}
        {actualNight && (
          <>
            {/* 로파이 BGM 텍스트 */}
            <div className="absolute bottom-2 left-2 text-[7px] text-white/20 flex items-center gap-1 z-20 pointer-events-none">
              🎵 lofi hip hop radio
            </div>
            {/* 별 더 많이 */}
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="absolute h-0.5 w-0.5 rounded-full bg-white/60 animate-pulse"
                style={{ top: `${Math.random() * 40}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 3}s`, opacity: Math.random() * 0.5 + 0.3 }}
              />
            ))}
          </>
        )}

        {/* 야근 환영 메시지 */}
        {actualNight && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 px-3 py-1.5 text-center pointer-events-none"
          >
            <p className="text-[9px] text-purple-300/80">
              🌙 야근 중... {new Date().getHours()}시 {new Date().getMinutes()}분 — 오늘도 수고하셨어요! ☕
            </p>
          </motion.div>
        )}

        {/* Office building frame */}
        <div className="relative z-10 p-3">
          {/* Floor plan */}
          <div className="relative mx-auto" style={{ width: MAP_COLS * TILE_SIZE, height: MAP_ROWS * TILE_SIZE }}>
            {/* Tiles */}
            {MAP_DATA.flatMap((row, y) =>
              row.map((tileIdx, x) => {
                const type = TYPES[tileIdx]!;
                const def = TILE_DEFS[type];
                return (
                  <div
                    key={`${x}-${y}`}
                    className="absolute transition-colors duration-500"
                    style={{
                      left: x * TILE_SIZE,
                      top: y * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                      backgroundColor: def.color + "40",
                      border: type === "wall" ? "1px solid #2a2a4a" : "1px solid transparent",
                      borderRadius: type === "plant" ? "50%" : undefined,
                    }}
                  >
                    {/* Furniture decorations */}
                    {type === "desk_blue" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">🖥️</span>}
                    {type === "desk_green" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">🖥️</span>}
                    {type === "desk_purple" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">🖥️</span>}
                    {type === "desk_orange" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-40">🖥️</span>}
                    {type === "table" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-30">⬜</span>}
                    {type === "cafeteria" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-60">🍽️</span>}
                    {type === "coffee" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-60">☕</span>}
                    {type === "plant" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-60">🌿</span>}
                    {type === "window" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-60" style={{color: actualNight ? "#4488ff60" : "#88ccff60"}}>▣</span>}
                    {type === "manager" && <span className="absolute inset-0 flex items-center justify-center text-[10px] opacity-60">🏆</span>}
                    {type === "door" && <span className="absolute inset-0 flex items-center justify-center text-[11px] opacity-50">🚪</span>}
                  </div>
                );
              })
            )}

            {/* Labels */}
            <div className="absolute top-[110px] left-[240px] text-[7px] text-white/30 font-semibold tracking-wider z-10">⚡ MEETING ROOM</div>
            <div className="absolute top-[260px] left-[80px] text-[7px] text-white/30 font-semibold tracking-wider z-10">🍽️ CAFETERIA</div>
            <div className="absolute top-[260px] left-[370px] text-[7px] text-white/30 font-semibold tracking-wider z-10">☕ BREAK</div>

            {/* Characters */}
            {employees.map((emp) => {
              const pos = charPositions.current[emp.id] || DESK_POSITIONS[emp.id] || { x: 5, y: 5 };
              const isSelected = emp.id === selectedEmployee;
              msgIdxRef.current[emp.id] = (msgIdxRef.current[emp.id] ?? 0) + (gameTick % 10 === 0 ? 1 : 0);

              return (
                <div
                  key={emp.id}
                  className={cn(
                    "absolute transition-all duration-500 cursor-pointer z-20",
                    isSelected && "z-30"
                  )}
                  style={{
                    left: pos.x * TILE_SIZE - 4,
                    top: pos.y * TILE_SIZE - 12,
                  }}
                  onClick={() => setSelectedEmployee(isSelected ? null : emp.id)}
                >
                  {/* 말풍선 */}
                  {isSelected && (
                    <SpeechBubble status={emp.status} idx={msgIdxRef.current[emp.id] ?? 0} />
                  )}

                  <PixelChar
                    color={emp.color}
                    status={emp.status}
                    emoji={emp.emoji}
                    name={emp.name}
                    idx={employees.indexOf(emp)}
                    level={emp.level}
                    stress={emp.stress}
                  />

                  {/* 진행 바 */}
                  <div className="mt-0.5 h-0.5 w-8 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-transparent to-white/60"
                      animate={{ width: `${emp.taskProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              );
            })}

            {/* 바닥에 그림자 */}
            {employees.map((emp) => {
              const pos = charPositions.current[emp.id] || DESK_POSITIONS[emp.id] || { x: 5, y: 5 };
              return (
                <div
                  key={`shadow-${emp.id}`}
                  className="absolute z-10"
                  style={{
                    left: pos.x * TILE_SIZE - 2,
                    top: pos.y * TILE_SIZE + 12,
                    width: TILE_SIZE - 8,
                    height: 4,
                    background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)",
                  }}
                />
              );
            })}

            {/* User character (내 책상) */}
            {(user || true) && (() => {
              const userPos = charPositions.current["user"] || { x: 10, y: 12 };
              return (
                <div className="absolute transition-all duration-500 z-20" style={{ left: userPos.x * TILE_SIZE - 8, top: userPos.y * TILE_SIZE - 16 }}>
                  <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-400/20 to-orange-400/20">
                      <span className="text-sm">{userEmoji}</span>
                    </div>
                    <p className="text-[8px] font-bold text-yellow-400/80 mt-0.5 whitespace-nowrap">👤 {userName}</p>
                    <div className="mt-0.5 h-1 w-12 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, totalSentToday)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Conversation bubble */}
            {activeConversation && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-xs">
                <div className="rounded-2xl bg-black/80 border border-white/10 p-3 backdrop-blur-sm shadow-2xl">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{activeConversation.emoji}</span>
                    <span className="text-[9px] font-bold text-white">사무실 대화</span>
                  </div>
                  {activeConversation.lines.map((line, i) => (
                    <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }}
                      className="text-[11px] text-white/80 leading-relaxed"
                    >{line}</motion.p>
                  ))}
                  <div className="flex justify-end mt-1">
                    <div className="flex gap-0.5">
                      <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{animationDelay: "0ms"}} />
                      <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{animationDelay: "150ms"}} />
                      <span className="h-1 w-1 rounded-full bg-white/40 animate-bounce" style={{animationDelay: "300ms"}} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="relative z-10 border-t border-white/5 px-4 py-2 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            {selected ? (
              <div className="flex items-center gap-2 text-xs">
                <span>{selected.emoji}</span>
                <span className="font-semibold text-white">{selected.name}</span>
                <span className="text-white/50">·</span>
                <span className="text-white/70">{selected.role}</span>
                  <span className="text-white/50">·</span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-2.5 w-2.5", i < selected.efficiency ? "text-yellow-400" : "text-white/20")} />
                    ))}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-white/50">
                    <span>📨 오늘 {selected.totalMessages}건 처리</span>
                  </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {employees.map((emp) => (
                  <button key={emp.id} onClick={() => setSelectedEmployee(emp.id)} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 transition-colors">
                    <span className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      emp.status === "working" ? "bg-green-400" : emp.status === "eating" ? "bg-orange-400" : emp.status === "idle" ? "bg-gray-500" : "bg-blue-400"
                    )} />
                    {emp.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/30">
            <MousePointerClick className="h-3 w-3" />
            직원 클릭 자세히보기
            <button onClick={() => setShowGame(true)} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-2 py-1 text-[9px] text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all ml-2">
              🎮 게임
            </button>
          </div>
        </div>
      </div>

      {/* Attendance + Customization panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showAttendance && <AttendanceSystem />}
        {customizingEmployee && (() => {
          const emp = employees.find(e => e.id === customizingEmployee);
          if (!emp) return null;
          return (
            <CharacterCustomizer
              employeeId={emp.id}
              employeeEmoji={emp.emoji}
              employeeName={emp.name}
              onClose={() => setCustomizingEmployee(null)}
            />
          );
        })()}
      </div>

      {/* Mini-game modal */}
      {showGame && <PixelClickGame onClose={() => setShowGame(false)} />}

      {/* Whiteboard + TV Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <OfficeWhiteboard />
        <OfficeTV />
      </div>

      {/* 직원 상태 요약 */}
      <div className="grid grid-cols-6 gap-2">
        {employees.map((emp) => {
          const statusColors: Record<string, string> = { working: "bg-green-500", eating: "bg-orange-500", meeting: "bg-purple-500", coffee: "bg-cyan-500", idle: "bg-gray-500", thinking: "bg-pink-500" };
          const statusIcons: Record<string, string> = { working: "⚡", eating: "🍜", meeting: "💬", coffee: "☕", idle: "💤", thinking: "🤔" };
          return (
            <button
              key={emp.id}
              onClick={() => { setSelectedEmployee(selectedEmployee === emp.id ? null : emp.id); setCustomizingEmployee(emp.id); }}
              className={cn(
                "rounded-xl border border-white/5 p-2 text-center transition-all hover:border-white/20",
                selectedEmployee === emp.id ? "bg-white/10 border-white/30" : "bg-white/5"
              )}
            >
              <div className="text-lg mb-0.5">{emp.emoji}</div>
              <p className="text-[9px] font-semibold text-white/80 truncate">{emp.name}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", statusColors[emp.status] ?? "bg-gray-500")} />
                <span className="text-[8px] text-white/50">{statusIcons[emp.status] ?? "?"} {emp.status}</span>
              </div>
              {/* 미니 진행바 */}
              <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${(emp.exp / emp.expToNext) * 100}%` }} />
              </div>
              <p className="text-[7px] text-yellow-400/60 mt-0.5">Lv.{emp.level} ({emp.exp}/{emp.expToNext})</p>
            </button>
          );
        })}
      </div>

      <style>{`
  @keyframes rain { 0% { transform: translateY(-10px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(400px); opacity: 0; } }
  @keyframes snow { 0% { transform: translateY(-10px) rotate(0deg); opacity: 0; } 50% { opacity: 0.8; } 100% { transform: translateY(400px) rotate(360deg); opacity: 0; } }
  @keyframes screenFlicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.97; }
  }
  .night-mode-screen { animation: screenFlicker 4s ease-in-out infinite; }
  .animate-rain { animation: rain 1s linear infinite; }
  .animate-snow { animation: snow 3s linear infinite; }
`}</style>
    </div>
  );
}
