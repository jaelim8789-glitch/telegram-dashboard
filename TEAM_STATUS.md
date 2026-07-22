# TeleMon V3  현황 & 실행

> 마지막 갱신: 2026-07-22 13:41 KST

## 1줄 요약

| 상태 | 내용 |
|------|------|
| 📦 최신 배포: `5d083f4` feat: visual regression tests (3시간 전 by Qoder) |
| ✅ CI: failure (npm_and_yarn) |
| 📋 미해결 이슈: 0건 |
| 🟢 긴급 상태: 정상 |

## 담당자별 파일 영역 (소유권 매트릭스)

| 경로 | 담당 팀 |
|------|---------|
| `src/app/(public)/` | Public Pages Team |
| `src/app/admin/` | Admin Dashboard Team |
| `src/app/api/` | API Team |
| `src/app/app/` | Core App Team |
| `src/app/miniapp/` | Mini App Team |
| `src/components/ai/` | AI Team |
| `src/components/layout/` + `Sidebar.tsx` | Layout Team |
| `src/components/navigation/` | Navigation Team |
| `src/components/telegram-chat/` | Chat Team |
| `src/components/ui/` | UI Components Team |
| `src/components/workspace/` | Workspace Team |
| `src/hooks/` | Hooks Team |
| `src/lib/` | Lib Team |
| `src/store/` | Store Team |
| `src/types/` | Types Team |
| `e2e/` | E2E Test Team |
| `scripts/` | DevOps Team |

## 팀 협업 규칙

### 긴급도 표시 (🔴🟡🟢)

- 🔴 **차단**: push/merge 금지. 즉시 해결 필요
- 🟡 **주의**: 해결 전까지 해당 파일 수정 금지
- 🟢 **정상**: 작업 가능

### 전체 중단 프로토콜

충돌/장애 시: `bash scripts/team/pause-all.sh "사유"`
해제: `bash scripts/team/resume-all.sh`
pre-push 훅이 자동 차단함

### 테스트 계정 정책

⚠️ 실제 사용자 계정으로 테스트 금지
전용 테스트 계정: `bash scripts/team/use-test-tenant.sh`

## 진행 중 작업

| 우선순위 | 작업 | 담당자 |
|----------|------|--------|
| 🔴 | #6 api.ts God 파일 분할 (2600라인) | TBD |
| 🟡 | #19 camelCaseKeys 중복 제거 (20+개 함수) | TBD |

## 최근 배포

| 일자 | 커밋 | 설명 |
|------|------|------|
| 2026-07-22 | `ed61123` | offline cache, inspector sheet, KPI bar, drilldown |
| 2026-07-22 | `8b146c4` | mobile dashboard UI/UX - 20 components |
| 2026-07-22 | `5d083f4` | visual regression tests, deploy timeline, slow API detection |
| 2026-07-22 | `2ea510d` | bulk fix 28/30 issues - security, race, perf, UX, i18n |

## 툴/스크립트 목록

| 명령어 | 설명 | 실행 |
|--------|------|------|
| `/team-status` | TEAM_STATUS.md 1줄 요약 갱신 | `bash scripts/team/update-status.sh` |
| `/handoff` | 인수인계 템플릿 생성 | `bash scripts/team/handoff.sh <session-id>` |
| `blame-summary` | 파일 마지막 수정자 1줄 조회 | `bash scripts/team/blame-summary.sh <file>` |
| `ci-summary` | CI 실패 원인 요약 | `bash scripts/team/ci-summary.sh [run-id]` |
| `weekly-report` | 주간 변경 리포트 | `bash scripts/team/weekly-report.sh` |
| `deploy-checklist` | 배포 전 자동 검증 | `bash scripts/team/deploy-checklist.sh` |
| `agent-timeline` | 오늘 작업 타임라인 | `bash scripts/team/agent-timeline.sh [date]` |
| `pause-all` | 긴급 전체 중단 | `bash scripts/team/pause-all.sh "사유"` |
| `resume-all` | 중단 해제 | `bash scripts/team/resume-all.sh` |
| `faq` | FAQ 조회 | `.kilo/FAQ.md` |
