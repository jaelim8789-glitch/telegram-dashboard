catch (e) { console.warn('Unhandled error in page', e) }rn('Unhandled error in page', e) }ort { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronLeft, KeyRound, RefreshCw, Smartphone, UserCheck, Users, Search, CheckCircle2, Copy, Trash2, AlertTriangle, Zap, Sparkles, TrendingUp } from "lucide-react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { InlineError } from "@/components/ui/InlineError";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import * as api from "@/lib/api";
import type { DashboardUser, UserLookupResult } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/formatTime";

function ManualIssueSection({ onIssued }: { onIssued: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [memo, setMemo] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "team">("team");
  const [lookupResult, setLookupResult] = useState<UserLookupResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;
    setSearching(true); setError(null); setLookupResult(null); setIssuedKey(null);
    try {
      const result = await api.adminUserLookup(searchQuery.trim());
      setLookupResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "?¬ìš©??ì¡°íšŒ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    } finally { setSearching(false); }
  }

  async function handleIssue() {
    if (!lookupResult?.phone || issuing) return;
    setIssuing(true); setError(null); setIssuedKey(null);
    try {
      const result = await api.manualIssueApiKey(lookupResult.phone, memo.trim() || undefined, plan);
      if (result.alreadyIssued) {
        setError("?´ë? API ?¤ê? ë°œê¸‰???¬ìš©?ì…?ˆë‹¤.");
      } else {
        setIssuedKey(result.apiKey);
        onIssued();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "API ??ë°œê¸‰???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    } finally { setIssuing(false); }
  }

  const hasResult = lookupResult && lookupResult.userId;

  return (
    <Panel title={
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-amber-400" />
        ?˜ë™ API ??ë°œê¸‰
      </div>
    } description="ê´€ë¦¬ìê°€ ?í•˜???¬ìš©?ì—ê²?ì§ì ‘ API ?¤ë? ë°œê¸‰?©ë‹ˆ??">
      <form onSubmit={handleSearch} className="mb-3 flex items-start gap-2">
        <div className="flex-1">
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="?„í™”ë²ˆí˜¸ ?…ë ¥..." required />
        </div>
        <Button type="submit" disabled={searching}>{searching ? "ê²€??ì¤?.." : "ì¡°íšŒ"}</Button>
      </form>
      {error && <InlineError className="mb-3">{error}</InlineError>}
      {hasResult && !issuedKey && (
        <div className="rounded-xl border border-app-border bg-app-bg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-app-text-muted">?„í™”ë²ˆí˜¸</span><p className="font-medium text-app-text">{lookupResult.phone}</p></div>
            <div><span className="text-app-text-muted">?íƒœ</span><p className="font-medium">{lookupResult.isActive ? "?œì„±" : "ë¹„í™œ??}</p></div>
            <div><span className="text-app-text-muted">?Œëœ</span><p className="font-medium">{lookupResult.tenantPlan ?? "-"}</p></div>
            <div><span className="text-app-text-muted">API ??/span><p className="font-medium">{lookupResult.hasApiKey ? "???ˆìŒ" : "???†ìŒ"}</p></div>
          </div>
          <div className="space-y-2">
            <Select value={plan} onChange={(e) => setPlan(e.target.value as "free" | "pro" | "team")}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
            </Select>
            <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="ë°œê¸‰ ?¬ìœ  (? íƒ)" />
            <Button onClick={handleIssue} disabled={issuing} loading={issuing} className="w-full">
              <KeyRound className="h-4 w-4" /> API ??ë°œê¸‰
            </Button>
          </div>
        </div>
      )}
      {issuedKey && (
        <div className="rounded-xl border border-app-success/30 bg-app-success-muted/20 p-3 space-y-2">
          <div className="flex items-center gap-2 text-app-success"><CheckCircle2 className="h-4 w-4" /> ë°œê¸‰ ?„ë£Œ</div>
          <code className="block break-all rounded-lg bg-app-bg p-2 text-xs font-mono">{issuedKey}</code>
          <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(issuedKey); } catch {} }}>
            <Copy className="h-3 w-3" /> ë³µì‚¬
          </Button>
        </div>
      )}
    </Panel>
  );
}

function DeleteUserByPhoneSection({ onDeleted }: { onDeleted: () => void }) {
  const [phone, setPhone] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setConfirmOpen(false);
    if (!phone.trim() || deleting) return;
    setDeleting(true); setError(null);
    try {
      const result = await api.adminDeleteUserByPhone(phone.trim());
      setDone(true);
      setPhone("");
      onDeleted();
      toast("success", `?¬ìš©??${result.phone} ?? œ ?„ë£Œ`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
    } finally { setDeleting(false); }
  }

  return (
    <Panel
      accent="rose"
      title={
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-rose-400" />
          ?„í™”ë²ˆí˜¸ë¡??¬ìš©???? œ
        </div>
      }
      description="DB?ì„œ ?¬ìš©??+ Tenant + ?¸ì…˜???„ì „???? œ?©ë‹ˆ?? ?? œ ??Telegram Login Widget?¼ë¡œ ?¬ê???ê°€?¥í•©?ˆë‹¤."
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="?„í™”ë²ˆí˜¸ (?? +819010679014)"
            className="font-mono"
          />
        </div>
        <Button
          variant="danger"
          onClick={() => setConfirmOpen(true)}
          disabled={!phone.trim() || deleting}
          loading={deleting}
        >
          <Trash2 className="h-4 w-4" /> ?? œ
        </Button>
      </div>
      {error && <InlineError className="mt-2">{error}</InlineError>}
      {done && <p className="mt-2 text-xs text-app-success">???? œ ?„ë£Œ. Telegram Login?¼ë¡œ ?¬ê???ê°€?¥í•©?ˆë‹¤.</p>}
      <p className="mt-2 text-[10px] text-app-text-subtle">
        ? ï¸ ???‘ì—…?€ ?˜ëŒë¦????†ìŠµ?ˆë‹¤. ?¬ìš©?ì˜ ëª¨ë“  ?°ì´??ë°œì†¡ ?´ì—­ ?œì™¸)ê°€ ?? œ?©ë‹ˆ??
      </p>

      <ConfirmDialog
        open={confirmOpen}
        title="?¬ìš©???? œ"
        description={`"${phone}" ?????„í™”ë²ˆí˜¸???¬ìš©?ì? ?°ê²°??Tenant, ?¸ì…˜???êµ¬ ?? œ?©ë‹ˆ?? ê³„ì†? ê¹Œ??`}
        variant="danger"
        confirmLabel="?êµ¬ ?? œ"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Panel>
  );
}

function TokenTopUpSection({ onTopUp }: { onTopUp: () => void }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [amount, setAmount] = useState(1000);
  const [memo, setMemo] = useState("ê´€ë¦¬ì ?˜ë™ ì¶©ì „");
  const [toppingUp, setToppingUp] = useState(false);
  const [done, setDone] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleTopUp() {
    if (!phoneInput.trim() || toppingUp) return;
    setToppingUp(true);
    setResultText(null);
    try {
      const lookup = await api.adminUserLookup(phoneInput.trim());
      if (!lookup?.userId) {
        toast("error", "?´ë‹¹ ?„í™”ë²ˆí˜¸ ?¬ìš©?ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.");
        return;
      }
      const result = await api.adminTopUpTokens(lookup.userId, amount, memo.trim() || undefined);
      setDone(true);
      setResultText(`ì¶©ì „ ?„ë£Œ: ???”ì•¡ ${result.new_balance.toLocaleString()} ? í°`);
      setPhoneInput("");
      toast("success", `${lookup.phone ?? "?¬ìš©??}??${amount.toLocaleString()}? í° ì¶©ì „ ?„ë£Œ`);
      onTopUp();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "ì¶©ì „ ?¤íŒ¨");
    }
    finally { setToppingUp(false); }
  }

  return (
    <Panel
      accent="amber"
      title={<div className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-400" /> ? í° ?˜ë™ ì¶©ì „</div>}
      description="?¬ìš©?ì—ê²?? í°??ì§ì ‘ ì§€ê¸‰í•©?ˆë‹¤. (ë¡œì»¬: ë¡œê·¸ ê¸°ë¡, ?œë²„: API ?„ìš”)"
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <Input value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="?„í™”ë²ˆí˜¸" className="font-mono" />
        </div>
        <div className="min-w-[180px]">
          <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="?¬ìœ  ë©”ëª¨" />
        </div>
        <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}
          className="rounded-lg border border-app-border bg-app-card px-2 py-2 text-xs text-app-text outline-none">
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1,000</option>
          <option value={5000}>5,000</option>
          <option value={10000}>10,000</option>
        </select>
        <Button variant="primary" onClick={handleTopUp} disabled={!phoneInput.trim() || toppingUp} loading={toppingUp}>
          <Zap className="h-3.5 w-3.5" /> ì¶©ì „
        </Button>
      </div>
      {done && <p className="mt-2 text-xs text-app-success">??{resultText ?? "ì¶©ì „ ?„ë£Œ"}</p>}
    </Panel>
  );
}

function UsersContent() {
  type UserFilterState = {
    search: string;
    plan: "all" | "free" | "pro" | "team";
    subscription: "all" | "active" | "inactive";
    activity: "all" | "active" | "inactive";
    minAccounts: "all" | "1" | "3" | "5";
  };
  type SavedView = { name: string; filters: UserFilterState };
  const SAVED_VIEW_KEY = "telemon_admin_users_saved_views_v1";

  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<DashboardUser | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<DashboardUser | null>(null);
  const [deletePhone, setDeletePhone] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DashboardUser | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [billingPlan, setBillingPlan] = useState<"keep" | "free" | "pro" | "team">("keep");
  const [billingSubscription, setBillingSubscription] = useState<"keep" | "active" | "inactive" | "pending" | "past_due" | "canceled">("keep");
  const [extendTrialDays, setExtendTrialDays] = useState<number>(7);
  const [billingLoading, setBillingLoading] = useState(false);
  const [filters, setFilters] = useState<UserFilterState>({
    search: "",
    plan: "all",
    subscription: "all",
    activity: "all",
    minAccounts: "all",
  });
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [newViewName, setNewViewName] = useState("");
  const [auditLogs, setAuditLogs] = useState<api.AdminAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [commissions, setCommissions] = useState<api.AdminReferralCommission[]>([]);
  const { toast } = useToast();
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<"all" | "pending" | "paid">("pending");
  const [commissionTxDrafts, setCommissionTxDrafts] = useState<Record<string, string>>({});
  const [highRiskAction, setHighRiskAction] = useState<{ kind: "bulk_deactivate" | "delete_user"; phone?: string } | null>(null);
  const [highRiskPhrase, setHighRiskPhrase] = useState("");
  const [highRiskSubmitting, setHighRiskSubmitting] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try { setUsers(await api.fetchUsers()); } catch (err) { setError(err instanceof Error ? err.message : "?¬ìš©??ëª©ë¡ ë¡œë“œ ?¤íŒ¨"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    void loadAuditLogs();
    void loadCommissions();
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setBillingPlan("keep");
    setBillingSubscription("keep");
    setExtendTrialDays(7);
  }, [selectedUser?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_VIEW_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedView[];
      if (!Array.isArray(parsed)) return;
      setSavedViews(parsed.filter((v) => !!v?.name && !!v?.filters));
    } catch {
      // Keep UX resilient even if local storage is malformed.
    }
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        if (!u.phone.toLowerCase().includes(q)) return false;
      }
      if (filters.plan !== "all" && (u.plan ?? "free") !== filters.plan) return false;
      if (filters.subscription !== "all") {
        const status = u.subscriptionStatus === "active" ? "active" : "inactive";
        if (status !== filters.subscription) return false;
      }
      if (filters.activity !== "all") {
        const activity = u.isActive ? "active" : "inactive";
        if (activity !== filters.activity) return false;
      }
      if (filters.minAccounts !== "all") {
        const min = Number(filters.minAccounts);
        if (u.accountCount < min) return false;
      }
      return true;
    });
  }, [users, filters]);

  const riskUsers = useMemo(
    () => filteredUsers.filter((u) => !u.isActive || (u.subscriptionStatus && u.subscriptionStatus !== "active") || u.accountCount === 0).length,
    [filteredUsers],
  );

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedIds.includes(u.id));

  function saveCurrentView() {
    const name = newViewName.trim();
    if (!name) return;
    const deduped = savedViews.filter((v) => v.name !== name);
    const next = [{ name, filters }, ...deduped].slice(0, 8);
    setSavedViews(next);
    setNewViewName("");
    try {
      localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(next));
    } catch (e) { console.warn('Unhandled error in page', e) }
  }

  function applySavedView(view: SavedView) {
    setFilters(view.filters);
  }

  function removeSavedView(name: string) {
    const next = savedViews.filter((v) => v.name !== name);
    setSavedViews(next);
    try {
      localStorage.setItem(SAVED_VIEW_KEY, JSON.stringify(next));
    } catch (e) { console.warn('Unhandled error in page', e) }
  }

  function resetFilters() {
    setFilters({ search: "", plan: "all", subscription: "all", activity: "all", minAccounts: "all" });
  }

  function toggleSelectUser(userId: string) {
    setSelectedIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredUsers.some((u) => u.id === id)));
      return;
    }
    const merged = new Set([...selectedIds, ...filteredUsers.map((u) => u.id)]);
    setSelectedIds(Array.from(merged));
  }

  async function runBulkToggle(nextActive: boolean) {
    if (selectedIds.length === 0 || bulkLoading) return;
    setBulkLoading(true);
    setError(null);
    try {
      await Promise.all(selectedIds.map((id) => api.toggleUser(id, nextActive)));
      await load();
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "?€???íƒœ ë³€ê²??¤íŒ¨");
    } finally {
      setBulkLoading(false);
    }
  }

  async function loadAuditLogs() {
    setAuditLoading(true);
    try {
      const logs = await api.fetchAdminAuditLogs(30);
      setAuditLogs(logs);
    } finally {
      setAuditLoading(false);
    }
  }

  async function loadCommissions() {
    setCommissionLoading(true);
    try {
      const status = commissionStatusFilter === "all" ? undefined : commissionStatusFilter;
      const list = await api.fetchAdminReferralCommissions(status);
      setCommissions(list);
    } finally {
      setCommissionLoading(false);
    }
  }

  useEffect(() => {
    void loadCommissions();
  }, [commissionStatusFilter]);

  async function handleReissue(u: DashboardUser) {
    setConfirmUser(u);
  }

  async function handleConfirmReissue() {
    if (!confirmUser) return;
    try {
      const newKey = await api.reissueUserApiKey(confirmUser.id, "Admin reissue");
      toast("success", `??API ?¤ê? ?ì„±?˜ì—ˆ?µë‹ˆ?? ???¤ëŠ” ??ë²ˆë§Œ ?œì‹œ?©ë‹ˆ??`);
      setConfirmUser(null);
    } catch { setError("???¬ë°œê¸??¤íŒ¨"); }
  }

  async function handleToggle(u: DashboardUser) {
    try {
      await api.toggleUser(u.id, !u.isActive);
      await load();
    } catch { setError("?íƒœ ë³€ê²??¤íŒ¨"); }
  }

  async function handleApproveCommission(commissionId: string) {
    try {
      await api.approveAdminReferralCommission(commissionId, commissionTxDrafts[commissionId] || undefined);
      await Promise.all([loadCommissions(), loadAuditLogs()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ì»¤ë????¹ì¸ ?¤íŒ¨");
    }
  }

  function requestHighRiskAction(action: { kind: "bulk_deactivate" | "delete_user"; phone?: string }) {
    setHighRiskAction(action);
    setHighRiskPhrase("");
  }

  async function executeHighRiskAction() {
    if (!highRiskAction || highRiskSubmitting) return;
    const required = highRiskAction.kind === "bulk_deactivate" ? "DEACTIVATE" : "DELETE";
    if (highRiskPhrase.trim().toUpperCase() !== required) {
      setError(`?•ì¸ ë¬¸êµ¬ê°€ ?¼ì¹˜?˜ì? ?ŠìŠµ?ˆë‹¤. ${required} ë¥??…ë ¥?´ì£¼?¸ìš”.`);
      return;
    }
    setHighRiskSubmitting(true);
    setError(null);
    try {
      if (highRiskAction.kind === "bulk_deactivate") {
        await runBulkToggle(false);
      } else if (highRiskAction.kind === "delete_user" && highRiskAction.phone) {
        await api.adminDeleteUserByPhone(highRiskAction.phone);
        await load();
      }
      await loadAuditLogs();
      setHighRiskAction(null);
      setHighRiskPhrase("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ê³ ìœ„???‘ì—… ?¤íŒ¨");
    } finally {
      setHighRiskSubmitting(false);
    }
  }

  async function refreshUsersAndSelection(userId: string) {
    const next = await api.fetchUsers();
    setUsers(next);
    const refreshed = next.find((u) => u.id === userId) ?? null;
    setSelectedUser(refreshed);
  }

  async function handleBillingUpdate() {
    if (!selectedUser || billingLoading) return;
    const payload: api.AdminBillingUpdateInput = {};
    if (billingPlan !== "keep") payload.plan = billingPlan;
    if (billingSubscription !== "keep") payload.subscription_status = billingSubscription;
    if (extendTrialDays > 0) payload.extend_trial_days = extendTrialDays;
    if (!payload.plan && !payload.subscription_status && !payload.extend_trial_days) {
      setError("ë³€ê²½í•  ê²°ì œ/?Œëœ ??ª©??? íƒ?´ì£¼?¸ìš”.");
      return;
    }
    setBillingLoading(true);
    setError(null);
    try {
      await api.adminUpdateUserBilling(selectedUser.id, payload);
      await refreshUsersAndSelection(selectedUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ê²°ì œ/?Œëœ ?…ë°?´íŠ¸ ?¤íŒ¨");
    } finally {
      setBillingLoading(false);
    }
  }

  function getRiskLevel(u: DashboardUser): "normal" | "warning" | "high" {
    if (!u.isActive || (u.subscriptionStatus && u.subscriptionStatus !== "active")) return "high";
    if (u.accountCount === 0 || u.starsBalance < 100) return "warning";
    return "normal";
  }

  function exportFilteredUsersCsv() {
    const rows = [
      ["phone", "is_active", "plan", "subscription_status", "account_count", "stars_balance", "risk", "created_at", "last_login", "trial_expires_at"],
      ...filteredUsers.map((u) => [
        u.phone,
        u.isActive ? "true" : "false",
        u.plan ?? "",
        u.subscriptionStatus ?? "",
        String(u.accountCount),
        String(u.starsBalance),
        getRiskLevel(u),
        u.createdAt,
        u.lastLogin ?? "",
        u.trialExpiresAt ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-users-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text">?¬ìš©??ê´€ë¦?/h1>
          <p className="text-sm text-app-text-muted">API ??ë°œê¸‰ ë°??¬ìš©??ê³„ì • ê´€ë¦?/p>
        </div>
        <Link href="/admin/dashboard" className="flex items-center gap-1 text-xs text-app-primary-hover hover:underline">
          <ChevronLeft className="h-3 w-3" /> ?€?œë³´??
        </Link>
      </div>

      <TokenTopUpSection onTopUp={() => { void loadAuditLogs(); void load(); }} />
      <DeleteUserByPhoneSection onDeleted={load} />
      <ManualIssueSection onIssued={load} />

      {/* User list */}
      <Panel
        accent="cyan"
        title={
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            ?„í™”ë²ˆí˜¸ ?¸ì¦ ?¬ìš©??
          </div>
        }
        description="ë³¸ì¸ ?„í™”ë²ˆí˜¸ë¥??¸ì¦??API ?¤ë? ë°œê¸‰ë°›ì? ?¬ìš©?ì…?ˆë‹¤."
      >
        <div className="mb-4 space-y-3 rounded-xl border border-app-border bg-app-bg p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="?„í™”ë²ˆí˜¸ ê²€??
            />
            <Select
              value={filters.plan}
              onChange={(e) => setFilters((prev) => ({ ...prev, plan: e.target.value as UserFilterState["plan"] }))}
            >
              <option value="all">?Œëœ ?„ì²´</option>
              <option value="free">ë¬´ë£Œ</option>
              <option value="pro">?„ë¡œ</option>
              <option value="team">?€</option>
            </Select>
            <Select
              value={filters.subscription}
              onChange={(e) => setFilters((prev) => ({ ...prev, subscription: e.target.value as UserFilterState["subscription"] }))}
            >
              <option value="all">êµ¬ë… ?„ì²´</option>
              <option value="active">?œì„±</option>
              <option value="inactive">ë¹„í™œ??ê¸°í?</option>
            </Select>
            <Select
              value={filters.activity}
              onChange={(e) => setFilters((prev) => ({ ...prev, activity: e.target.value as UserFilterState["activity"] }))}
            >
              <option value="all">?œì„±?íƒœ ?„ì²´</option>
              <option value="active">?œì„± ?¬ìš©??/option>
              <option value="inactive">ë¹„í™œ???¬ìš©??/option>
            </Select>
            <Select
              value={filters.minAccounts}
              onChange={(e) => setFilters((prev) => ({ ...prev, minAccounts: e.target.value as UserFilterState["minAccounts"] }))}
            >
              <option value="all">ê³„ì • ???„ì²´</option>
              <option value="1">1ê°??´ìƒ</option>
              <option value="3">3ê°??´ìƒ</option>
              <option value="5">5ê°??´ìƒ</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
            <span>ì¡°íšŒ {filteredUsers.length}ëª?/span>
            <span>ë¦¬ìŠ¤???„ë³´ {riskUsers}ëª?/span>
            <span>? íƒ {selectedIds.length}ëª?/span>
            <Button size="sm" variant="ghost" onClick={resetFilters}>?„í„° ì´ˆê¸°??/Button>
            <Button size="sm" variant="secondary" onClick={exportFilteredUsersCsv} disabled={filteredUsers.length === 0}>CSV ?´ë³´?´ê¸°</Button>
            <Button size="sm" variant="secondary" onClick={() => runBulkToggle(true)} disabled={selectedIds.length === 0 || bulkLoading} loading={bulkLoading}>? íƒ ?¼ê´„ ?œì„±??/Button>
            <Button size="sm" variant="danger" onClick={() => requestHighRiskAction({ kind: "bulk_deactivate" })} disabled={selectedIds.length === 0 || bulkLoading} loading={bulkLoading}>? íƒ ?¼ê´„ ë¹„í™œ?±í™”</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-app-border pt-2">
            <Input
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="?€??ë·??´ë¦„"
              className="w-full sm:w-52"
            />
            <Button size="sm" onClick={saveCurrentView} disabled={!newViewName.trim()}>?„ì¬ ?„í„° ?€??/Button>
            {savedViews.map((view) => (
              <div key={view.name} className="flex items-center gap-1 rounded-lg border border-app-border px-2 py-1 text-xs">
                <button className="text-app-text hover:underline" onClick={() => applySavedView(view)}>{view.name}</button>
                <button className="text-app-text-muted hover:text-app-danger" onClick={() => removeSavedView(view.name)} aria-label={`${view.name} ?? œ`}>x</button>
              </div>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`user-sk-${i}`} className="h-14 animate-pulse rounded-xl bg-app-card-hover" />
            ))}
          </div>
        )}
        {error && <InlineError>{error}</InlineError>}
        {!loading && !error && users.length === 0 && (
          <EmptyState icon={Users} title="ê°€?…í•œ ?¬ìš©???†ìŒ" />
        )}
        {!loading && !error && users.length > 0 && filteredUsers.length === 0 && (
          <EmptyState icon={Users} title="?„í„° ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤" />
        )}
        {/* Users table with enriched info */}
        {!loading && filteredUsers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-4 py-3 text-center font-semibold">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      aria-label="?„ì¬ ?„í„° ê²°ê³¼ ?„ì²´ ? íƒ"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">?„í™”ë²ˆí˜¸</th>
                  <th className="px-4 py-3 text-left font-semibold">?Œëœ</th>
                  <th className="px-4 py-3 text-left font-semibold">êµ¬ë…?íƒœ</th>
                  <th className="px-4 py-3 text-center font-semibold">ê³„ì •??/th>
                  <th className="px-4 py-3 text-center font-semibold">ë³??”ì•¡</th>
                  <th className="px-4 py-3 text-left font-semibold">ë¦¬ìŠ¤??/th>
                  <th className="px-4 py-3 text-left font-semibold">ê°€?…ì¼</th>
                  <th className="px-4 py-3 text-left font-semibold">?íƒœ</th>
                  <th className="px-4 py-3 text-right font-semibold">?‘ì—…</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="cursor-pointer transition-colors hover:bg-app-card-hover" onClick={() => setSelectedUser(u)}>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={() => toggleSelectUser(u.id)}
                        aria-label={`${u.phone} ? íƒ`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-app-text-muted" />
                        <span className="font-medium">{u.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.plan ? (
                        <Badge tone={u.plan === "team" ? "info" : u.plan === "pro" ? "success" : "neutral"}>
                          {u.plan === "team" ? "?€" : u.plan === "pro" ? "?„ë¡œ" : "ë¬´ë£Œ"}
                        </Badge>
                      ) : (
                        <span className="text-app-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.subscriptionStatus ? (
                        <Badge tone={u.subscriptionStatus === "active" ? "success" : "danger"}>
                          {u.subscriptionStatus === "active" ? "?œì„±" : "ë¹„í™œ??}
                        </Badge>
                      ) : (
                        <span className="text-app-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.accountCount > 0 ? (
                        <span className="font-semibold text-app-text">{u.accountCount}</span>
                      ) : (
                        <span className="text-app-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.starsBalance > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                          <span className="font-semibold text-yellow-600 dark:text-yellow-400">{u.starsBalance}</span>
                        </div>
                      ) : (
                        <span className="text-app-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getRiskLevel(u) === "high" && <Badge tone="danger">?’ìŒ</Badge>}
                      {getRiskLevel(u) === "warning" && <Badge tone="warning">ì£¼ì˜</Badge>}
                      {getRiskLevel(u) === "normal" && <Badge tone="success">?•ìƒ</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs text-app-text-muted">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.isActive ? "success" : "neutral"}>
                        {u.isActive ? "?œì„±" : "ë¹„í™œ??}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleReissue(u); }} title="API ???¬ë°œê¸?>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={u.isActive ? "danger" : "secondary"}
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={(e) => { e.stopPropagation(); setToggleConfirm(u); }}
                        >
                          {u.isActive ? "ë¹„í™œ?? : "?œì„±"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-app-danger hover:bg-app-danger-muted/20"
                          onClick={(e) => { e.stopPropagation(); setDeletePhone(u.phone); setDeleteConfirmOpen(true); }}
                          title="?¬ìš©???? œ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        accent="violet"
        title={<div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-400" /> ì¶”ì²œ/ì´íŒ ì»¤ë????´ì˜</div>}
        description="?€ê¸?ì¤?ì»¤ë??˜ì„ ê²€? í•˜ê³?ì§€ê¸?ì²˜ë¦¬?©ë‹ˆ??"
      >
        <div className="mb-3 flex items-center gap-2">
          <Select value={commissionStatusFilter} onChange={(e) => setCommissionStatusFilter(e.target.value as typeof commissionStatusFilter)}>
            <option value="all">?„ì²´</option>
            <option value="pending">?€ê¸?/option>
            <option value="paid">ì§€ê¸‰ì™„ë£?/option>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => void loadCommissions()} disabled={commissionLoading}>?ˆë¡œê³ ì¹¨</Button>
        </div>
        {commissionLoading && <p className="text-xs text-app-text-muted">ë¶ˆëŸ¬?¤ëŠ” ì¤?..</p>}
        {!commissionLoading && commissions.length === 0 && <EmptyState icon={TrendingUp} title="ì»¤ë????°ì´???†ìŒ" />}
        {!commissionLoading && commissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-2 py-2 text-left">?íƒœ</th>
                  <th className="px-2 py-2 text-left">ê¸ˆì•¡</th>
                  <th className="px-2 py-2 text-left">Rate</th>
                  <th className="px-2 py-2 text-left">ì§€ê¸?TX</th>
                  <th className="px-2 py-2 text-right">?‘ì—…</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {commissions.map((c) => (
                  <tr key={c.id}>
                    <td className="px-2 py-2">
                      <Badge tone={c.status === "pending" ? "warning" : "success"}>{c.status}</Badge>
                    </td>
                    <td className="px-2 py-2">{(c.amount_cents / 100).toLocaleString()} USDT</td>
                    <td className="px-2 py-2">{(c.rate * 100).toFixed(1)}%</td>
                    <td className="px-2 py-2">
                      {c.status === "pending" ? (
                        <Input
                          value={commissionTxDrafts[c.id] ?? ""}
                          onChange={(e) => setCommissionTxDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="ì§€ê¸?TX ID (? íƒ)"
                          className="w-52"
                        />
                      ) : (
                        <span className="text-app-text-muted">{c.payment_tx_id ?? "-"}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {c.status === "pending" ? (
                        <Button size="sm" onClick={() => void handleApproveCommission(c.id)}>ì§€ê¸??¹ì¸</Button>
                      ) : (
                        <span className="text-app-text-muted">?„ë£Œ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        accent="indigo"
        title={<div className="flex items-center gap-2"><Search className="h-4 w-4 text-slate-400" /> ê´€ë¦¬ì ê°ì‚¬ë¡œê·¸</div>}
        description="ê³ ìœ„???‘ì—… ì¶”ì ??ìµœê·¼ ê°ì‚¬ ?´ë²¤?¸ì…?ˆë‹¤."
      >
        <div className="mb-2 flex items-center justify-end">
          <Button size="sm" variant="ghost" onClick={() => void loadAuditLogs()} disabled={auditLoading}>?ˆë¡œê³ ì¹¨</Button>
        </div>
        {auditLoading && <p className="text-xs text-app-text-muted">ë¶ˆëŸ¬?¤ëŠ” ì¤?..</p>}
        {!auditLoading && auditLogs.length === 0 && <EmptyState icon={Search} title="ê°ì‚¬ë¡œê·¸ ?†ìŒ" />}
        {!auditLoading && auditLogs.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-app-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-app-card">
                <tr className="border-b border-app-border text-app-text-muted">
                  <th className="px-2 py-2 text-left">?œê°„</th>
                  <th className="px-2 py-2 text-left">?¡ì…˜</th>
                  <th className="px-2 py-2 text-left">?€??/th>
                  <th className="px-2 py-2 text-left">ë©”ëª¨</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-2 py-2 text-app-text-muted">{formatDateTime(log.created_at)}</td>
                    <td className="px-2 py-2"><Badge tone="info">{log.action}</Badge></td>
                    <td className="px-2 py-2">{log.target_phone ?? log.target_id ?? "-"}</td>
                    <td className="px-2 py-2 text-app-text-muted">{log.memo ?? log.detail ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelectedUser(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-app-border bg-app-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-app-text">?¬ìš©??360 ?ì„¸</h2>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>?«ê¸°</Button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-xs text-app-text-muted">?„í™”ë²ˆí˜¸</p>
                <p className="mt-1 font-semibold text-app-text">{selectedUser.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">?Œëœ</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.plan ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">êµ¬ë… ?íƒœ</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.subscriptionStatus ?? "-"}</p>
                </div>
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">?°ê²° ê³„ì • ??/p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.accountCount}</p>
                </div>
                <div className="rounded-xl border border-app-border bg-app-bg p-3">
                  <p className="text-xs text-app-text-muted">Stars ?”ì•¡</p>
                  <p className="mt-1 font-semibold text-app-text">{selectedUser.starsBalance}</p>
                </div>
              </div>
              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-xs text-app-text-muted">ê°€?…ì¼</p>
                <p className="mt-1 text-app-text">{formatDateTime(selectedUser.createdAt)}</p>
                <p className="mt-2 text-xs text-app-text-muted">ìµœê·¼ ë¡œê·¸??/p>
                <p className="mt-1 text-app-text">{selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : "ë¡œê·¸???´ë ¥ ?†ìŒ"}</p>
                <p className="mt-2 text-xs text-app-text-muted">?¸ë¼?´ì–¼ ë§Œë£Œ</p>
                <p className="mt-1 text-app-text">{selectedUser.trialExpiresAt ? formatDateTime(selectedUser.trialExpiresAt) : "-"}</p>
                <p className="mt-2 text-xs text-app-text-muted">?´ì˜ ë¦¬ìŠ¤??/p>
                <div className="mt-1">
                  {getRiskLevel(selectedUser) === "high" && <Badge tone="danger">?’ìŒ</Badge>}
                  {getRiskLevel(selectedUser) === "warning" && <Badge tone="warning">ì£¼ì˜</Badge>}
                  {getRiskLevel(selectedUser) === "normal" && <Badge tone="success">?•ìƒ</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant={selectedUser.isActive ? "danger" : "primary"}
                  onClick={() => {
                    setToggleConfirm(selectedUser);
                  }}
                >
                  {selectedUser.isActive ? "ë¹„í™œ?±í™”" : "?œì„±??}
                </Button>
                <Button variant="secondary" onClick={() => handleReissue(selectedUser)}>API ???¬ë°œê¸?/Button>
              </div>

              <div className="rounded-xl border border-app-border bg-app-bg p-3">
                <p className="text-sm font-semibold text-app-text">ê²°ì œ/?Œëœ ?´ì˜</p>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <Select value={billingPlan} onChange={(e) => setBillingPlan(e.target.value as typeof billingPlan)}>
                    <option value="keep">?Œëœ ë³€ê²??ˆí•¨</option>
                    <option value="free">ë¬´ë£Œë¡?ë³€ê²?/option>
                    <option value="pro">?„ë¡œë¡?ë³€ê²?/option>
                    <option value="team">?€?¼ë¡œ ë³€ê²?/option>
                  </Select>
                  <Select value={billingSubscription} onChange={(e) => setBillingSubscription(e.target.value as typeof billingSubscription)}>
                    <option value="keep">êµ¬ë…?íƒœ ë³€ê²??ˆí•¨</option>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="pending">pending</option>
                    <option value="past_due">past_due</option>
                    <option value="canceled">canceled</option>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={extendTrialDays}
                    onChange={(e) => setExtendTrialDays(Number(e.target.value || 0))}
                    placeholder="?¸ë¼?´ì–¼ ?°ì¥ ?¼ìˆ˜"
                  />
                  <Button onClick={handleBillingUpdate} loading={billingLoading} disabled={billingLoading}>ê²°ì œ/?Œëœ ë°˜ì˜</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmUser}
        title="API ???¬ë°œê¸?
        description={confirmUser ? `${confirmUser.phone} ?¬ìš©?ì˜ API ?¤ë? ?¬ë°œê¸‰í•˜ë©?ê¸°ì¡´ ?¤ëŠ” ì¦‰ì‹œ ë¬´íš¨?”ë©?ˆë‹¤. ê³„ì†? ê¹Œ??` : ""}
        variant="danger"
        confirmLabel="?¬ë°œê¸?
        onConfirm={handleConfirmReissue}
        onCancel={() => setConfirmUser(null)}
      />
      <ConfirmDialog
        open={deleteConfirmOpen && !!deletePhone}
        title="?¬ìš©???? œ"
        description={`"${deletePhone}" ?????¬ìš©?ì? ?°ê²°??Tenant, ?¸ì…˜???êµ¬ ?? œ?©ë‹ˆ??`}
        variant="danger"
        confirmLabel="?êµ¬ ?? œ"
        onConfirm={async () => {
          const phone = deletePhone;
          setDeleteConfirmOpen(false);
          setDeletePhone(null);
          if (!phone) return;
          requestHighRiskAction({ kind: "delete_user", phone });
        }}
        onCancel={() => { setDeleteConfirmOpen(false); setDeletePhone(null); }}
      />
      <ConfirmDialog
        open={!!toggleConfirm}
        title={toggleConfirm?.isActive ? "?¬ìš©??ë¹„í™œ?±í™”" : "?¬ìš©???œì„±??}
        description={toggleConfirm ? `"${toggleConfirm.phone}" ?¬ìš©?ë? ${toggleConfirm.isActive ? "ë¹„í™œ?±í™”" : "?œì„±??}?˜ì‹œê² ìŠµ?ˆê¹Œ?` : ""}
        variant={toggleConfirm?.isActive ? "danger" : "default"}
        confirmLabel={toggleConfirm?.isActive ? "ë¹„í™œ?±í™”" : "?œì„±??}
        onConfirm={() => { const u = toggleConfirm; setToggleConfirm(null); if (u) handleToggle(u); }}
        onCancel={() => setToggleConfirm(null)}
      />

      <Modal
        open={!!highRiskAction}
        onClose={() => { if (!highRiskSubmitting) setHighRiskAction(null); }}
        title="ê³ ìœ„???‘ì—… 2?¨ê³„ ?¹ì¸"
        description={highRiskAction?.kind === "bulk_deactivate"
          ? "? íƒ ?¬ìš©???¼ê´„ ë¹„í™œ?±í™” ?? ?•ì¸ ë¬¸êµ¬ë¥??…ë ¥?´ì£¼?¸ìš”."
          : `"${highRiskAction?.phone}" ?¬ìš©???êµ¬ ?? œ ?? ?•ì¸ ë¬¸êµ¬ë¥??…ë ¥?´ì£¼?¸ìš”.`}
        size="sm"
        preventClose={highRiskSubmitting}
        footer={
          <>
            <Button variant="ghost" onClick={() => setHighRiskAction(null)} disabled={highRiskSubmitting}>ì·¨ì†Œ</Button>
            <Button variant="danger" onClick={() => void executeHighRiskAction()} loading={highRiskSubmitting}>?¤í–‰</Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-xs text-app-text-muted">
            ?•ì¸ ë¬¸êµ¬: <span className="font-semibold text-app-text">{highRiskAction?.kind === "bulk_deactivate" ? "DEACTIVATE" : "DELETE"}</span>
          </p>
          <Input value={highRiskPhrase} onChange={(e) => setHighRiskPhrase(e.target.value)} placeholder="?•ì¸ ë¬¸êµ¬ ?…ë ¥" />
        </div>
      </Modal>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AdminGuard requireAdmin>
      <UsersContent />
    </AdminGuard>
  );
}