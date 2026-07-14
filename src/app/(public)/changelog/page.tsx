import Link from "next/link";
import { ArrowLeft, Sparkles, Bug, Zap, Shield, Palette, BarChart3 } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  sections: {
    icon: React.ReactNode;
    title: string;
    items: string[];
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "v0.1.0-beta",
    date: "2025-07-13",
    sections: [
      {
        icon: <Sparkles className="h-4 w-4 text-amber-400" />,
        title: "프리런치 안정화",
        items: [
          "프리미엄 Dark/Light/System 테마 시스템 적용",
          "관리자 수동 API 키 발급 UI 추가",
          "무료 체험 Telegram 채널 인증 흐름 개선",
          "세션 지속성 개선 (visibilitychange 폴링)",
          "스마트 그룹 참가 큐(Join Queue) 백엔드 연동",
        ],
      },
    ],
  },
  {
    version: "beta-20250712",
    date: "2025-07-12",
    sections: [
      {
        icon: <Zap className="h-4 w-4 text-blue-400" />,
        title: "신규 기능",
        items: [
          "Telegram 벌크 링크 인스펙터 (Link Checker) 추가",
          "무료 체험 전화번호 SMS OTP → Telegram 채널 인증으로 전환",
          "관리자 대시보드에 고객 지원 콘솔 추가",
          "전달 분석(Delivery Analytics) 탭에 실패 분석 패널 추가",
        ],
      },
      {
        icon: <Bug className="h-4 w-4 text-red-400" />,
        title: "버그 수정",
        items: [
          "반복 발송(Recurring Broadcast) 일시정지/재개 상태 동기화 오류 수정",
          "답장매크로(Reply Macro) 대상 채팅 선택 UI 오류 수정",
          "그룹 선택 제한(cap) 불일치 수정",
        ],
      },
      {
        icon: <Shield className="h-4 w-4 text-emerald-400" />,
        title: "인프라",
        items: [
          "Docker standalone 빌드 최적화",
          "Playwright E2E 테스트 안정화",
          "Python 스모크 테스트 추가",
        ],
      },
    ],
  },
  {
    version: "alpha-20250710",
    date: "2025-07-10",
    sections: [
      {
        icon: <Sparkles className="h-4 w-4 text-amber-400" />,
        title: "최초 출시",
        items: [
          "Telegram 계정 등록 및 관리",
          "메시지 발송 (즉시/예약/반복)",
          "자동 응답(FAQ Macro) 규칙",
          "답장매크로(Reply Macro)",
          "그룹 관리 및 그룹 검색",
          "링크 인스펙터",
          "대시보드 개요",
          "발송 로그",
          "관리자 콘솔 (사용자 관리, API 키 관리)",
          "무료 체험(Free Trial) 및 유료 요금제 (USDT)",
        ],
      },
      {
        icon: <Palette className="h-4 w-4 text-purple-400" />,
        title: "UI/UX",
        items: [
          "한국어/영어/일본어/중국어 다국어 지원",
          "커맨드 팔레트 (⌘K)",
          "반응형 레이아웃 (모바일 지원)",
        ],
      },
      {
        icon: <BarChart3 className="h-4 w-4 text-indigo-400" />,
        title: "분석",
        items: [
          "전달 분석 (성공률, 실패 분석, 지연 측정)",
          "계정 건강 상태 모니터링",
        ],
      },
    ],
  },
];

export const metadata = {
  title: "변경사항",
  description: "TeleMon 업데이트 및 변경사항",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-app-bg bg-grid px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          홈으로
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-app-text">
            <span className="gold-text">변경사항</span>
          </h1>
          <p className="mt-3 text-base text-app-text-secondary">
            TeleMon의 새로운 기능과 개선 사항을 확인하세요.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-app-border" aria-hidden="true" />

          <div className="space-y-12">
            {changelog.map((entry) => (
              <div key={entry.version} className="relative pl-10">
                <div className="absolute left-0 mt-1.5 h-9 w-9 rounded-full border-2 border-app-border bg-app-card flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-app-primary" />
                </div>

                <div className="glass-card p-6 space-y-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-lg font-semibold text-app-text font-mono">{entry.version}</h2>
                    <span className="text-xs text-app-text-subtle tabular-nums">{entry.date}</span>
                  </div>

                  {entry.sections.map((section) => (
                    <div key={section.title}>
                      <div className="flex items-center gap-2 mb-2">
                        {section.icon}
                        <h3 className="text-sm font-medium text-app-text">{section.title}</h3>
                      </div>
                      <ul className="space-y-1.5">
                        {section.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-app-text-secondary">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-app-text-subtle" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-xs text-app-text-subtle">
            더 자세한 변경사항은{" "}
            <a href="mailto:support@telemon.io" className="text-app-primary-hover hover:underline">
              support@telemon.io
            </a>
            로 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
