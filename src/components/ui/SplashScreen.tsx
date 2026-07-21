"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundColor: "var(--color-bg)" }}
        >
          {/* Gold shimmer background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              background: `linear-gradient(135deg, transparent 0%, var(--color-accent-glow) 30%, transparent 50%, var(--color-accent-glow) 70%, transparent 100%)`,
              backgroundSize: '400% 400%',
              animation: 'gold-shimmer 4s ease-in-out infinite',
            }}
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* Logo */}
            <div className="flex h-16 w-16 items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] shadow-2xl shadow-[var(--color-accent-glow)]">
              <span className="text-lg font-bold tracking-wider" style={{ color: "var(--color-accent-contrast)" }}>
                TM
              </span>
            </div>

            {/* Glow ring */}
            <div
              className="absolute -inset-4 rounded-full opacity-20 animate-pulse-glow-soft"
              style={{
                background: `radial-gradient(circle, var(--color-accent-glow) 0%, transparent 70%)`,
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
              Tele<span style={{ color: "var(--color-accent)" }}>Mon</span>
            </p>
            <p className="mt-2 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              텔레그램 자동화 플랫폼
            </p>
          </motion.div>

          {/* Bottom gold line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-16 left-1/4 right-1/4 h-px origin-center"
            style={{
              background: `linear-gradient(90deg, transparent, var(--color-accent), transparent)`,
            }}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.4 }}
            className="absolute bottom-8 text-[10px]"
            style={{ color: "var(--color-text-subtle)" }}
          >
            Loading...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
