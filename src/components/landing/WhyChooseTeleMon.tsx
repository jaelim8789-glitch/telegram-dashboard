"use client";

import { motion } from "framer-motion";
import { Zap, Settings, Shield, Bot } from "lucide-react";
import Image from "next/image";

const REASONS = [
  { 
    icon: Zap, 
    title: "빠른 설정", 
    desc: "전화번호 인증만으로 계정을 간편하게 연결하고, 몇 분 안에 자동화를 시작할 수 있습니다." 
  },
  { 
    icon: Settings, 
    title: "강력한 자동화", 
    desc: "예약 발송, 키워드 기반 자동 응답, 반복 작업 등 다양한 자동화 기능을 제공합니다." 
  },
  { 
    icon: Shield, 
    title: "안전한 운영", 
    desc: "Telegram 정책을 준수하는 방식으로 계정 보호 및 데이터 암호화를 제공합니다." 
  },
  { 
    icon: Bot, 
    title: "AI 지원", 
    desc: "AI 비서가 채널 운영을 도와주며, 자연스러운 대화와 운영을 지원합니다." 
  },
];

export function WhyChooseTeleMon() {
  return (
    <div className="mx-auto max-w-6xl w-full"> {/* w-full 추가 */}
      <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-accent)" }}>
            TeleMon을 선택하는 이유
          </p>
          <div className="h-px w-6 bg-[var(--color-accent)] opacity-50" />
        </div>
        <h2 className="section-heading text-[1.375rem] sm:text-3xl luxury-section-title">
          왜 <span style={{ color: "var(--color-accent)" }}>TeleMon</span>을 선택해야 할까요?
        </h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm editorial-body luxury-section-desc">다른 플랫폼과 차별화된 TeleMon의 가치</p>
        <div className="h-px w-16 mx-auto mt-5 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
      </div>

      <div className="grid grid-cols-1 gap-8"> {/* 모바일에서는 단일 열로 변경 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {REASONS.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-5 sm:p-6 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 flex flex-col items-center text-center" // padding 조정
                style={{
                  borderTop: "4px solid var(--color-accent)",
                }}
              >
                {/* 상단 우측 TM 배지 */}
                <div className="absolute -top-2.5 right-3 sm:right-4 h-5 w-5 flex items-center justify-center rounded-full bg-[var(--color-accent)] text-[8px] font-bold text-[var(--color-bg)] shadow-sm">
                  TM
                </div>

                <div className="flex h-12 w-12 items-center justify-center rounded-lg mb-4 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] shadow-md">
                  <Icon className="h-6 w-6" />
                </div>

                <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--color-text)" }}>{reason.title}</h3>
                <p className="text-xs sm:text-sm leading-relaxed text-center" style={{ color: "var(--color-text-secondary)" }}>{reason.desc}</p>

                {/* 하단 장식선 */}
                <div className="mt-4 h-px w-0 bg-gradient-to-r from-[var(--color-accent)] to-transparent transition-all duration-500 group-hover:w-full" />
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"> {/* 간격 조정 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-lg overflow-hidden border border-[var(--color-accent-border)] shadow-lg aspect-square"
            style={{
              background: "var(--color-card)",
            }}
          >
            <Image
              src="/landing/Corporate elegance in a tech space.png"
              alt="Corporate elegance in a tech space"
              width={300}
              height={300}
              className="w-full h-full object-cover"
              priority
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-lg overflow-hidden border border-[var(--color-accent-border)] shadow-lg aspect-square"
            style={{
              background: "var(--color-card)",
            }}
          >
            <Image
              src="/landing/Serene portrait of a confident woman.png"
              alt="Serene portrait of a confident woman"
              width={300}
              height={300}
              className="w-full h-full object-cover"
              priority
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="relative rounded-lg overflow-hidden border border-[var(--color-accent-border)] shadow-lg aspect-square"
            style={{
              background: "var(--color-card)",
            }}
          >
            <Image
              src="/landing/Profesyonal na portrait ng kabataang babae.png"
              alt="Profesyonal na portrait ng kabataang babae"
              width={300}
              height={300}
              className="w-full h-full object-cover"
              priority
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.0 }}
            className="relative rounded-lg overflow-hidden border border-[var(--color-accent-border)] shadow-lg aspect-square"
            style={{
              background: "var(--color-card)",
            }}
          >
            <Image
              src="/landing/Seryoso at estilong portret ni lalaki.png"
              alt="Seryoso at estilong portret ni lalaki"
              width={300}
              height={300}
              className="w-full h-full object-cover"
              priority
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}