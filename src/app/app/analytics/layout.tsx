import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "분석 대시보드",
  description: "TeleMon 분석 리포트 대시보드",
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
