"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Send,
  CalendarClock,
  Shield,
  FileText,
  Gamepad2,
  Users,
  Search,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "자동 응답 (FAQ 매크로)",
    desc: "들어오는 메시지에 키워드가 포함되면 자동으로 답변을 전송합니다. 조건(키워드 포함/정확히 일치), 쿨다운 시간, 일일 최대 응답 횟수를 상세하게 설정할 수 있습니다.",
    details: [
      "키워드 매칭 (포함/정확히 일치)",
      "쿨다운 시간 설정",
      "일일 최대 응답 횟수 제한",
      "성공/실패/제한 로깅",
    ],
  },
  {
    icon: Send,
    title: "메시지 발송",
    desc: "등록된 Telegram 계정으로 메시지를 발송합니다. 텍스트는 물론 이미지까지 첨부 가능하며, 여러 수신자에게 한 번에 전송할 수 있습니다.",
    details: [
      "텍스트 + 이미지 발송",
      "여러 수신자 동시 발송",
      "즉시 발송 지원",
      "백그라운드 처리",
    ],
  },
  {
    icon: CalendarClock,
    title: "예약 발송",
    desc: "원하는 날짜와 시간에 메시지가 자동으로 발송되도록 예약하세요. 30초 주기로 정확하게 디스패치됩니다.",
    details: [
      "ISO 8601 시간 형식 지원",
      "30초 주기 디스패치",
      "예약 상태 추적",
      "즉시 발송 자동 전환",
    ],
  },
  {
    icon: Shield,
    title: "멀티 계정 & 2FA 인증",
    desc: "여러 Telegram 계정을 하나의 대시보드에서 관리하세요. SMS 인증부터 2단계 비밀번호까지 완벽한 인증 과정을 지원합니다.",
    details: [
      "전화번호 기반 계정 등록",
      "SMS/2FA 인증",
      "FloodWait 에러 처리",
      "암호화된 세션 저장",
    ],
  },
  {
    icon: FileText,
    title: "발송 로그 & 모니터링",
    desc: "모든 발송 내역을 상세히 확인할 수 있습니다. Broadcast 상태(대기/발송중/성공/실패)별로 필터링하고 재시도할 수 있습니다.",
    details: [
      "계정/상태/날짜별 필터링",
      "Broadcast 재시도 지원",
      "JSON 구조화 로깅",
      "진행 상황 실시간 추적",
    ],
  },
  {
    icon: Gamepad2,
    title: "BotFather 원격 제어",
    desc: "Telegram BotFather 봇을 통해 대시보드에 접속하지 않고도 자동응답을 원격으로 제어하세요.",
    details: [
      "/autoreply 명령어 지원",
      "계정별 On/Off 버튼",
      "실시간 상태 업데이트",
      "대시보드 토글과 동기화",
    ],
  },
  {
    icon: Users,
    title: "그룹/채널 조회",
    desc: "인증된 계정이 속한 모든 그룹과 채널 목록을 실시간으로 조회합니다. 그룹 검색 기능으로 원하는 채팅방을 빠르게 찾을 수 있습니다.",
    details: [
      "계정별 그룹/채널 목록",
      "실시간 Telethon 연동",
      "그룹 검색 기능",
      "참여자/채널 정보 표시",
    ],
  },
  {
    icon: Search,
    title: "계정 건강 모니터링",
    desc: "각 계정의 인증 상태, 세션 유효성, 최근 활동, 오류 내역을 한눈에 확인하세요. 문제가 있는 계정에 신속히 대응할 수 있습니다.",
    details: [
      "인증 상태 (healthy/unauthorized/banned 등)",
      "세션 유효성 확인",
      "최근 성공/실패율",
      "전달 시도 횟수 추적",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-app-bg bg-grid">
      <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="badge-premium mx-auto w-fit mb-4">모든 기능</div>
          <h1 className="text-4xl sm:text-5xl font-bold text-app-text">
            강력한 <span className="text-app-primary">기능</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-app-text-secondary">
            텔레그램 자동화에 필요한 모든 기능을 한 곳에서
          </p>
        </div>

        <div className="mt-20 space-y-32">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className={`flex flex-col lg:flex-row gap-12 lg:gap-20 items-center ${
                  i % 2 === 1 ? "lg:flex-row-reverse" : ""
                } animate-slide-up`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex-1">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-primary/10 text-app-primary mb-6">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-app-text">
                    {feat.title}
                  </h2>
                  <p className="mt-4 text-app-text-secondary leading-relaxed">
                    {feat.desc}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {feat.details.map((d) => (
                      <li
                        key={d}
                        className="flex items-center gap-3 text-sm text-app-text-secondary"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-app-primary" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 w-full">
                  <div className="glass-card rounded-2xl p-10 sm:p-14 flex items-center justify-center min-h-[280px]">
                    <div className="text-center">
                      <Icon className="h-16 w-16 mx-auto mb-4 text-app-primary/40" />
                      <p className="text-sm text-app-text-muted">
                        실제 구동 화면은 대시보드에서 확인하세요
                      </p>
                      <Link
                        href="/signup"
                        className="btn-primary mt-6 inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-semibold relative z-10"
                      >
                        무료로 시작하기
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-32 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-app-text">
            더 궁금한 점이 있나요?
          </h2>
          <p className="mt-2 text-app-text-secondary">
            지금 바로 무료로 시작해보세요
          </p>
          <Link
            href="/signup"
            className="btn-primary mt-8 inline-flex h-12 items-center gap-2 rounded-xl px-10 text-base font-semibold relative z-10"
          >
            무료 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}