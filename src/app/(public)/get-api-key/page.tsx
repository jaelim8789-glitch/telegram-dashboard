"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, KeyRound, Shield, CheckCircle2, Sparkles, Crown,
  Zap, ExternalLink, Clock,
} from "lucide-react";
import { useFadeIn } from "@/lib/useFadeIn";
import { PlanUpgradeModal } from "@/components/workspace/tabs/register/PlanUpgradeModal";
import { useToast } from "@/components/ui/Toast";

export default function GetApiKeyPage() {
  useFadeIn();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);

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
            요금제를 구독하면 즉시 API 키가 발급됩니다. 외부 프로그램에서 TeleMon API를 자유롭게 사용하세요.
          </p>
        </div>

        {/* Free Plan Promotion */}
        <div className="mt-8 text-center" data-fade>
          <div className="glass-card p-6 border border-app-primary/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-primary/10 mx-auto mb-3">
              <Sparkles className="h-6 w-6 text-app-primary" />
            </div>
            <h3 className="text-lg font-bold text-app-text">무료 플랜도 있어요</h3>
            <p className="mt-2 text-sm text-app-text-secondary">
              Pro 요금제가 부담스럽다면 무료 플랜으로도 충분히 활용할 수 있습니다.<br/>
              발송 시 워터마크 광고가 포함됩니다.
            </p>
            <Link
              href="/signup"
              className="btn-secondary mt-4 inline-flex h-10 items-center gap-2 rounded-xl px-6 text-sm font-medium"
            >
              <Zap className="h-4 w-4" />
              무료 플랜 시작하기
            </Link>
          </div>
        </div>

        {/* How it works — 3 steps */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3" data-fade>
          {[
            { icon: Crown, title: "요금제 선택", desc: "필요한 플랜을 고르세요" },
            { icon: Shield, title: "USDT 결제", desc: "QR코드로 간편하게 송금" },
            { icon: KeyRound, title: "API 키 발급", desc: "입금 확인 즉시 자동 발급" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="glass-card p-5 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-app-primary/10">
                  <Icon className="h-5 w-5 text-app-primary" />
                </div>
                <p className="mt-3 text-sm font-semibold text-app-text">{s.title}</p>
                <p className="mt-1 text-[11px] text-app-text-muted">{s.desc}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center" data-fade>
          <div className="glass-card p-8 sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary/10 mx-auto mb-4">
              <Crown className="h-7 w-7 text-app-primary" />
            </div>
            <h2 className="text-xl font-bold text-app-text">결제하고 API 키 발급받기</h2>
            <p className="mt-2 text-sm text-app-text-secondary max-w-md mx-auto">
              Pro 또는 Business 요금제를 구독하면 API 키가 즉시 발급됩니다. 입금 확인은 보통 2~5분 내에 완료됩니다.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-6 inline-flex h-12 items-center gap-2 rounded-xl px-8 text-sm font-semibold"
            >
              <Crown className="h-4 w-4" />
              요금제 선택하고 결제하기
            </button>
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-16 grid gap-3 sm:grid-cols-2" data-fade>
          {[
            { icon: KeyRound, title: "SHA-256 해시 저장", desc: "원본 키는 저장되지 않으며, 해시로만 검증됩니다." },
            { icon: Shield, title: "관리자 콘솔에서 관리", desc: "발급·삭제·재발급을 관리자 페이지에서 직접 제어합니다." },
            { icon: CheckCircle2, title: "사용자별 발급", desc: "전화번호 인증 사용자마다 고유한 API 키가 부여됩니다." },
            { icon: Zap, title: "즉시 사용 가능", desc: "발급 즉시 API 호출이 가능합니다. 추가 설정이 필요 없습니다." },
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

        {/* FAQ */}
        <div className="mt-16" data-fade>
          <div className="text-center mb-8">
            <h3 className="text-lg font-bold text-app-text">자주 묻는 질문</h3>
          </div>
          <div className="space-y-3">
            {[
              { q: "결제 후 얼마나 걸리나요?", a: "USDT 네트워크 상황에 따라 보통 2~5분 내에 입금이 확인됩니다. 확인 즉시 API 키가 자동 발급됩니다." },
              { q: "어떤 암호화폐로 결제할 수 있나요?", a: "현재 USDT(TRC-20)를 기본으로 지원하며, BTC, ETH 등 다양한 암호화폐도 선택 가능합니다." },
              { q: "API 키를 잃어버리면 어떻게 하나요?", a: "관리자 콘솔에서 언제든지 재발급이 가능합니다. 이전 키는 즉시 폐기됩니다." },
              { q: "환불 정책은 어떻게 되나요?", a: "결제 후 7일 이내에 @telemon_support 로 문의하시면 환불이 가능합니다." },
            ].map((faq, i) => (
              <div key={i} className="glass-card p-4">
                <h4 className="text-sm font-semibold text-app-text">{faq.q}</h4>
                <p className="mt-1 text-xs text-app-text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 text-center text-xs text-app-text-subtle">
          문의: @telemon_support · 결제 후 7일 이내 환불 가능
        </p>
      </div>

      {/* Payment Modal */}
      <PlanUpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}