"""
Remove HistoryRow function from SendTab.tsx and replace with the import.
"""
SENDTAB = "src/components/workspace/tabs/SendTab.tsx"

with open(SENDTAB, "r", encoding="utf-8") as f:
    content = f.read()

# Find the HistoryRow function boundaries
start_marker = "function HistoryRow({\n  h,\n  cancelling,\n  retrying,\n  onCancelClick,\n  onRetry,\n  onReuse,\n  onClone,\n  onPauseResume,\n  selected,\n  onToggleSelect,\n}: {"

end_marker = "\nexport function SendTab()"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("[ERROR] Could not find HistoryRow start marker")
    # Try alternative start
    alt_start = "function HistoryRow({\n  h,\n  cancelling,"
    start_idx = content.find(alt_start)
    if start_idx == -1:
        print("[ERROR] Could not find HistoryRow at all")
        exit(1)

if end_idx == -1:
    print("[ERROR] Could not find SendTab marker")
    exit(1)

# Remove from start of HistoryRow to the blank line before SendTab
# end_idx points to the newline before "export function SendTab()"
removed = content[start_idx:end_idx]

content = content[:start_idx] + content[end_idx:]

with open(SENDTAB, "w", encoding="utf-8") as f:
    f.write(content)

print(f"[OK] Removed HistoryRow function ({len(removed)} chars)")
print(f"[NOTE] HistoryRow is now imported from @/components/workspace/tabs/send/HistoryRow")
