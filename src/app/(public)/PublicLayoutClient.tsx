"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE } from "@/lib/site";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSwitcher } from "@/components/landing/LanguageSwitcher";
import { AnnouncementBanner } from "@/components/landing/AnnouncementBanner";
import { ScrollProgress } from "@/components/landing/ScrollProgress";
import { GoldCursor } from "@/components/ui/GoldCursor";
import { useTranslation } from "@/lib/i18n";

const pageVariants = {
  initial: { opacity: 0, scale: 0.98, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: 24, rotateX: -15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.5, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function PublicLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useTranslation();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  const menuItems = [
    { href: "/features", label: t("app.features") },
    { href: "/pricing", label: t("app.pricing") },
    { href: "/get-api-key", label: t("app.apiKey") },
    { href: "/changelog", label: t("app.updates") },
    { href: "/#faq", label: t("app.faq") },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-app-bg leather-bg">
      <GoldCursor />
      <ScrollProgress />

      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-glass-bg)] backdrop-blur-2xl border-b border-[var(--color-accent-border)] satin-overlay transition-all duration-300 ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className={`mx-auto flex max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12 transition-all duration-300 ${
          scrolled ? "h-12" : "h-16"
        }`}>
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] text-xs font-bold tracking-wider shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[var(--color-accent-glow)]">
              TM
            </div>
            <span className="text-base font-semibold heritage-heading">
              Tele<span className="text-[var(--color-accent)]">Mon</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            <Link href="/features" className="tab-heritage">{t("app.features")}</Link>
            <Link href="/pricing" className="tab-heritage">{t("app.pricing")}</Link>
            <Link href="/get-api-key" className="tab-heritage">{t("app.apiKey")}</Link>
            <Link href="/changelog" className="tab-heritage">{t("app.updates")}</Link>
            <Link href="/#faq" className="tab-heritage">{t("app.faq")}</Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle className="hidden md:flex" />

            {/* Luxury hamburger — animated gold-tinted button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex items-center justify-center rounded-full w-11 h-11 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all md:hidden border border-[var(--color-accent-border)]"
              aria-label="메뉴 열기"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M3 5H15M3 9H15M3 13H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <Link href="/admin/login" className="btn-heritage-secondary px-5 py-1.5 text-xs animate-gold-shimmer">{t("app.login")}</Link>
              <Link href="/signup" className="btn-heritage px-5 py-1.5 text-xs">{t("app.start")}</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Full-screen luxury overlay menu (mobile only) */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            key="mobile-menu-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="luxury-mobile-overlay md:hidden"
          >
            {/* TM watermark */}
            <div className="absolute top-8 left-6 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] text-xs font-bold tracking-wider">
                TM
              </div>
              <span className="text-sm font-semibold heritage-heading">
                Tele<span className="text-[var(--color-accent)]">Mon</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="luxury-mobile-menu-close"
              aria-label="메뉴 닫기"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            <nav className="relative z-10 flex flex-col items-center text-center">
              {menuItems.map((item, i) => (
                <motion.div
                  key={item.href}
                  custom={i}
                  variants={menuItemVariants}
                  initial="hidden"
                  animate="visible"
                  className="overflow-hidden"
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="luxury-mobile-nav-link"
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div
                custom={menuItems.length}
                variants={menuItemVariants}
                initial="hidden"
                animate="visible"
                className="mt-12 w-full max-w-[240px] space-y-3"
              >
                <div className="divider-heritage" />
                <Link
                  href="/admin/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="btn-luxury btn-luxury-secondary w-full justify-center text-sm"
                >
                  {t("app.login")}
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileNavOpen(false)}
                  className="btn-luxury btn-luxury-primary w-full justify-center text-sm"
                >
                  {t("app.start")}
                </Link>
              </motion.div>

              <motion.div
                custom={menuItems.length + 2}
                variants={menuItemVariants}
                initial="hidden"
                animate="visible"
                className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-6"
              >
                <ThemeToggle />
                <LanguageSwitcher />
              </motion.div>
            </nav>

            {/* Bottom gold line */}
            <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent opacity-30" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-16">
        <AnnouncementBanner />
      </div>

      {/* Page transition wrapper */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="border-t border-[var(--color-accent-border)] bg-[var(--color-bg-surface)] relative z-10 leather-bg">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-12">
          <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-gold-deep)] text-[var(--color-bg)] text-xs font-bold">
                  TM
                </div>
                <span className="text-base font-semibold heritage-heading">
                  Tele<span className="text-[var(--color-accent)]">Mon</span>
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed max-w-xs">
                {t("app.tagline")}
              </p>
              <div className="gold-beam !m-0" />
            </div>
            {[
              { title: "Service", links: [[t("app.features"), "/features"],[t("app.pricing"), "/pricing"],[t("app.apiKey"), "/get-api-key"]] },
              { title: "Resources", links: [[t("app.updates"), "/changelog"],[t("app.faq"), "/#faq"]] },
              { title: "Contact", links: [[t("app.support"), `mailto:${SITE.support.email}`],["Telegram", `https://t.me/${SITE.support.telegram.replace("@", "")}`]] },
            ].map((section) => (
              <div key={section.title}>
                <h3 className="mb-5 text-xs font-semibold text-[var(--color-text)] uppercase tracking-[0.12em]">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="divider-heritage mt-14 mb-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-[var(--color-text-muted)]">&copy; {new Date().getFullYear()} TeleMon. {t("app.allRightsReserved")}</p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">{t("app.terms")}</Link>
              <Link href="/privacy" className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">{t("app.privacy")}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}