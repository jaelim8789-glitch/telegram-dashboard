"use client";

import { create } from "zustand";

interface HelpState { show: boolean; article: string | null; open: (article: string) => void; close: () => void; }

export const useHelpCenter = create<HelpState>((set) => ({
  show: false, article: null,
  open: (article) => set({ show: true, article }),
  close: () => set({ show: false, article: null }),
}));

const ARTICLES: Record<string, { title: string; content: string }> = {
  "account-connect": { title: "계정 연결하기", content: "프로필 탭에서 '계정 연결' 버튼을 누르고 전화번호를 입력하세요. 인증 후 자동으로 연결됩니다." },
  "first-send": { title: "첫 발송하기", content: "발송 탭에서 계정을 선택하고 메시지를 입력한 후 발송 버튼을 누르세요." },
  "ai-chat": { title: "AI 채팅 사용법", content: "AI 채팅 탭에서 질문을 입력하면 DeepSeek AI가 답변합니다. '발송해줘'라고 말하면 발송 탭으로 이동합니다." },
};

export function HelpCenterPanel({ onClose }: { onClose: () => void }) {
  const article = useHelpCenter(s => s.article);
  const a = article ? ARTICLES[article] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-app-card p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-app-text mb-2">{a?.title || "도움말"}</h3>
        <p className="text-xs text-app-text-muted leading-relaxed">{a?.content || "도움말을 선택하세요."}</p>
        <button onClick={onClose} className="mt-4 w-full rounded-xl bg-app-primary py-2.5 text-sm font-semibold text-white active:scale-[0.98]">확인</button>
      </div>
    </div>
  );
}
