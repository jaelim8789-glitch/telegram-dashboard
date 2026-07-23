"use client";

import { Building2, Monitor, Code2, GraduationCap, Coins, Gamepad2, Building, Sparkles, HeartPulse, Landmark, Shield, Cpu, Radio, Globe, Briefcase } from "lucide-react";

const ITEMS = [
  { icon: Building2, label: "스타트업" },
  { icon: Monitor, label: "마케팅 에이전시" },
  { icon: Code2, label: "IT 기업" },
  { icon: Building, label: "커뮤니티 운영자" },
  { icon: GraduationCap, label: "교육 기관" },
  { icon: HeartPulse, label: "병원" },
  { icon: Coins, label: "핀테크" },
  { icon: Gamepad2, label: "게임 스튜디오" },
  { icon: Building, label: "부동산" },
  { icon: Sparkles, label: "자동화 전문가" },
  { icon: Monitor, label: "디지털 마케터" },
  { icon: Landmark, label: "공공기관" },
  { icon: Shield, label: "비영리단체" },
  { icon: Cpu, label: "P2P" },
  { icon: Radio, label: "크립토" },
  { icon: Globe, label: "물류" },
  { icon: Briefcase, label: "컨설팅" },
  { icon: Code2, label: "SaaS" },
  { icon: GraduationCap, label: "연구소" },
  { icon: Coins, label: "은행" },
];

export function MarqueeTrust() {
  return (
    <section className="tm-section-bg px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs uppercase tracking-[0.15em] mb-8" style={{ color: "var(--color-text-muted)" }}>
          다양한 분야에서 신뢰하는 플랫폼
        </p>

        <div
          className="tm-marquee-track overflow-hidden"
          style={{
            width: "100%",
            position: "relative",
            display: "flex",
            flexWrap: "nowrap",
            overflow: "hidden",
          }}
        >
          {/* First copy (visible) */}
          <div
            className="tm-marquee-content flex shrink-0 items-center gap-4"
            style={{ flexShrink: 0 }}
          >
            {ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <span key={`a-${i}`} className="tm-marquee-item whitespace-nowrap flex items-center gap-2 min-h-[44px] min-w-[120px] justify-center" role="listitem">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-accent)" }} />
                  {item.label}
                </span>
              );
            })}
          </div>
          {/* Duplicate copy (aria-hidden for seamless loop) */}
          <div
            className="tm-marquee-content flex shrink-0 items-center gap-4"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            {ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <span key={`b-${i}`} className="tm-marquee-item whitespace-nowrap flex items-center gap-2 min-h-[44px] min-w-[120px] justify-center" role="presentation">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-accent)" }} />
                  {item.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}