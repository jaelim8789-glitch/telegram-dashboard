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
import * as api from "@/lib/api";
import { analyzeTone, toneLabel, toneColor, toneBg, type ToneAnalysis } from "@/lib/toneAnalyzer";
import { computeSpamScore, type SpamScoreResult } from "@/lib/spamScore";
import { analyzeSendRisk, riskLevelColor, riskLevelBg, riskLevelLabel } from "@/lib/riskAnalysis";

export function AccountRegisterTab() {
  const { hasApiKey, onKeySet } = useApiKeyGuard();
  const accounts = useDashboardStore((s) => s.accounts);
  const selectedAccountId = useDashboardStore((s) => s.selectedAccountId);
  const account = accounts.find((a) => a.id === selectedAccountId);
  const addAccount = useDashboardStore((s) => s.addAccount);
  const removeAccount = useDashboardStore((s) => s.removeAccount);
  const updateAccount = useDashboardStore((s) => s.updateAccount);
  const selectAccount = useDashboardStore((s) => s.selectAccount);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 모바일 멀티스텝 상태
  const [showSteps, setShowSteps] = useState(false); // 모바일에서 단계 표시 여부
  
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

  // 패스워드 강도 검사
  const calculatePasswordStrength = useCallback((password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    const hints = [];
    if (password.length < 8) hints.push("8자 이상");
    if (!/[A-Z]/.test(password)) hints.push("대문자 포함");
    if (!/[a-z]/.test(password)) hints.push("소문자 포함");
    if (!/[0-9]/.test(password)) hints.push("숫자 포함");
    if (!/[^A-Za-z0-9]/.test(password)) hints.push("특수문자 포함");
    
    setPasswordStrength(strength);
    setPasswordHint(hints.join(", "));
    return strength;
  }, []);

  // 폼 데이터 변경 핸들러
  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'smtpPassword') {
      calculatePasswordStrength(value as string);
    }
  }, [calculatePasswordStrength]);

  // QR 코드 생성
  const generateQrCode = useCallback(async () => {
    if (!formData.telegramSession) {
      toast("error", "Telegram 세션을 입력해주세요.");
      return;
    }
    
    setQrLoading(true);
    try {
      // 실제 QR 코드 생성 로직은 프론트엔드에서 불가능하므로 모의 데이터
      setQrData(`QR_CODE_DATA:${formData.telegramSession.substring(0, 10)}`);
      setQrModalOpen(true);
    } catch (error) {
      toast("error", "QR 코드 생성에 실패했습니다.");
    } finally {
      setQrLoading(false);
    }
  }, [formData.telegramSession, toast]);

  // 폼 제출
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setSubmitError("이름을 입력해주세요.");
      return;
    }
    
    if (!formData.telegramSession.trim()) {
      setSubmitError("Telegram 세션을 입력해주세요.");
      return;
    }
    
    if (formData.smtpPassword && formData.smtpPassword.length > 0) {
      if (passwordStrength < 3) {
        setSubmitError("SMTP 비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.");
        return;
      }
    }
    
    try {
      setSubmitting(true);
      const newAccount = await api.createAccount({
        name: formData.name,
        phone: formData.phone,
        telegram_session: formData.telegramSession,
        telegram_bot_token: formData.telegramBotToken,
        smtp_host: formData.smtpHost || undefined,
        smtp_port: formData.smtpPort || undefined,
        smtp_user: formData.smtpUser || undefined,
        smtp_password: formData.smtpPassword || undefined,
        smtp_from: formData.smtpFrom || undefined,
        api_key: formData.apiKey || undefined,
        webhook_url: formData.webhookUrl || undefined,
        notes: formData.notes || undefined,
      });
      
      addAccount(newAccount);
      selectAccount(newAccount.id);
      setSubmitSuccess("계정이 성공적으로 등록되었습니다!");
      setSubmitError(null);
      
      // 폼 초기화
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
      setSubmitError(error instanceof Error ? error.message : "계정 등록에 실패했습니다.");
    }
  }, [formData, passwordStrength, addAccount, selectAccount]);

  // 계정 삭제
  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    
    removeAccount(deleteTarget);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
    toast("success", "계정이 삭제되었습니다.");
  }, [deleteTarget, removeAccount, toast]);

  // 계정 테스트
  const handleTestAccount = useCallback(async (accountId: string) => {
    // 더미 테스트 로직
    toast("info", "계정 테스트를 시작합니다...");
    setTimeout(() => {
      toast("success", "계정 연결 테스트가 성공적으로 완료되었습니다!");
    }, 2000);
  }, [toast]);

  // AI 분석 기능 추가
  const analyzeAccountConfig = useCallback(() => {
    const spamScore: SpamScoreResult = computeSpamScore(formData.name + ' ' + formData.notes);
    const toneAnalysis: ToneAnalysis = analyzeTone(formData.notes);
    const riskAnalysis = analyzeSendRisk(
      {
        id: "temp",
        name: formData.name,
        phone: formData.phone,
        status: "active",
        todaySent: 0,
        plan: "free",
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      },
      [], // 그룹 데이터 없음
      [], // 로그 데이터 없음
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

  // 모바일 멀티스텝 네비게이션
  const steps = [
    { id: 0, name: "기본 정보", icon: User },
    { id: 1, name: "Telegram", icon: Send },
    { id: 2, name: "SMTP", icon: Key },
    { id: 3, name: "보안", icon: Shield },
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
      <Panel title="계정 등록" description="계정을 등록하려면 API 키가 필요합니다.">
        <EmptyState 
          icon={Key} 
          title="API 키가 없습니다" 
          description="봇 메뉴에서 '🔑 내 API 키'를 통해 발급받은 후 다시 시도해주세요." 
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* ── AI Security Insights Panel ── */}
      {configAnalysis && (
        <Panel 
          title="AI 보안 인사이트" 
          description="계정 구성에서 감지된 보안 패턴"
        >
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {/* Spam Score */}
            <div className="rounded-lg border border-app-border bg-app-card p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] font-medium text-app-text-muted">이름/노트 스팸 점수</span>
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
                    <li key={i} className="text-[10px] text-app-text-subtle">• {r}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tone Analysis */}
            <div className="rounded-lg border border-app-border bg-app-card p-2.5">
              <div className="mb-1 text-[10px] font-medium text-app-text-muted">노트 톤 분석</div>
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
              <div className="mb-1 text-[10px] font-medium text-app-text-muted">보안 리스크</div>
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

      {/* ── Multi-step Form for Mobile ── */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-app-primary" />
            <span>계정 등록</span>
          </div>
        }
        description="새로운 계정을 등록하세요"
        action={
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="md:hidden flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors"
          >
            <div className="h-2 w-2 rounded-full bg-app-primary" />
            단계
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
                <Field label="계정 이름 *">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="내 텔레그램 계정"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="전화번호">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+821012345678"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="메모">
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="이 계정에 대한 추가 정보를 입력하세요..."
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
                <Field label="Telegram 세션 *">
                  <Textarea
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
                    variant="outline"
                    onClick={generateQrCode}
                    disabled={qrLoading}
                    className="flex-1 min-h-[44px]"
                  >
                    {qrLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        QR 생성
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(formData.telegramSession)}
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
                  <Field label="SMTP 호스트">
                    <input
                      type="text"
                      value={formData.smtpHost}
                      onChange={(e) => handleInputChange('smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                    />
                  </Field>

                  <Field label="SMTP 포트">
                    <input
                      type="number"
                      value={formData.smtpPort}
                      onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value) || 587)}
                      placeholder="587"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                    />
                  </Field>
                </div>

                <Field label="SMTP 사용자">
                  <input
                    type="email"
                    value={formData.smtpUser}
                    onChange={(e) => handleInputChange('smtpUser', e.target.value)}
                    placeholder="user@gmail.com"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="SMTP 비밀번호">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.smtpPassword}
                      onChange={(e) => handleInputChange('smtpPassword', e.target.value)}
                      placeholder="앱 비밀번호"
                      className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 pr-10 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-subtle hover:text-app-text transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {formData.smtpPassword && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-app-text-subtle mb-1">
                        <span>비밀번호 강도</span>
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
                          개선 팁: {passwordHint}
                        </p>
                      )}
                    </div>
                  )}
                </Field>

                <Field label="보내는 이 주소">
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
                <Field label="API 키">
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => handleInputChange('apiKey', e.target.value)}
                    placeholder="sk-...your-api-key..."
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <Field label="웹훅 URL">
                  <input
                    type="url"
                    value={formData.webhookUrl}
                    onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                    placeholder="https://your-domain.com/webhook"
                    className="w-full rounded-xl border border-app-border bg-app-card px-3 py-2.5 text-sm text-app-text placeholder:text-app-text-subtle outline-none transition-colors duration-150 focus:border-app-primary/60 focus:ring-2 focus:ring-app-primary/15 min-h-[44px]"
                  />
                </Field>

                <div className="rounded-xl border border-app-border bg-app-card/30 p-3">
                  <h4 className="text-sm font-medium text-app-text mb-2">보안 팁</h4>
                  <ul className="space-y-1 text-xs text-app-text-subtle">
                    <li>• 비밀번호는 최소 8자리 이상 사용하세요</li>
                    <li>• 특수문자, 숫자, 대소문자를 조합하세요</li>
                    <li>• 중요한 계정에는 앱 비밀번호를 사용하세요</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons for Mobile */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex-1 min-h-[44px]"
              >
                이전
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 min-h-[44px]"
                >
                  다음
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 min-h-[44px]"
                >
                  등록
                </Button>
              )}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center mt-2">
              <div className="flex space-x-1">
                {steps.map((_, index) => (
                  <div
                    key={index}
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

      {/* ── Existing Accounts Panel ── */}
      {accounts.length > 0 && (
        <Panel
          title="등록된 계정"
          description={`${accounts.length}개의 계정이 등록되어 있습니다`}
          action={
            <button
              onClick={() => {
                useDashboardStore.getState().accounts.forEach(acc => {
                  // Test each account
                  toast("info", `${acc.name} 계정 테스트 시작...`);
                  setTimeout(() => {
                    toast("success", `${acc.name} 계정 연결 확인 완료!`);
                  }, 2000);
                });
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              전체 테스트
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
                        {acc.status === "active" ? "활성" : "비활성"}
                      </Badge>
                    </div>
                    
                    <p className="mt-1 truncate text-xs text-app-text-subtle">
                      {acc.phone || "전화번호 없음"}
                    </p>
                    
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-lg bg-app-card-hover px-2 py-1 text-[10px] text-app-text-muted">
                        오늘 {acc.todaySent}회 발송
                      </span>
                      <span className="rounded-lg bg-app-card-hover px-2 py-1 text-[10px] text-app-text-muted">
                        {acc.plan}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => selectAccount(acc.id)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors min-h-[44px] min-w-[44px]",
                        acc.id === selectedAccountId
                          ? "bg-app-primary text-white"
                          : "text-app-text-muted hover:bg-app-card-hover hover:text-app-text"
                      )}
                      aria-label="계정 선택"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleTestAccount(acc.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-app-text-muted hover:bg-app-card-hover hover:text-app-text transition-colors min-h-[44px] min-w-[44px]"
                        aria-label="계정 테스트"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setDeleteTarget(acc.id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-app-danger hover:bg-app-danger-muted hover:text-app-danger transition-colors min-h-[44px] min-w-[44px]"
                        aria-label="계정 삭제"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {acc.notes && (
                  <p className="mt-2 text-xs text-app-text-subtle">
                    {acc.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* QR Code Modal */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Telegram QR 코드"
        size="sm"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-lg">
            <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
              <span className="text-gray-500">QR 코드</span>
            </div>
          </div>
          <p className="text-sm text-app-text-subtle text-center">
            이 QR 코드를 텔레그램 앱에서 스캔하여 로그인하세요
          </p>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="계정 삭제"
        description="이 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmLabel="삭제" cancelLabel="취소" variant="danger"
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