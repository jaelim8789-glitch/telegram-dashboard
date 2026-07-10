"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SITE } from "@/lib/site";

export function PublicLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-app-bg">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 dashboard-header">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-app-primary to-orange-600 text-sm font-bold text-white shadow-lg shadow-app-primary/25 group-hover:shadow-app-primary/40 transition-all">
              TM
            </div>
            <span className="text-lg font-bold">
              <span className="text-app-text">Tele</span>
              <span className="text-app-primary">Mon</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link href="/features" className="tab-premium">
              기능
            </Link>
            <Link href="/pricing" className="tab-premium">
              요금제
            </Link>
            <Link href="/get-api-key" className="tab-premium">
              API 키 발급
            </Link>
            <a href="#faq" className="tab-premium">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex items-center justify-center rounded-lg p-2 text-app-text-muted hover:text-app-text hover:bg-app-card transition-all md:hidden"
              aria-label={mobileNavOpen ? "닫기" : "메뉴 열기"}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              href="/admin/login"
              className="btn-secondary rounded-lg px-4 py-2 text-sm"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="btn-primary rounded-lg px-5 py-2 text-sm font-medium relative z-10"
            >
              시작하기
            </Link>
          </div>
        </div>

        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div className="border-t border-app-border bg-app-card md:hidden">
            <nav className="flex flex-col px-4 py-3 space-y-1">
              <Link
                href="/features"
                className="rounded-lg px-3 py-2.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                기능
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg px-3 py-2.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                요금제
              </Link>
              <Link
                href="/get-api-key"
                className="rounded-lg px-3 py-2.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                API 키 발급
              </Link>
              <a
                href="#faq"
                className="rounded-lg px-3 py-2.5 text-sm text-app-text hover:bg-app-card-hover transition-colors"
                onClick={() => setMobileNavOpen(false)}
              >
                FAQ
              </a>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 pt-16">{children}</main>

      {/* Footer */}
      <footer className="border-t border-app-border/50 bg-app-surface/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-app-primary to-orange-600 text-sm font-bold text-white">
                  TM
                </div>
                <span className="text-lg font-bold">
                  <span className="text-app-text">Tele</span>
                  <span className="text-app-primary">Mon</span>
                </span>
              </div>
              <p className="text-sm text-app-text-secondary leading-relaxed">
                텔레그램 자동화의 모든 것.
                <br />
                하나의 대시보드로 관리하세요.
              </p>
            </div>
            {[
              {
                title: "서비스",
                links: [
                  ["기능 소개", "/features"],
                  ["요금제", "/pricing"],
                  ["API 키 발급", "/get-api-key"],
                ],
              },
              {
                title: "문서",
                links: [
                  ["API 문서", "#"],
                  ["사용 가이드", "#"],
                  ["자주 묻는 질문", "#faq"],
                ],
              },
              {
                title: "문의",
                links: [
                  ["이메일", `mailto:${SITE.support.email}`],
                  ["텔레그램", `https://t.me/${SITE.support.telegram.replace("@", "")}`],
                ],
              },
            ].map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 text-sm font-semibold text-app-text tracking-wide">
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-app-text-secondary hover:text-app-text transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="divider-gradient mt-12 mb-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-app-text-muted">
              &copy; {new Date().getFullYear()} TeleMon. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-app-text-muted">
              <Link
                href="#"
                className="hover:text-app-text transition-colors"
              >
                이용약관
              </Link>
              <Link
                href="#"
                className="hover:text-app-text transition-colors"
              >
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
