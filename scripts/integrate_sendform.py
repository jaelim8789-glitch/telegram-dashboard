"""
Integrate useSendForm hook into SendTab.tsx.
Replaces duplicated state/effect/handler declarations with hook call.
"""

import sys

SENDTAB = "src/components/workspace/tabs/SendTab.tsx"

with open(SENDTAB, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add import
old = 'import { useRouter } from "next/navigation";'
new = old + '\nimport { useSendForm } from "@/hooks/useSendForm";'
if old in content and "useSendForm" not in content:
    content = content.replace(old, new)
    print("[OK] Added useSendForm import")
else:
    print("[SKIP] Import already present or marker not found")

# 2. Find the block to replace: from useAccountCache to reuseNotice
marker_start = "const { groups: cachedGroups, broadcasts: cachedBroadcasts } = useAccountCache(selectedAccountId);"
# The end marker - where the state declarations end and business logic begins
marker_end = "const reuseNotice = useDashboardStore((s) => s.reuseNotice);"

start_idx = content.find(marker_start)
end_idx = content.find(marker_end)

if start_idx == -1:
    print("[ERROR] Cannot find useAccountCache marker")
    sys.exit(1)

if end_idx == -1:
    print("[ERROR] Cannot find reuseNotice marker")
    sys.exit(1)

# The block to replace includes everything from useAccountCache to reuseNotice
block = content[start_idx:end_idx]

# Build the replacement: hook call + shared state declarations that stay in SendTab
replacement = '''  const sendForm = useSendForm();

  // Destructure all hook-provided values
  const {
    account, selectedAccountId, accounts,
    groups, groupsLoading, groupsError,
    selectedIds, selectedRecipients, selectedRecipientIds,
    message, setMessage, imageFile, setImageFile, imageObjectUrl, clearSendDraft,
    templates, templateSearch, setTemplateSearch,
    templateLibraryOpen, setTemplateLibraryOpen,
    saveTemplateDialogOpen, setSaveTemplateDialogOpen,
    saveTemplateName, setSaveTemplateName,
    refreshTemplates,
    isScheduled, setIsScheduled, scheduledAtLocal, setScheduledAtLocal,
    isRecurring, setIsRecurring, recurringInterval, setRecurringInterval,
    deliveryMode, setDeliveryMode, normalDelaySeconds, setNormalDelaySeconds,
    batchSize, setBatchSize,
    replyMacroEnabled, setReplyMacroEnabled, replyToMessageId, setReplyToMessageId,
    autoRetry, setAutoRetry, autoRetryCount, setAutoRetryInterval,
    inlineButtons, setInlineButtons,
    submitting, retrying, cancelling, cancelConfirmOpen, cancelTarget,
    submitError, setSubmitError, submitNotice, setSubmitNotice,
    estimatePreview, estimateLoading,
    batchRetrying, selectedHistoryIds, setSelectedHistoryIds,
    history, setHistory, historyLoading, historyRefreshing,
    historySearch, setHistorySearch, historyDateFrom, setHistoryDateFrom,
    historyDateTo, setHistoryDateTo,
    historyFilter, saveHistoryFilter, filteredHistory, statusCounts, groupedHistory,
    distributionBatchId, setDistributionBatchId, distributionSiblings, setDistributionSiblings,
    search, setSearch, recentSets, setRecentSets,
    cancelDialogTitle, cancelDialogDescription, statusSummary,
    handleSubmit, handleRetry, handleBatchRetry,
    handleStop, handlePauseRecurring, handleUnpauseRecurring,
    handleCancelClick, handleManualRefresh, handleReuse, handleClone,
    loadHistory, loadDistributionStatus,
    setHistory, setHistoryLoading, setHistoryRefreshing,
  } = sendForm;

  // Group filtering state (stays in SendTab)
  const { isFavorite, toggleFavorite } = useFavoriteGroups();
  const { recent, markUsed } = useRecentGroups();
  const { tagsByGroup, addTag } = useGroupTags();
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [savedSendGroupIds, setSavedSendGroupIds] = useState<string[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [typeFilter, setTypeFilter] = useState<GroupType | "all" | "saved">("all");
  const [sendFolders, setSendFolders] = useState<GroupFolder[]>([]);

  const reuseNotice = useDashboardStore((s) => s.reuseNotice);
'''

content = content[:start_idx] + replacement + content[end_idx:]

with open(SENDTAB, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Integration complete. Output written to SendTab.tsx")
print("[NOTE] Run 'npx tsc --noEmit' to check for remaining issues.")
