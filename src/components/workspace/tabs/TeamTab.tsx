"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users, UserPlus, UserMinus, Shield, ShieldAlert, ShieldCheck, ChevronDown, Search, X, Copy, Check, Loader2 } from "lucide-react";
import { fetchAuthMe, request } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useFocusTrap } from "@/hooks/useFocusTrap";

// ?Ä?Ä?Ä Types ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä

interface TeamMember {
  id: string;
  tenant_id: string;
  username: string;
  display_name: string | null;
  phone: string | null;
  role: "owner" | "admin" | "member";
  is_active: boolean;
  invited_by: string | null;
  invite_token: string | null;
  invited_at: string | null;
  joined_at: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface TeamMemberListResponse {
  items: TeamMember[];
  total: number;
}

type RoleBadge = "owner" | "admin" | "member";

// ?Ä?Ä?Ä Helpers ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä

const ROLE_LABELS: Record<RoleBadge, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

const ROLE_COLORS: Record<RoleBadge, string> = {
  owner: "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800",
  admin: "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800",
  member: "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800/20 dark:border-gray-700",
};

const ROLE_ICONS: Record<RoleBadge, React.ComponentType<{ className?: string }>> = {
  owner: ShieldAlert,
  admin: ShieldCheck,
  member: Shield,
};

function RoleBadge({ role }: { role: RoleBadge }) {
  const Icon = ROLE_ICONS[role];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", ROLE_COLORS[role])}>
      <Icon className="h-3 w-3" />
      {ROLE_LABELS[role]}
    </span>
  );
}

function getTenantId(): string | null {
  try {
        const stored = localStorage.getItem("telemon-tenant-id");
    if (stored) return stored;
    // Fallback: decode JWT from token
    const token = localStorage.getItem("telemon_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.tenant_id || null;
    }
    return null;
  } catch {
    return null;
  }
}

// ?Ä?Ä?Ä Main Component ?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä?Ä

export function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const inviteRef = useRef<HTMLDivElement>(null);

  useFocusTrap(inviteRef, showInviteModal, () => setShowInviteModal(false));

  const fetchMembers = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await request<TeamMemberListResponse>(`/api/tenants/${tenantId}/team/members${qs}`);
      setMembers(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Î©§Î≤Ñ Î™©Î°ù??Î∂àÎü¨?§Îäî???§Ìå®?àÏäµ?àÎã§.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, search]);

  useEffect(() => {
    const tid = getTenantId();
    if (!tid) {
      // Try to resolve tenant_id from /api/auth/me
      fetchAuthMe().then(() => {
    const stored = localStorage.getItem("telemon-tenant-id");
        if (stored) setTenantId(stored);
      }).catch(() => {
        setError("?åÎÑå???ïÎ≥¥Î•?Ï∞æÏùÑ ???ÜÏäµ?àÎã§. Î°úÍ∑∏?????§Ïãú ?úÎùÑ?¥Ï£º?∏Ïöî.");
        setLoading(false);
      });
    } else {
      setTenantId(tid);
    }
  }, []);

  useEffect(() => {
    if (tenantId) fetchMembers();
  }, [tenantId, fetchMembers]);

  const handleInvite = async () => {
    if (!tenantId || !inviteUsername.trim()) return;
    setInviting(true);
    try {
      const result = await request<TeamMember>(`/api/tenants/${tenantId}/team/invite`, {
        method: "POST",
        body: JSON.stringify({ username: inviteUsername.trim(), role: inviteRole }),
      });
      setCopiedToken(result.invite_token ?? null);
      setShowInviteModal(false);
      setInviteUsername("");
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ï¥àÎ????§Ìå®?àÏäµ?àÎã§.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!tenantId) return;
    const member = members.find((m) => m.id === memberId);
    if (member) setDeleteTarget(member);
  };

  const confirmRemoveMember = async () => {
    if (!tenantId || !deleteTarget) return;
    try {
      await request(`/api/tenants/${tenantId}/team/members/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Î©§Î≤Ñ ?úÍ±∞???§Ìå®?àÏäµ?àÎã§.");
      setDeleteTarget(null);
    }
  };

  const handleRoleChange = async (memberId: string, role: "admin" | "member") => {
    if (!tenantId) return;
    try {
      await request<TeamMember>(`/api/tenants/${tenantId}/team/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "??ï† Î≥ÄÍ≤ΩÏóù ?§Ìå®?àÏäµ?àÎã§.");
    }
  };

  const copyInviteLink = async () => {
    if (!copiedToken) return;
    const link = `${window.location.origin}/invite?token=${copiedToken}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2000);
    }
  };

  if (!tenantId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-app-text-muted">
          <Users className="mx-auto mb-3 h-12 w-12 opacity-40" />
          <p className="text-sm">?åÎÑå???ïÎ≥¥Î•?Î∂àÎü¨?§Îäî Ï§?..</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">?Ä Í¥ÄÎ¶?/h2>
          <p className="text-sm text-app-text-muted">Ï¥?{total}Î™ÖÏùò Î©§Î≤Ñ</p>
        </div>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="focus-ring flex items-center gap-2 rounded-lg bg-app-primary px-4 py-2 text-sm font-medium text-white hover:bg-app-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Î©§Î≤Ñ Ï¥àÎ?
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
        <input
          type="text"
          placeholder="Î©§Î≤Ñ Í≤Ä??.."
          aria-label="Î©§Î≤Ñ Í≤Ä??
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="focus-ring w-full rounded-lg border border-app-border bg-app-surface py-2 pl-10 pr-4 text-sm text-app-text placeholder:text-app-text-muted"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Í≤Ä??ÏßÄ?∞Í∏∞"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">?´Í∏∞</button>
        </div>
      )}

      {/* Invite Token Copy */}
      {copiedToken && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="mb-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            ??Ï¥àÎ?Í∞Ä ?ùÏÑ±?òÏóà?µÎãà?? ?ÑÎûò ÎßùÌù¨Î•???Î©§Î≤Ñ?ùÍ≤å Í≥µÏú†?¥Ï£º?∏Ïöî.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-3 py-2 text-xs font-mono text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              {window.location.origin}/invite?token={copiedToken}
            </code>
            <button
              type="button"
              onClick={copyInviteLink}
              className="focus-ring flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              {copiedFeedback ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedFeedback ? "Î≥µÏÇ¨?? : "Î≥µÏÇ¨"}
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-app-text-muted" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-app-border py-16">
          <Users className="mb-3 h-10 w-10 text-app-text-muted/40" />
          <p className="text-sm text-app-text-muted">?ÑÏßù ?Ä Î©§Î≤ÑÍ∞Ä ?ÜÏäµ?àÎã§.</p>
          <p className="text-xs text-app-text-muted/60 mt-1">Î©§Î≤ÑÎ•?Ï¥àÎ??òÏó¨ ?Ä??Íµ¨ÏÑ±?¥Î≥¥?∏Ïöî.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface p-4 transition-colors hover:bg-app-surface/80"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-app-primary/10 text-sm font-semibold text-app-primary">
                  {(member.display_name || member.username).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-app-text">{member.display_name || member.username}</span>
                    <RoleBadge role={member.role as RoleBadge} />
                    {!member.is_active && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        Ï¥àÎ? ?ÄÍ∏?
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-app-text-muted">
                    {member.phone && <span>{member.phone}</span>}
                    <span>@{member.username}</span>
                    {member.joined_at && (
                      <span>Í∞Ä?? {new Date(member.joined_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {member.role !== "owner" && (
                  <>
                    {/* Role dropdown */}
                    <div className="relative group">
                      <button
                        type="button"
                        className="focus-ring flex items-center gap-1 rounded-lg border border-app-border px-2.5 py-1.5 text-xs font-medium text-app-text-muted hover:text-app-text hover:bg-app-surface/80"
                      >
                        {ROLE_LABELS[member.role as RoleBadge]}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="absolute right-0 top-full z-10 mt-1 hidden w-32 rounded-lg border border-app-border bg-app-surface shadow-lg group-hover:block">
                        <button
                          type="button"
                          onClick={() => handleRoleChange(member.id, "admin")}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-app-text hover:bg-app-surface/80"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                          Admin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRoleChange(member.id, "member")}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-app-text hover:bg-app-surface/80"
                        >
                          <Shield className="h-3.5 w-3.5 text-gray-500" />
                          Member
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="focus-ring flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      ?úÍ±∞
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="Î©§Î≤Ñ ?úÍ±∞"
          description={`?ïÎßùÎ°?"${deleteTarget.display_name || deleteTarget.username}" Î©§Î≤ÑÎ•??Ä?ùÏÑú ?úÍ±∞?òÏãúÍ≤†Ïäµ?àÍπå?`}
          confirmLabel="?úÍ±∞"
          cancelLabel="Ï∑®ÏÜå"
          variant="danger"
          onConfirm={confirmRemoveMember}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" aria-hidden="true">
          <div
            ref={inviteRef}
            role="dialog"
            aria-modal="true"
            aria-label="Î©§Î≤Ñ Ï¥àÎ?"
            className="w-full max-w-md rounded-xl bg-app-surface p-6 shadow-2xl mx-auto max-h-[85dvh] overflow-y-auto"
          >
            <h3 className="mb-4 text-base font-semibold text-app-text">Î©§Î≤Ñ Ï¥àÎ?</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-app-text-muted">?¨Ïö©?ùÎ™Ö</label>
                <input
                  type="text"
                  placeholder="Ï¥àÎ???Î©§Î≤Ñ???¨Ïö©?ùÎ™Ö"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-text-muted"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-app-text-muted">Í∂åÌïú</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                  className="focus-ring w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text"
                >
                  <option value="member">Member - ?¥Ïòù Í∏∞Îä• ?¨Ïö©</option>
                  <option value="admin">Admin - ?Ä Í¥ÄÎ¶?+ ?¥Ïòù</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-app-text-muted hover:text-app-text"
                >
                  Ï∑®ÏÜå
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={inviting || !inviteUsername.trim()}
                  className="focus-ring flex items-center gap-2 rounded-lg bg-app-primary px-4 py-2 text-sm font-medium text-white hover:bg-app-primary/90 disabled:opacity-50"
                >
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Ï¥àÎ? Î≥¥ÎÇ¥Í∏?
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}