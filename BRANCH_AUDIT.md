# Branch Audit Report

> Generated: 2026-07-22
> Base branch: `origin/master` (tip: `57773da`)
> Method: `git branch -r --merged` + `git diff master...branch --stat` + manual review

---

## (a) 이미 master에 반영됨 → 삭제 대상 (33 branches)

이 브랜치들은 `git branch -r --merged origin/master`로 확인된, 이미 master에 병합된 브랜치입니다. 안전하게 삭제할 수 있습니다.

| # | Branch | 마지막 커밋일 | Diff (master 대비) | 비고 |
|---|--------|-------------|-------------------|------|
| 1 | `origin/develop/telemon-v2-20260714` | 2026-07-14 | 0 files changed | 개발 브랜치, 이미 병합됨 |
| 2 | `origin/feat-dashboard-health-recovery` | 2026-07-11 | 0 files changed | 병합 완료 |
| 3 | `origin/feat-recurring-scheduler-frontend` | 2026-07-11 | 0 files changed | 병합 완료 |
| 4 | `origin/feat/auto-reply-macro-operations-upgrade` | 2026-07-11 | 0 files changed | 병합 완료 |
| 5 | `origin/feat/delivery-analytics-operations-upgrade` | 2026-07-11 | 0 files changed | 병합 완료 |
| 6 | `origin/feat/group-retry-send-draft-integration` | 2026-07-11 | 0 files changed | 병합 완료 |
| 7 | `origin/feat/guest-engine-poc` | 2026-07-20 | 0 files changed | POC 실험, 병합 완료 |
| 8 | `origin/feat/miniapp-deepseek-pixeloffice` | 2026-07-22 | 0 files changed | 병합 완료 |
| 9 | `origin/feat/miniapp-ux-20` | 2026-07-22 | 0 files changed | 병합 완료 |
| 10 | `origin/feat/miniapp-ux-next20` | 2026-07-22 | 0 files changed | 병합 완료 |
| 11 | `origin/feat/mobile-account-auth-canonical` | 2026-07-11 | 0 files changed | 병합 완료 |
| 12 | `origin/feat/mobile-integrate` | 2026-07-11 | 0 files changed | 병합 완료 |
| 13 | `origin/feat/mobile-ux-next20` | 2026-07-22 | 0 files changed | 병합 완료 |
| 14 | `origin/feat/mobile-ux-next20-v2` | 2026-07-22 | 0 files changed | 병합 완료 |
| 15 | `origin/feat/mobile-ux-next20-v3` | 2026-07-22 | 0 files changed | 병합 완료 |
| 16 | `origin/feat/mobile-ux-next20-v4` | 2026-07-22 | 0 files changed | 병합 완료 |
| 17 | `origin/feat/mobile-ux-next20-v5` | 2026-07-22 | 0 files changed | 병합 완료 |
| 18 | `origin/feat/monetization-and-workflow` | 2026-07-20 | 0 files changed | 병합 완료 |
| 19 | `origin/feat/trial-status-frontend` | 2026-07-12 | 0 files changed | 병합 완료 |
| 20 | `origin/feat/ui-ux-improvements-20260713` | 2026-07-13 | 0 files changed | 병합 완료 |
| 21 | `origin/feat/workspace-v2-nicegram-plus` | 2026-07-16 | 0 files changed | 병합 완료 |
| 22 | `origin/fix/recovery-r3-20260715` | 2026-07-15 | 0 files changed | 병합 완료 |
| 23 | `origin/integrate/dyad-design-update-20260712` | 2026-07-12 | 0 files changed | 병합 완료 |
| 24 | `origin/integrate/dyad-landing-design` | 2026-07-12 | 0 files changed | 병합 완료 |
| 25 | `origin/integrate/final-telemon-consolidation` | 2026-07-12 | 0 files changed | 병합 완료 |
| 26 | `origin/integrate/final-ui-ux-20260713` | 2026-07-14 | 0 files changed | 병합 완료 |
| 27 | `origin/integrate/frontend-final-20260712` | 2026-07-12 | 0 files changed | 병합 완료 |
| 28 | `origin/integrate/frontend-launch-fixes-20260712` | 2026-07-12 | 0 files changed | 병합 완료 |
| 29 | `origin/integrate/mobile-recurring-operations` | 2026-07-11 | 0 files changed | 병합 완료 |
| 30 | `origin/integrate/pre-launch-stabilization-20260713` | 2026-07-13 | 0 files changed | 병합 완료 |
| 31 | `origin/integrate/recovery-20260714` | 2026-07-14 | 0 files changed | 병합 완료 |
| 32 | `origin/release-20260715` | 2026-07-16 | 0 files changed | 릴리스 브랜치, 병합 완료 |
| 33 | `origin/worktree/kiro` | 2026-07-19 | 0 files changed | Kiro 작업트리, 병합 완료 |

---

## (b) 아직 유효하고 살릴 가치 있음 → merge 후보 (13 branches)

### 신규 기능 개발 (Qoder — 2026-07-22, 오늘 생성)

| # | Branch | 마지막 커밋 | Diff | 설명 |
|---|--------|-----------|------|------|
| 1 | `origin/feat-accounts-ai-assistant` | 07-22 20:56 | 16 files, +792 | 계정 관리 테이블 + AI 어시스턴트 채팅 |
| 2 | `origin/feat-analytics-dashboard` | 07-22 20:55 | 9 files, +485 | 분석 대시보드 (통계/차트/Top-5) |
| 3 | `origin/feat-chat-management-redesign` | 07-22 20:54 | 6 files, +658 | 3-패널 채팅 관리 + 퍼플 테마 |
| 4 | `origin/feat-dark-purple-theme-sidebar` | 07-22 21:28 | 7 files, +398/-282 | 다크 퍼플/블루 테마 + 사이드바 개선 |
| 5 | `origin/feat-macro-flow-editor` | 07-22 20:54 | 14 files, +1053 | 노드 기반 매크로 플로우 에디터 (React Flow) |
| 6 | `origin/feat/mobile-workspace-20` | 07-22 18:12 | 34 files, +2034/-127 | 모바일 워크스페이스 v2 (포괄적 개선) |

### 의존성 자동 업데이트 (dependabot — 2026-07-22)

| # | Branch | Diff | 비고 |
|---|--------|------|------|
| 7 | `origin/dependabot/npm_and_yarn/jscpd-5.0.12` | 2 files, +60 | jscpd 5.0.12 |
| 8 | `origin/dependabot/npm_and_yarn/knip-6.27.0` | 2 files, +35 | knip 6.27.0 |
| 9 | `origin/dependabot/npm_and_yarn/nextjs-76b8cb21aa` | 2 files, +41 | Next.js |
| 10 | `origin/dependabot/npm_and_yarn/react-dad16014af` | 2 files, +26 | React |
| 11 | `origin/dependabot/npm_and_yarn/storybook-913ea631f4` | 2 files, +87 | Storybook |
| 12 | `origin/dependabot/npm_and_yarn/types/node-26.1.1` | 2 files, +49 | @types/node 26.1.1 |

### 릴리스 후보

| # | Branch | 마지막 커밋 | Diff | 설명 |
|---|--------|-----------|------|------|
| 13 | `origin/release-rc-1` | 07-16 19:57 | 67 files, +4610/-819 | Release Candidate 1. master에 미병합된 pre-launch 픽스 포함. rebase 후 병합 필요. |

---

## (c) 오래되고 폐기된 실험 → 삭제 대상 (32 branches)

이 브랜치들은 2026-07-11 ~ 07-13 기간에 생성된 오래된 기능/통합 브랜치들입니다. 당시 스프린트/런칭 준비 과정에서 생성되었으며, 이후 `integrate/` 및 `release-` 브랜치들을 통해 master에 반영되거나 다른 방식으로 대체되어 현재는 폐기된 상태입니다.

### feat/ 브랜치 (슬래시 구분, 9개)

| # | Branch | 마지막 커밋 | Diff | 이유 |
|---|--------|-----------|------|------|
| 1 | `origin/feat/dashboard-operations-command-center` | 07-11 14:03 | 1 file, +447/-328 | 대시보드 개선, 이후 integrate 브랜치로 대체됨 |
| 2 | `origin/feat/failure-recovery` | 07-11 10:02 | 4 files, +381/-88 | 장애 복구, 이후 recovery 브랜치로 대체됨 |
| 3 | `origin/feat/group-discovery-upgrade` | 07-11 15:10 | 4 files, +861/-500 | 그룹 발견 업그레이드, 11일간 방치 |
| 4 | `origin/feat/launch-integration` | 07-11 10:30 | 2 files, +128/-55 | 통합 브랜치와 중복 |
| 5 | `origin/feat/group-discovery-upgrade` | 07-11 15:10 | 4 files, +861/-500 | 실험적 디자인 변경, 오래됨 |
| 6 | `origin/feat/recurring-exec-intel` | 07-11 10:35 | 3 files, +60/-16 | 작은 변경, 실행 인텔, 방치됨 |
| 7 | `origin/feat/send-draft-persistence` | 07-11 12:08 | 4 files, +169/-15 | 충돌 해결 커밋이 마지막, 이후 통합됨 |
| 8 | `origin/feat/send-preflight-upgrade` | 07-11 09:25 | 2 files, +205/-10 | preflight 업그레이드, 중복 |
| 9 | `origin/feat/send-recipient-review-canonical` | 07-11 12:13 | 5 files, +284/-29 | 수신자 검토, 정식 버전으로 대체 |
| 10 | `origin/feat/send-smart-recipient-integration` | 07-11 13:40 | 3 files, +262/-22 | 스마트 수신자 통합, 중복 |
| 11 | `origin/feat/send-smart-recipient-operations` | 07-11 12:17 | 3 files, +263/-23 | 스마트 수신자 운영, 중복 |
| 12 | `origin/feat/public-homepage-production-upgrade` | 07-11 12:47 | 4 files, +612/-601 | 홈페이지 업그레이드, dyad 디자인으로 대체 |
| 13 | `origin/feat/workspace-command-palette-upgrade` | 07-11 12:41 | 4 files, +411 | 커맨드 팔레트, 이후 integrate에서 처리 |
| 14 | `origin/feat/mobile-recurring-operations` | 07-11 12:35 | 3 files, +921/-259 | 모바일 recurring, 통합 브랜치로 대체 |
| 15 | `origin/feat/mobile-account-auth-ux` | 07-11 11:31 | 3 files, +108/-124 | 모바일 계정 UX, canonical로 대체 |
| 16 | `origin/feat/mobile-failure-recovery-ux` | 07-11 11:14 | 4 files, +121/-156 | 모바일 장애 복구 UX, 통합됨 |

### feat- 브랜치 (하이픈 구분, 4개)

| # | Branch | 마지막 커밋 | Diff | 이유 |
|---|--------|-----------|------|------|
| 17 | `origin/feat-dashboard-failure-intel` | 07-11 10:05 | 3 files, +30/-7 | 작은 대시보드 개선, 11일 방치 |
| 18 | `origin/feat-group-discovery-workflow` | 07-11 11:00 | 1 file, +89/-11 | 그룹 발견 워크플로, 실험적 |
| 19 | `origin/feat-group-retry-send-draft-integration` | 07-11 11:22 | 3 files, +1/-779 | 대부분 삭제 위주, 정리 브랜치 |
| 20 | `origin/feat-recurring-duplicate` | 07-11 09:26 | 1 file, +30/-5 | 사소한 변경, 방치 |

### feature/ 브랜치 (3개)

| # | Branch | 마지막 커밋 | Diff | 이유 |
|---|--------|-----------|------|------|
| 21 | `origin/feature/bulk-link-inspector` | 07-12 22:48 | 7 files, +535/-2 | 벌크 링크 검사기, smart-join-queue로 발전 |
| 22 | `origin/feature/smart-join-queue-20260713` | 07-13 00:48 | 1 file, +323/-16 | 초기 smart-join-queue, 이후 backend-integration으로 발전 |
| 23 | `origin/feature/smart-join-queue-backend-integration` | 07-13 01:41 | 2 files, +672/-17 | 백엔드 통합 버전, 이후 integrate 브랜치에 흡수 |
| 24 | `origin/feature/send-recipient-review-bulk-cleanup` | 07-11 11:35 | 4 files, +145/-82 | 수신자 검토 정리, canonical로 대체 |
| 25 | `origin/feature/workspace-nav-reconciliation` | 07-11 09:40 | 2 files, +115/-48 | 워크스페이스 네비게이션, 병합/대체됨 |

### fix/ 브랜치 (3개)

| # | Branch | 마지막 커밋 | Diff | 이유 |
|---|--------|-----------|------|------|
| 26 | `origin/fix/p0-3-and-p0-5-api-key-billing` | 07-12 18:54 | 7 files, +372/-35 | P0/P5 API 키 과금 픽스, 이후 통합됨 |
| 27 | `origin/fix/signup-plan-flow` | 07-12 20:32 | 8 files, +381/-36 | 회원가입 플랜 플로우 픽스, 병합/대체됨 |
| 28 | `origin/fix/smoke-test-launch` | 07-12 23:31 | 1 file, +36/-3 | 스모크 테스트, 이후 버전에서 처리 |

### 기타 (7개)

| # | Branch | 마지막 커밋 | Diff | 이유 |
|---|--------|-----------|------|------|
| 29 | `origin/hotfix-group-limit-deploy` | 07-13 17:19 | 7 files, +39/-63 | 핫픽스, 이후 정식 릴리스에서 반영 |
| 30 | `origin/integrate/free-api-key-channel-20260712` | 07-13 10:01 | 6 files, +1069/-88 | 무료 API 키 채널 통합, 이후 merge됨 |
| 31 | `origin/qa-launch-fixes-20260711` | 07-11 15:13 | 5 files, +19/-80 | 런칭 QA 픽스, 11일 방치 |
| 32 | `origin/reconcile-account-upgrade` | 07-11 10:29 | 3 files, +493/-97 | 계정 업그레이드 조정, 방치 |
| 33 | `origin/dyad-landing-design-snapshot` | 07-12 14:23 | 171 files, +16616/-9832 | Dyad 디자인 스냅샷. 매우 큰 변경사항이지만 이후 dyad-design-update/integrate 브랜치에 흡수됨 |

---

## 요약

| 분류 | 개수 | 조치 |
|------|------|------|
| (a) 이미 병합됨 → 삭제 | **33** | `git push origin --delete` 로 안전하게 삭제 가능 |
| (b) merge 후보 | **13** | Qoder 6개 + dependabot 6개 + release-rc-1 |
| (c) 폐기됨 → 삭제 | **32** | 삭제 전 내용 확인 권장 (특히 dyad-landing-design-snapshot 등 큰 브랜치) |
| **합계** | **78** | origin/HEAD, origin/master 제외 |

---

## 참고: Master 최근 커밋

```
57773da fix: 10 critical launch-blocking bugs
7f385bc fix(urgent): encoding UTF-8 recovery
cb15d6b merge: origin/master (encoding fix)
```

## 실행 예시 (삭제 명령)

```bash
# Category (a) 일괄 삭제
git push origin --delete develop/telemon-v2-20260714 feat-dashboard-health-recovery ...
```

> **주의**: 위 명령은 직접 실행하지 마세요. 승인 후 진행합니다.
