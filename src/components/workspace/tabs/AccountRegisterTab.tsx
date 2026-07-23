"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Copy, Eye, EyeOff, Key, Loader2, QrCode, RotateCcw, Send, Shield, User, X } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { InlineError } from "@/components/ui/InlineError";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useToast } from "@/components/ui/Toast";
import { useApiKeyGuard } from "@/lib/useApiKeyGuard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { analyzeTone, toneLabel, toneColor, toneBg, type ToneAnalysis } from "@/lib/toneAnalyzer";
import { computeSpamScore, type SpamScoreResult } from "@/lib/spamScore";
import { analyzeSendRisk, riskLevelColor, riskLevelBg, riskLevelLabel } from "@/lib/riskAnalysis";
import type { Account } from "@/types";
import * as api from "@/lib/api";

export function AccountRegisterTab() {
  const { hasApiKey, onKeySet } = useApiKeyGuard();
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const registerAccount = useDashboardStore((s) => s.registerAccount);
  const removeAccount = useDashboardStore((s) => s.removeAccount);
  const selectAccount = useDashboardStore((s) => s.selectAccount);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // Î™®Î∞î??Î©Ä?∞Ïä§???ÅÌÉú
  const [showSteps, setShowSteps] = useState(false); // Î™®Î∞î?ºÏóê???®Í≥Ñ ?úÏãú ?¨Î?
  const [submitting, setSubmitting] = useState(false); // ?úÏ∂ú ?ÅÌÉú
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    telegramSession: "",
    telegramBotToken: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFrom: "",
    apiKey: "",
    webhookUrl: "",
    notes: "",
  });

  const [qrData, setQrData] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordHint, setPasswordHint] = useState("");

  const { toast } = useToast();

  // ?®Ïä§?åÎìú Í∞ïÎèÑ Í≤Ä??
  const calculatePasswordStrength = useCallback((password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const hints = [];
    if (password.length < 8) hints.push("8???¥ÏÉÅ");
    if (!/[A-Z]/.test(password)) hints.push("?ÄÎ¨∏Ïûê ?¨Ìï®");
    if (!/[a-z]/.test(password)) hints.push("?åÎ¨∏???¨Ìï®");
    if (!/[0-9]/.test(password)) hints.push("?´Ïûê ?¨Ìï®");
    if (!/[^A-Za-z0-9]/.test(password)) hints.push("?πÏàòÎ¨∏Ïûê ?¨Ìï®");
    
    setPasswordStrength(strength);
    setPasswordHint(hints.join(", "));
    return strength;
  }, []);

  // ???∞Ïù¥??Î≥ÄÍ≤??∏Îì§??
  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'smtpPassword') {
      calculatePasswordStrength(value as string);
    }
  }, [calculatePasswordStrength]);

  // QR ÏΩîÎìú ?ùÏÑ±
  const generateQrCode = useCallback(async () => {
    if (!formData.telegramSession) {
      toast("error", "Telegram ?∏ÏÖò???ÖÎ†•?¥Ï£º?∏Ïöî.");
      return;
    }
    
    setQrLoading(true);
    try {
      // ?§Ï†ú QR ÏΩîÎìú ?ùÏÑ± Î°úÏßÅ?Ä ?ÑÎ°†?∏Ïóî?úÏóê??Î∂àÍ??•ÌïòÎØÄÎ°?Î™®Ïùò ?∞Ïù¥??
      setQrData(`QR_CODE_DATA:${formData.telegramSession.substring(0, 10)}`);
      setQrModalOpen(true);
    } catch (error) {
      toast("error", "QR ÏΩîÎìú ?ùÏÑ±???§Ìå®?àÏäµ?àÎã§.");
    } finally {
      setQrLoading(false);
    }
  }, [formData.telegramSession, toast]);

  // ???úÏ∂ú
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setSubmitError("?¥Î¶Ñ???ÖÎ†•?¥Ï£º?∏Ïöî.");
      return;
    }
    
    if (!formData.telegramSession.trim()) {
      setSubmitError("Telegram ?∏ÏÖò???ÖÎ†•?¥Ï£º?∏Ïöî.");
      return;
    }
    
    if (formData.smtpPassword && formData.smtpPassword.length > 0) {
      if (passwordStrength < 3) {
        setSubmitError("SMTP ÎπÑÎ?Î≤àÌò∏Í∞Ä ?àÎ¨¥ ?ΩÌï©?àÎã§. ??Í∞ïÎ†•??ÎπÑÎ?Î≤àÌò∏Î•??¨Ïö©?¥Ï£º?∏Ïöî.");
        return;
      }
    }
    
    setSubmitting(true);
    
    try {
      const newAccount = await registerAccount({
        name: formData.name,
        phone: formData.phone,
      });
      
      selectAccount(newAccount.id);
      setSubmitSuccess("Í≥ÑÏ†ï???±Í≥µ?ÅÏúºÎ°??±Î°ù?òÏóà?µÎãà??");
      setSubmitError(null);
      
      // ??Ï¥àÍ∏∞??
      setFormData({
        name: "",
        phone: "",
        telegramSession: "",
        telegramBotToken: "",
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPassword: "",
        smtpFrom: "",
        apiKey: "",
        webhookUrl: "",
        notes: "",
      });
      setCurrentStep(0);
      
      setTimeout(() => setSubmitSuccess(null), 5000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Í≥ÑÏ†ï ?±Î°ù???§Ìå®?àÏäµ?àÎã§.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, passwordStrength, registerAccount, selectAccount]);

  // Í≥ÑÏ†ï ??†ú
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    
    removeAccount(deleteTarget);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    toast("success", "Í≥ÑÏ†ï????†ú?òÏóà?µÎãà??");
  }, [deleteTarget, removeAccount, toast]);

  // Í≥ÑÏ†ï ?åÏä§??
  const handleTestAccount = useCallback(async (accountId: string) => {
    // ?îÎ? ?åÏä§??Î°úÏßÅ
    toast("info", "Í≥ÑÏ†ï ?åÏä§?∏Î? ?úÏûë?©Îãà??..");
    setTimeout(() => {
      toast("success", "Í≥ÑÏ†ï ?∞Í≤∞ ?åÏä§?∏Í? ?±Í≥µ?ÅÏúºÎ°??ÑÎ£å?òÏóà?µÎãà??");
    }, 2000);
  }, [toast]);

  // AI Î∂ÑÏÑù Í∏∞Îä• Ï∂îÍ?
  const analyzeAccountConfig = useCallback(() => {
    const spamScore: SpamScoreResult = computeSpamScore(formData.name + ' ' + formData.notes);
    const toneAnalysis: ToneAnalysis = analyzeTone(formData.notes);
    const riskAnalysis = analyzeSendRisk(
      {
        id: "temp",
        phone: formData.phone,
        name: formData.name,
        status: "active",
        todaySent: 0,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      } as unknown as Account,
      [], // Í∑∏Î£π ?∞Ïù¥???ÜÏùå
      [], // Î°úÍ∑∏ ?∞Ïù¥???ÜÏùå
      formData.notes
    );

    return {
      spamScore,
      toneAnalysis,
      riskAnalysis
    };
  }, [formData]);

  const configAnalysis = useMemo(() => {
    if (!formData.name && !formData.notes) return null;
    return analyzeAccountConfig();
  }, [analyzeAccountConfig]);

  // Î™®Î∞î??Î©Ä?∞Ïä§???§ÎπÑÍ≤åÏù¥??
  const steps = [
    { id: 0, name: "Í∏∞Î≥∏ ?ïÎ≥¥", icon: User },
    { id: 1, name: "Telegram", icon: Send },
    { id: 2, name: "SMTP", icon: Key },
    { id: 3, name: "Î≥¥Ïïà", icon: Shield },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!hasApiKey) {
    return (
      <Panel title="Í≥ÑÏ†ï ?±Î°ù" description="Í≥ÑÏ†ï???±Î°ù?òÎ†§Î©?API ?§Í? ?ÑÏöî?©Îãà??">
        <EmptyState 
          icon={Key} 
          title="API ?§Í? ?ÜÏäµ?àÎã§" 
          description="Î¥?Î©îÎâ¥?êÏÑú '?îë ??API ??Î•??µÌï¥ Î∞úÍ∏âÎ∞õÏ? ???§Ïãú ?úÎèÑ?¥Ï£º?∏Ïöî." 
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* ?Ä?Ä AI Security Insights Panel ?Ä?Ä */}
      {configAnalysis && (
        <Panel 
          title="AI Î≥¥Ïïà ?∏ÏÇ¨?¥Ìä∏" 
          description="Í≥ÑÏ†ï Íµ¨ÏÑ±?êÏÑú Í∞êÏ???Î≥¥Ïïà ?®ÌÑ¥"
        >
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {/* Spam Score */}
            <div className="rounded-lg border border-app-border bg-app-card p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium text-app-text-muted">?¥Î¶Ñ/?∏Ìä∏ ?§Ìå∏ ?êÏàò</span>
                <span className={cn(
                  "text-xs font-bold tabular-nums",
                  configAnalysis.spamScore.score >= 70 ? "text-app-danger" : 
                  configAnalysis.spamScore.score >= 40 ? "text-app-warning" : "text-app-success",
                )}>
                  {configAnalysis.spamScore.score}/100
                </span>
              </div>
              <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    configAnalysis.spamScore.score >= 70 ? "bg-app-danger" : 
                    configAnalysis.spamScore.score >= 40 ? "bg-app-warning" : "bg-app-success",
                  )}
                  style={{ width: `${configAnalysis.spamScore.score}%` }}
                />
              </div>
              {configAnalysis.spamScore.reasons.length > 0 && (
                <ul className="space-y-0.5">
                    {configAnalysis.spamScore.reasons.slice(0, 2).map((r, i) => (
                    <li key={`${r}-${i}`} className="text-[10px] text-app-text-subtle">??{r}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tone Analysis */}
            <div className="rounded-lg border border-app-border bg-app-card p-2.5">
              <div className="mb-1 text-[10px] font-medium text-app-text-muted">?∏Ìä∏ ??Î∂ÑÏÑù</div>
              <div className="mb-1 flex flex-wrap items-center gap-1">
                {configAnalysis.toneAnalysis.primaryTone && (
                  <span className={cn("inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold", 
                    toneBg(configAnalysis.toneAnalysis.primaryTone), 
                    toneColor(configAnalysis.toneAnalysis.primaryTone)
                  )}>
                    {toneLabel(configAnalysis.toneAnalysis.primaryTone)}
                  </span>
                )}
                {configAnalysis.toneAnalysis.secondaryTone && (
                  <span className="inline-block rounded-full bg-app-card-hover px-1.5 py-0.5 text-[10px] text-app-text-muted">
                    {toneLabel(configAnalysis.toneAnalysis.secondaryTone)}
                  </span>
                )}
              </div>
              <p className="text-[10px] leading-tight text-app-text-subtle">
                {configAnalysis.toneAnalysis.feedback}
              </p>
            </div>

            {/* Risk Analysis */}
            <div className="rounded-lg border border-app-border bg-app-card p-2.5">
              <div className="mb-1 text-[10px] font-medium text-app-text-muted">Î≥¥Ïïà Î¶¨Ïä§??/div>
              <div className={cn(
                "inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                configAnalysis.riskAnalysis.level === "danger" ? "bg-app-danger text-white" :
                configAnalysis.riskAnalysis.level === "caution" ? "bg-app-warning text-white" :
                "bg-app-success text-white"
              )}>
                {riskLevelLabel(configAnalysis.riskAnalysis.level)}
              </div>
              {configAnalysis.riskAnalysis.reasons.length > 0 && (
                <p className="text-[10px] leading-tight text-app-text-subtle mt-1">
                  {configAnalysis.riskAnalysis.reasons[0]}
                </p>
              )}
            </div>
          </div>
        </Panel>
      )}

      {/* ?Ä?Ä Multi-step Form for Mobile ?Ä?Ä */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-app-primary" />
            <span>Í≥ÑÏ†ï ?±Î°ù</span>
          </div>
        }
        description="?àÎ°ú??Í≥ÑÏ†ï???±Î°ù?òÏÑ∏??
        action={
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="md:hidden flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors"
          >
            <div className="h-2 w-2 rounded-full bg-app-primary" />
            ?®Í≥Ñ
          </button>
        }
      >
        {/* Mobile Step Indicator */}
        {showSteps && (
          <div className="md:hidden mb-4">
            <div className="flex justify-between mb-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center flex-1 mx-1 ${index < steps.length - 1 ? 'border-b-2' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                      currentStep === step.id
                        ? 'bg-app-primary text-white'
                        : index < currentStep
                        ? 'bg-app-success text-white'
                        : 'bg-app-card text-app-text'
                    }`}
                  >
                    {step.id + 1}
                  </button>
                  <span className="text-[10px] mt-1 text-center">{step.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Step 0: Basic Info */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Field label="Í≥ÑÏ†ï ?¥Î¶Ñ *">
                  <input
                    type="text"
                    autoFocus
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="???îÎ†àÍ∑∏Îû® Í≥ÑÏ†ï"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="?ÑÌôîÎ≤àÌò∏">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+821012345678"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="Î©îÎ™®">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="??Í≥ÑÏ†ï???Ä??Ï∂îÍ? ?ïÎ≥¥Î•??ÖÎ†•?òÏÑ∏??.."
                    rows={3}
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 resize-none min-h-[88px]"
                  />
                </Field>
              </motion.div>
            )}

            {/* Step 1: Telegram */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Field label="Telegram ?∏ÏÖò *">
                  <Textarea
                    autoFocus
                    value={formData.telegramSession}
                    onChange={(e) => handleInputChange('telegramSession', e.target.value)}
                    placeholder="session_string_here"
                    rows={4}
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 resize-none min-h-[132px]"
                  />
                </Field>

                <Field label="Telegram Bot Token">
                  <input
                    type="password"
                    value={formData.telegramBotToken}
                    onChange={(e) => handleInputChange('telegramBotToken', e.target.value)}
                    placeholder="bot123456:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateQrCode}
                    disabled={qrLoading || submitting}
                    className="flex-1 min-h-[44px]"
                  >
                    {qrLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        QR ?ùÏÑ±
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigator.clipboard.writeText(formData.telegramSession)}
                    disabled={submitting}
                    className="min-h-[44px]"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: SMTP */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="SMTP ?∏Ïä§??>
                    <input
                      type="text"
                      autoFocus
                      value={formData.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                    />
                  </Field>

                  <Field label="SMTP ?¨Ìä∏">
                    <input
                      type="number"
                      value={formData.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                    />
                  </Field>
                </div>

                <Field label="SMTP ?¨Ïö©??>
                  <input
                    type="email"
                    value={formData.smtpUser}
                    onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="SMTP ÎπÑÎ?Î≤àÌò∏">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.smtpPassword}
                      onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                      placeholder="??ÎπÑÎ?Î≤àÌò∏"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 pr-10 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-subtle hover:text-app-text transition-colors"
                      disabled={submitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.smtpPassword && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-app-text-subtle mb-1">
                        <span>ÎπÑÎ?Î≤àÌò∏ Í∞ïÎèÑ</span>
                        <span>{passwordStrength}/5</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-app-bg">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            passwordStrength < 2 ? "bg-app-danger" :
                            passwordStrength < 4 ? "bg-app-warning" : "bg-app-success"
                          )}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      {passwordHint && (
                        <p className="mt-1 text-xs text-app-text-subtle">
                          Í∞úÏÑ† ?? {passwordHint}
                        </p>
                      )}
                    </div>
                  )}
                </Field>

                <Field label="Î≥¥ÎÇ¥????Ï£ºÏÜå">
                  <input
                    type="email"
                    value={formData.smtpFrom}
                    onChange={(e) => handleInputChange('smtpFrom', e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>
              </motion.div>
            )}

            {/* Step 3: Security */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <Field label="API ??>
                  <input
                    type="password"
                    autoFocus
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="sk-...your-api-key..."
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="?πÌõÖ URL">
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                    placeholder="https://your-domain.com/webhook"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <div className="rounded-xl border border-app-border bg-app-card/30 p-3">
                  <h4 className="text-sm font-medium text-app-text mb-2">Î≥¥Ïïà ??/h4>
                  <ul className="space-y-1 text-xs text-app-text-subtle">
                    <li>??ÎπÑÎ?Î≤àÌò∏??ÏµúÏÜå 8?êÎ¶¨ ?¥ÏÉÅ ?¨Ïö©?òÏÑ∏??/li>
                    <li>???πÏàòÎ¨∏Ïûê, ?´Ïûê, ?Ä?åÎ¨∏?êÎ? Ï°∞Ìï©?òÏÑ∏??/li>
                    <li>??Ï§ëÏöî??Í≥ÑÏ†ï?êÎäî ??ÎπÑÎ?Î≤àÌò∏Î•??¨Ïö©?òÏÑ∏??/li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons for Mobile */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={prevStep}
                disabled={currentStep === 0 || submitting}
                className="flex-1 min-h-[44px]"
              >
                ?¥Ï†Ñ
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={nextStep}
                  disabled={submitting}
                  className="flex-1 min-h-[44px]"
                >
                  ?§Ïùå
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="flex-1 min-h-[44px]"
                >
                  {submitting ? '?±Î°ù Ï§?..' : '?±Î°ù'}
                </Button>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center mt-2">
              <div className="flex space-x-1">
                {steps.map((_, index) => (
                  <div
                    key={`step-${index}`}
                    className={`h-1.5 rounded-full transition-all ${
                      index <= currentStep ? 'bg-app-primary w-6' : 'bg-app-border w-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </form>
      </Panel>

      {/* ?Ä?Ä Existing Accounts Panel ?Ä?Ä */}
      {accounts.length > 0 && (
        <Panel
          title="?±Î°ù??Í≥ÑÏ†ï"
          description={`${accounts.length}Í∞úÏùò Í≥ÑÏ†ï???±Î°ù?òÏñ¥ ?àÏäµ?àÎã§`}
          action={
            <button
              onClick={() => {
                accounts.forEach(acc => {
                  // Test each account
                  toast("info", `${acc.name} Í≥ÑÏ†ï ?åÏä§???úÏûë...`);
                  setTimeout(() => {
                    toast("success", `${acc.name} Í≥ÑÏ†ï ?∞Í≤∞ ?ïÏù∏ ?ÑÎ£å!`);
                  }, 2000);
                });
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors"
              disabled={submitting}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              ?ÑÏ≤¥ ?åÏä§??
            </button>
          }
        >
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={cn(
                  "group relative rounded-xl border bg-app-card p-3 transition-colors",
                  acc.id === selectedAccountId
                    ? "border-app-primary/50 ring-2 ring-app-primary/10"
                    : "border-app-border/60 hover:border-app-border-strong"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium text-app-text">
                        {acc.name}
                      </h3>
                      <Badge
                        tone={acc.status === "active" ? "success" : "warning"}
                        className="shrink-0"
                      >
                        {acc.status === "active" ? "?úÏÑ±" : "ÎπÑÌôú??}
                      </Badge>
                    </div>
                    
                    <p className="mt-1 truncate text-xs text-app-text-subtle">
                      {acc.phone}
                    </p>
                    
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-lg bg-app-card-hover px-2 py-1 text-[10px] text-app-text-muted">
                        ?§Îäò {acc.todaySent}??Î∞úÏÜ°
                      </span>
                      <span className="rounded-lg bg-app-card-hover px-2 py-1 text-[10px] text-app-text-muted">
                        Í∑∏Î£π {acc.groupCount}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => selectAccount(acc.id)}
                      className={cn(
                        "flex items-center justify-center rounded-lg transition-colors min-h-[44px] min-w-[44px]",
                        acc.id === selectedAccountId
                          ? "bg-app-primary text-white"
                          : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
                      )}
                      aria-label="Í≥ÑÏ†ï ?†ÌÉù"
                      disabled={submitting}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTestAccount(acc.id)}
                        className="flex items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[44px] min-w-[44px]"
                        aria-label="Í≥ÑÏ†ï ?åÏä§??
                        disabled={submitting}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setDeleteTarget(acc.id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="flex items-center justify-center rounded-lg text-app-danger hover:bg-app-danger-muted hover:text-app-danger transition-colors min-h-[44px] min-w-[44px]"
                        aria-label="Í≥ÑÏ†ï ??†ú"
                        disabled={submitting}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* QR Code Modal */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Telegram QR ÏΩîÎìú"
        size="sm"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-lg">
            <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-500">QR ÏΩîÎìú</span>
            </div>
          </div>
          <p className="text-sm text-app-text-subtle text-center">
            ??QR ÏΩîÎìúÎ•??îÎ†àÍ∑∏Îû® ?±Ïóê???§Ï∫î?òÏó¨ Î°úÍ∑∏?∏Ìïò?∏Ïöî
          </p>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Í≥ÑÏ†ï ??†ú"
        description="??Í≥ÑÏ†ï????†ú?òÏãúÍ≤†Ïäµ?àÍπå? ???ëÏóÖ?Ä ?òÎèåÎ¶????ÜÏäµ?àÎã§."
        confirmLabel="??†ú" cancelLabel="Ï∑®ÏÜå" variant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />

      {/* Messages */}
      {submitError && (
        <InlineError className="mt-3">{submitError}</InlineError>
      )}
      {submitSuccess && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-start gap-2 rounded-xl border border-app-success/20 bg-app-success-muted px-3 py-2.5 text-sm text-app-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        </div>
      )}
    </div>
  );
}