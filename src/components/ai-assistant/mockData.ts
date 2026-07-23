import type { SummaryItem, ChatMessage, SuggestedQuestion } from "./types";

export const MOCK_SUMMARY_ITEMS: SummaryItem[] = [
  { id: "s1", icon: "UserPlus", title: "신규 가입자 24명", description: "오늘 24명의 신규 사용자가 가입했습니다. 전일 대비 15% 증가했습니다.", timestamp: "2026-07-22T20:00:00+09:00", iconColor: "green" },
  { id: "s2", icon: "CheckCircle2", title: "발송 성공률 98.2%", description: "오늘 총 1,234건 발송 중 1,211건이 성공적으로 전달되었습니다.", timestamp: "2026-07-22T21:30:00+09:00", iconColor: "violet" },
  { id: "s3", icon: "Clock", title: "응답 대기 3건", description: "3개의 고객 문의가 응답을 기다리고 있습니다. 빠른 확인이 필요합니다.", timestamp: "2026-07-22T22:00:00+09:00", iconColor: "amber" },
  { id: "s4", icon: "Calendar", title: "오늘 예약 발송 2건", description: "18:00와 21:00에 예약된 발송이 있습니다. 콘텐츠를 최종 확인하세요.", timestamp: "2026-07-22T18:00:00+09:00", iconColor: "blue" },
  { id: "s5", icon: "Shield", title: "스팸 차단 47건", description: "오늘 자동 스팸 필터가 47건의 의심 메시지를 차단했습니다.", timestamp: "2026-07-22T21:50:00+09:00", iconColor: "red" },
];

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  { id: "m1", role: "assistant", content: "안녕하세요! 저는 AI 비서입니다. 계정 관리와 발송 통계에 관해 무엇이든 물어보세요.", timestamp: "2026-07-22T20:00:00+09:00" },
  { id: "m2", role: "user", content: "오늘 발송 통계 간략하게 보여줘", timestamp: "2026-07-22T20:01:00+09:00" },
  { id: "m3", role: "assistant", content: "오늘(7월 22일) 기준 발송 통계입니다:\n\n📊 **총 발송:** 1,234건\n✅ **성공:** 1,211건 (98.2%)\n❌ **실패:** 23건 (1.8%)\n\n**상위 발송 계정:**\n1. 24시 자동응답 - 234건\n2. 프로모션 계정 A - 201건\n3. SNS 통합 관리 - 167건\n\n발송 성공률이 매우 양호합니다. 다만 뉴스레터 발송 계정과 파트너사 B 계정에서 오류가 감지되었으니 확인이 필요합니다.", timestamp: "2026-07-22T20:01:05+09:00" },
  { id: "m4", role: "user", content: "오류 난 계정들 자세히 알려줘", timestamp: "2026-07-22T20:02:00+09:00" },
  { id: "m5", role: "assistant", content: "현재 오류가 발생한 계정은 2개입니다:\n\n🔴 **뉴스레터 발송** (010-6789-0123)\n- 마지막 활동: 2026-07-21 09:15\n- 오늘 발송: 0건\n- 오류 유형: Telegram 세션 만료\n- 조치: 재인증이 필요합니다\n\n🔴 **파트너사 B** (010-2222-3333)\n- 마지막 활동: 2026-07-21 20:00\n- 오늘 발송: 0건\n- 오류 유형: Rate limit 초과\n- 조치: 1시간 후 자동 해제 예정\n\n두 계정 모두 빠른 조치가 필요합니다. '계정 관리' 페이지에서 상태를 확인하고 복구 작업을 진행하세요.", timestamp: "2026-07-22T20:02:08+09:00" },
];

export const MOCK_SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: "q1", text: "오늘 발송 통계 보여줘" },
  { id: "q2", text: "응답률이 낮은 채팅방 알려줘" },
  { id: "q3", text: "이번 주 신규 가입자 추이는?" },
  { id: "q4", text: "AI 매크로 추천해줘" },
];
