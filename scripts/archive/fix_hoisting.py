#!/usr/bin/env python3
"""Fix the selectedRecipientIds hoisting issue in SendTab.tsx."""
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8')

PROJECT = r"C:\Backups\emergency-20260718-211528\Dev\TeleMon"
path = os.path.join(PROJECT, "src/components/workspace/tabs/SendTab.tsx")

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the misplaced estimate effect and remove it
old_effect = '''  // Auto-fetch send time estimate when message or recipients change
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
  }, [selectedAccountId, selectedRecipientIds.length, message.trim(), deliveryMode, normalDelaySeconds]);
'''

if old_effect in content:
    content = content.replace(old_effect, '', 1)
    print("[OK] Removed misplaced estimate effect")
else:
    print("[WARN] Misplaced estimate effect not found, trying with different comment")
    # Try without comment
    alt_effect = '''  useEffect(() => {
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
  }, [selectedAccountId, selectedRecipientIds.length, message.trim(), deliveryMode, normalDelaySeconds]);
'''
    if alt_effect in content:
        content = content.replace(alt_effect, '', 1)
        print("[OK] Removed misplaced estimate effect (alt match)")

# Now add the effect in the right place - after selectedRecipientIds declaration
old_location = '''  const selectedRecipientIds = useMemo(() => selectedRecipients.map((g) => g.id), [selectedRecipients]);

  const { toast } = useToast();'''

new_location = '''  const selectedRecipientIds = useMemo(() => selectedRecipients.map((g) => g.id), [selectedRecipients]);

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
  }, [selectedAccountId, selectedRecipientIds.length, message.trim(), deliveryMode, normalDelaySeconds]);

  const { toast } = useToast();'''

if old_location in content:
    content = content.replace(old_location, new_location, 1)
    print("[OK] Added estimate effect after selectedRecipientIds")
else:
    print("[WARN] Target location not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[DONE] Hoisting fix complete")
