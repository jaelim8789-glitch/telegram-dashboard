"use client";

import { useMemo, useState, memo } from "react";
import { Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/cn";
import { previewTemplate } from "@/lib/messageTemplates";

interface MessagePreviewProps {
  message: string;
  recipientCount: number;
  accountPhone?: string;
  groupName?: string;
  imagePreviewUrl?: string | null;
  plan?: string | null;
}

export const MessagePreview = memo(function MessagePreview({
  message,
  recipientCount,
  accountPhone,
  groupName,
  imagePreviewUrl,
  plan,
}: MessagePreviewProps) {
  const [view, setView] = useState<"mobile" | "desktop">("mobile");

  const WATERMARK_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://telemon.online";
  const WATERMARK = `\n\n━━━━━━━━━━━━━━━━━━\n🤖 TeleMon AI\n\n🚀 Telegram 운영, 아직도 직접 하시나요?\n\nAI 비서가\n✅ 자동 홍보\n✅ 자동 답장\n✅ 채널 운영\n✅ 그룹 관리\n\n🌐 ${WATERMARK_URL}`;

  const preview = useMemo(
    () =>
      previewTemplate(
        message + (plan === "free" ? WATERMARK : ""),
        {
          name: groupName ?? "샘플 그룹",
          phone: accountPhone ?? "010-0000-0000",
          count: recipientCount ?? 10,
        }
      ),
    [message, groupName, accountPhone, recipientCount, plan],
  );

  const isEmpty = !message.trim() && !imagePreviewUrl;

  return (
    <div className="rounded-xl border border-app-border bg-app-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-app-border px-3 py-2">
        <span className="text-[11px] font-semibold text-app-text-muted tracking-wider uppercase">
          미리보기
        </span>
        <div className="flex items-center gap-0.5 rounded-lg border border-app-border bg-app-bg p-0.5">
          <button
            type="button"
            onClick={() => setView("mobile")}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-[10px] transition-colors",
              view === "mobile"
                ? "bg-app-card text-app-text shadow-sm"
                : "text-app-text-muted hover:text-app-text"
            )}
            title="모바일"
          >
            <Smartphone className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setView("desktop")}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-[10px] transition-colors",
              view === "desktop"
                ? "bg-app-card text-app-text shadow-sm"
                : "text-app-text-muted hover:text-app-text"
            )}
            title="데스크톱"
          >
            <Monitor className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className={cn(
        "flex items-center justify-center p-3",
        view === "mobile" ? "bg-gradient-to-b from-telegram-blue/5 to-telegram-blue/10" : "bg-app-bg"
      )}>
        <div
          className={cn(
            "flex flex-col overflow-hidden",
            view === "mobile"
              ? "w-[240px] rounded-2xl border border-app-border/50 bg-app-card shadow-lg"
              : "w-full max-w-md rounded-xl border border-app-border bg-app-card shadow-sm"
          )}
        >
          {/* Chat header */}
          <div className="flex items-center gap-2 border-b border-app-border px-3 py-2 bg-app-primary/5">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-app-primary/20 text-[10px] font-bold text-app-primary">
              T
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-app-text truncate">
                {groupName || "수신자"}
              </p>
              <p className="text-[9px] text-app-text-muted truncate">
                {recipientCount > 0 ? `${recipientCount}명` : "봇"} · 지금
              </p>
            </div>
          </div>

          {/* Message bubbles */}
          <div className="flex-1 space-y-2 p-3 min-h-[120px]">
            {isEmpty ? (
              <div className="flex h-full min-h-[100px] items-center justify-center">
                <p className="text-[10px] text-app-text-muted/50 italic">
                  메시지를 입력하면 미리보기가 표시됩니다
                </p>
              </div>
            ) : (
              <>
                {/* Image preview */}
                {imagePreviewUrl && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-md overflow-hidden border border-app-border">
                      <img
                        src={imagePreviewUrl}
                        alt="첨부 이미지"
                        className="w-full h-auto max-h-40 object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Text message */}
                {preview && (
                  <div className="flex justify-start">
                    <div
                      className={cn(
                        "rounded-2xl rounded-bl-md px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words",
                        imagePreviewUrl
                          ? "bg-app-bg text-app-text border border-app-border mt-[-4px] rounded-tl-none"
                          : "bg-app-primary/10 text-app-text"
                      )}
                      style={!imagePreviewUrl ? { backgroundColor: "rgba(0, 136, 204, 0.1)" } : undefined}
                    >
                      {preview}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input bar */}
          <div className="border-t border-app-border px-2 py-1.5 flex items-center gap-1">
            <div className="flex-1 h-6 rounded-lg bg-app-bg border border-app-border" />
            <div className="h-6 w-6 rounded-lg bg-app-primary/30 flex items-center justify-center">
              <div className="h-3 w-3 rotate-45 border-2 border-white/70 border-l-transparent border-t-transparent ml-0.5 mb-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});


