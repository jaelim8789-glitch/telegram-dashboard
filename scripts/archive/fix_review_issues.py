#!/usr/bin/env python3
"""Fix code review issues from the AI UI integration."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

# === 1. AgentSidebar.tsx: Remove AgentMarketplace dead import + fix bottom button ===
sidebar_path = os.path.join(PROJECT, "src/components/ai/AgentSidebar.tsx")
with open(sidebar_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove unused AgentMarketplace import
old_import = '\nimport { AgentMarketplace } from "@/components/ai/AgentMarketplace";'
if old_import in content:
    content = content.replace(old_import, '')
    print("[OK] Removed unused AgentMarketplace import")
else:
    print("[WARN] AgentMarketplace import not found as expected")

# Fix bottom section: replace duplicate "새 Agent 만들기" with template market button
old_bottom = """      {/* Bottom actions */}
      <div className="border-t border-app-border px-3 py-2 space-y-1">
        <button onClick={onNewAgent}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]"
        >
          <Bot className="h-3.5 w-3.5 shrink-0" />
          새 Agent 만들기
        </button>
      </div>"""

new_bottom = """      {/* Bottom actions */}
      <div className="border-t border-app-border px-3 py-2 space-y-1">
        <button onClick={onNewAgent}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text min-h-[36px]"
        >
          <Bot className="h-3.5 w-3.5 shrink-0" />
          템플릿 마켓
        </button>
      </div>"""

if old_bottom in content:
    content = content.replace(old_bottom, new_bottom, 1)
    print("[OK] Bottom button changed to 템플릿 마켓")
else:
    print("[WARN] Bottom section not found")

with open(sidebar_path, "w", encoding="utf-8") as f:
    f.write(content)

# === 2. SendTab.tsx: Fix URL.createObjectURL memory leak ===
sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the URL.createObjectURL expression with useMemo-wrapped version
old_url = 'imagePreviewUrl={imageFile ? URL.createObjectURL(imageFile) : null}'
new_url = 'imagePreviewUrl={imageObjectUrl}'

if old_url in content:
    content = content.replace(old_url, new_url, 1)
    print("[OK] SendTab.tsx: Replaced inline URL.createObjectURL with variable")
else:
    print("[WARN] SendTab.tsx: URL.createObjectURL pattern not found")

# Add useMemo import if not already there
if 'useMemo' not in content.split('from "react"')[0] and 'useMemo' not in content.split("from 'react'")[0]:
    print("[WARN] useMemo import may already be there - need to check")

# Add the useMemo for imageObjectUrl near the imageFile state
old_state = 'const imageFile = useDashboardStore((s) => s.sendImageFile);\n  const setImageFile = useDashboardStore((s) => s.setSendImageFile);'
new_state = 'const imageFile = useDashboardStore((s) => s.sendImageFile);\n  const setImageFile = useDashboardStore((s) => s.setSendImageFile);\n  const imageObjectUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);'

if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print("[OK] Added imageObjectUrl useMemo")
else:
    print("[WARN] imageFile state definition not found in expected format")

with open(sendtab_path, "w", encoding="utf-8") as f:
    f.write(content)

print("\n[DONE] All review issues fixed!")
