"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

// ── Fixed deadlines (KST) ──
// Launch: July 13, 2026 00:00 KST = July 12, 2026 15:00 UTC
// Offer end: 72 hours after launch = July 16, 2026 00:00 KST = July 15, 2026 15:00 UTC
const LAUNCH_UTC = Date.UTC(2026, 6, 12, 15, 0, 0);   // 2026-07-12 15:00 UTC
const OFFER_END_UTC = Date.UTC(2026, 6, 15, 15, 0, 0); // 2026-07-15 15:00 UTC

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}일 ${hours}시간 ${minutes}분 ${seconds}초`;
  }
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function LaunchOfferCountdown() {
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  let phase: "before" | "active" | "ended" = "before";
  let remaining = 0;

  if (now < LAUNCH_UTC) {
    phase = "before";
    remaining = LAUNCH_UTC - now;
  } else if (now < OFFER_END_UTC) {
    phase = "active";
    remaining = OFFER_END_UTC - now;
  } else {
    phase = "ended";
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-accent-border/30 bg-gradient-to-br from-accent-glow/20 via-app-card to-accent-glow/10 p-8 sm:p-12 text-center"
      data-fade
    >
      {/* Background glow */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent-glow blur-[80px] opacity-20 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-accent-glow blur-[80px] opacity-10 pointer-events-none" />

      {phase === "ended" ? (
        <div className="relative z-0">
          <div className="badge-premium mx-auto w-fit mb-4">GRAND OPENING · 72H OFFER</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-app-text">
            런칭 특별가가 종료되었습니다
          </h2>
          <p className="mt-3 text-sm text-app-text-secondary">
            관심 가져주셔서 감사합니다. 지금부터는 정식 요금제가 적용됩니다.
          </p>
        </div>
      ) : (
        <div className="relative z-0">
          {/* Date badge */}
          <div className="badge-premium mx-auto w-fit mb-4">
            <Sparkles className="h-3 w-3" />
            {phase === "before" ? "2026.07.13 GRAND OPEN" : "PRIVATE LAUNCH OFFER · 72 HOURS ONLY"}
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-app-text">
            {phase === "before" ? (
              <>
                TeleMon <span className="gold-text">Grand Open</span>
              </>
            ) : (
              <>
                72시간 <span className="gold-text">한정 특별가</span>
              </>
            )}
          </h2>

          {phase !== "before" && (
            <p className="mt-3 text-sm text-app-text-secondary max-w-md mx-auto">
              7월 13일부터 단 3일. TeleMon의 시작을 함께하는 초기 고객에게만 런칭 특별가를 제공합니다.
              <br />
              72시간 종료 후 정식 요금제로 전환됩니다.
            </p>
          )}

          {/* Countdown */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-accent-border/20 bg-app-card/50 px-5 py-3">
            <span className="text-xs text-app-text-muted uppercase tracking-wider">
              {phase === "before" ? "오픈까지" : "남은 시간"}
            </span>
            <span className="text-2xl font-semibold text-accent tabular-nums font-mono tracking-wider">
              {formatCountdown(remaining)}
            </span>
          </div>

          {phase === "before" && (
            <p className="mt-4 text-xs text-app-text-muted">
              2026.07.13 00:00 (KST) 오픈 예정
            </p>
          )}
        </div>
      )}
    </div>
  );
}