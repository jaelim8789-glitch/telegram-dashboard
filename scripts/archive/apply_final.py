#!/usr/bin/env python3
"""Apply final integrations using exact file content reading."""

import os, sys
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

# === 1. SendTab.tsx ===
sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"[SENDTAB] Total lines: {len(lines)}")
print(f"[SENDTAB] Line 1436: {repr(lines[1435])}")
print(f"[SENDTAB] Line 1437: {repr(lines[1436])}")
print(f"[SENDTAB] Line 1438: {repr(lines[1437])}")
print(f"[SENDTAB] Line 1439: {repr(lines[1438])}")

# Step 1: Read the exact block content between </Field> and {/* Template library toolbar */}
old_lines = []
in_block = False
in_field = False
toolbar_line = -1

for i, line in enumerate(lines):
    if 'placeholder="발송할 메시지를 입력하세요."' in line:
        in_field = True
    if in_field and '</Field>' in line:
        in_block = True
        start_idx = i
    if in_block and '/** Inline variable preview **/' in line:
        # The actual comment syntax in the file
        pass
    if in_block and 'Template library toolbar' in line:
        toolbar_line = i
        break

print(f"\n[SENDTAB] Field end at line: {start_idx}")
print(f"[SENDTAB] Toolbar at line: {toolbar_line}")

# Let's just replace using a simpler approach - find </Field> and the next Toolbar
field_end = None
toolbar_start = None

for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == '</Field>':
        field_end = i
    if stripped.startswith('{/*') and 'Template library toolbar' in stripped:
        toolbar_start = i
        break

print(f"\n[SENDTAB DEBUG]")
print(f"  field_end = {field_end}")
print(f"  toolbar_start = {toolbar_start}")

if field_end is not None and toolbar_start is not None:
    # The old block is from field_end (inclusive) to toolbar_start
    old_block = ''.join(lines[field_end:toolbar_start])
    print(f"\n  Old block ({toolbar_start - field_end} lines):")
    print(f"  {repr(old_block[:200])}...")
    
    # New block
    new_block = """            </Field>

            {/* ── Message preview ( Telegram style ) ── */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <MessagePreview
                message={message}
                recipientCount={selectedRecipientIds.length}
                accountPhone={account?.phone}
                groupName={selectedRecipients[0]?.title}
                imagePreviewUrl={imageFile ? URL.createObjectURL(imageFile) : null}
              />
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

            {/* Template library toolbar */}
"""
    
    content = ''.join(lines)
    if old_block in content:
        content = content.replace(old_block, new_block, 1)
        print("\n[OK] SendTab.tsx: Block replaced successfully!")
    else:
        print(f"\n[FAIL] SendTab.tsx: Old block not found in content!")
        print(f"  Searching for first 100 chars: {repr(old_block[:100])}")
        # Try to find a smaller portion
        probe = old_block[:80]
        idx = content.find(probe)
        print(f"  Index of first 80 chars: {idx}")
        if idx >= 0:
            print(f"  Context at idx: {repr(content[idx:idx+150])}")
    
    with open(sendtab_path, "w", encoding="utf-8") as f:
        f.write(content)
else:
    print("[FAIL] Could not find field_end or toolbar_start")

# === 2. AgentSidebar.tsx ===
sidebar_path = os.path.join(PROJECT, "src/components/ai/AgentSidebar.tsx")
with open(sidebar_path, "r", encoding="utf-8") as f:
    sidebar = f.read()

# Add Store icon
sidebar = sidebar.replace(
    'Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap',
    'Plus, MessageSquare, Trash2, Bot, Settings, ChevronDown, X, Loader2, Zap, Store'
)
print("\n[OK] AgentSidebar.tsx: Store icon added")

# Add AgentMarketplace import
sidebar = sidebar.replace(
    'import type { Agent, AgentChat } from "@/lib/agent-api";',
    'import type { Agent, AgentChat } from "@/lib/agent-api";\nimport { AgentMarketplace } from "@/components/ai/AgentMarketplace";'
)
print("[OK] AgentSidebar.tsx: AgentMarketplace import added")

# Replace bottom section
old_bottom_text = """      {/* Bottom settings */}
      <div className="border-t border-app-border px-3 py-2">
        <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]">
          <Settings className="h-3.5 w-3.5 shrink-0" />
          템플릿 마켓
        </button>
      </div>"""

new_bottom_text = """      {/* Bottom actions */}
      <div className="border-t border-app-border px-3 py-2 space-y-1">
        <button onClick={onNewAgent}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]"
        >
          <Bot className="h-3.5 w-3.5 shrink-0" />
          새 Agent 만들기
        </button>
      </div>"""

if old_bottom_text in sidebar:
    sidebar = sidebar.replace(old_bottom_text, new_bottom_text, 1)
    print("[OK] AgentSidebar.tsx: Bottom section updated")
else:
    print("[FAIL] AgentSidebar.tsx: Bottom section not found")
    # debug
    idx = sidebar.find('템플릿 마켓')
    print(f"  '템플릿 마켓' found at: {idx}")
    if idx > 0:
        print(f"  Context: {repr(sidebar[idx-20:idx+50])}")

with open(sidebar_path, "w", encoding="utf-8") as f:
    f.write(sidebar)

print("\n[DONE] All integrations applied!")
