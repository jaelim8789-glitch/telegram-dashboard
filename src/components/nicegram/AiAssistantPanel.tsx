"use client";

/**
 * AiAssistantPanel ? ¿ìÃø AI ºñ¼­ ÆÐ³Î
 *
 * Claude ½ºÅ¸ÀÏ ºó Ã¤ÆÃÃ¢. ÃßÈÄ AI Whisper ¿¬µ¿ ¿¹Á¤.
 */

import { Sparkles, MessageSquare } from "lucide-react";

interface AiAssistantPanelProps {
  chatTitle?: string;
}

export function AiAssistantPanel({ chatTitle }: AiAssistantPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-app-border px-3 py-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-app-text">AI ºñ¼­</h3>
          <p className="text-[10px] text-app-text-muted truncate">
            {chatTitle ? `${chatTitle}¿¡ ´ëÇÑ ÃßÃµ` : "´ëÈ­¹æÀ» ¼±ÅÃÇÏ¼¼¿ä"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary/5 mb-4">
          <MessageSquare className="h-7 w-7 text-app-primary/40" />
        </div>
        <h4 className="text-base font-semibold text-app-text mb-2">
          ¹«¾ùÀ» µµ¿Íµå¸±±î¿ä?
        </h4>
        <p className="text-xs text-app-text-muted leading-relaxed max-w-[250px]">
          {chatTitle
            ? `¼±ÅÃÇÑ ´ëÈ­¹æ(${chatTitle})ÀÇ ¸Æ¶ôÀ» ºÐ¼®ÇÏ¿© ÃÖÀûÀÇ ´äº¯À» ÃßÃµÇØµå¸³´Ï´Ù.`
            : "ÁÂÃø Ã¤ÆÃ¹æÀ» ¼±ÅÃÇÏ¸é AI°¡ ´äº¯À» ÃßÃµÇØµå¸³´Ï´Ù."}
        </p>

        {/* Feature hints */}
        <div className="mt-6 space-y-2 w-full max-w-[260px]">
          <div className="flex items-start gap-2.5 rounded-lg bg-app-card-hover/50 px-3 py-2 text-left">
            <span className="text-xs mt-0.5">??</span>
            <div>
              <p className="text-[11px] font-medium text-app-text">¸Æ¶ô ºÐ¼®</p>
              <p className="text-[10px] text-app-text-muted">´ëÈ­ ³»¿ëÀ» ºÐ¼®ÇÏ¿© ÀûÀýÇÑ ´äº¯ Á¦¾È</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-app-card-hover/50 px-3 py-2 text-left">
            <span className="text-xs mt-0.5">??</span>
            <div>
              <p className="text-[11px] font-medium text-app-text">ÀÚµ¿ ´äÀå</p>
              <p className="text-[10px] text-app-text-muted">AI°¡ »ý¼ºÇÑ ´äº¯À» ¿øÅ¬¸¯À¸·Î Àü¼Û</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg bg-app-card-hover/50 px-3 py-2 text-left">
            <span className="text-xs mt-0.5">??</span>
            <div>
              <p className="text-[11px] font-medium text-app-text">°¨Á¤ ºÐ¼®</p>
              <p className="text-[10px] text-app-text-muted">°í°´ °¨Á¤À» ÆÄ¾ÇÇÏ¿© ÀÀ´ë Àü·« Á¦¾È</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom input area (future) */}
      <div className="border-t border-app-border px-3 py-2.5">
        <div className="rounded-xl border border-app-border bg-app-bg px-3 py-2 text-xs text-app-text-muted">
          AI¿¡°Ô Áú¹®ÇÏ±â...
        </div>
      </div>
    </div>
  );
}
