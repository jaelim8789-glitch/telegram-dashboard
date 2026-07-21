"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="tm-section-bg relative min-h-[90vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden px-6 sm:px-6 lg:px-8 satin-overlay luxury-hero">
      {/* Metallic sheen overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] sm:opacity-[0.03]"
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

      {/* Gold accent line top */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-40 hidden sm:block" />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="gold-smallcaps mb-4 sm:mb-6 flex items-center justify-center gap-2"
        >
          <Sparkles className="h-3 w-3" />
          TeleMon — {t("app.tagline")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-[2rem] sm:text-6xl lg:text-7xl font-bold luxury-hero-title"
          style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.03em" }}
        >
          {t("hero.title1")}
          <br />
          <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-gold-deep)] bg-clip-text text-transparent">
            {t("hero.title2")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-4 sm:mt-6 text-sm sm:text-lg max-w-2xl mx-auto luxury-hero-subtitle"
          style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
        >
          {t("hero.subtitle")}
        </motion.p>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="h-px w-24 sm:w-32 mx-auto mt-6 sm:mt-8 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent origin-center"
        />

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="mt-6 sm:mt-10 max-w-lg mx-auto px-4"
        >
          <p className="italic-script text-[11px] sm:text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            &ldquo;{t("hero.quote")}&rdquo;
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Link
            href="/features"
            className="btn-luxury btn-luxury-secondary w-full sm:w-auto justify-center text-xs sm:text-sm"
          >
            {t("app.features")}
          </Link>
          <Link
            href="/signup"
            className="btn-luxury btn-luxury-primary w-full sm:w-auto justify-center text-xs sm:text-sm group"
          >
            <span>{t("app.start")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
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