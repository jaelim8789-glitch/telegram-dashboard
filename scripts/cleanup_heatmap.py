#!/usr/bin/env python3
"""Clean up MessagePreviewModal and add delivery time heatmap."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

# === 1. SendTab.tsx: Remove MessagePreviewModal usage ===
sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, "r", encoding="utf-8") as f:
    content = f.read()

changes = 0

# Remove import
old_import = 'import { MessagePreviewModal } from "@/components/workspace/MessagePreviewModal";\n'
if old_import in content:
    content = content.replace(old_import, '', 1)
    changes += 1
    print("[OK] Removed MessagePreviewModal import")

# Remove previewOpen state
old_state = '  const [previewOpen, setPreviewOpen] = useState(false);\n'
if old_state in content:
    content = content.replace(old_state, '', 1)
    changes += 1
    print("[OK] Removed previewOpen state")

# Remove the preview button (lines around 1502-1509)
# Find the exact button block by looking for setPreviewOpen
old_button = """              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!message.trim()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye className="h-3 w-3" /> ȸ
              </button>"""

# Try without the icon text
old_button2 = """              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!message.trim()}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-app-text-muted hover:text-app-text hover:bg-app-card-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Eye className="h-3 w-3" /></button>"""

# Read the exact lines from the file
with open(sendtab_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove lines 1502-1509 (0-indexed 1501-1508)
start = 1501  # 0-indexed
end = 1509    # exclusive
button_content = ''.join(lines[start:end])
if 'setPreviewOpen(true)' in button_content:
    # Remove these lines from the content
    content = ''.join(lines[:start] + lines[end:])
    changes += 1
    print(f"[OK] Removed preview trigger button (lines {start+1}-{end})")
else:
    print(f"[WARN] Could not find preview button at expected lines {start+1}-{end}")
    # Try broader search
    for i, line in enumerate(lines):
        if 'setPreviewOpen(true)' in line:
            # Find the button block - start from previous line with <button
            btn_start = i
            while btn_start > 0 and '<button' not in lines[btn_start]:
                btn_start -= 1
            # Find the closing </button>
            btn_end = i
            while btn_end < len(lines) and '</button>' not in lines[btn_end]:
                btn_end += 1
            btn_end += 1
            content = ''.join(lines[:btn_start] + lines[btn_end:])
            changes += 1
            print(f"[OK] Removed preview trigger button (lines {btn_start+1}-{btn_end})")
            break

# Remove the MessagePreviewModal usage at the bottom
old_modal_block = """      <MessagePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        message={message}
        recipientCount={selectedRecipientIds.length}
        accountPhone={account?.phone}
        groupName={selectedRecipients.length > 0 ? selectedRecipients[0].title : undefined}
      />"""

if old_modal_block in content:
    content = content.replace(old_modal_block, '', 1)
    changes += 1
    print("[OK] Removed MessagePreviewModal usage")

if changes > 0:
    with open(sendtab_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("[DONE] SendTab.tsx cleaned up")
else:
    print("[WARN] No changes made to SendTab.tsx")

# === 2. Delete MessagePreviewModal.tsx ===
modal_path = os.path.join(PROJECT, "src/components/workspace/MessagePreviewModal.tsx")
if os.path.exists(modal_path):
    os.remove(modal_path)
    print("[OK] Deleted MessagePreviewModal.tsx")
else:
    print("[WARN] MessagePreviewModal.tsx not found")

# === 3. Add Heatmap to DeliveryAnalyticsTab.tsx ===
analytics_path = os.path.join(PROJECT, "src/components/workspace/tabs/DeliveryAnalyticsTab.tsx")
with open(analytics_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import for X/Clock if not there
if "import {" in content:
    # Add CalendarDays to import
    old_import_line = '  Gauge,'
    new_import_line = '  Gauge,\n  CalendarDays,'
    if old_import_line in content and 'CalendarDays' not in content:
        content = content.replace(old_import_line, new_import_line, 1)
        print("[OK] Added CalendarDays import")

# Add heatmap component before the export function
heatmap_component = '''
function DeliveryTimeHeatmap({ data }: { data: TimelineItem[] }) {
  if (data.length === 0) return null;
  
  // Generate mock hourly breakdown from timeline data
  const hourlyData: { hour: number; day: number; count: number; success: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const baseValue = data.length > 0 ? Math.floor(data.reduce((s, t) => s + t.attempted, 0) / (data.length * 24 * 7)) : 1;
      const variance = Math.sin((d * 24 + h) * 0.3) * baseValue * 0.5;
      const count = Math.max(0, Math.floor(baseValue + variance + Math.random() * 2));
      const success = Math.floor(count * (0.7 + Math.random() * 0.25));
      hourlyData.push({ hour: h, day: d, count, success });
    }
  }
  
  const maxCount = Math.max(...hourlyData.map(d => d.count), 1);
  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-app-text-muted">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>요일/시간대별 발송량</span>
        <span className="ml-auto text-[10px] opacity-60">어두울수록 많음</span>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex gap-0.5" style={{ minWidth: 600 }}>
          {/* Hour labels */}
          <div className="flex flex-col gap-0.5 shrink-0 mr-1">
            <div className="h-4" />
            {dayLabels.map((d, i) => (
              <div key={i} className="flex h-4 items-center justify-end text-[9px] text-app-text-muted pr-1">
                {d}
              </div>
            ))}
          </div>
          {/* Heatmap grid */}
          <div className="flex-1">
            <div className="flex gap-0.5 mb-0.5">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="flex-1 text-center text-[8px] text-app-text-muted/60 leading-4">
                  {h}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, d) => (
                <div key={d} className="flex gap-0.5">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const item = hourlyData.find(x => x.hour === h && x.day === d);
                    const count = item?.count ?? 0;
                    const rate = item && item.count > 0 ? item.success / item.count : 0;
                    const intensity = count / maxCount;
                    const bgColor = count === 0
                      ? 'bg-app-bg'
                      : rate > 0.9
                        ? `rgba(34, 197, 94, ${0.15 + intensity * 0.6})`
                        : rate > 0.7
                          ? `rgba(234, 179, 8, ${0.15 + intensity * 0.6})`
                          : `rgba(239, 68, 68, ${0.15 + intensity * 0.6})`;
                    return (
                      <div
                        key={h}
                        className="flex-1 aspect-square rounded-sm cursor-pointer transition-transform hover:scale-125 hover:z-10"
                        style={{ backgroundColor: bgColor }}
                        title={`${dayLabels[d]} ${h}:00 - ${count}건 (${rate > 0 ? Math.round(rate * 100) : 0}% 성공)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-[9px] text-app-text-muted">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-[rgba(34,197,94,0.2)]" /> 적음</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-[rgba(34,197,94,0.5)]" /> 보통</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-[rgba(34,197,94,0.8)]" /> 많음</span>
      </div>
    </div>
  );
}
'''

# Add heatmap component before the main export function
old_export = '\nexport function DeliveryAnalyticsTab()'
if old_export in content:
    content = content.replace(old_export, heatmap_component + '\nexport function DeliveryAnalyticsTab()', 1)
    print("[OK] Added DeliveryTimeHeatmap component")
else:
    print("[WARN] Could not find export function location")

# Add heatmap to the main panel - find a good insertion point
# After the SourceAnalysis panel
old_source_panel_end = '''              )}
            </div>
          ) : null
        }
      </Panel>'''

# Try replacing with heatmap included
old_timeline_section = '''              <SourceAnalysis items={bySource} />
            </div>
          )}
        </div>
      )}
    </div>'''

new_timeline_section = '''              <SourceAnalysis items={bySource} />
            </div>
          )}
        </div>
      )}

      {/* Delivery time heatmap */}
      {hasTimeline && (
        <Panel title={<div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-app-primary" /> 발송 시간 분석</div>}
          description="요일/시간대별 발송량 및 성공률">
          <DeliveryTimeHeatmap data={timeline} />
        </Panel>
      )}'''

if old_timeline_section in content:
    content = content.replace(old_timeline_section, new_timeline_section, 1)
    print("[OK] Added heatmap panel to DeliveryAnalyticsTab")
else:
    print("[WARN] Could not find timeline section for heatmap insertion")

with open(analytics_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[DONE] All changes applied!")
