# TeleMon V3 — 팀 상태 & 진행

> 마지막 갱신: 2026-07-22 08:45 KST

## 파일 소유자 표 (담당자별 관리 파일)

| 파일/디렉토리 | 담당자 |
|---------------|--------|
| src/app/(public)/ | Public Pages Team |
| src/app/admin/ | Admin Dashboard Team |
| src/app/api/ | API Team |
| src/app/app/ | Core App Team |
| src/app/miniapp/ | Mini App Team |
| src/components/admin/ | Admin Components Team |
| src/components/ai/ | AI Team |
| src/components/inspector/ | Inspector Team |
| src/components/landing/ | Landing Team |
| src/components/layout/ | Layout Team |
| src/components/navigation/ | Navigation Team |
| src/components/onboarding/ | Onboarding Team |
| src/components/sidebar/ | Sidebar Team |
| src/components/telegram-chat/ | Chat Team |
| src/components/ui/ | UI Components Team |
| src/components/workspace/ | Workspace Team |
| src/hooks/ | Hooks Team |
| src/lib/ | Lib Team |
| src/messages/ | Messages Team |
| src/store/ | Store Team |
| src/types/ | Types Team |
| src/workers/ | Workers Team |
| backend/ | Backend Team |
| e2e/ | E2E Test Team |
| public/ | Public Assets Team |
| config/ | Config Team |

## V3 리디자인 — 완료 (3단계)

| 단계 | 커밋 | 내용 |
|------|------|------|
| 1 | `5c7fafb` | AI 채팅 첫 화면 + 웰컴 카드(AiWelcomeCard) + 카테고리 내비게이션 |
| 2 | `9324125` | AI 직원 카드(AiStaffBoard) — 6명(AI 마케터/웹서치/무당/법률/글쓰기/운영비서) + 플로팅 AI 버튼 |
| 3 | `64eaa81` | 다크모드 `#090909`, 골드 `#D4AF37`, 시안 `#00D4FF`, 글래스모피즘 강화, 애니메이션 |

## 아키텍처 규칙

- 기존 기능 로직(API 호출, 훅, 상태관리)은 **절대 건드리지 않음**
- UI/스타일 레이어만 수정 (CSS, 레이아웃, 컴포넌트 구조)
- 각 단계는 독립적이며 이전 단계와 호환됨

## 신규 파일

```
src/components/ai/AiWelcomeCard.tsx   — 웰컴 카드 (AI 인사 + 오늘 통계)
src/components/ai/AiStaffBoard.tsx    — AI 직원 6인 카드 + 플로팅 AI 버튼
```

## 현재 작업 중

없음 — V3 3단계 완료

## 다음 예정

- V4 로드맵 (미정)
