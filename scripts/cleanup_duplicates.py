"""
Remove duplicate declarations from SendTab.tsx that are now provided by useSendForm hook.
Reads the file, identifies duplicate lines by content patterns, removes them.
"""

SENDTAB = "src/components/workspace/tabs/SendTab.tsx"

with open(SENDTAB, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Patterns for lines that are DUPLICATED (now provided by hook)
DUPLICATE_PATTERNS = [
    # History states (lines ~484-510)
    "const [history, setHistory] = useState<Broadcast[]>",
    "const [historyLoading, setHistoryLoading] = useState",
    "const [historyRefreshing, setHistoryRefreshing] = useState",
    "const [distributionBatchId, setDistributionBatchId]",
    "const [distributionSiblings, setDistributionSiblings]",
    "const [historySearch, setHistorySearch] = useState",
    "const [historyDateFrom, setHistoryDateFrom] = useState",
    "const [historyDateTo, setHistoryDateTo] = useState",
    
    # Poll timers (hook has its own)
    "const pollTimer = useRef<ReturnType<typeof setTimeout>",
    "const historyPollTimer = useRef<ReturnType<typeof setTimeout>",
    "const distributionPollTimer = useRef<ReturnType<typeof setTimeout>",
    
    # bgPollTick (in hook)
    "const [bgPollTick, setBgPollTick] = useState",
    
    # historyFilter state (in hook, initialized by saveHistoryFilter)
    "const [historyFilter, setHistoryFilter] = useState<HistoryFilter>",
    
    # refreshTemplates function (in hook)
    "function refreshTemplates() {",
    
    # isRecurringBroadcast helper (in hook)
    "function isRecurringBroadcast(b: Broadcast): boolean",
]

# Also remove the comment above distribution state
COMMENT_PATTERNS = [
    "// Account distribution state",
]

lines_to_skip = set()

for i, line in enumerate(lines):
    s = line.strip()
    # Check line against duplicate patterns
    for pattern in DUPLICATE_PATTERNS:
        if pattern in s:
            lines_to_skip.add(i)
            print(f"[REMOVE] Line {i+1}: {s[:70]}")
            break
    # Check comment patterns
    for pattern in COMMENT_PATTERNS:
        if pattern == s.rstrip():
            lines_to_skip.add(i)
            print(f"[REMOVE] Line {i+1}: {s[:70]}")
            break

# Remove lines (in reverse order to preserve indices)
new_lines = [line for i, line in enumerate(lines) if i not in lines_to_skip]

removed = len(lines) - len(new_lines)
print(f"\nRemoved {removed} duplicate lines")

with open(SENDTAB, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"[OK] Written to {SENDTAB}")
