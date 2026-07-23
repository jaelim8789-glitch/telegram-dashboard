"use client";

/**
 * Nicegram ChatView ? Áß¾Ó Telegram ½ºÅ¸ÀÏ ´ëÈ­Ã¢ ÆÐ³Î
 *
 * ±âÁ¸ TelegramChatView¸¦ Àç»ç¿ë. º°µµ ¼öÁ¤ ±ÝÁö.
 * NicegramToolbar¸¦ »ó´Ü¿¡ ¹èÄ¡.
 */

import { NicegramToolbar } from "./NicegramToolbar";
import { TelegramChatView } from "@/components/telegram-chat/TelegramChatView";

interface NicegramChatViewProps {
  accountId: string;
  chatId: number;
  chatTitle: string;
  onBack: () => void;
}

export function NicegramChatView({ accountId, chatId, chatTitle, onBack }: NicegramChatViewProps) {
  return (
    <div className="flex h-full flex-col">
      <NicegramToolbar />
      <div className="flex-1 overflow-hidden">
        <TelegramChatView
          accountId={accountId}
          chatId={chatId}
          chatTitle={chatTitle}
          onBack={onBack}
        />
      </div>
    </div>
  );
}
