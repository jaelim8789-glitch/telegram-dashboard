"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Users, PhoneOff, MessageSquare, Send, MessageCircle, Bot } from "lucide-react";
import { cn } from "@/lib/cn";

interface EmptyIllustrationProps {
  children: React.ReactNode;
  className?: string;
}

function Wrapper({ children, className }: EmptyIllustrationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 gap-4",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

function GlowCircle({ className, children }: EmptyIllustrationProps) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full opacity-20"
        style={{ backgroundColor: "var(--color-accent-glow, #5288c1)" }}
      />
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const EmptyAccounts = memo(function EmptyAccounts() {
  return (
    <Wrapper>
      <GlowCircle className="h-16 w-16 bg-app-card-hover">
        <div className="relative flex items-center justify-center">
          <Users className="h-7 w-7 opacity-30 text-app-text-subtle" />
          <PhoneOff className="absolute -bottom-1 -right-2 h-4 w-4 opacity-30 text-app-text-subtle" />
        </div>
      </GlowCircle>
      <div className="max-w-xs">
        <p className="text-base font-semibold text-app-text">계정을 추가해주세요</p>
        <p className="mt-1 text-sm text-app-text-muted">
          Telegram 계정을 연결하고 메시지를 관리하세요
        </p>
      </div>
    </Wrapper>
  );
});

export const EmptyBroadcasts = memo(function EmptyBroadcasts() {
  return (
    <Wrapper>
      <GlowCircle className="h-16 w-16 bg-app-card-hover">
        <div className="relative flex items-center justify-center">
          <MessageSquare className="h-7 w-7 opacity-30 text-app-text-subtle" />
          <Send className="absolute -bottom-2 -right-1 h-4 w-4 opacity-30 text-app-text-subtle -rotate-12" />
        </div>
      </GlowCircle>
      <div className="max-w-xs">
        <p className="text-base font-semibold text-app-text">첫 발송을 시작하세요</p>
        <p className="mt-1 text-sm text-app-text-muted">
          그룹이나 채널에 메시지를 발송하고 결과를 확인하세요
        </p>
      </div>
    </Wrapper>
  );
});

export const EmptyChats = memo(function EmptyChats() {
  return (
    <Wrapper>
      <GlowCircle className="h-16 w-16 bg-app-card-hover">
        <div className="relative flex items-center justify-center">
          <MessageCircle className="h-7 w-7 opacity-30 text-app-text-subtle" />
          <Bot className="absolute -top-1 -right-1 h-4 w-4 opacity-30 text-app-text-subtle" />
        </div>
      </GlowCircle>
      <div className="max-w-xs">
        <p className="text-base font-semibold text-app-text">AI 채팅을 시작하세요</p>
        <p className="mt-1 text-sm text-app-text-muted">
          AI 어시스턴트와 대화하며 업무를 효율화하세요
        </p>
      </div>
    </Wrapper>
  );
});
