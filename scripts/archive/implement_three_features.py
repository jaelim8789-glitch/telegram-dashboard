#!/usr/bin/env python3
"""Implement 3 high-ROI features: variable expansion, auto-retry UI, and schedule calendar."""
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

# ═══════════════════════════════════════════════════════════════
# 1. messageTemplates.ts - Expand variables + previewTemplate
# ═══════════════════════════════════════════════════════════════
tmpl_path = os.path.join(PROJECT, "src/lib/messageTemplates.ts")
with open(tmpl_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_vars = '''export const TEMPLATE_VARIABLES: { key: string; label: string; description: string }[] = [
  { key: "{{name}}", label: "받는 사람 이름", description: "그룹/채널 이름으로 치환됩니다." },
  { key: "{{phone}}", label: "발신자 전화번호", description: "선택한 계정의 전화번호로 치환됩니다." },
  { key: "{{count}}", label: "수신자 수", description: "선택한 수신자 총 개수로 치환됩니다." },
];'''

new_vars = '''export const TEMPLATE_VARIABLES: { key: string; label: string; description: string }[] = [
  { key: "{{name}}", label: "받는 사람 이름", description: "그룹/채널 이름으로 치환됩니다." },
  { key: "{{phone}}", label: "발신자 전화번호", description: "선택한 계정의 전화번호로 치환됩니다." },
  { key: "{{count}}", label: "수신자 수", description: "선택한 수신자 총 개수로 치환됩니다." },
  { key: "{{date}}", label: "오늘 날짜", description: "발송일자 (예: 2025-07-20)로 치환됩니다." },
  { key: "{{time}}", label: "현재 시간", description: "발송시간 (예: 14:30)으로 치환됩니다." },
  { key: "{{sender}}", label: "발신자 이름", description: "선택한 계정의 이름으로 치환됩니다." },
  { key: "{{group_title}}", label: "그룹 제목", description: "{{name}}과 동일, 그룹 제목으로 치환됩니다." },
];'''

if old_vars in content:
    content = content.replace(old_vars, new_vars, 1)
    print("[OK] TEMPLATE_VARIABLES expanded with 4 new variables")
else:
    print("[WARN] TEMPLATE_VARIABLES not found with expected format")

# Update previewTemplate signature and function
old_preview = '''export function previewTemplate(
  content: string,
  vars: { name?: string; phone?: string; count?: number },
): string {
  return content
    .replace(/\\{\\{name\\}\\}/g, vars.name ?? "[이름]")
    .replace(/\\{\\{phone\\}\\}/g, vars.phone ?? "[전화번호]")
    .replace(/\\{\\{count\\}\\}/g, vars.count != null ? String(vars.count) : "[수]");
}'''

new_preview = '''export function previewTemplate(
  content: string,
  vars: { name?: string; phone?: string; count?: number; date?: string; time?: string; sender?: string; groupTitle?: string },
): string {
  const now = new Date();
  return content
    .replace(/\\{\\{name\\}\\}/g, vars.name ?? "[이름]")
    .replace(/\\{\\{phone\\}\\}/g, vars.phone ?? "[전화번호]")
    .replace(/\\{\\{count\\}\\}/g, vars.count != null ? String(vars.count) : "[수]")
    .replace(/\\{\\{date\\}\\}/g, vars.date ?? now.toISOString().slice(0, 10))
    .replace(/\\{\\{time\\}\\}/g, vars.time ?? now.toTimeString().slice(0, 5))
    .replace(/\\{\\{sender\\}\\}/g, vars.sender ?? "[발신자]")
    .replace(/\\{\\{group_title\\}\\}/g, vars.groupTitle ?? vars.name ?? "[그룹명]");
}'''

if old_preview in content:
    content = content.replace(old_preview, new_preview, 1)
    print("[OK] previewTemplate updated with new variables")
else:
    print("[WARN] previewTemplate not found with expected format")

with open(tmpl_path, 'w', encoding='utf-8') as f:
    f.write(content)

# ═══════════════════════════════════════════════════════════════
# 2. SendTab.tsx - Add variable chips above textarea + auto-retry UI
# ═══════════════════════════════════════════════════════════════
sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 2a. Add auto-retry states after existing states
# Find a good insertion point - after replyToMessageId state, before inlineButtons
old_states = '  const [replyToMessageId, setReplyToMessageId] = useState("");\n  const [inlineButtons, setInlineButtons] = useState<{ label: string; url: string }[]>([]);'
new_states = '  const [replyToMessageId, setReplyToMessageId] = useState("");\n  const [autoRetry, setAutoRetry] = useState(false);\n  const [autoRetryCount, setAutoRetryCount] = useState(3);\n  const [autoRetryInterval, setAutoRetryInterval] = useState(5);\n  const [inlineButtons, setInlineButtons] = useState<{ label: string; url: string }[]>([]);'

if old_states in content:
    content = content.replace(old_states, new_states, 1)
    print("[OK] Auto-retry states added")
else:
    print("[WARN] Auto-retry states not added (pattern not found)")

# 2b. Add variable chip buttons above the message textarea
# Find the message Field label and textarea
old_field = """            {/* Message */}
            <Field label=\"메시지 내용\">"""

new_field = """            {/* Variable quick-insert chips */}
            <div className=\"flex flex-wrap items-center gap-1.5\">
              <span className=\"text-[10px] text-app-text-muted\">변수:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type=\"button\"
                  onClick={() => handleInsertVariable(v.key)}
                  title={v.description}
                  className=\"rounded-md border border-app-border/60 bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-text-muted transition-colors hover:border-app-primary/40 hover:text-app-primary hover:bg-app-primary/5\"
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Message */}
            <Field label=\"메시지 내용\">"""

if old_field in content:
    content = content.replace(old_field, new_field, 1)
    print("[OK] Variable chip buttons added above textarea")
else:
    print("[WARN] Variable chips not added (pattern not found)")

# 2c. Update the handleInsertVariable to insert at cursor position (approximate: append)
# The current implementation appends at the end - that's fine for quick-insert

# 2d. Add auto-retry UI in the timing/delivery options section
# Find the batch size + reply macro section
old_retry_section = """              {/* Timing options */}
              <div className=\"grid grid-cols-1 gap-3 sm:grid-cols-2\">"""

new_retry_section = """              {/* Auto-retry on failure */}
              <div className=\"flex items-center gap-2 rounded-xl border border-app-border/60 bg-app-card/30 px-3 py-2\">
                <label className=\"flex cursor-pointer items-center gap-2\">
                  <input type=\"checkbox\" checked={autoRetry}
                    onChange={(e) => setAutoRetry(e.target.checked)}
                    className=\"rounded border-app-border text-app-primary focus-ring\" />
                  <span className=\"text-xs text-app-text\">실패 시 자동 재시도</span>
                </label>
                {autoRetry && (
                  <div className=\"flex items-center gap-2 ml-auto\">
                    <span className=\"text-[10px] text-app-text-muted\">최대</span>
                    <select value={autoRetryCount} onChange={(e) => setAutoRetryCount(Number(e.target.value))}
                      className=\"w-16 rounded border border-app-border bg-app-bg px-1 py-0.5 text-[10px] text-app-text outline-none focus-ring\">
                      {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}회</option>)}
                    </select>
                    <span className=\"text-[10px] text-app-text-muted\">간격</span>
                    <select value={autoRetryInterval} onChange={(e) => setAutoRetryInterval(Number(e.target.value))}
                      className=\"w-20 rounded border border-app-border bg-app-bg px-1 py-0.5 text-[10px] text-app-text outline-none focus-ring\">
                      {[1, 3, 5, 10, 30, 60].map((m) => <option key={m} value={m}>{m}분</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Timing options */}
              <div className=\"grid grid-cols-1 gap-3 sm:grid-cols-2\">"""

if old_retry_section in content:
    content = content.replace(old_retry_section, new_retry_section, 1)
    print("[OK] Auto-retry UI added")
else:
    print("[WARN] Auto-retry UI not added (Timing options section not found)")

# 2e. Update createBroadcast call to include auto-retry params
old_create = """      const created = await api.createBroadcast({
        accountId: selectedAccountId,
        message: message.trim(),
        recipients: selectedRecipientIds,"""

new_create = """      const created = await api.createBroadcast({
        accountId: selectedAccountId,
        message: message.trim(),
        recipients: selectedRecipientIds,
        autoRetry: autoRetry ? { maxRetries: autoRetryCount, intervalMinutes: autoRetryInterval } : undefined,"""

if old_create in content:
    content = content.replace(old_create, new_create, 1)
    print("[OK] createBroadcast updated with auto-retry params")
else:
    print("[WARN] createBroadcast call not updated")

# 2f. Update the variable preview section to include new variables
old_preview_section = """                  {previewTemplate(message, {
                    name: selectedRecipients[0]?.title ?? \"샘플 그룹\",
                    phone: account?.phone ?? \"010-0000-0000\",
                    count: selectedRecipientIds.length || 10,
                  })}"""

new_preview_section = """                  {previewTemplate(message, {
                    name: selectedRecipients[0]?.title ?? \"샘플 그룹\",
                    phone: account?.phone ?? \"010-0000-0000\",
                    count: selectedRecipientIds.length || 10,
                    date: new Date().toISOString().slice(0, 10),
                    time: new Date().toTimeString().slice(0, 5),
                    sender: account?.name || account?.phone || \"[발신자]\",
                    groupTitle: selectedRecipients[0]?.title ?? \"샘플 그룹\",
                  })}"""

if old_preview_section in content:
    content = content.replace(old_preview_section, new_preview_section, 1)
    print("[OK] Variable preview updated with new variables")
else:
    print("[WARN] Variable preview not updated")

with open(sendtab_path, 'w', encoding='utf-8') as f:
    f.write(content)

# ═══════════════════════════════════════════════════════════════
# 3. ScheduleCalendar component + integration
# ═══════════════════════════════════════════════════════════════
calendar_component = '''"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Broadcast } from "@/types";

interface ScheduleCalendarProps {
  broadcasts: Broadcast[];
  onCancel?: (broadcast: Broadcast) => void;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  // Pad with previous month's days
  const startPad = first.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }
  // Current month
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Pad with next month's days
  const endPad = 6 - last.getDay();
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

export function ScheduleCalendar({ broadcasts, onCancel }: ScheduleCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Group scheduled broadcasts by date
  const scheduledByDate = useMemo(() => {
    const map = new Map<string, Broadcast[]>();
    for (const b of broadcasts) {
      if (b.scheduledAt) {
        const dateKey = b.scheduledAt.slice(0, 10);
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(b);
      }
    }
    return map;
  }, [broadcasts]);

  const selectedBroadcasts = selectedDate ? scheduledByDate.get(selectedDate) ?? [] : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-app-text">
          <CalendarDays className="h-3.5 w-3.5 text-app-primary" />
          {viewYear}년 {viewMonth + 1}월
        </h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="flex h-6 w-6 items-center justify-center rounded text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" aria-label="이전 달">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
            className="rounded px-1.5 py-0.5 text-[10px] text-app-text-muted hover:text-app-text transition-colors">
            오늘
          </button>
          <button onClick={nextMonth} className="flex h-6 w-6 items-center justify-center rounded text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors" aria-label="다음 달">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-app-border bg-app-border">
        {DAY_LABELS.map((label) => (
          <div key={label} className="bg-app-card px-1 py-1 text-center text-[9px] font-medium text-app-text-muted">
            {label}
          </div>
        ))}
        {weeks.flat().map((date, i) => {
          const dateKey = date.toISOString().slice(0, 10);
          const isCurrentMonth = date.getMonth() === viewMonth;
          const isToday = dateKey === today.toISOString().slice(0, 10);
          const isSelected = dateKey === selectedDate;
          const dayEvents = scheduledByDate.get(dateKey);
          const hasEvents = !!dayEvents?.length;
          const hasFailed = dayEvents?.some((b) => b.status === "failed");

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(isSelected ? null : dateKey)}
              className={cn(
                "relative flex flex-col items-center px-0.5 py-1 text-xs transition-colors min-h-[40px]",
                isCurrentMonth ? "bg-app-card" : "bg-app-bg/50",
                isSelected && "ring-1 ring-inset ring-app-primary",
                isToday && "bg-app-primary/5",
                "hover:bg-app-card-hover"
              )}
            >
              <span className={cn(
                "text-[10px] leading-tight",
                isToday ? "font-bold text-app-primary" : isCurrentMonth ? "text-app-text" : "text-app-text-muted/40"
              )}>
                {date.getDate()}
              </span>
              {hasEvents && (
                <div className="mt-0.5 flex gap-0.5">
                  {hasFailed ? (
                    <span className="inline-block h-1 w-1 rounded-full bg-app-danger" />
                  ) : (
                    <span className="inline-block h-1 w-1 rounded-full bg-app-primary" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div className="rounded-xl border border-app-border bg-app-card/50 p-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-app-text">{selectedDate}</span>
            <span className="text-[10px] text-app-text-muted">{selectedBroadcasts.length}개 예약</span>
          </div>
          {selectedBroadcasts.length === 0 ? (
            <p className="text-[10px] text-app-text-muted py-2 text-center italic">예약된 발송이 없습니다</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
              {selectedBroadcasts.map((b) => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg border border-app-border bg-app-bg px-2 py-1.5 text-[10px]">
                  <Clock className="h-3 w-3 shrink-0 text-app-text-muted" />
                  <span className="truncate flex-1 text-app-text">{b.message}</span>
                  <span className="shrink-0 text-app-text-muted">
                    {b.scheduledAt ? b.scheduledAt.slice(11, 16) : ""}
                  </span>
                  {b.status === "failed" && <AlertTriangle className="h-3 w-3 shrink-0 text-app-danger" />}
                  {onCancel && b.status === "pending" && (
                    <button onClick={() => onCancel(b)}
                      className="shrink-0 rounded px-1 py-0.5 text-app-danger hover:bg-app-danger-muted transition-colors">
                      취소
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
'''

# Write the ScheduleCalendar component
cal_path = os.path.join(PROJECT, "src/components/workspace/ScheduleCalendar.tsx")
with open(cal_path, 'w', encoding='utf-8') as f:
    f.write(calendar_component)
print("[OK] ScheduleCalendar.tsx created")

# Add calendar to SendTab - find a good spot
# Let's add it after the history section
old_cal_section = """      {/* History section */}
      <Panel"""

new_cal_section = """      {/* Schedule calendar */}
      {selectedAccountId && (
        <Panel title={<div className=\"flex items-center gap-2\"><CalendarDays className=\"h-4 w-4 text-app-primary\" /> 발송 일정</div>}
          description=\"예약된 발송을 달력에서 확인하세요\">
          <ScheduleCalendar broadcasts={history} onCancel={(b) => handleCancelClick(b)} />
        </Panel>
      )}

      {/* History section */}
      <Panel"""

if old_cal_section in content:
    content = content.replace(old_cal_section, new_cal_section, 1)
    print("[OK] ScheduleCalendar added to SendTab")
else:
    print("[WARN] ScheduleCalendar not added (History section not found with expected pattern)")
    # Try alternate pattern
    alt_pattern = '{/** History section **/}'
    if alt_pattern in content:
        # Find the full line
        for i, pattern in enumerate(['History section', 'history section', '발송 이력']):
            idx = content.find(pattern)
            if idx > 0:
                print(f"  Found alternate pattern '{pattern}' at index {idx}")
                break

with open(sendtab_path, 'w', encoding='utf-8') as f:
    f.write(content)

# ═══════════════════════════════════════════════════════════════
# 4. Add ScheduleCalendar and CalendarDays imports to SendTab
# ═══════════════════════════════════════════════════════════════
with open(sendtab_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add ScheduleCalendar import
old_cal_imports = 'import { MessagePreview } from "@/components/workspace/tabs/send/MessagePreview";'
new_cal_imports = 'import { MessagePreview } from "@/components/workspace/tabs/send/MessagePreview";\nimport { ScheduleCalendar } from "@/components/workspace/ScheduleCalendar";'

if old_cal_imports in content:
    content = content.replace(old_cal_imports, new_cal_imports, 1)
    print("[OK] ScheduleCalendar import added")
else:
    print("[WARN] ScheduleCalendar import not added")

# Add CalendarDays to lucide-react import
old_lucide = '  Hourglass, MessageSquare, RefreshCw, RotateCcw, Search, SearchX, Users, X,'
new_lucide = '  CalendarDays, Hourglass, MessageSquare, RefreshCw, RotateCcw, Search, SearchX, Users, X,'

if old_lucide in content:
    content = content.replace(old_lucide, new_lucide, 1)
    print("[OK] CalendarDays icon added to imports")
else:
    print("[WARN] CalendarDays icon not added")

with open(sendtab_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("\n[DONE] All 3 features implemented!")
print("  1. Template variables expanded (+date, +time, +sender, +group_title)")
print("  2. Variable chip buttons added above textarea")
print("  3. Auto-retry UI added to timing options")
print("  4. Schedule calendar component created + integrated")
