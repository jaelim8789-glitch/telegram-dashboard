export type ChatType = "personal" | "group" | "channel";

export interface ChatRoom {
  id: string;
  name: string;
  type: ChatType;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  subscriberCount?: number;
  isOnline?: boolean;
  isFavorite?: boolean;
  isPinned?: boolean;
  lastSeen?: Date;
}

export type MessageStatus = "sent" | "delivered" | "read";

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  sender: "me" | "other";
  senderName: string;
  content: string;
  timestamp: Date;
  status?: MessageStatus;
  reaction?: "heart";
}

export interface AiMacro {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

const now = Date.now();
const HOUR = 3600000;
const MIN = 60000;

export const CHAT_ROOMS: ChatRoom[] = [
  {
    id: "personal-1",
    name: "김민수",
    type: "personal",
    lastMessage: "내일 회의 자료 공유 부탁드립니다",
    lastMessageTime: new Date(now - 5 * MIN),
    unreadCount: 2,
    isOnline: true,
    isFavorite: true,
    isPinned: true,
  },
  {
    id: "personal-2",
    name: "이지은",
    type: "personal",
    lastMessage: "네, 알겠습니다. 확인 후 연락드릴게요",
    lastMessageTime: new Date(now - 23 * MIN),
    unreadCount: 0,
    isOnline: false,
    lastSeen: new Date(now - 15 * MIN),
  },
  {
    id: "personal-3",
    name: "박서준",
    type: "personal",
    lastMessage: "프로젝트 일정 조정이 필요할 것 같아요",
    lastMessageTime: new Date(now - 1 * HOUR),
    unreadCount: 5,
    isOnline: true,
  },
  {
    id: "personal-4",
    name: "최유진",
    type: "personal",
    lastMessage: "좋은 하루 보내세요!",
    lastMessageTime: new Date(now - 3 * HOUR),
    unreadCount: 0,
    isOnline: false,
    lastSeen: new Date(now - 45 * MIN),
  },
  {
    id: "group-1",
    name: "마케팅 팀",
    type: "group",
    lastMessage: "이번 캠페인 성과 리포트 공유드립니다",
    lastMessageTime: new Date(now - 8 * MIN),
    unreadCount: 12,
    isPinned: true,
  },
  {
    id: "group-2",
    name: "개발 스터디",
    type: "group",
    lastMessage: "다음 주 발표 주제 추천받습니다",
    lastMessageTime: new Date(now - 35 * MIN),
    unreadCount: 3,
  },
  {
    id: "group-3",
    name: "주말 등산 모임",
    type: "group",
    lastMessage: "이번 주는 북한산 어떠세요?",
    lastMessageTime: new Date(now - 2 * HOUR),
    unreadCount: 0,
    isFavorite: true,
  },
  {
    id: "group-4",
    name: "스타트업 네트워크",
    type: "group",
    lastMessage: "투자 유치 관련 노하우 공유해주신 분 감사합니다",
    lastMessageTime: new Date(now - 4 * HOUR),
    unreadCount: 8,
  },
  {
    id: "channel-1",
    name: "테크 뉴스",
    type: "channel",
    lastMessage: "애플, 새로운 AI 기능 발표 예정",
    lastMessageTime: new Date(now - 12 * MIN),
    unreadCount: 1,
    subscriberCount: 12500,
  },
  {
    id: "channel-2",
    name: "일일 경제 브리핑",
    type: "channel",
    lastMessage: "코스피 2,800선 돌파... 외국인 매수세 확대",
    lastMessageTime: new Date(now - 1 * HOUR),
    unreadCount: 3,
    subscriberCount: 8300,
  },
  {
    id: "channel-3",
    name: "디자인 인스피레이션",
    type: "channel",
    lastMessage: "2026년 UI/UX 트렌드 총정리",
    lastMessageTime: new Date(now - 5 * HOUR),
    unreadCount: 0,
    subscriberCount: 4600,
  },
  {
    id: "channel-4",
    name: "맛집 탐방",
    type: "channel",
    lastMessage: "을지로 숨은 맛집 리스트 공개합니다",
    lastMessageTime: new Date(now - 7 * HOUR),
    unreadCount: 2,
    subscriberCount: 21000,
  },
];

function buildMessages(chatRoomId: string, count: number): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const koreanMessages = {
    me: [
      "안녕하세요! 프로젝트 진행 상황 공유 부탁드려요",
      "네, 확인했습니다. 오늘 중으로 전달드릴게요",
      "좋은 아이디어네요! 저도 동의합니다",
      "혹시 관련 자료 있으시면 공유 부탁드립니다",
      "회의 시간이 변경되었습니다. 오후 3시로 조정되었어요",
      "감사합니다! 덕분에 많이 배웠습니다",
      "이 부분은 추가 논의가 필요할 것 같아요",
      "월요일까지 검토 후 피드백 드리겠습니다",
      "방금 메일로 상세 내용 보내드렸습니다",
      "점심 식사 같이 하실래요?",
      "일정 조율이 필요합니다. 가능한 시간 알려주세요",
      "새로운 기능 제안이 있어서 공유드려요",
      "이번 주 금요일까지 완료 목표입니다",
      "리뷰 감사합니다. 수정해서 다시 올리겠습니다",
      "오늘 회의 내용 정리해서 공유드립니다",
    ],
    other: [
      "안녕하세요! 자료는 정리되는 대로 보내드리겠습니다",
      "회의록 확인했습니다. 몇 가지 수정 요청드려요",
      "의견 감사합니다. 팀원들과 논의해보겠습니다",
      "자료 방금 공유드렸습니다. 확인 부탁드려요",
      "오후 3시에 뵙겠습니다. 회의실 예약해두었어요",
      "네, 덕분에 프로젝트가 순조롭게 진행되고 있습니다",
      "이 부분에 대해서는 추가 리서치가 필요할 것 같네요",
      "월요일 오전 중으로 검토 완료하겠습니다",
      "메일 확인했습니다. 상세히 살펴보고 회신드릴게요",
      "좋아요! 12시에 로비에서 만나요",
      "다음 주 화요일 오전이 가능합니다",
      "제안해주신 내용 정말 좋네요. 바로 적용해보겠습니다",
      "현재 진척률은 약 70% 정도입니다",
      "수정사항 반영했습니다. 다시 한번 확인 부탁드려요",
      "회의 내용 잘 정리해주셨네요. 감사합니다",
    ],
  };

  for (let i = 0; i < count; i++) {
    const sender = i % 2 === 0 ? "me" : ("other" as const);
    const senderName = sender === "me" ? "나" : CHAT_ROOMS.find((r) => r.id === chatRoomId)?.name.split(" ")[0] ?? "상대";
    const pool = sender === "me" ? koreanMessages.me : koreanMessages.other;
    const content = pool[i % pool.length];
    const timestamp = new Date(now - (count - i) * (25 + Math.random() * 40) * MIN);

    messages.push({
      id: `${chatRoomId}-msg-${i}`,
      chatRoomId,
      sender,
      senderName,
      content,
      timestamp,
      ...(sender === "me" ? { status: "read" as const } : {}),
    });
  }

  return messages;
}

export const MESSAGES: Record<string, ChatMessage[]> = {};
for (const room of CHAT_ROOMS) {
  MESSAGES[room.id] = buildMessages(room.id, 22 + Math.floor(Math.random() * 8));
}

export const AI_MACROS: AiMacro[] = [
  {
    id: "auto-reply",
    label: "자동 응답",
    description: "수신 메시지에 자동으로 응답합니다",
    enabled: true,
  },
  {
    id: "spam-filter",
    label: "스팸 필터",
    description: "스팸/광고 메시지를 자동 차단합니다",
    enabled: true,
  },
  {
    id: "keyword-alert",
    label: "키워드 알림",
    description: "특정 키워드 포함 시 알림을 보냅니다",
    enabled: false,
  },
  {
    id: "translate",
    label: "번역",
    description: "외국어 메시지를 자동 번역합니다",
    enabled: false,
  },
  {
    id: "sentiment",
    label: "감정 분석",
    description: "메시지의 감정을 분석합니다",
    enabled: true,
  },
  {
    id: "summary",
    label: "요약 생성",
    description: "긴 메시지를 자동 요약합니다",
    enabled: false,
  },
];
