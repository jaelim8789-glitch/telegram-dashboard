"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="tm-section-bg relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">
      {/* Subtle background texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--text) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-xs uppercase tracking-[0.2em] mb-6"
          style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}
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
          <span style={{ color: "var(--accent)" }}>{t("hero.title2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-6 text-base sm:text-lg max-w-2xl mx-auto"
          style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)", lineHeight: 1.7 }}
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
          <p className="text-xs italic leading-relaxed" style={{ color: "var(--text-muted)" }}>
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
            href="/signup"
            className="btn-luxury btn-luxury-primary"
          >
            {t("app.start")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/features"
            className="btn-luxury btn-luxury-secondary"
          >
            {t("app.features")}
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