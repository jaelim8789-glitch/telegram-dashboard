"""
Remove RecipientReviewPanel function and normalizeSelectedRecipients from SendTab.tsx
since they're now separate imports or provided by useSendForm hook.
"""
SENDTAB = "src/components/workspace/tabs/SendTab.tsx"

with open(SENDTAB, "r", encoding="utf-8") as f:
    content = f.read()

# Remove normalizeSelectedRecipients function
start = "function normalizeSelectedRecipients(groups: Group[], selectedIds: string[]): Group[] {"
# Find end - after the closing brace before RecipientReviewPanel
start_idx = content.find(start)
end_marker = "function RecipientReviewPanel"
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# Remove RecipientReviewPanel function  
start = "function RecipientReviewPanel({"
end_marker = "\n\n\nfunction HistoryRow"
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # Find the actual start (may have changed after first removal)
    start_idx = content.find(start)
    end_idx = content.find(end_marker)
    if start_idx != -1 and end_idx != -1:
        content = content[:start_idx] + "\n\n" + content[end_idx:]

with open(SENDTAB, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Removed RecipientReviewPanel and normalizeSelectedRecipients from SendTab.tsx")
print("[NOTE] RecipientReviewPanel is now imported from @/components/workspace/tabs/send/RecipientReviewPanel")
print("[NOTE] normalizeSelectedRecipients is provided by useSendForm hook")
