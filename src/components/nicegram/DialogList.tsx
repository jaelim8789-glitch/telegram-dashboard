"use client";

/**
 * Nicegram DialogList ? 좌측 채팅방 목록 패널
 *
 * 기존 Telegram DialogList를 그대로 재사용. 별도 수정 금지.
 */

import { useState } from "react";
import { DialogList as BaseDialogList } from "@/components/telegram-chat/DialogList";

// ── Demo / placeholder data ──
const MOCK_DIALOGS = [
  {
    id: 1,
    title: "김고객",
    type: "private" as const,
    unread_count: 3,
    last_message: "네, 알겠습니다. 확인해볼게요.",
    last_message_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    pinned: true,
    participants_count: 0,
  },
  {
    id: 2,
    title: "이대리",
    type: "private" as const,
    unread_count: 0,
    last_message: "감사합니다!",
    last_message_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 0,
  },
  {
    id: 3,
    title: "프로모션 단체방",
    type: "group" as const,
    unread_count: 12,
    last_message: "박매니저: 새 프로모션 안내드립니다",
    last_message_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 45,
  },
  {
    id: 4,
    title: "공지 채널",
    type: "channel" as const,
    unread_count: 1,
    last_message: "[공지] 시스템 점검 안내",
    last_message_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 128,
  },
  {
    id: 5,
    title: "최부장",
    type: "private" as const,
    unread_count: 0,
    last_message: "네, 내일 회의 때 논의하죠",
    last_message_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 0,
  },
];

interface NicegramDialogListProps {
  activeChatId: number | null;
  onSelectChat: (chatId: number) => void;
}

export function NicegramDialogList({ activeChatId, onSelectChat }: NicegramDialogListProps) {
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  return (
    <BaseDialogList
      dialogs={MOCK_DIALOGS}
      activeChatId={activeChatId}
      onSelectChat={onSelectChat}
      search={search}
      onSearchChange={setSearch}
      unreadOnly={unreadOnly}
      onUnreadFilterChange={setUnreadOnly}
    />
  );
}
