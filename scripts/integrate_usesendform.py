"""
TeleMon: useSendForm → SendTab 통합 스크립트

This script transforms SendTab.tsx to use the useSendForm hook by:
1. Adding the hook import + call + destructure
2. Removing ALL duplicated declarations/handlers/effects/memos
3. Keeping ONLY SendTab-specific code (UI state, event handlers that interact with UI)

Usage: python scripts/integrate_usesendform.py
"""
import re

SENDTAB_PATH = "src/components/workspace/tabs/SendTab.tsx"

# The hook destructuring block to insert at the start of SendTab()
HOOK_DESTRUCTURE = """  const sf = useSendForm();
  const {
    account, selectedAccountId, accounts, groups, groupsLoading, groupsError,
    selectedIds, selectedRecipients, selectedRecipientIds,
    message, setMessage, imageFile, setImageFile, imageObjectUrl, clearSendDraft,
    templates, setTemplates, templateSearch, setTemplateSearch,
    templateLibraryOpen, setTemplateLibraryOpen,
    saveTemplateDialogOpen, setSaveTemplateDialogOpen,
    saveTemplateName, setSaveTemplateName,
    refreshTemplates,
    isScheduled, setIsScheduled, scheduledAtLocal, setScheduledAtLocal,
    isRecurring, setIsRecurring, recurringInterval, setRecurringInterval,
    deliveryMode, setDeliveryMode, normalDelaySeconds, setNormalDelaySeconds,
    batchSize, setBatchSize,
    replyMacroEnabled, setReplyMacroEnabled, replyToMessageId, setReplyToMessageId,
    autoRetry, setAutoRetry, autoRetryCount, setAutoRetryCount, autoRetryInterval, setAutoRetryInterval,
    inlineButtons, setInlineButtons,
    submitting, setSubmitting, retrying, setRetrying,
    cancelling, setCancelling, cancelConfirmOpen, setCancelConfirmOpen,
    cancelTarget, setCancelTarget, submitError, setSubmitError, submitNotice, setSubmitNotice,
    estimatePreview, estimateLoading,
    batchRetrying, selectedHistoryIds, setSelectedHistoryIds,
    history, setHistory, historyLoading, historyRefreshing,
    historySearch, setHistorySearch, historyDateFrom, setHistoryDateFrom, historyDateTo, setHistoryDateTo,
    historyFilter, saveHistoryFilter, filteredHistory, statusCounts, groupedHistory,
    distributionBatchId, setDistributionBatchId, distributionSiblings, setDistributionSiblings,
    search, setSearch, recentSets, setRecentSets,
    cancelDialogTitle, cancelDialogDescription, statusSummary,
    handleSubmit, handleRetry, handleBatchRetry,
    handleStop, handlePauseRecurring, handleUnpauseRecurring,
    handleCancelClick, handleManualRefresh, handleReuse, handleClone,
    loadHistory, loadDistributionStatus,
    cachedGroups, cachedBroadcasts, runtimeActions,
  } = sf;
"""

# Lines/blocks to remove from SendTab.tsx (start marker → end marker)
# These are EXACT multi-line strings that exist in the file
REMOVE_BLOCKS = [
    # ── Duplicated state declarations ──
    # accounts, selectedAccountId, account
    """  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);""",

    # RuntimeManager cache
    """  // ── RuntimeManager 캐시에서 데이터 즉시 로드 ──
  const { groups: cachedGroups, broadcasts: cachedBroadcasts } = useAccountCache(selectedAccountId);
  const runtimeActions = useRuntimeActions();""",

    # groups state
    """  const groups = useDashboardStore((s) => s.sendGroups);
  const groupsLoading = useDashboardStore((s) => s.sendGroupsLoading);
  const setGroups = useDashboardStore((s) => s.setSendGroups);
  const setGroupsLoading = useDashboardStore((s) => s.setSendGroupsLoading);
  const [groupsError, setGroupsError] = useState<string | null>(null);""",

    # Recipients state
    """  const selectedIds = useDashboardStore((s) => s.sendSelectedGroupIds);
  const toggleGroup = useDashboardStore((s) => s.toggleSendGroupId);
  const setSendSelectedGroupIds = useDashboardStore((s) => s.setSendSelectedGroupIds);
  const clearSendRecipients = useDashboardStore((s) => s.clearSendRecipients);""",

    # Message + image state
    """  const message = useDashboardStore((s) => s.sendMessage);
  const setMessage = useDashboardStore((s) => s.setSendMessage);
  const imageFile = useDashboardStore((s) => s.sendImageFile);
  const setImageFile = useDashboardStore((s) => s.setSendImageFile);
  const imageObjectUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : null, [imageFile]);
  useEffect(() => {
    return () => { if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl); };
  }, [imageObjectUrl]);
  const clearSendDraft = useDashboardStore((s) => s.clearSendDraft);""",

    # ── Template state (keep local setTemplates since hook also has it) ──
    # Actually, keep template state in SendTab since the hook has it but 
    # SendTab uses a different type (MessageTemplate vs LocalTemplate)

    # Broadcast options state
    """  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<number>(60);
  const [deliveryMode, setDeliveryMode] = useState<"normal" | "cycle" | "bulk" | "reply">("normal");
  const [normalDelaySeconds, setNormalDelaySeconds] = useState<number>(60);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [replyMacroEnabled, setReplyMacroEnabled] = useState(false);
  const [replyToMessageId, setReplyToMessageId] = useState("");
  const [autoRetry, setAutoRetry] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(3);
  const [autoRetryInterval, setAutoRetryInterval] = useState(5);
  const [inlineButtons, setInlineButtons] = useState<{ label: string; url: string }[]>([]);""",

    # Submission state
    """  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Broadcast | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitNotice, setSubmitNotice] = useState<string | null>(null);""",

    # Estimate state
    """  const [estimatePreview, setEstimatePreview] = useState<{ estimated_seconds: number; estimated_minutes: number; readable: string } | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);""",

    # Batch retry + reuse state
    """  const [batchRetrying, setBatchRetrying] = useState(false);
  const reuseBroadcast = useDashboardStore((s) => s.reuseBroadcast);""",

    # handleReuse (duplicated in hook)
    """  const handleReuse = useCallback((b: Broadcast) => {
    reuseBroadcast(b);
    setInlineButtons(b.inlineButtons?.filter((btn) => btn.label && btn.url) ?? []);
    if (b.replyToMessageId != null) {
      setReplyMacroEnabled(true);
      setReplyToMessageId(String(b.replyToMessageId));
    } else {
      setReplyMacroEnabled(false);
      setReplyToMessageId("");
    }
  }, [reuseBroadcast]);""",

    # History state
    """  const [history, setHistory] = useState<Broadcast[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HISTORY_FILTER_KEY = "telemon-history-filter";""",

    # Distribution state
    """  // 계정별 분산 발송 현황 — 발송이 여러 계정으로 쪼개졌을 때만 채워짐 (distributionBatchId 있는 경우)
  const [distributionBatchId, setDistributionBatchId] = useState<string | null>(null);
  const [distributionSiblings, setDistributionSiblings] = useState<DistributionSibling[]>([]);
  const distributionPollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);""",

    # History search/date/filter state
    """  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>(() => {""",
]

def main():
    with open(SENDTAB_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Step 1: Insert import for useSendForm
    content = content.replace(
        'import { useRouter } from "next/navigation";',
        'import { useRouter } from "next/navigation";\nimport { useSendForm } from "@/hooks/useSendForm";'
    )

    # Step 2: Insert hook destructure right after "export function SendTab() {"
    content = content.replace(
        "export function SendTab() {",
        "export function SendTab() {\n" + HOOK_DESTRUCTURE
    )

    # Step 3: Remove duplicated blocks (these come after the hook destructure)
    # We need to find and remove them
    for block in REMOVE_BLOCKS:
        count = content.count(block)
        if count > 0:
            content = content.replace(block, "")
        else:
            print(f"WARNING: Block not found (or found {count}x): {block[:50]}...")

    # Step 4: Remove duplicated constants (already in hook or file-level scope)
    content = content.replace(
        "  const POLL_INTERVAL_MS = 3000;\n  const HISTORY_POLL_INTERVAL_MS = 30000;\n",
        ""
    )

    # Step 5: Remove duplicated state items that were in the hook
    # These are the full declaration blocks that the hook covers
    
    # isInitialMount ref
    content = content.replace(
        "  const draftRestoredRef = useRef(false);\n  const isInitialMount = useRef(true);\n",
        "  const draftRestoredRef = useRef(false);\n"
    )

    # Write result
    with open(SENDTAB_PATH, "w", encoding="utf-8") as f:
        f.write(content)

    print("Transformation complete. Check the file for any remaining issues.")

if __name__ == "__main__":
    main()
