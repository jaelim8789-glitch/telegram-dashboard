"use client";

import { SummaryPanel } from "@/components/ai-assistant/SummaryPanel";
import { ChatPanel } from "@/components/ai-assistant/ChatPanel";
import { MOCK_SUMMARY_ITEMS } from "@/components/ai-assistant/mockData";

export function AiAssistantPageClient() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] bg-app-bg">
      {/* Left panel - daily summary */}
      <div className="hidden w-[300px] shrink-0 border-r border-app-border bg-app-surface lg:block">
        <SummaryPanel items={MOCK_SUMMARY_ITEMS} />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <ChatPanel />
      </div>
    </div>
  );
}
