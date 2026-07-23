#!/usr/bin/env python3
"""Implement 3 features: history filter, pause/resume recurring, send time estimate."""
import os, sys
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"

sendtab_path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")
with open(sendtab_path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. Add history search state + keyword filter
# ═══════════════════════════════════════════════════════════════

# Add historySearch state after historyFilter
old_hf = 'const [historyFilter, setHistoryFilter] = useState<HistoryFilter>(() => {'
new_hf = 'const [historySearch, setHistorySearch] = useState("");\n  const [historyDateFrom, setHistoryDateFrom] = useState("");\n  const [historyDateTo, setHistoryDateTo] = useState("");\n  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>(() => {'

if old_hf in content:
    content = content.replace(old_hf, new_hf, 1)
    changes += 1
    print("[OK] Added history search/date states")
else:
    print("[WARN] historyFilter state not found")

# Update filteredHistory to include keyword + date filter
old_filtered = '''  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return history;
    return history.filter((h) => h.status === historyFilter);
  }, [history, historyFilter]);'''

new_filtered = '''  const filteredHistory = useMemo(() => {
    let result = history;
    if (historyFilter !== "all") {
      result = result.filter((h) => h.status === historyFilter);
    }
    if (historySearch.trim()) {
      const q = historySearch.trim().toLowerCase();
      result = result.filter((h) =>
        h.message.toLowerCase().includes(q) ||
        h.recipients.some((r) => r.toLowerCase().includes(q)) ||
        (h.errorMessage && h.errorMessage.toLowerCase().includes(q))
      );
    }
    if (historyDateFrom) {
      result = result.filter((h) => (h.scheduledAt || h.createdAt) >= historyDateFrom);
    }
    if (historyDateTo) {
      result = result.filter((h) => (h.scheduledAt || h.createdAt) <= historyDateTo + "T23:59:59");
    }
    return result;
  }, [history, historyFilter, historySearch, historyDateFrom, historyDateTo]);'''

if old_filtered in content:
    content = content.replace(old_filtered, new_filtered, 1)
    changes += 1
    print("[OK] Updated filteredHistory with keyword/date filter")
else:
    print("[WARN] filteredHistory not found")

# Add search bar + date filters to the history panel header area
# Find the history filter buttons area
old_filters = '''                    {FILTER_ORDER.map((f) => (
                      <button
                        key={f}
                        type=\"button\"'''

new_filters = '''                    {/* Search + date range */}
                    <div className=\"flex items-center gap-2 flex-1 min-w-0\">
                      <div className=\"relative flex-1 min-w-[120px] max-w-xs\">
                        <input type=\"text\" value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder=\"메시지 검색...\"
                          className=\"w-full rounded-lg border border-app-border/60 bg-app-bg py-1 pl-2.5 pr-2 text-[10px] text-app-text placeholder:text-app-text-muted outline-none focus:border-app-primary/60\"
                        />
                      </div>
                      <input type=\"date\" value={historyDateFrom}
                        onChange={(e) => setHistoryDateFrom(e.target.value)}
                        className=\"w-28 rounded-lg border border-app-border/60 bg-app-bg px-1.5 py-1 text-[10px] text-app-text outline-none focus:border-app-primary/60\"
                        title=\"시작일\" aria-label=\"시작일\"
                      />
                      <span className=\"text-[9px] text-app-text-muted\">~</span>
                      <input type=\"date\" value={historyDateTo}
                        onChange={(e) => setHistoryDateTo(e.target.value)}
                        className=\"w-28 rounded-lg border border-app-border/60 bg-app-bg px-1.5 py-1 text-[10px] text-app-text outline-none focus:border-app-primary/60\"
                        title=\"종료일\" aria-label=\"종료일\"
                      />
                      {(historySearch || historyDateFrom || historyDateTo) && (
                        <button onClick={() => { setHistorySearch(""); setHistoryDateFrom(""); setHistoryDateTo(""); }}
                          className=\"shrink-0 rounded px-1.5 py-1 text-[9px] text-app-danger hover:bg-app-danger-muted transition-colors\">
                          초기화
                        </button>
                      )}
                    </div>

                    {FILTER_ORDER.map((f) => ('''

if old_filters in content:
    content = content.replace(old_filters, new_filters, 1)
    changes += 1
    print("[OK] Added history search/date filter UI")
else:
    print("[WARN] Filter buttons not found")

# ═══════════════════════════════════════════════════════════════
# 2. Pause/Resume recurring broadcasts
# ═══════════════════════════════════════════════════════════════

# Add pause/resume handlers after handleStop
old_stop = '''  async function handleStop(broadcast: Broadcast) {
    if (cancelling || !selectedAccountId) return;
    setCancelling(broadcast.id);
    setSubmitError(null);
    setSubmitNotice(null);
    const isRecurringBroadcastItem = isRecurringBroadcast(broadcast);
    try {
      await api.stopBroadcast(broadcast.id);
      setSubmitNotice(isRecurringBroadcastItem ? \"반복 발송이 취소되었습니다.\" : \"발송이 중단되었습니다.\");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : \"발송 중단에 실패했습니다.\");
    } finally { setCancelling(null); }
  }'''

new_stop = '''  async function handleStop(broadcast: Broadcast) {
    if (cancelling || !selectedAccountId) return;
    setCancelling(broadcast.id);
    setSubmitError(null);
    setSubmitNotice(null);
    const isRecurringBroadcastItem = isRecurringBroadcast(broadcast);
    try {
      await api.stopBroadcast(broadcast.id);
      setSubmitNotice(isRecurringBroadcastItem ? \"반복 발송이 취소되었습니다.\" : \"발송이 중단되었습니다.\");
      await loadHistory(selectedAccountId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : \"발송 중단에 실패했습니다.\");
    } finally { setCancelling(null); }
  }

  async function handlePauseRecurring(broadcast: Broadcast) {
    if (!selectedAccountId) return;
    try {
      await api.pauseRecurringBroadcast(broadcast.id);
      await loadHistory(selectedAccountId);
    } catch { /* silent */ }
  }

  async function handleUnpauseRecurring(broadcast: Broadcast) {
    if (!selectedAccountId) return;
    try {
      await api.unpauseRecurringBroadcast(broadcast.id);
      await loadHistory(selectedAccountId);
    } catch { /* silent */ }
  }'''

if old_stop in content:
    content = content.replace(old_stop, new_stop, 1)
    changes += 1
    print("[OK] Added pause/resume handlers")
else:
    print("[WARN] handleStop not found")

# Add pause/resume buttons to HistoryRow component
old_recurring_actions = '''        {canStop && (
          <button
            type=\"button\"
            onClick={() => onCancelClick(h)}
            disabled={cancelling === h.id}
            title={recurring ? \"반복 취소\" : \"발송 중단\"}
            className=\"flex h-7 w-7 items-center justify-center rounded-full text-app-warning transition-colors hover:bg-app-warning-muted disabled:opacity-40\"
          >
            <XCircle className={`h-3.5 w-3.5 ${cancelling === h.id ? \"animate-spin\" : \"\"}`} />
          </button>
        )}'''

new_recurring_actions = '''        {recurring && !recurringCancelled && (
          <>
            {h.isRecurringPaused ? (
              <button
                type=\"button\"
                onClick={() => onPauseResume?.(h)}
                title=\"반복 재개\"
                className=\"flex h-7 w-7 items-center justify-center rounded-full text-app-success transition-colors hover:bg-app-success-muted\"
              >
                <Play className=\"h-3.5 w-3.5\" />
              </button>
            ) : (
              <button
                type=\"button\"
                onClick={() => onPauseResume?.(h)}
                title=\"반복 일시정지\"
                className=\"flex h-7 w-7 items-center justify-center rounded-full text-app-warning transition-colors hover:bg-app-warning-muted\"
              >
                <Pause className=\"h-3.5 w-3.5\" />
              </button>
            )}
          </>
        )}
        {canStop && (
          <button
            type=\"button\"
            onClick={() => onCancelClick(h)}
            disabled={cancelling === h.id}
            title={recurring ? \"반복 취소\" : \"발송 중단\"}
            className=\"flex h-7 w-7 items-center justify-center rounded-full text-app-warning transition-colors hover:bg-app-warning-muted disabled:opacity-40\"
          >
            <XCircle className={`h-3.5 w-3.5 ${cancelling === h.id ? \"animate-spin\" : \"\"}`} />
          </button>
        )}'''

if old_recurring_actions in content:
    content = content.replace(old_recurring_actions, new_recurring_actions, 1)
    changes += 1
    print("[OK] Updated recurring actions with pause/resume buttons")
else:
    print("[WARN] Recurring actions section not found")

# Add Play/Pause to HistoryRow props and icon imports
# Add onPauseResume to HistoryRow props
old_history_row = '''function HistoryRow({
  h,
  cancelling,
  retrying,
  onCancelClick,
  onRetry,
  onReuse,
  onClone,
}: {'''

new_history_row = '''function HistoryRow({
  h,
  cancelling,
  retrying,
  onCancelClick,
  onRetry,
  onReuse,
  onClone,
  onPauseResume,
}: {'''

if old_history_row in content:
    content = content.replace(old_history_row, new_history_row, 1)
    changes += 1
    print("[OK] Added onPauseResume to HistoryRow props")
else:
    print("[WARN] HistoryRow function definition not found")

# Update HistoryRow type to include onPauseResume
old_history_row_type = '''  onCancelClick: (b: Broadcast) => void;
  onRetry: (b: Broadcast) => void;
  onReuse: (b: Broadcast) => void;
  onClone: (b: Broadcast) => void;
}) {'''

new_history_row_type = '''  onCancelClick: (b: Broadcast) => void;
  onRetry: (b: Broadcast) => void;
  onReuse: (b: Broadcast) => void;
  onClone: (b: Broadcast) => void;
  onPauseResume?: (b: Broadcast) => void;
}) {'''

if old_history_row_type in content:
    content = content.replace(old_history_row_type, new_history_row_type, 1)
    changes += 1
    print("[OK] Added onPauseResume type to HistoryRow")
else:
    print("[WARN] HistoryRow type not found")

# Add Play, Pause to lucide-react imports
old_lucide_icons = '  Hourglass, MessageSquare, RefreshCw, RotateCcw, Search, SearchX, Users, X,'
new_lucide_icons = '  Hourglass, MessageSquare, Pause, Play, RefreshCw, RotateCcw, Search, SearchX, Users, X,'

if old_lucide_icons in content:
    content = content.replace(old_lucide_icons, new_lucide_icons, 1)
    changes += 1
    print("[OK] Added Play/Pause to lucide imports")
else:
    print("[WARN] Lucide imports not found")

# Wire onPauseResume in HistoryRow calls - find the usage
old_history_call = '''                onClone={handleClone}
              />'''

new_history_call = '''                onClone={handleClone}
                onPauseResume={(b) => b.isRecurringPaused ? handleUnpauseRecurring(b) : handlePauseRecurring(b)}
              />'''

if old_history_call in content:
    content = content.replace(old_history_call, new_history_call, 1)
    changes += 1
    print("[OK] Wired onPauseResume to HistoryRow")
else:
    print("[WARN] HistoryRow call not found")

# ═══════════════════════════════════════════════════════════════
# 3. Send time estimate display
# ═══════════════════════════════════════════════════════════════

# Add estimate fetch logic after validateRecipients calculation
# Find a good spot - right after the canSubmit calculation or inside the UI
# Add estimate display near the submit button or in the delivery options area

# First, find where the estimate state exists and wire it up
# Add useEffect to fetch estimate when message/recipients change
old_estimate_state = '  const [estimatePreview, setEstimatePreview] = useState<{ estimated_seconds: number; estimated_minutes: number; readable: string } | null>(null);\n  const [estimateLoading, setEstimateLoading] = useState(false);'

# Add auto-fetch logic after the estimate state
new_estimate_state = '''  const [estimatePreview, setEstimatePreview] = useState<{ estimated_seconds: number; estimated_minutes: number; readable: string } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Auto-fetch send time estimate when message or recipients change
  useEffect(() => {
    if (!selectedAccountId || selectedRecipientIds.length === 0 || !message.trim()) {
      setEstimatePreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setEstimateLoading(true);
      try {
        const est = await api.fetchBroadcastEstimate({
          accountId: selectedAccountId,
          recipientCount: selectedRecipientIds.length,
          deliveryMode: deliveryMode === "reply" ? "normal" : deliveryMode,
          delaySeconds: normalDelaySeconds,
        });
        setEstimatePreview(est);
      } catch { setEstimatePreview(null); }
      finally { setEstimateLoading(false); }
    }, 800);
    return () => clearTimeout(timer);
  }, [selectedAccountId, selectedRecipientIds.length, message.trim(), deliveryMode, normalDelaySeconds]);'''

if old_estimate_state in content:
    content = content.replace(old_estimate_state, new_estimate_state, 1)
    changes += 1
    print("[OK] Added estimate auto-fetch effect")
else:
    print("[WARN] Estimate state not found")

# Add estimate display near the submit button. Find the submit button area.
old_submit_btn = '''          <Button
            type=\"submit\"
            form=\"send-form\"
            variant=\"primary\"
            size=\"md\"
            className=\"w-full sm:w-auto\"
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            {submitting ? \"처리 중...\" : isRecurring ? \"반복 설정\" : isScheduled ? \"예약하기\" : \"발송\"}
          </Button>'''

new_submit_btn = '''          {/* Estimated time */}
          {estimatePreview && canSubmit && !submitting && (
            <div className=\"flex items-center gap-1.5 rounded-lg border border-app-info/15 bg-app-info-muted/10 px-2.5 py-1.5 text-[10px] text-app-text-muted\">
              <Clock className=\"h-3 w-3 text-app-info\" />
              <span>예상 소요 시간: <strong className=\"text-app-text\">{estimatePreview.readable}</strong></span>
            </div>
          )}
          {estimateLoading && (
            <div className=\"flex items-center gap-1.5 rounded-lg border border-app-border/50 px-2.5 py-1.5 text-[10px] text-app-text-muted\">
              <RefreshCw className=\"h-3 w-3 animate-spin\" />
              예상 시간 계산 중...
            </div>
          )}
          <Button
            type=\"submit\"
            form=\"send-form\"
            variant=\"primary\"
            size=\"md\"
            className=\"w-full sm:w-auto\"
            disabled={!canSubmit || submitting}
            loading={submitting}
          >
            {submitting ? \"처리 중...\" : isRecurring ? \"반복 설정\" : isScheduled ? \"예약하기\" : \"발송\"}
          </Button>'''

if old_submit_btn in content:
    content = content.replace(old_submit_btn, new_submit_btn, 1)
    changes += 1
    print("[OK] Added estimate display near submit button")
else:
    print("[WARN] Submit button not found")

# ═══════════════════════════════════════════════════════════════
# Write the file
# ═══════════════════════════════════════════════════════════════
if changes > 0:
    with open(sendtab_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n[DONE] {changes} changes applied to SendTab.tsx")
else:
    print("\n[WARN] No changes were made!")

print("\n✅ Features implemented:")
print("  1. History search/date filter UI + keyword/date filtering logic")
print("  2. Pause/Resume recurring broadcast buttons + handlers")
print("  3. Send time estimate auto-fetch + display near submit button")
