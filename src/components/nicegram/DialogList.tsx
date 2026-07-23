"use client";

/**
 * Nicegram DialogList ? ÁÂÃø Ã¤ÆÃ¹æ ¸ñ·Ï ÆÐ³Î
 *
 * ±âÁ¸ Telegram DialogList¸¦ ±×´ë·Î Àç»ç¿ë. º°µµ ¼öÁ¤ ±ÝÁö.
 */

import { useState } from "react";
import { DialogList as BaseDialogList } from "@/components/telegram-chat/DialogList";

// ¦¡¦¡ Demo / placeholder data ¦¡¦¡
const MOCK_DIALOGS = [
  {
    id: 1,
    title: "±è°í°´",
    type: "private" as const,
    unread_count: 3,
    last_message: "³×, ¾Ë°Ú½À´Ï´Ù. È®ÀÎÇØº¼°Ô¿ä.",
    last_message_date: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    pinned: true,
    participants_count: 0,
  },
  {
    id: 2,
    title: "ÀÌ´ë¸®",
    type: "private" as const,
    unread_count: 0,
    last_message: "°¨»çÇÕ´Ï´Ù!",
    last_message_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 0,
  },
  {
    id: 3,
    title: "ÇÁ·Î¸ð¼Ç ´ÜÃ¼¹æ",
    type: "group" as const,
    unread_count: 12,
    last_message: "¹Ú¸Å´ÏÀú: »õ ÇÁ·Î¸ð¼Ç ¾È³»µå¸³´Ï´Ù",
    last_message_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 45,
  },
  {
    id: 4,
    title: "°øÁö Ã¤³Î",
    type: "channel" as const,
    unread_count: 1,
    last_message: "[°øÁö] ½Ã½ºÅÛ Á¡°Ë ¾È³»",
    last_message_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    pinned: false,
    participants_count: 128,
  },
  {
    id: 5,
    title: "ÃÖºÎÀå",
    type: "private" as const,
    unread_count: 0,
    last_message: "³×, ³»ÀÏ È¸ÀÇ ¶§ ³íÀÇÇÏÁÒ",
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
