"use client";

import { useRef, useState, useEffect } from "react";

function useCurrentTime() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const FLOATING_STATS = [
  { label: "처리율", value: "99.8%", color: "#2b8a3e", delay: "0s", x: -40, y: 20 },
  { label: "응답 시간", value: "0.3s", color: "#3a9fc4", delay: "1s", x: 40, y: -30 },
  { label: "가동률", value: "99.9%", color: "#bfa260", delay: "2s", x: -20, y: -50 },
];

const TELEGRAM_SCREENSHOTS = [
  {
    id: "sent",
    label: "자동 응답 발송",
    lines: [
      { from: "사용자", text: "안녕하세요, 가격이 어떻게 되나요?", time: "14:23", isUser: true },
      { from: "TeleMon", text: "안녕하세요! 🙏\nPro 요금제: $100/월 (10개 계정)\nTeam 요금제: $199/분기 (20개 계정)\n자세한 내용은 요금제 페이지를 확인해주세요!", time: "14:23", isUser: false, avatar: "TM" },
      { from: "사용자", text: "감사합니다! 바로 가입할게요", time: "14:24", isUser: true },
    ],
  },
  {
    id: "broadcast",
    label: "그룹 발송",
    lines: [
      { from: "TeleMon", text: "📢 [공지] 오늘 18시까지 신청 마감입니다!\n링크: t.me/example/123", time: "10:00", isUser: false, avatar: "TM" },
      { from: "시스템", text: "✅ 12개 그룹에 발송 완료 (3/4)", time: "10:01", isUser: false, avatar: "S" },
    ],
  },
  {
    id: "schedule",
    label: "예약 발송",
    lines: [
      { from: "TeleMon", text: "🌅 좋은 아침입니다!\n오늘의 할인 소식을 전해드립니다.", time: "08:00", isUser: false, avatar: "TM" },
      { from: "시스템", text: "⏰ 예약 발송 완료 | 다음 발송: 내일 08:00", time: "08:00", isUser: false, avatar: "S" },
    ],
  },
];

export function DashboardPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState("sent");
  const currentTime = useCurrentTime();
  const screenshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const ids = Object.keys(TELEGRAM_SCREENSHOTS);
    screenshotIntervalRef.current = setInterval(() => {
      setActiveScreenshot((prev) => {
        const idx = ids.indexOf(prev);
        return ids[(idx + 1) % ids.length];
      });
    }, 5000);
    return () => { if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current); };
  }, []);

  const currentScreenshot = TELEGRAM_SCREENSHOTS.find((s) => s.id === activeScreenshot) ?? TELEGRAM_SCREENSHOTS[0];

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const rotateX = mousePos.y * -3;
  const rotateY = mousePos.x * 3;

  const sidebarBg = "#1e1e2a";
  const mainBg = "#16161f";
  const cardBg = "#222233";
  const cardHover = "#2a2a3e";
  const borderColor = "#333355";
  const textPrimary = "#e8e8f0";
  const textSecondary = "#b0b0c8";
  const textMuted = "#8888a8";
  const accentGold = "#c8a86e";
  const successGreen = "#2b8a3e";
  const liveBg = "#0d2814";

  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-w-5xl"
      onMouseMove={onMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMousePos({ x: 0, y: 0 }); }}
    >
      {FLOATING_STATS.map((stat) => (
        <div
          key={stat.label}
          className={`absolute -top-2 z-20 transition-all duration-700 ease-out ${
            isHovered
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-4 scale-95"
          }`}
          style={{
            left: `calc(50% + ${stat.x}%)`,
            top: `calc(50% + ${stat.y}%)`,
            transitionDelay: stat.delay,
          }}
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-[#444466] bg-[#1a1a30] px-4 py-2.5 shadow-lg shadow-black/40 backdrop-blur-md">
            <div
              className="h-2 w-2 rounded-full animate-pulse"
              style={{ backgroundColor: stat.color }}
            />
            <div>
              <div className="text-[10px] text-[#9999bb] uppercase tracking-wider">{stat.label}</div>
              <div className="text-sm font-bold font-mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div
        ref={browserRef}
        className="relative transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${isHovered ? 1.01 : 1}, ${isHovered ? 1.01 : 1}, ${isHovered ? 1.01 : 1})`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Window chrome */}
        <div className="rounded-t-xl border border-[#444466] border-b-0 px-4 py-3 flex items-center gap-2" style={{ background: "#2a2a40" }}>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#555577]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#555577]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#555577]" />
          </div>
          <div className="ml-3 flex-1 max-w-md mx-auto">
            <div className="rounded-md px-3 py-1.5 text-[11px] text-center font-mono" style={{ background: "#1a1a2e", color: textMuted }}>
              app.telemon.online
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="rounded-b-xl border border-[#444466] overflow-hidden" style={{ background: mainBg }}>
          <div className="grid grid-cols-[200px_1fr] min-h-[360px]">
            {/* Sidebar */}
            <div className="border-r border-[#444466] p-4 space-y-1.5" style={{ background: sidebarBg }}>
              {[["Dashboard", true], ["Send", false], ["Auto Reply", false], ["Groups", false], ["Logs", false], ["Schedule", false], ["Profile", false]].map(([item, active]) => (
                <div
                  key={item as string}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-all"
                  style={{
                    background: active ? "rgba(200,168,110,0.12)" : "transparent",
                    color: active ? accentGold : textMuted,
                  }}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: active ? accentGold : "#444466" }} />
                  {item as string}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="p-5 space-y-4">
              {/* Animated live activity bar */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: liveBg }}>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2b8a3e] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2b8a3e]" />
                  </span>
                  <span className="text-[10px] text-[#2b8a3e] font-medium">Live</span>
                </div>
                <span className="text-[10px] font-mono animate-pulse min-w-[4rem] text-right" style={{ color: textMuted }}>
                  {currentTime}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Connected Accounts", value: "3", change: "+1", up: true },
                  { label: "Messages Sent", value: "1,284", change: "+12%", up: true },
                  { label: "Auto Replies", value: "347", change: "+8%", up: true },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border p-3 transition-all hover:shadow-md"
                    style={{
                      background: cardBg,
                      borderColor: borderColor,
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>{stat.label}</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="text-lg font-bold font-mono" style={{ color: textPrimary }}>{stat.value}</div>
                      <span className="text-[10px] font-medium" style={{ color: stat.up ? successGreen : "#e04747" }}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Screenshot carousel */}
              <div className="rounded-lg border p-4" style={{ background: cardBg, borderColor: borderColor }}>
                {/* Tab selector */}
                <div className="flex items-center gap-2 mb-3">
                  {TELEGRAM_SCREENSHOTS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveScreenshot(s.id)}
                      className="rounded-md px-2.5 py-1 text-[10px] font-medium transition-all"
                      style={{
                        background: activeScreenshot === s.id ? accentGold : "transparent",
                        color: activeScreenshot === s.id ? "#0d0d14" : textMuted,
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-[10px]" style={{ color: textMuted }}>자동 전환 중</span>
                    <span className="flex gap-0.5">
                      {TELEGRAM_SCREENSHOTS.map((s) => (
                        <span
                          key={s.id}
                          className="h-1.5 w-1.5 rounded-full transition-all"
                          style={{
                            background: activeScreenshot === s.id ? accentGold : borderColor,
                            width: activeScreenshot === s.id ? "12px" : "6px",
                          }}
                        />
                      ))}
                    </span>
                  </div>
                </div>

                {/* Message conversation */}
                <div className="space-y-2.5">
                  {currentScreenshot.lines.map((line, i) => (
                    <div key={i} className={`flex items-start gap-2 ${line.isUser ? "justify-end" : ""}`}>
                      {!line.isUser && (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold"
                          style={{ background: accentGold, color: "#0d0d14" }}>
                          {line.avatar || "TM"}
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-xl px-3 py-2 text-xs ${
                          line.isUser ? "rounded-tr-md" : "rounded-tl-md"
                        }`}
                        style={{
                          background: line.isUser ? "#2a5580" : "#252540",
                          color: line.isUser ? "#ffffff" : textSecondary,
                        }}
                      >
                        <p className="whitespace-pre-line leading-relaxed">{line.text}</p>
                        <p className="mt-1 text-[9px]" style={{ color: line.isUser ? "rgba(255,255,255,0.5)" : textMuted }}>{line.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini chart bar */}
              <div className="flex items-end gap-1 h-8">
                {[35, 55, 40, 70, 60, 85, 50].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all duration-500 hover:scale-y-110"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(to top, ${accentGold}80, ${accentGold}30)`,
                      transitionDelay: `${i * 0.05}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Glossy reflection overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.06 : 0,
            background: `linear-gradient(135deg, 
              rgba(255,255,255,0.3) 0%, 
              transparent 50%,
              rgba(255,255,255,0.05) 100%)`,
          }}
        />
      </div>

      {/* Backdrop glow */}
      <div className="absolute -inset-8 -z-10 opacity-30 transition-opacity duration-500"
        style={{ opacity: isHovered ? 0.5 : 0.3 }}
      >
        <div className="w-full h-full bg-gradient-to-r from-[#bfa260]/5 via-transparent to-[#bfa260]/5 blur-3xl" />
      </div>
    </div>
  );
}
