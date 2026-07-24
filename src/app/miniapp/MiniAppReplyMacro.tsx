"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronUp, Clock, ToggleLeft, ToggleRight, Users, MessageSquare, AlertCircle, X } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import * as api from "@/lib/api";
import { useToastStore } from "@/components/ui/GlobalToast";
import { GradientToggle } from "@/components/ui/GradientToggle";
import type { ReplyMacro } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface ToggleState {
  is_active: boolean;
  message_content: string;
  today_count: number;
  last_sent_at: string | null;
}

export const MiniAppReplyMacro = memo(function MiniAppReplyMacro() {
  const toast = useToastStore(s => s.add);

  const [accounts, setAccounts] = useState<{ id: string; phone: string }[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccts, setLoadingAccts] = useState(true);

  const [toggle, setToggle] = useState<ToggleState>({ is_active: false, message_content: "", today_count: 0, last_sent_at: null });
  const [toggleLoading, setToggleLoading] = useState(false);
  const [toggleSaving, setToggleSaving] = useState(false);

  const [macros, setMacros] = useState<ReplyMacro[]>([]);
  const [macrosLoading, setMacrosLoading] = useState(false);

  const [editingMacro, setEditingMacro] = useState<ReplyMacro | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const [expandedMacroId, setExpandedMacroId] = useState<string | null>(null);

  useEffect(() => {
    api.fetchAccounts().then(list => {
      const active = list.filter((a: any) => a.status === "active").map((a: any) => ({ id: a.id, phone: a.phone }));
      setAccounts(active);
      if (active.length > 0) setSelectedAccountId(active[0].id);
      setLoadingAccts(false);
    }).catch(() => setLoadingAccts(false));
  }, []);

  const fetchToggle = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setToggleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${accountId}/reply-macros/toggle`, { headers: api.authHeaders() });
      const data = await res.json();
      setToggle({ is_active: !!data.is_active, message_content: data.message_content || "", today_count: data.today_count ?? 0, last_sent_at: data.last_sent_at ?? null });
    } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) } finally { setToggleLoading(false); }
  }, []);

  const fetchMacros = useCallback(async (accountId: string) => {
    if (!accountId) return;
    setMacrosLoading(true);
    try {
      const list = await api.fetchReplyMacros(accountId);
      setMacros(list || []);
    } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) } finally { setMacrosLoading(false); }
  }, []);

  useEffect(() => {
    if (!selectedAccountId) return;
    fetchToggle(selectedAccountId);
    fetchMacros(selectedAccountId);
  }, [selectedAccountId, fetchToggle, fetchMacros]);

  const saveToggle = useCallback(async (nextActive: boolean) => {
    if (!selectedAccountId || toggleSaving) return;
    setToggleSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/toggle`, {
        method: "PUT",
        headers: { ...await api.authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive, message_content: toggle.message_content }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ type: "error", title: "?�???�패", message: data.detail || "" }); return; }
      setToggle(prev => ({ ...prev, is_active: !!data.is_active }));
      try { hapticFeedback.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) }
      toast({ type: "success", title: nextActive ? "?�덤 ?�장 켜짐" : "?�덤 ?�장 꺼짐" });
    } catch { toast({ type: "error", title: "?�트?�크 ?�류" }); }
    finally { setToggleSaving(false); }
  }, [selectedAccountId, toggle.message_content, toggleSaving, toast]);

  const handleSaveMessage = useCallback(async () => {
    if (!selectedAccountId || toggleSaving) return;
    setToggleSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/accounts/${selectedAccountId}/reply-macros/toggle`, {
        method: "PUT",
        headers: { ...await api.authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: toggle.is_active, message_content: toggle.message_content }),
      });
      const data = await res.json();
      if (res.ok) {
        setToggle(prev => ({ ...prev, message_content: data.message_content || "" }));
        try { hapticFeedback.notificationOccurred("success"); } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) }
        toast({ type: "success", title: "메시지 ?�?�됨" });
      }
    } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) }
    finally { setToggleSaving(false); }
  }, [selectedAccountId, toggle.is_active, toggle.message_content, toggleSaving, toast]);

  const handleCreateMacro = useCallback(async () => {
    if (!selectedAccountId || !formName.trim() || !formMessage.trim() || formSaving) return;
    setFormSaving(true);
    try {
      if (editingMacro) {
        await api.updateReplyMacro(selectedAccountId, editingMacro.id, { name: formName.trim(), messageContent: formMessage.trim() });
        toast({ type: "success", title: "매크�??�정?? });
      } else {
        await api.createReplyMacro(selectedAccountId, { name: formName.trim(), messageContent: formMessage.trim(), targetChats: [], scheduleType: "interval", intervalHours: 24, maxSendsPerDay: 10 });
        toast({ type: "success", title: "매크�??�성?? });
      }
      try { hapticFeedback.notificationOccurred("success"); } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) }
      setShowForm(false);
      setEditingMacro(null);
      setFormName("");
      setFormMessage("");
      fetchMacros(selectedAccountId);
    } catch { toast({ type: "error", title: "?�???�패" }); }
    finally { setFormSaving(false); }
  }, [selectedAccountId, formName, formMessage, editingMacro, formSaving, toast, fetchMacros]);

  const handleDeleteMacro = useCallback(async (macroId: string) => {
    if (!selectedAccountId) return;
    try {
      await api.deleteReplyMacro(selectedAccountId, macroId);
      try { hapticFeedback.impactOccurred("medium"); } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) }
      toast({ type: "success", title: "매크�???��?? });
      fetchMacros(selectedAccountId);
    } catch { toast({ type: "error", title: "??�� ?�패" }); }
  }, [selectedAccountId, toast, fetchMacros]);

  const startEditMacro = useCallback((macro: ReplyMacro) => {
    setEditingMacro(macro);
    setFormName(macro.name);
    setFormMessage(macro.messageContent);
    setShowForm(true);
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setEditingMacro(null);
    setFormName("");
    setFormMessage("");
  }, []);

  return (
    <div className="p-4 pb-8 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>?�덤 ?�장</p>
        <span className="text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>Reply Macro</span>
      </div>

      {/* Account selector */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color)" }}>
          <Users className="h-3 w-3" /> 계정
        </label>
        {loadingAccts ? (
          <div className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }} />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {accounts.map(a => (
              <button key={a.id} onClick={() => { setSelectedAccountId(a.id); try { hapticFeedback.impactOccurred("light"); } catch (e) { console.warn('Unhandled error in MiniAppReplyMacro', e) } }}
                className="rounded-full px-3 py-2 text-[11px] font-medium active:scale-95"
                style={{ backgroundColor: selectedAccountId === a.id ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-secondary-bg-color, #232e3c)", color: selectedAccountId === a.id ? "#fff" : "var(--tg-theme-text-color)" }}>
                {a.phone}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAccountId && (
        <>
          {/* Global toggle + message editor */}
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${toggle.is_active ? "bg-emerald-500" : "bg-gray-500"}`} />
                <span className="text-sm font-medium" style={{ color: "var(--tg-theme-text-color)" }}>
                  {toggle.is_active ? "켜짐 ???�동 ?�행 �? : "꺼짐"}
                </span>
              </div>
              <GradientToggle
                checked={toggle.is_active}
                onChange={(next) => saveToggle(next)}
                disabled={toggleSaving}
              />
            </div>

            {toggleLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--tg-theme-hint-color)" }} /></div>
            ) : (
              <>
                <textarea
                  value={toggle.message_content}
                  onChange={(e) => setToggle(prev => ({ ...prev, message_content: e.target.value }))}
                  placeholder="?�장?�로 보낼 메시지�??�력?�세??
                  rows={3}
                  disabled={toggleSaving}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
                    {toggle.last_sent_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> 마�?�? {new Date(toggle.last_sent_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {toggle.today_count > 0 && (
                      <span>?�늘 {toggle.today_count}??/span>
                    )}
                  </div>
                  <button onClick={handleSaveMessage} disabled={toggleSaving}
                    className="rounded-lg px-3 py-1.5 text-[11px] font-medium active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
                    {toggleSaving ? "?�??�?.." : "메시지 ?�??}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Macro rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: "var(--tg-theme-hint-color)" }}>매크�?규칙 ({macros.length})</span>
              <button onClick={() => { setShowForm(true); setEditingMacro(null); setFormName(""); setFormMessage(""); }}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium active:scale-95"
                style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
                <Plus className="h-3 w-3" /> 추�?
              </button>
            </div>

            {macrosLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--tg-theme-hint-color)" }} /></div>
            ) : macros.length === 0 && !showForm ? (
              <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
                <p className="text-xs" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>?�록??매크로�? ?�습?�다.</p>
                <p className="text-[10px] mt-1" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>??메시지 ?�????추�? 버튼?�로 규칙??만드?�요.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {macros.map(macro => (
                  <motion.div key={macro.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl overflow-hidden"
                    style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
                    <button onClick={() => setExpandedMacroId(expandedMacroId === macro.id ? null : macro.id)}
                      className="flex w-full items-center justify-between px-4 py-3 active:scale-[0.99]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Zap className={`h-4 w-4 shrink-0 ${macro.isActive ? "text-emerald-400" : "opacity-40"}`} />
                        <span className="text-sm font-medium truncate" style={{ color: "var(--tg-theme-text-color)" }}>{macro.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); startEditMacro(macro); }}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90"
                          style={{ color: "var(--tg-theme-hint-color, #708499)" }} aria-label="?�정">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteMacro(macro.id); }}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90"
                          style={{ color: "var(--tg-theme-destructive-text-color, #ec3942)" }} aria-label="??��">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {expandedMacroId === macro.id ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedMacroId === macro.id && (
                        <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-3 space-y-2 border-t pt-2" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--tg-theme-text-color)" }}>{macro.messageContent}</p>
                            <div className="flex flex-wrap gap-2 text-[10px]" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {macro.intervalHours}?�간 간격</span>
                              <span>최�? {macro.maxSendsPerDay}????/span>
                              {macro.lastSentAt && <span>마�?�??�송: {new Date(macro.lastSentAt).toLocaleString("ko-KR")}</span>}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Create/Edit form */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--tg-theme-text-color)" }}>
                    {editingMacro ? "매크�??�정" : "??매크�?}
                  </span>
                  <button onClick={cancelForm} className="flex min-h-11 min-w-11 items-center justify-center rounded-full active:scale-90"
                    aria-label="?�기"><X className="h-4 w-4" /></button>
                </div>

                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="매크�??�름"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}
                />
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="보낼 메시지 ?�용"
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
                  style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}
                />

                <button onClick={handleCreateMacro} disabled={!formName.trim() || !formMessage.trim() || formSaving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}>
                  {formSaving ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> ?�??�?..</>
                  ) : editingMacro ? "?�정 ?�료" : "?�성?�기"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {!selectedAccountId && !loadingAccts && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color, #708499)" }}>
          <AlertCircle className="h-3.5 w-3.5" /> ?�성 계정???�습?�다. ?�로????��??계정???�결?�세??
        </div>
      )}
    </div>
  );
});
