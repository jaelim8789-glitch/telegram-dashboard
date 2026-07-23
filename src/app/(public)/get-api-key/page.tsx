"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, KeyRound, Shield, Smartphone, CheckCircle2,
} from "lucide-react";
import { useFadeIn } from "@/lib/useFadeIn";
import { useToast } from "@/components/ui/Toast";
import { InlineError } from "@/components/ui/InlineError";
import { PlanUpgradeModal } from "@/components/workspace/tabs/register/PlanUpgradeModal";

export default function GetApiKeyPage() {
  useFadeIn();
  const { toast } = useToast();
  const [showPayment, setShowPayment] = useState(false);
  const [error] = useState<string | null>(null);

  return (
    <div className="tm-section-bg bg-grid min-h-screen px-4 py-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-app-text-muted hover:text-app-text transition-colors mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          홈으로
        </Link>

        <div className="text-center" data-fade>
          <div className="badge-premium mx-auto w-fit mb-4">API Key</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-app-text">
            <span className="gold-text">API 키</span> 발급
          </h1>
          <p className="mt-3 text-base text-app-text-secondary max-w-lg mx-auto">
            외부 프로그램·스크립트에서 TeleMon API를 사용하려면 X-API-Key가 필요합니다.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-16 space-y-6" data-fade>
          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted gold-text">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">1. 요금제 선택</h3>
                <p className="mt-1 text-sm text-app-text-secondary">
                  Pro 또는 Team 요금제를 선택하고 USDT, BTC, ETH 등으로 결제하세요.
                  신용카드는 NOWPayments 페이지에서 가능합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted gold-text">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">2. API 키 발급</h3>
                <p className="mt-1 text-sm text-app-text-secondary">
                  입금 확인 즉시 API 키가 자동 발급됩니다 (보통 2~5분). 관리자 콘솔에서 언제든지 확인 가능합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary-muted gold-text">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">3. API 사용</h3>
                <p className="mt-1 text-sm text-app-text-secondary">
                  발급받은 키를 HTTP 헤더 <code className="text-app-text">X-API-Key</code>에 담아 요청하세요.
                  모든 엔드포인트는 <code className="text-app-text">/api/*</code>에서 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center" data-fade>
          <div className="glass-card p-8 sm:p-10">
            <h2 className="text-xl font-bold text-app-text">지금 API 키 발급받기</h2>
            <p className="mt-2 text-sm text-app-text-secondary max-w-md mx-auto">
              요금제를 선택하고 결제하면 API 키가 즉시 발급됩니다. 문의는 @telemon_support
            </p>
            {error && <InlineError className="mt-4 max-w-md mx-auto">{error}</InlineError>}
            <button
              onClick={() => setShowPayment(true)}
              className="btn-primary mt-6 inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold"
            >
              요금제 선택하고 결제하기
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2" data-fade>
          {[
            { icon: KeyRound, title: "SHA-256 해시 저장", desc: "원본 키는 저장되지 않으며, 해시로만 검증됩니다." },
            { icon: Shield, title: "관리자 콘솔에서 관리", desc: "발급·삭제·재발급을 관리자 페이지에서 직접 제어합니다." },
            { icon: CheckCircle2, title: "사용자별 발급", desc: "전화번호 인증 사용자마다 고유한 API 키가 부여됩니다." },
            { icon: Smartphone, title: "모든 요금제 지원", desc: "Pro, Team 등 모든 유료 요금제에서 API 키를 발급받을 수 있습니다." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="glass-card p-4 flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 gold-text" />
                <div>
                  <h4 className="text-sm font-semibold text-app-text">{item.title}</h4>
                  <p className="mt-0.5 text-xs text-app-text-muted">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xs text-app-text-subtle">
          문의: @telemon_support · 결제 후 7일 이내 환불 가능
        </p>
      </div>

      {/* Payment Modal */}
      <PlanUpgradeModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
}
