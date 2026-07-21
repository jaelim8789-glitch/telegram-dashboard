"use client";

import { motion } from "framer-motion";
import { Bot, MessageCircle, Clock, Sparkles } from "lucide-react";
import Image from "next/image";

const AI_FEATURES = [
  { 
    icon: MessageCircle, 
    title: "질문하면 AI가 바로 답변", 
    desc: "채널 운영에 대한 질문을 자연스럽게 물어보세요. AI 비서가 실시간으로 도와줍니다." 
  },
  { 
    icon: Clock, 
    title: "24시간 AI 어시스턴트", 
    desc: "언제든지 AI가 대기하고 있어, 밤낮 없이 채널 운영을 도와줍니다." 
  },
  { 
    icon: Bot, 
    title: "채널 운영을 AI에게 맡기세요", 
    desc: "AI가 자동으로 메시지를 보내고, 응답하고, 채널을 관리합니다." 
  },
  { 
    icon: Sparkles, 
    title: "지능형 대화", 
    desc: "AI는 단순한 키워드가 아닌, 진짜 대화를 이해하고 자연스럽게 응답합니다." 
  },
];

export function OperationalStatus() {
  return (
    <section className="tm-section-bg px-4 sm:px-6 lg:px-8 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <div className="text-center lg:text-left mb-10 lg:mb-0">
              <p className="text-xs uppercase tracking-[0.15em] mb-3" style={{ color: "var(--color-accent)" }}>
                AI 어시스턴트
              </p>
              <h2 className="section-heading text-2xl sm:text-3xl">
                <span style={{ color: "var(--color-accent)" }}>나만의 AI</span>와 함께
              </h2>
              <p className="mt-3 text-sm editorial-body max-w-lg mx-auto lg:mx-0">
                AI 비서가 대화하듯 채널 운영을 도와줍니다.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-10">
              {AI_FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                    className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-center text-center"
                    style={{
                      borderTop: "4px solid var(--color-accent)",
                    }}
                  >
                    {/* 상단 우측 TM 배지 */}
                    <div className="absolute -top-2.5 right-4 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm">
                      TM
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-lg mb-4 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] shadow-md">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{feature.desc}</p>

                    {/* 하단 장식선 */}
                    <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Image Content */}
          <div className="flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <Image
                src="/landing/AI assistant in a sleek office.png"
                alt="AI 비서 이미지"
                width={500}
                height={500}
                className="rounded-xl shadow-2xl"
                priority
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}