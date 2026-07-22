import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 비서",
  description: "AI 비서와 대화하며 계정 관리와 발송 통계를 확인하세요.",
};

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
