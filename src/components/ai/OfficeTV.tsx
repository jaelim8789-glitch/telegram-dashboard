"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Monitor, TrendingUp, Activity, Send, MessageCircle } from "lucide-react";

interface TVState {
  sent: number;
  success: number;
  reply: number;
  activeAccounts: number;
  timeStr: string;
}

export function OfficeTV() {
  const [stats, setStats] = useState<TVState>({
    sent: 0, success: 0, reply: 0, activeAccounts: 0,
    timeStr: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  });
  const [channel, setChannel] = useState(0);

  // Simulate stats updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        sent: prev.sent + Math.floor(Math.random() * 5),
        success: prev.success + Math.floor(Math.random() * 4),
        reply: Math.floor(Math.random() * 50),
        activeAccounts: Math.max(1, Math.floor(Math.random() * 6)),
        timeStr: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const channels = [
    {
      name: "📊 실시간 통계",
      content: (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-white/50">📨 발송</span>
            <motion.span key={stats.sent} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-bold text-white">{stats.sent}</motion.span>
          </div>
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-white/50">✅ 성공</span>
            <motion.span key={stats.success} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="font-bold text-green-400">{stats.success}</motion.span>
          </div>
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-white/50">💬 응답</span>
            <span className="font-bold text-purple-400">{stats.reply}</span>
          </div>
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-white/50">📱 계정</span>
            <span className="font-bold text-blue-400">{stats.activeAccounts}</span>
          </div>
        </div>
      ),
    },
    {
      name: "📈 트렌드",
      content: (
        <div className="space-y-0.5">
          <p className="text-[7px] text-white/40">실시간 성장률</p>
          <p className="text-lg font-bold text-green-400">+{Math.floor(Math.random() * 30) + 5}%</p>
          <div className="flex gap-0.5 h-4 items-end">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-2 rounded-t-sm transition-all bg-gradient-to-t from-green-500 to-green-400"
                style={{ height: `${Math.random() * 100}%` }} />
            ))}
          </div>
        </div>
      ),
    },
    {
      name: "🏆 금주의 직원",
      content: (
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">👩‍💻</span>
          <p className="text-[9px] font-bold text-yellow-400">티나</p>
          <p className="text-[7px] text-white/50">1,247건 처리 🥇</p>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-app-border bg-[#0f0f1a] p-2 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Monitor className="h-3 w-3 text-app-primary" />
        <span className="text-[9px] font-semibold text-white/70">TeleMon TV</span>
        <span className="text-[7px] text-white/30 ml-auto">{stats.timeStr}</span>
      </div>

      {/* Screen */}
      <div className="rounded-lg bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-white/5 p-2 min-h-[80px]">
        <div className="text-[7px] text-white/30 mb-1">{channels[channel].name}</div>
        <motion.div key={channel} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {channels[channel].content}
        </motion.div>
      </div>

      {/* Channel buttons */}
      <div className="flex gap-1 mt-1.5">
        {channels.map((ch, i) => (
          <button key={i} onClick={() => setChannel(i)}
            className={`flex-1 rounded px-1 py-0.5 text-[7px] font-medium transition-colors ${channel === i ? "bg-white/10 text-white" : "text-white/30 hover:bg-white/5"}`}
          >{ch.name}</button>
        ))}
      </div>
    </div>
  );
}
