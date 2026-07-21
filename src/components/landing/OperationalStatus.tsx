"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MessageCircle, Bot, Zap, Brain, Clock } from "lucide-react";

export function OperationalStatus() {
  return (
    <section id="ai-operational-status" className="tm-section-bg-alt px-6 sm:px-6 lg:px-8 py-12 sm:py-16 luxury-section">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
            <p className="section-heading-luxury mb-0">AI 운영비서</p>
            <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          </div>
          <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
            나만의 <span style={{ color: "var(--color-accent)" }}>AI</span>와 함께
          </h2>
          <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">AI 비서가 대화하듯 채널 운영을 도와줍니다.</p>
          <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text)" }}>
                AI 비서가 대화하듯 채널 운영을 도와줍니다
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                질문하면 AI가 바로 답변하고, 24시간 AI 어시스턴트가 대기하고 있어 언제든지 도움을 받을 수 있습니다. 채널 운영을 AI에게 맡기세요.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                className="p-4 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-card)] flex items-start gap-3 group"
                style={{
                  transition: "all 0.3s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(184,160,96,0.08)",
                }}
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] text-xs">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm" style={{ color: "var(--color-text)" }}>질문하면 AI가 바로 답변</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>AI가 질문에 즉시 응답합니다</p>
                </div>
              </div>

              <div 
                className="p-4 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-card)] flex items-start gap-3 group"
                style={{
                  transition: "all 0.3s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(184,160,96,0.08)",
                }}
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] text-xs">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm" style={{ color: "var(--color-text)" }}>24시간 AI 어시스턴트</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>하루 종일 운영을 도와줍니다</p>
                </div>
              </div>

              <div 
                className="p-4 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-card)] flex items-start gap-3 group"
                style={{
                  transition: "all 0.3s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(184,160,96,0.08)",
                }}
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] text-xs">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm" style={{ color: "var(--color-text)" }}>채널 운영을 AI에게 맡기세요</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>지능형 대화로 운영을 지원합니다</p>
                </div>
              </div>

              <div 
                className="p-4 rounded-lg border border-[var(--color-accent-border)] bg-[var(--color-card)] flex items-start gap-3 group"
                style={{
                  transition: "all 0.3s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(184,160,96,0.08)",
                }}
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-bg)] text-xs">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium text-sm" style={{ color: "var(--color-text)" }}>지능형 대화</h4>
                  <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>자연스러운 대화를 경험하세요</p>
                </div>
              </div>
            </div>

            <Link
              href="/app/chat"
              className="inline-flex items-center gap-1 text-sm font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              AI 비서 만나러 가기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-xl overflow-hidden border border-[var(--color-accent-border)] shadow-lg"
              style={{
                background: "var(--color-card)",
              }}
            >
              <Image
                src="/landing/TeleMon AI 시스템 소개.png"
                alt="TeleMon AI 시스템 소개"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative rounded-xl overflow-hidden border border-[var(--color-accent-border)] shadow-lg"
              style={{
                background: "var(--color-card)",
              }}
            >
              <Image
                src="/landing/프리미엄 AI 자동화 솔루션.png"
                alt="프리미엄 AI 자동화 솔루션"
                width={600}
                height={400}
                className="w-full h-auto object-cover"
                priority
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}