#!/usr/bin/env python3
"""Apply SendTab MessagePreview integration + AgentSidebar Marketplace integration."""

import os, sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

# 1. SendTab.tsx: Replace inline variable preview with MessagePreview
sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = '''            </Field>

            {/** Inline variable preview **/}
            {message.trim() && TEMPLATE_VARIABLES.some((v) => message.includes(v.key)) && (
              <div className="rounded-xl border border-app-info/15 bg-app-info-muted/5 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-info mb-1">
                  <Eye className="h-3 w-3" />
                  \ubcc0\uc218 \uce58\ud658 \ubbf8\ub9ac\ubcf4\uae30
                </div>
                <div className="whitespace-pre-wrap break-words rounded-lg border border-app-border/50 bg-app-card/50 px-3 py-2 text-sm leading-relaxed text-app-text">
                  {previewTemplate(message, {
                    name: selectedRecipients[0]?.title ?? "\uc0d8\ud50c \uadf8\ub8f9",
                    phone: account?.phone ?? "010-0000-0000",
                    count: selectedRecipientIds.length || 10,
                  })}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-text-subtle">
                  {TEMPLATE_VARIABLES.filter((v) => message.includes(v.key)).map((v) => {
                    let sample = "";
                    if (v.key === "{{name}}") sample = selectedRecipients[0]?.title ?? "\uc0d8\ud50c \uadf8\ub8f9";
                    else if (v.key === "{{phone}}") sample = account?.phone ?? "010-0000-0000";
                    else if (v.key === "{{count}}") sample = String(selectedRecipientIds.length || 10);
                    return (
                      <span key={v.key} className="inline-flex items-center gap-1">
                        <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[10px] text-app-info">{v.key}</code>
                        <span className="text-app-text-subtle">\u2192</span>
                        <span className="font-medium text-app-text">{sample}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Template library toolbar */}'''

new_block = '''            </Field>

            {/** Telegram-style message preview **/}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <MessagePreview
                message={message}
                recipientCount={selectedRecipientIds.length}
                accountPhone={account?.phone}
                groupName={selectedRecipients[0]?.title}
                imagePreviewUrl={imageFile ? URL.createObjectURL(imageFile) : null}
              />
              {/** Variable substitution info **/}
              {message.trim() && TEMPLATE_VARIABLES.some((v) => message.includes(v.key)) && (
                <div className="rounded-xl border border-app-info/15 bg-app-info-muted/5 px-3 py-2 self-start">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-app-info mb-1">
                    <Eye className="h-3 w-3" />
                    \ubcc0\uc218 \uce58\ud658 \uc815\ubcf4
                  </div>
                  <div className="whitespace-pre-wrap break-words rounded-lg border border-app-border/50 bg-app-card/50 px-3 py-2 text-sm leading-relaxed text-app-text">
                    {previewTemplate(message, {
                      name: selectedRecipients[0]?.title ?? "\uc0d8\ud50c \uadf8\ub8f9",
                      phone: account?.phone ?? "010-0000-0000",
                      count: selectedRecipientIds.length || 10,
                    })}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-text-subtle">
                    {TEMPLATE_VARIABLES.filter((v) => message.includes(v.key)).map((v) => {
                      let sample = "";
                      if (v.key === "{{name}}") sample = selectedRecipients[0]?.title ?? "\uc0d8\ud50c \uadf8\ub8f9";
                      else if (v.key === "{{phone}}") sample = account?.phone ?? "010-0000-0000";
                      else if (v.key === "{{count}}") sample = String(selectedRecipientIds.length || 10);
                      return (
                        <span key={v.key} className="inline-flex items-center gap-1">
                          <code className="rounded bg-app-card-hover px-1 py-0.5 font-mono text-[10px] text-app-info">{v.key}</code>
                          <span className="text-app-text-subtle">\u2192</span>
                          <span className="font-medium text-app-text">{sample}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Template library toolbar */}'''

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    print("[OK] SendTab.tsx: MessagePreview integrated")
else:
    print("[FAIL] SendTab.tsx: Could not find the old block")
    # Try alternate patterns
    patterns = [
        '/** Inline variable preview **/',
        'Inline variable preview',
        '\ubcc0\uc218 \uce58\ud658 \ubbf8\ub9ac\ubcf4\uae30',
    ]
    for p in patterns:
        if p in content:
            print(f"  Found pattern: {repr(p[:50])}")

with open(sendtab_path, "w", encoding="utf-8") as f:
    f.write(content)

# 2. AgentSidebar.tsx: Integrate AgentMarketplace
sidebar_path = os.path.join(PROJECT, "src/components/ai/AgentSidebar.tsx")
with open(sidebar_path, "r", encoding="utf-8") as f:
    sidebar = f.read()

# Add Store import
old_import_icons = '''import { Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap } from "lucide-react";'''
new_import_icons = '''import { Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap, Store } from "lucide-react";'''

if old_import_icons in sidebar:
    sidebar = sidebar.replace(old_import_icons, new_import_icons, 1)
    print("[OK] AgentSidebar.tsx: Store icon import added")
else:
    print("[FAIL] AgentSidebar.tsx: Icon import not found")
    # Try alternative
    if 'Loader2, Zap' in sidebar:
        sidebar = sidebar.replace('Loader2, Zap', 'Loader2, Zap, Store')
        print("[OK] AgentSidebar.tsx: Store import added (alt)")

# Add AgentMarketplace import
old_imports_end = '''import type { Agent, AgentChat } from "@/lib/agent-api";'''
new_imports_end = '''import type { Agent, AgentChat } from "@/lib/agent-api";\nimport { AgentMarketplace } from "@/components/ai/AgentMarketplace";'''

if old_imports_end in sidebar:
    sidebar = sidebar.replace(old_imports_end, new_imports_end, 1)
    print("[OK] AgentSidebar.tsx: AgentMarketplace import added")
else:
    print("[FAIL] AgentSidebar.tsx: Agent type import not found")
    # Try without type import
    alt_import = '''import type { Agent, AgentChat } from "@/lib/agent-api"'''
    if alt_import in sidebar:
        sidebar = sidebar.replace(alt_import, alt_import + ''';\nimport { AgentMarketplace } from "@/components/ai/AgentMarketplace"''')
        print("[OK] AgentSidebar.tsx: AgentMarketplace import added (alt)")

# Replace bottom section
old_bottom = '''      {/** Bottom settings **/}
      <div className="border-t border-app-border px-3 py-2">
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]">
          <Settings className="h-3.5 w-3.5 shrink-0" />
          \ud15c\ud50c\ub9bf \ub9c8\ucf13
        </button>
      </div>'''

new_bottom = '''      {/** Bottom actions **/}
      <div className="border-t border-app-border px-3 py-2 space-y-1">
        <button
          onClick={onNewAgent}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]"
        >
          <Bot className="h-3.5 w-3.5 shrink-0" />
          \uc0c8 Agent \ub9cc\ub4e4\uae30
        </button>
      </div>'''

if old_bottom in sidebar:
    sidebar = sidebar.replace(old_bottom, new_bottom, 1)
    print("[OK] AgentSidebar.tsx: Bottom section updated")
else:
    print("[FAIL] AgentSidebar.tsx: Bottom section not found")
    # Try without JSX comments
    alt_bottom = 'className="border-t border-app-border px-3 py-2">\n        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs'
    if alt_bottom in sidebar:
        print("  Found bottom area but with different comment syntax")

with open(sidebar_path, "w", encoding="utf-8") as f:
    f.write(sidebar)

print("\n[DONE] All integrations applied!")
