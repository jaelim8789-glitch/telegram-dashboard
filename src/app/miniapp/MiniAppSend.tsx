"use client";

import { useState, memo, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, CheckCircle, Users, ChevronDown, AlertCircle, Image, Camera, X, Info } from "lucide-react";
import { hapticFeedback } from "@tma.js/sdk-react";
import * as api from "@/lib/api";
import { quickSendToTopGroups } from "@/lib/api-miniapp";
import { useToastStore } from "@/components/ui/GlobalToast";
import { useAutoDraft } from "@/hooks/useAutoDraft";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ConfirmAction, useConfirmAction } from "@/components/ui/ConfirmAction";
import { SuccessPredictorBadge } from "@/hooks/useSuccessPredictor";
import { useSwipeTemplate } from "@/hooks/useSwipeTemplate";
import { SmartKeyboardToolbar } from "@/components/ui/SmartKeyboardToolbar";
import { cn } from "@/lib/cn";
import { useAccountStateStore } from "@/store/useAccountStateStore";

interface MiniAppSendProps { user?: { id: number; first_name?: string; last_name?: string; username?: string }; }

const MAX_CHARS = 4096;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const MiniAppSend = memo(function MiniAppSend({ user }: MiniAppSendProps) {
  const toast = useToastStore(s => s.add);
  const { confirm, ConfirmDialog } = useConfirmAction();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; phone: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<{ id: string; title: string }[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loadingAccts, setLoadingAccts] = useState(true);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draft = useAutoDraft("miniapp-send-message");
  
  // 계정 상태 관리
  const { 
    getCurrentAccountState, 
    updateAccountState,
    switchAccount 
  } = useAccountStateStore();

  // Image attachment
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reply macro
  const [replyMacroActive, setReplyMacroActive] = useState(false);
  const [replyMacroMessage, setReplyMacroMessage] = useState("");
  const [replyMacroLoading, setReplyMacroLoading] = useState(false);
  
  // Smart keyboard toolbar
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [templates] = useState([
    { id: '1', name: '기본 인사', content: '안녕하세요, 잘 부탁드립니다.' },
    { id: '2', name: '업무 안내', content: '업무시간은 평일 09:00~18:00입니다.' },
    { id: '3', name: '감사 인사', content: '항상 감사합니다.' },
  ]);
  const [recentMessages, setRecentMessages] = useState<string[]>([]);

  // Swipe template functionality
  const { attachSwipeListeners } = useSwipeTemplate({
    templates: templates.map(t => t.content),
    recentMessages,
    onTemplateSelect: (template: string) => setMessage(prev => prev + template),
    onRecentMessageSelect: (recentMsg: string) => setMessage(prev => prev + recentMsg)
  });

  // 계정 상태 동기화
  useEffect(() => {
    // 계정 목록 로드 후 상태 초기화
    api.fetchAccounts().then(list => {
      const active = list.filter((a: any) => a.status === "active").map((a: any) => ({ id: a.id, phone: a.phone }));
      setAccounts(active);
      
      // 상태 저장소에 계정 정보 등록
      active.forEach(account => {
        useAccountStateStore.getState().initializeAccountState(account.id);
      });
      
      if (active.length > 0) {
        // 이전에 선택한 계정이 있다면 복원, 없으면 첫 번째 계정 선택
        const firstAccountId = active[0].id;
        const currentState = useAccountStateStore.getState();
        const storedState = currentState.getAccountState(firstAccountId);
        
        setSelectedAccountIds([firstAccountId]);
        currentState.switchAccount(firstAccountId);
        
        // 저장된 메시지 상태 복원
        if (storedState?.lastMessage) {
          setMessage(storedState.lastMessage);
        }
        
        // 저장된 그룹 상태 복원
        if (storedState?.selectedGroups) {
          setSelectedGroupIds(storedState.selectedGroups);
        }
      }
      setLoadingAccts(false);
    }).catch(() => setLoadingAccts(false));
  }, []);

  // 선택된 계정이 변경될 때 상태 업데이트
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      const accountId = selectedAccountIds[0];
      // 계정 전환
      switchAccount(accountId);
      
      // 현재 계정 상태 가져오기
      const currentAccountState = getCurrentAccountState();
      if (currentAccountState) {
        setMessage(currentAccountState.lastMessage);
        setSelectedGroupIds(currentAccountState.selectedGroups);
        setReplyMacroActive(currentAccountState.autoReplyEnabled);
        setReplyMacroMessage(currentAccountState.autoReplyMessage);
      }
    }
  }, [selectedAccountIds, switchAccount, getCurrentAccountState]);

  useEffect(() => {
    const aid = selectedAccountIds[0];
    if (!aid) return;
    api.fetchGroups(aid).then((list: any[]) => setGroups(list || [])).catch(() => setGroups([]));
  }, [selectedAccountIds]);

  // Fetch reply macro state for selected account
  useEffect(() => {
    const aid = selectedAccountIds[0];
    if (!aid) return;
    setReplyMacroLoading(true);
    fetch(`${API_BASE}/api/accounts/${aid}/reply-macros/toggle`, { headers: api.authHeaders() })
      .then(r => r.json())
      .then(data => {
        setReplyMacroActive(!!data.is_active);
        setReplyMacroMessage(data.message_content || "");
      })
      .catch(() => {})
      .finally(() => setReplyMacroLoading(false));
  }, [selectedAccountIds]);

  // Image preview cleanup
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreviewUrl(null);
    }
  }, [imageFile]);

  // 메시지 변경 시 계정 상태 업데이트
  useEffect(() => {
    if (selectedAccountIds.length > 0) {
      const accountId = selectedAccountIds[0];
      updateAccountState(accountId, {
        lastMessage: message,
        selectedGroups: selectedGroupIds,
        autoReplyEnabled: replyMacroActive,
        autoReplyMessage: replyMacroMessage
      });
    }
  }, [message, selectedGroupIds, replyMacroActive, replyMacroMessage, selectedAccountIds, updateAccountState]);

  const handlePickImage = useCallback((capture: boolean) => {
    const input = capture ? cameraInputRef.current : fileInputRef.current;
    if (input) input.click();
  }, []);

  const handleImageSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImageFile(f);
    e.target.value = "";
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
  }, []);

  const handleSend = useCallback(async () => {
    if ((!message.trim() && !imageFile) || sending || selectedAccountIds.length === 0) return;
    setSending(true); setError("");
    let success = 0, failed = 0;

    for (const accountId of selectedAccountIds) {
      try {
        if (selectedGroupIds.length > 0) {
          const form = new FormData();
          form.append("account_id", accountId);
          form.append("message", message.trim() || "");
          form.append("recipients", JSON.stringify(selectedGroupIds));
          if (imageFile) form.append("image", imageFile);
          const { request } = await import("@/lib/api");
          await request("/api/broadcast", { method: "POST", body: form });
        } else {
          if (imageFile) {
            // With image, use manual per-group send
            const { request } = await import("@/lib/api");
            const topGroups = await api.fetchGroups(accountId);
            const groupIds = topGroups.slice(0, 5).map((g: any) => g.id);
            if (groupIds.length === 0) throw new Error("연결된 그룹이 없습니다");
            const form = new FormData();
            form.append("account_id", accountId);
            form.append("message", message.trim() || "");
            form.append("recipients", JSON.stringify(groupIds));
            if (imageFile) form.append("image", imageFile);
            await request("/api/broadcast", { method: "POST", body: form });
          } else {
            const result = await quickSendToTopGroups(accountId, message.trim(), 5);
            if (!result.success) throw new Error(result.message);
          }
        }
        success++;
      } catch { failed++; }
    }

    setSending(false);
    if (failed === 0) {
      setSent(true);
      setImageFile(null);
      draft.clearDraft();
      // Add to recent messages
      if (message.trim()) {
        setRecentMessages(prev => [message.trim(), ...prev.slice(0, 4)]);
      }
      try { hapticFeedback.notificationOccurred("success"); } catch {}
      toast({ type: "success", title: "발송 완료", message: `${success}개 계정 발송 성공` });
      setTimeout(() => setSent(false), 3000);
    } else {
      setError(`${success}건 성공, ${failed}건 실패`);
      try { hapticFeedback.notificationOccurred("error"); } catch {}
    }
  }, [message, imageFile, sending, selectedAccountIds, selectedGroupIds, toast, draft]);

  useKeyboardShortcut("Enter", handleSend, { ctrl: true });

  const toggleAccount = useCallback((id: string) => {
    setSelectedAccountIds(prev => {
      const newSelection = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // 계정 전환 시 상태 업데이트
      if (newSelection.length > 0) {
        switchAccount(newSelection[0]);
      }
      return newSelection;
    });
  }, [switchAccount]);

  const toggleGroup = useCallback((id: string) => {
    setSelectedGroupIds(prev => {
      const newSelection = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      // 그룹 선택 변경 시 계정 상태 업데이트
      if (selectedAccountIds.length > 0) {
        updateAccountState(selectedAccountIds[0], { selectedGroups: newSelection });
      }
      return newSelection;
    });
  }, [selectedAccountIds, updateAccountState]);

  const remaining = MAX_CHARS - message.length;
  const remainingColor = remaining > 500 ? "var(--tg-theme-hint-color)" : remaining > 100 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-4 pb-8 space-y-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 280px)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--tg-theme-text-color)" }}>발송</p>
        <SuccessPredictorBadge text={message} />
      </div>

      {/* Account selection */}
      <div className="space-y-1">
        <label className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--tg-theme-hint-color)" }}><Users className="h-3 w-3" /> 계정 ({selectedAccountIds.length}개)</label>
        {loadingAccts ? <div className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }} /> : (
          <div className="flex flex-wrap gap-1.5">
            {accounts.map(a => (
              <button key={a.id} onClick={() => toggleAccount(a.id)}
                className={cn("rounded-full px-3 py-2 text-[11px] font-medium active:scale-95 min-h-[44px] min-w-[44px]")}
                style={{ backgroundColor: selectedAccountIds.includes(a.id) ? "var(--tg-theme-button-color, #5288c1)" : "var(--tg-theme-secondary-bg-color, #232e3c)", color: selectedAccountIds.includes(a.id) ? "#fff" : "var(--tg-theme-text-color)" }}>
                {a.phone}
              </button>
            ))}
          </div>
        )}
        {accounts.length === 0 && !loadingAccts && (
          <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs min-h-[44px]")} style={{ backgroundColor: "var(--tg-theme-section-bg-color, #232e3c)", color: "var(--tg-theme-hint-color)" }}>
            <Info className="h-3.5 w-3.5" /> 활성 계정이 없습니다. 프로필 탭에서 계정을 연결하세요.
          </div>
        )}
      </div>

      {/* Group selection */}
      <div>
        <button onClick={() => setShowGroupPicker(!showGroupPicker)} className={cn("flex items-center justify-between w-full rounded-xl px-4 py-3 text-sm active:scale-[0.98] min-h-[44px]")}
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}>
          <span>{selectedGroupIds.length > 0 ? `${selectedGroupIds.length}개 그룹 선택됨` : "그룹 선택 (선택사항)"}</span>
          <ChevronDown className={cn(`h-4 w-4 transition-transform ${showGroupPicker ? "rotate-180" : ""}`)} style={{ color: "var(--tg-theme-hint-color, #708499)" }} />
        </button>
        {showGroupPicker && (
          <div className={cn("mt-1 max-h-40 overflow-y-auto rounded-xl p-2")} style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
            {groups.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>그룹이 없습니다</p>
            ) : groups.map(g => (
              <button key={g.id} onClick={() => toggleGroup(g.id)}
                className={cn(`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs min-h-[44px] ${selectedGroupIds.includes(g.id) ? "font-semibold" : ""}`)}
                style={{ backgroundColor: selectedGroupIds.includes(g.id) ? "var(--tg-theme-button-color, #5288c1)" : "transparent", color: selectedGroupIds.includes(g.id) ? "#fff" : "var(--tg-theme-text-color)" }}>
                <span className={cn(`flex h-2 w-2 rounded-full ${selectedGroupIds.includes(g.id) ? "bg-white" : "bg-gray-500"}`)} />
                {g.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image attachment */}
      <div>
        <label className="text-[10px] font-medium flex items-center gap-1 mb-1" style={{ color: "var(--tg-theme-hint-color)" }}>
          <Image className="h-3 w-3" /> 이미지 첨부 (선택사항)
        </label>
        <div className="flex gap-2">
          <button onClick={() => handlePickImage(true)}
            className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium active:scale-95 min-h-[44px] min-w-[44px]")}
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}>
            <Camera className="h-4 w-4" /> 촬영
          </button>
          <button onClick={() => handlePickImage(false)}
            className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium active:scale-95 min-h-[44px] min-w-[44px]")}
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}>
            <Image className="h-4 w-4" /> 앨범
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelected} />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageSelected} />
        </div>

        {/* Image preview */}
        {imagePreviewUrl && (
          <div className={cn("relative mt-2 rounded-xl overflow-hidden")} style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
            <img src={imagePreviewUrl} alt="첨부 이미지" className="w-full max-h-48 object-contain" />
            <button onClick={handleRemoveImage}
              className={cn("absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full active:scale-90 min-h-[44px] min-w-[44px]")}
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }} aria-label="이미지 제거">
              <X className="h-4 w-4 text-white" />
            </button>
            <span className={cn("absolute bottom-2 left-2 rounded px-2 py-0.5 text-[10px] min-h-[44px]")}
              style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#ccc" }}>
              {imageFile!.name} ({(imageFile!.size / 1024).toFixed(0)}KB)
            </span>
            {imageFile && imageFile.size > 5 * 1024 * 1024 && (
              <div className={cn("absolute bottom-8 left-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] min-h-[44px]")}
                style={{ backgroundColor: "rgba(239,68,68,0.8)", color: "#fff" }}>
                <AlertCircle className="h-3 w-3" /> 5MB 초과 — 전송에 실패할 수 있습니다
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message textarea */}
      <div className="relative" ref={(el) => el && attachSwipeListeners(el)}>
        <textarea ref={textareaRef} value={message} onChange={e => { 
          setMessage(e.target.value); 
          draft.onChange(e.target.value); 
        }}
          placeholder="보낼 메시지를 입력하세요..." rows={5} maxLength={MAX_CHARS}
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)", color: "var(--tg-theme-text-color)" }}
          className={cn("w-full rounded-xl px-4 py-3 text-sm outline-none resize-none min-h-[44px]")}
          aria-label="발송 메시지" 
          onFocus={() => setToolbarVisible(true)}
          onBlur={() => setTimeout(() => setToolbarVisible(false), 200)} />
        <div className="absolute bottom-2 right-3 text-[10px] font-medium" style={{ color: remainingColor }}>{remaining}</div>
      </div>

      {/* Reply macro toggle */}
      {selectedAccountIds.length > 0 && !replyMacroLoading && (
        <div className={cn("flex items-center justify-between rounded-xl px-4 py-3 min-h-[44px]")}
          style={{ backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)" }}>
          <div className="flex items-center gap-2">
            <div className={cn(`h-2.5 w-2.5 rounded-full ${replyMacroActive ? "bg-emerald-500" : "bg-gray-500"}`)} />
            <span className="text-xs" style={{ color: "var(--tg-theme-text-color)" }}>
              랜덤 답장 {replyMacroActive ? "켜짐" : "꺼짐"}
            </span>
            {replyMacroMessage && (
              <span className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--tg-theme-hint-color)" }}>
                — {replyMacroMessage.length > 20 ? replyMacroMessage.slice(0, 20) + "..." : replyMacroMessage}
              </span>
            )}
          </div>
          <label className={cn("relative inline-flex h-6 w-11 cursor-pointer items-center min-h-[44px]")}>
            <input type="checkbox" className="peer sr-only" checked={replyMacroActive}
              onChange={async () => {
                const currentAcct = selectedAccountIds[0];
                if (!currentAcct) return;
                try {
                  setReplyMacroActive(!replyMacroActive);
                  const res = await fetch(`${API_BASE}/api/accounts/${currentAcct}/reply-macros/toggle`, {
                    method: "PUT",
                    headers: { ...await api.authHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ is_active: !replyMacroActive, message_content: replyMacroMessage }),
                  });
                  const data = await res.json();
                  setReplyMacroActive(!!data.is_active);
                  // 계정 상태 업데이트
                  updateAccountState(currentAcct, { 
                    autoReplyEnabled: !replyMacroActive,
                    autoReplyMessage: replyMacroMessage
                  });
                  hapticFeedback.impactOccurred("light");
                } catch {
                  setReplyMacroActive(replyMacroActive);
                }
              }} />
            <span className="absolute inset-0 rounded-full transition-colors peer-checked:bg-emerald-500 bg-gray-600" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
          </label>
        </div>
      )}

      {error && (
        <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs min-h-[44px]")} style={{ backgroundColor: "var(--tg-theme-destructive-text-color, #ec3942)" }}>
          <AlertCircle className="h-3.5 w-3.5 text-white" /><span className="text-white">{error}</span>
        </div>
      )}

      <motion.button
        onClick={() => confirm("발송 확인", handleSend, `${selectedAccountIds.length}개 계정 · ${selectedGroupIds.length || "상위 5"}개 그룹${imageFile ? " · 이미지 포함" : ""}으로 발송합니다`)}
        disabled={(!message.trim() && !imageFile) || sending || selectedAccountIds.length === 0}
        animate={sent ? { backgroundColor: "var(--tg-theme-button-color, #5288c1)", transition: { duration: 0.3 } } : {}}
        style={{ backgroundColor: "var(--tg-theme-button-color, #5288c1)", color: "#fff" }}
        className={cn("flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-semibold disabled:opacity-50 active:scale-[0.98] min-h-[44px]")}
        aria-label={sending ? "발송 중" : sent ? "발송 완료" : "발송하기"}>
        <AnimatePresence mode="wait">
          {sending ? (
            <motion.div key="spinner" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Loader2 className="h-5 w-5" />
              </motion.div>
              발송 중...
            </motion.div>
          ) : sent ? (
            <motion.div key="check" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              발송 완료!
            </motion.div>
          ) : (
            <motion.div key="send" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {`발송 (${selectedAccountIds.length}개 계정)`}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {selectedGroupIds.length === 0 && (
        <p className="text-xs text-center" style={{ color: "var(--tg-theme-hint-color, #708499)" }}>그룹을 선택하지 않으면 상위 5개 그룹에 자동 발송됩니다</p>
      )}
      {ConfirmDialog}
      
      {/* Smart keyboard toolbar */}
      <SmartKeyboardToolbar
        onInsertTemplate={(template) => setMessage(prev => prev + template)}
        onInsertEmoji={(emoji) => setMessage(prev => prev + emoji)}
        onInsertSpecialChar={(char) => setMessage(prev => prev + char)}
        onInsertRecentMessage={(recentMsg) => setMessage(prev => prev + recentMsg)}
        templates={templates}
        recentMessages={recentMessages}
        isVisible={toolbarVisible}
        onClose={() => setToolbarVisible(false)}
      />
    </div>
  );
});