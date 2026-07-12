"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SITE } from "@/lib/site";

const NAV_LINKS = [
  { label: "제품", href: "#product" },
  { label: "워크플로우", href: "#workflows" },
  { label: "기능", href: "#features" },
  { label: "FAQ", href: "#faq" },
];

export function PublicLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-app-bg">
      <header className="dashboard-header sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="focus-ring flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-app-primary to-orange-600 text-sm font-bold text-white shadow-lg shadow-app-primary/25">
              TM
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-app-text">Tele</span>
              <span className="text-app-primary">Mon</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((item) => (
              <a key={item.label} href={item.href} className="tab-premium focus-ring">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/login"
              className="focus-ring hidden min-h-11 items-center justify-center rounded-xl border border-app-border bg-app-card px-4 py-2 text-sm font-medium text-app-text transition-all hover:border-app-border-strong hover:bg-app-card-hover sm:inline-flex"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-app-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-app-primary-hover"
            >
              무료 시작
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-app-border bg-app-card p-2 text-app-text-muted transition-all hover:border-app-border-strong hover:bg-app-card-hover md:hidden"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileNavOpen}
              aria-controls="public-mobile-nav"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div id="public-mobile-nav" className="border-t border-app-border bg-app-card md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="Mobile">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="focus-ring rounded-xl px-3 py-3 text-sm font-medium text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text"
                  onClick={closeMobileNav}
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 flex gap-3">
                <Link
                  href="/admin/login"
                  className="focus-ring flex min-h-11 flex-1 items-center justify-center rounded-xl border border-app-border bg-app-bg px-4 py-2 text-sm font-medium text-app-text"
                  onClick={closeMobileNav}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/signup"
                    className="focus-ring flex min-h-11 flex-1 items-center justify-center rounded-xl bg-app-primary px-4 py-2 text-sm font-semibold text-white"
                    onClick={closeMobileNav}
                  >
                    무료 시작
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 pt-0">{children}</main>

      <footer className="border-t border-app-border/60 bg-app-surface/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-app-primary to-orange-600 text-sm font-bold text-white">
                  TM
                </div>
                <span className="text-lg font-bold tracking-tight">
                  <span className="text-app-text">Tele</span>
                  <span className="text-app-primary">Mon</span>
                </span>
              </div>
              <p className="max-w-sm text-sm leading-6 text-app-text-secondary">
                Telegram 계정 관리, 자동 응답, 예약 발송, 그룹 검색, 계정 건강 모니터링, 전달 분석까지.
                코딩 없이 하나의 대시보드에서 텔레그램을 완전 자동화하세요.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-app-text">둘러보기</h3>
              <ul className="space-y-3">
                {NAV_LINKS.slice(0, 3).map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="focus-ring text-sm text-app-text-secondary transition-colors hover:text-app-text">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-wide text-app-text">지원</h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href={`mailto:${SITE.support.email}`}
                    className="focus-ring text-sm text-app-text-secondary transition-colors hover:text-app-text"
                  >
                    {SITE.support.email}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://t.me/${SITE.support.telegram.replace("@", "")}`}
                    className="focus-ring text-sm text-app-text-secondary transition-colors hover:text-app-text"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {SITE.support.telegram}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="focus-ring text-sm text-app-text-secondary transition-colors hover:text-app-text">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="divider-gradient my-8" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-app-text-muted">
              &copy; {new Date().getFullYear()} TeleMon. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-app-text-muted">
              <Link href="/signup" className="focus-ring transition-colors hover:text-app-text">
                무료 시작
              </Link>
              <a href="#product" className="focus-ring transition-colors hover:text-app-text">
                제품 살펴보기
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
