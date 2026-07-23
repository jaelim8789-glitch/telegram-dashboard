import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 관리",
  description: "등록된 계정을 관리하고 상태를 모니터링합니다.",
};

export default function AccountsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
