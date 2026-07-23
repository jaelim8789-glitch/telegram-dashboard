"""
Fix remaining issues after useSendForm integration:
1. Remove orphaned historyFilter initializer
2. Remove orphaned refreshTemplates body
3. Add missing destructured values (cachedGroups, cachedBroadcasts, runtimeActions)
4. Add isRecurringBroadcast function to SendTab
5. Remove duplicate normalizeSelectedRecipients in SendTab if present
"""

SENDTAB = "src/components/workspace/tabs/SendTab.tsx"

with open(SENDTAB, "r", encoding="utf-8") as f:
    lines = f.readlines()

changes = 0

# 1. Remove orphaned historyFilter initializer (leftover from cleanup)
# Pattern: lines with "catch { /* ignore */ }" and "FILTER_ORDER.includes" that aren't in a valid function context
new_lines = []
skip_orphaned_block = False
for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Detect orphaned historyFilter initializer: lines after the historyFilter useState was removed
    if i > 0 and lines[i-1].strip().startswith("const saveHistoryFilter"):
        # This is fine - saveHistoryFilter is in the hook's return
        pass
    
    # Skip orphaned init blocks
    if "FILTER_ORDER.includes" in stripped and i > 0 and not lines[i-1].strip().startswith("const ["):
        # This is an orphaned line from the removed historyFilter useState
        skip_orphaned_block = True
        print(f"[REMOVE orphan] Line {i+1}: {stripped[:60]}")
        changes += 1
        continue
    
    if skip_orphaned_block:
        # Keep skipping until we hit a known good line
        if stripped.startswith("//") or stripped.startswith("const ") or stripped.startswith("export") or stripped.startswith("function"):
            skip_orphaned_block = False
        else:
            print(f"[REMOVE orphan] Line {i+1}: {stripped[:60]}")
            changes += 1
            continue
    
    new_lines.append(line)

# After removal, re-read and fix remaining issues
lines = new_lines

# 2. Fix refreshTemplates orphaned body
# Find orphaned "setTemplates(loadTemplates());" and "}" not in a proper function
result = []
skip_next = False
for i, line in enumerate(lines):
    stripped = line.strip()
    
    if i > 0 and lines[i-1].strip() == "// Template library":
        # The next line might be orphaned setTemplates
        if "setTemplates(loadTemplates())" in stripped:
            print(f"[REMOVE orphan] Line {i+1}: orphaned setTemplates(loadTemplates())")
            skip_next = True
            changes += 1
            continue
    
    if skip_next:
        skip_next = False
        if stripped == "}":
            print(f"[REMOVE orphan] Line {i+1}: orphaned }}")
            changes += 1
            continue
    
    result.append(line)

lines = result

# 3. Fix destructuring to include cachedGroups/cachedBroadcasts/runtimeActions
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == "} = sendForm;":
        # Find the line BEFORE the closing brace and add the missing values
        for j in range(i-1, -1, -1):
            if lines[j].strip().endswith("setHistoryRefreshing,"):
                # Insert before this line
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                lines[j] = indent + "setHistoryRefreshing,\n" + indent + "cachedGroups, cachedBroadcasts, runtimeActions,\n" + lines[j]
                print(f"[FIX] Added cachedGroups/cachedBroadcasts/runtimeActions to destructuring (around line {j+1})")
                changes += 1
                break
        break

# 4. Add isRecurringBroadcast function to SendTab (for HistoryRow usage)
# Find the function end marker and add the helper before it
found = False
for i, line in enumerate(lines):
    if "function normalizeSelectedRecipients" in line:
        # Add isRecurringBroadcast before normalizeSelectedRecipients
        indent = "  "
        helper = f"{indent}function isRecurringBroadcast(b: Broadcast): boolean {{\n{indent}  return !!b.recurringIntervalMinutes;\n{indent}}}\n\n"
        lines.insert(i, helper)
        print(f"[FIX] Added isRecurringBroadcast function back to SendTab (before line {i+1})")
        found = True
        changes += 1
        break

if not found:
    # Try to find it elsewhere
    for i, line in enumerate(lines):
        if "function isRecurringBroadcast" in line:
            print(f"[INFO] isRecurringBroadcast already at line {i+1}")
            break
    else:
        print("[WARN] Could not find insertion point for isRecurringBroadcast")

# Write the file
with open(SENDTAB, "w", encoding="utf-8") as f:
    f.writelines(lines)

print(f"\n[DONE] Made {changes} fix(es)")
