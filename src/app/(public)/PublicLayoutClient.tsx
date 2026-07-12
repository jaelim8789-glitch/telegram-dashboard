"use client";

import { useState } from "react";
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
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function PublicLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useTranslation();
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-app-bg leather-bg">
      <GoldCursor />
      <ScrollProgress />

      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-glass-bg)] backdrop-blur-2xl border-b border-[var(--color-accent-border)] satin-overlay">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12">
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
            <a href="#faq" className="tab-heritage">{t("app.faq")}</a>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle className="hidden md:flex" />

            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex items-center justify-center rounded-md p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all md:hidden"
              aria-label={mobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}
            >
              {mobileNavOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M3 5H15M3 9H15M3 13H15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <Link href="/admin/login" className="btn-heritage-secondary px-5 py-1.5 text-xs animate-gold-shimmer">{t("app.login")}</Link>
              <Link href="/signup" className="btn-heritage px-5 py-1.5 text-xs">{t("app.start")}</Link>
            </div>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-[var(--color-accent-border)] bg-[var(--color-card)] md:hidden animate-fade-in">
            <nav className="flex flex-col px-6 py-4 space-y-1">
              <Link href="/features" className="tab-heritage w-full" onClick={() => setMobileNavOpen(false)}>{t("app.features")}</Link>
              <Link href="/pricing" className="tab-heritage w-full" onClick={() => setMobileNavOpen(false)}>{t("app.pricing")}</Link>
              <Link href="/get-api-key" className="tab-heritage w-full" onClick={() => setMobileNavOpen(false)}>{t("app.apiKey")}</Link>
              <Link href="/changelog" className="tab-heritage w-full" onClick={() => setMobileNavOpen(false)}>{t("app.updates")}</Link>
              <a href="#faq" className="tab-heritage w-full" onClick={() => setMobileNavOpen(false)}>{t("app.faq")}</a>
              <div className="pt-4 mt-3 border-t border-[var(--color-accent-border)] flex items-center gap-3">
                <Link href="/admin/login" className="btn-heritage-secondary w-full text-center py-1.5 text-xs">{t("app.login")}</Link>
                <Link href="/signup" className="btn-heritage w-full text-center py-1.5 text-xs">{t("app.start")}</Link>
              </div>
              <div className="flex items-center gap-2 pt-3">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            </nav>
          </div>
        )}
      </header>

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
              { title: "Resources", links: [[t("app.updates"), "/changelog"],[t("app.faq"), "#faq"]] },
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