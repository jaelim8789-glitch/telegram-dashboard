"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, CloudSun, Coffee } from "lucide-react";

function getGreeting(): { text: string; icon: typeof Sun } {
  const h = new Date().getHours();
  if (h < 6) return { text: "깊은 밤에도", icon: Moon };
  if (h < 9) return { text: "좋은 아침입니다", icon: Sun };
  if (h < 12) return { text: "활기찬 오전", icon: CloudSun };
  if (h < 14) return { text: "점심 식사는 하셨나요", icon: Coffee };
  if (h < 18) return { text: "따뜻한 오후", icon: CloudSun };
  if (h < 21) return { text: "편안한 저녁", icon: Sun };
  return { text: "오늘도 수고하셨습니다", icon: Moon };
}

interface GreetingHeaderProps {
  name?: string;
  className?: string;
}

export function GreetingHeader({ name, className = "" }: GreetingHeaderProps) {
  const [greeting, setGreeting] = useState(() => getGreeting());

  useEffect(() => {
    const nextMinute = () => {
      const now = new Date();
      return (60 - now.getSeconds()) * 1000;
    };
    const timer = setTimeout(() => setGreeting(getGreeting()), nextMinute());
    return () => clearTimeout(timer);
  }, []);

  const Icon = greeting.icon;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] shadow-md">
        <Icon className="h-5 w-5" style={{ color: "var(--color-accent-contrast)" }} />
      </div>
      <div>
        <h2 className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
          {greeting.text}{name ? `, ${name}` : ""}
        </h2>
        <p className="text-xs text-app-text-muted">
          TeleMon 대시보드
        </p>
      </div>
    </div>
  );
}
