# State Consistency Audit — Verified Production Bugs

## Bug 1 (Critical) — Cancel race condition in BroadcastQueue
**File:** `backend/account_runtime.py` lines 244-257
**Root Cause:** `_prune_cancelled_set(broadcast.id)` at line 254 removes the cancellation marker BEFORE the send loop checks it at line 270. `cancel_broadcast()` and `_dispatch` race:
1. `_dispatch` checks cancelled_set at line 248 → False
2. `cancel_broadcast()` pops from `_active_broadcasts`, appends to `_completed`, adds to `_cancelled_set`
3. `_dispatch` prunes cancelled_set at line 254 — **removes the marker!**
4. `_dispatch` send loop completes, overwrites status="cancelled" with "sent"/"failed"
5. `_dispatch` tries `_active_broadcasts.pop(broadcast.id, None)` — **KeyError** (already popped)
6. **Result:** Cancel is silently ignored, broadcast marked "sent", duplicate entry in `_completed`
**Fix:** Move prune AFTER the send loop completes, only when broadcast is truly finalized.

## Bug 2 (Critical) — Idempotency-Key header not enforced by backend
**File:** `src/lib/api.ts` line 469 vs `backend/routers/broadcast.py` lines 13-22
**Root Cause:** Frontend sends `Idempotency-Key` header, but the backend POST `/api/broadcast` endpoint never reads or checks it. If the request succeeds on the backend but the frontend throws a network error, the key is cleared and retrying creates a **DUPLICATE** broadcast.
**Fix:** Backend must store and check the Idempotency-Key before creating duplicates.

## Bug 3 (Critical) — Account status PATCH is a no-op stub
**File:** `backend/routers/accounts.py` line 56
**Root Cause:** `PATCH /api/accounts/{account_id}/status` returns `{"status": "updated"}` but never actually calls any runtime method. The `# TODO` comment confirms this. Frontend shows stale account status indefinitely.
**Fix:** Implement actual status changes in the account runtime.

## Bug 4 (High) — Cancelled broadcast stays "pending" in `_broadcast_store`
**File:** `backend/account_runtime.py` `cancel_broadcast()` lines 362-367
**Root Cause:** When `cancel_broadcast()` adds a queued (not yet dispatched) broadcast's ID to `_cancelled_set`, it never updates the Broadcast object in `_broadcast_store`. Its status stays "pending" forever. The frontend shows it as pending even though it's cancelled.
**Fix:** Find and update the broadcast in `_broadcast_store` when cancelling via the set.

## Bug 5 (High) — EventBus handlers leak on runtime stop
**File:** `backend/account_runtime.py` line 1094-1096 vs `stop()` line 1137-1143
**Root Cause:** `__init__` subscribes three event handlers, but `stop()` never calls `self.event_bus.clear()`. When healing engine restarts a runtime, old handlers hang around as zombie references to the old runtime. Memory leak + stale callbacks.
**Fix:** Call `self.event_bus.clear()` in `stop()`.

## Bug 6 (High) — Cancel route returns stale broadcast
**File:** `backend/routers/broadcast.py` lines 90-109
**Root Cause:** When `cancel_broadcast(broadcast_id)` returns False (broadcast not in active/completed queue but ID added to `_cancelled_set`), the route raises 404 even though the cancel was recorded. The broadcast object `b` still has `status: "pending"`.
**Fix:** When cancel is recorded via `_cancelled_set`, update status to "cancelled" in the broadcast object too.

## Bug 7 (Medium) — `get_auto_reply_settings` leaks internal list reference
**File:** `backend/runtime_manager.py` line 342
**Root Cause:** `AutoReplySettings(rules=runtime.auto_reply._rules)` passes the internal list directly. Any mutation of `runtime.auto_reply._rules` will corrupt the API response. No defensive copy.
**Fix:** Copy the list with `list(...)`.

## Bug 8 (Low) — `RuntimeManager._getOrCreateCache` calls `_prefetchAccount` which is async but not awaited
**File:** `src/lib/runtimeManager.ts` line 472
**Root Cause:** `_getOrCreateCache` calls `this._prefetchAccount(accountId)` without `await`. The prefetch runs in background, potentially creating a race where `getSnapshotKey` runs before the cache is populated.
**Fix:** Don't fire prefetch from a synchronous getter. Let the caller manage prefetch.

## Bug 9 (Medium) — Broadcast retry updates object but not broadcast_store
**File:** `backend/routers/broadcast.py` lines 65-87 and `backend/account_runtime.py` `_dispatch` flood-wait path lines 291-314
**Root Cause:** When a broadcast gets flood-waited, `_dispatch` modifies `broadcast.recipients` in-place (line 312) and re-enqueues the SAME object. The `_broadcast_store` entry also points to this object, so the recipients get truncated even before the broadcast completes. If a user views the broadcast while it's being retried, they see truncated recipients.
**Fix:** Re-enqueue with a COPY of the broadcast, not the original.