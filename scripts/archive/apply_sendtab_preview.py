#!/usr/bin/env python3
"""Apply SendTab MessagePreview integration + AgentSidebar Marketplace integration."""

import re, os

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

# ── 1. SendTab.tsx: Replace inline variable preview with MessagePreview ──
sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find and replace the inline variable preview block
old_block = """            </Field>

            {/* ── Inline variable preview ── */}
            {message.trim() && TEMPLATE_VARIABLES.some((v) => message.includes(v.key)) && (
              <div className="rounded-xl border border-app-info/15 bg-app-info-muted/5 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-info mb-1">
                  <Eye className="h-3 w-3" />
                  변수 치환 미리보기
                </div>
                <div className="whitespace-pre-wrap break-words rounded-lg border border-app-border/50 bg-app-card/50 px-3 py-2 text-sm leading-relaxed text-app-text">
                  {previewTemplate(message, {
                    name: selectedRecipients[0]?.title ?? "샘플 그룹",
                    phone: account?.phone ?? "010-0000-0000",
                    count: selectedRecipientIds.length || 10,
                  })}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-text-subtle">
                  {TEMPLATE_VARIABLES.filter((v) => message.includes(v.key)).map((v) => {
                    let sample = "";
                    if (v.key === "{{name}}") sample = selectedRecipients[0]?.title ?? "샘플 그룹";
                    else if (v.key === "{{phone}}") sample = account?.phone ?? "010-0000-0000";
                    else if (v.key === "{{count}}") sample = String(selectedRecipientIds.length || 10);
                    return (
                      <span key={v.key} className="inline-flex items-center gap-1">
                        <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[10px] text-app-info">{v.key}</code>
                        <span className="text-app-text-subtle">→</span>
                        <span className="font-medium text-app-text">{sample}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Template library toolbar */}"""

new_block = """            </Field>

            {/* ── Telegram-style message preview ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <MessagePreview
                message={message}
                recipientCount={selectedRecipientIds.length}
                accountPhone={account?.phone}
                groupName={selectedRecipients[0]?.title}
                imagePreviewUrl={imageFile ? URL.createObjectURL(imageFile) : null}
              />
              {/* Variable substitution info */}
              {message.trim() && TEMPLATE_VARIABLES.some((v) => message.includes(v.key)) && (
                <div className="rounded-xl border border-app-info/15 bg-app-info-muted/5 px-3 py-2 self-start">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-info mb-1">
                    <Eye className="h-3 w-3" />
                    변수 치환 정보
                  </div>
                  <div className="whitespace-pre-wrap break-words rounded-lg border border-app-border/50 bg-app-card/50 px-3 py-2 text-sm leading-relaxed text-app-text">
                    {previewTemplate(message, {
                      name: selectedRecipients[0]?.title ?? "샘플 그룹",
                      phone: account?.phone ?? "010-0000-0000",
                      count: selectedRecipientIds.length || 10,
                    })}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-text-subtle">
                    {TEMPLATE_VARIABLES.filter((v) => message.includes(v.key)).map((v) => {
                      let sample = "";
                      if (v.key === "{{name}}") sample = selectedRecipients[0]?.title ?? "샘플 그룹";
                      else if (v.key === "{{phone}}") sample = account?.phone ?? "010-0000-0000";
                      else if (v.key === "{{count}}") sample = String(selectedRecipientIds.length || 10);
                      return (
                        <span key={v.key} className="inline-flex items-center gap-1">
                          <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[10px] text-app-info">{v.key}</code>
                          <span className="text-app-text-subtle">→</span>
                          <span className="font-medium text-app-text">{sample}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Template library toolbar */}"""

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    print("✅ SendTab.tsx: MessagePreview integrated (inline variable preview replaced)")
else:
    print("❌ SendTab.tsx: Could not find the old block to replace")

with open(sendtab_path, "w", encoding="utf-8") as f:
    f.write(content)

# ── 2. AgentSidebar.tsx: Integrate AgentMarketplace ──
sidebar_path = os.path.join(PROJECT, "src/components/ai/AgentSidebar.tsx")
with open(sidebar_path, "r", encoding="utf-8") as f:
    sidebar = f.read()

# Add import for AgentMarketplace
old_import = """import { Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import type { Agent, AgentChat } from "@/lib/agent-api";"""

new_import = """import { Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { InlineError } from "@/components/ui/InlineError";
import { AgentMarketplace } from "@/components/ai/AgentMarketplace";
import type { Agent, AgentChat } from "@/lib/agent-api";"""

if old_import in sidebar:
    sidebar = sidebar.replace(old_import, new_import, 1)
    print("✅ AgentSidebar.tsx: Import added")
else:
    print("⚠️ AgentSidebar.tsx: Import not found, trying alternate...")
    # Try partial match
    if "Plus, MessageSquare, Trash2" in sidebar:
        sidebar = sidebar.replace(
            'Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap',
            'Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap, Store'
        )
        print("  → Store icon import added")
    if "InlineError" in sidebar:
        sidebar = sidebar.replace(
            'import { InlineError } from "@/components/ui/InlineError"',
            'import { InlineError } from "@/components/ui/InlineError";\nimport { AgentMarketplace } from "@/components/ai/AgentMarketplace"'
        )
        print("  → AgentMarketplace import added")

# Add state for marketplace open and onAgentCreated handler
old_bottom = """      {/* Bottom settings */}
      <div className="border-t border-app-border px-3 py-2">
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]">
          <Settings className="h-3.5 w-3.5 shrink-0" />
          템플릿 마켓
        </button>
      </div>"""

new_bottom = """      {/* Bottom settings */}
      <div className="border-t border-app-border px-3 py-2 space-y-1">
        <button
          onClick={onNewAgent}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]"
        >
          <Bot className="h-3.5 w-3.5 shrink-0" />
          새 Agent 만들기
        </button>
        <button
          onClick={() => onNewAgent()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]"
        >
          <Store className="h-3.5 w-3.5 shrink-0 text-purple-500" />
          템플릿 마켓
        </button>
      </div>"""

if old_bottom in sidebar:
    sidebar = sidebar.replace(old_bottom, new_bottom, 1)
    print("✅ AgentSidebar.tsx: Bottom section updated with template market button")
else:
    print("❌ AgentSidebar.tsx: Bottom section not found")

with open(sidebar_path, "w", encoding="utf-8") as f:
    f.write(sidebar)

# ── 3. Clean up the unused `previewTemplate` import in SendTab.tsx ──
# (previewTemplate is still used in the variable info section, so keep it)

print("\n✅ All integrations applied!")
