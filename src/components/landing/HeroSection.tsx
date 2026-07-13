"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="tm-section-bg relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 satin-overlay">
      {/* Metallic sheen overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          background: `linear-gradient(135deg, 
            transparent 0%, 
            var(--color-accent-glow) 30%, 
            transparent 50%,
            var(--color-accent-glow) 70%,
            transparent 100%
          )`,
          backgroundSize: '400% 400%',
          animation: 'gold-shimmer 6s ease-in-out infinite',
        }}
      />

      {/* Subtle background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-text) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="gold-smallcaps mb-6"
        >
          TeleMon — {t("app.tagline")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold"
          style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}
        >
          {t("hero.title1")}
          <br />
          <span style={{ color: "var(--color-accent)" }}>{t("hero.title2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-6 text-base sm:text-lg max-w-2xl mx-auto"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="mt-10 max-w-lg mx-auto"
        >
          <p className="italic-script text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            {t("hero.quote")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/features"
            className="btn-luxury btn-luxury-secondary"
          >
            {t("app.features")}
          </Link>
          <Link
            href="/signup"
            className="btn-luxury btn-luxury-secondary"
          >
            {t("app.start")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div className="scroll-indicator">
        <div className="scroll-line" />
        <div className="scroll-chevron" />
      </div>
    </section>
  );
}