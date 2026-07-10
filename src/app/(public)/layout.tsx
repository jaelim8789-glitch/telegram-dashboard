import type { Metadata } from "next";
import { PublicLayoutClient } from "./PublicLayoutClient";

export const metadata: Metadata = {
  title: {
    default: `TeleMon | 텔레그램 자동화 매크로 플랫폼`,
    template: `%s | TeleMon`,
  },
  description:
    "Telegram 계정 관리, 자동 응답, 예약 발송, 그룹 검색, 계정 건강 모니터링, 전달 분석까지. 코딩 없이 하나의 대시보드에서 텔레그램을 완전 자동화하세요.",
  keywords:
    "텔레그램, 텔레그램 매크로, 텔레그램 자동응답, 텔레그램 발송, FAQ 봇, Telegram 자동화, 텔레그램 그룹 관리, 텔레그램 분석",
  openGraph: {
    title: "TeleMon | 텔레그램 자동화 플랫폼",
    description:
      "하나의 대시보드에서 텔레그램 계정 관리, 자동 응답, 발송, 분석까지.",
    siteName: "TeleMon",
    type: "website",
    locale: "ko_KR",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayoutClient>{children}</PublicLayoutClient>;
}