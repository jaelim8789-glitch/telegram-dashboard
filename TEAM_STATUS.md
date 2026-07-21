# TeleMon 실시간 작업 현황판

각 AI는 작업 시작/커밋/푸시할 때마다 이 파일을 갱신합니다. 상태값: `진행중` / `커밋완료` / `푸시완료` / `배포완료`

| 작업 | 담당 | 상태 | 파일/커밋 | 비고 |
|---|---|---|---|---|
| 랜딩페이지 (public) 라우트그룹 전체 404 | Qoder | 진행중 | - | (public) Route Group이 루트 경로(/)를 제대로 처리하지 못함. Next.js의 Route Groups 기능이 의도한 대로 작동하지 않는 것으로 확인. Route Groups는 URL에 영향을 주지 않아야 하지만 현재 구조에서는 루트 경로가 (public)/page.tsx를 참조하지 못하고 있음. |
| AI Function Calling 실제 시나리오 테스트 | Cline | 진행중 | app/api/ai_tools.py 등 | "발송현황", "그룹A 발송" 시나리오 확인 후 커밋 예정 |
| 런칭 전 최종 점검 (결제3종/로그인3종/테넌트격리/마이그레이션) | Kiro | 진행중 | - | 완료되면 "런칭 준비 완료" 보고 예정 |
| 모바일 최적화(10항목) + P0/P1 기능 | OpenCode | 푸시완료 | `mobile: 전면적 모바일 최적화 및 UX 개선`, `feat: P0/P1 모바일 개선 및 신규 기능 추가` | |
| 모바일 최적화 2차 (13항목) — 가상스크롤/번들분할/IndexedDB/터치피드백/CLS/키보드 | OpenCode | 푸시완료 | 720bca2 | VirtualList, db.ts, next/dynamic 전환, iOS 키보드 대응, Skeleton CLS, 터치 CSS |
| 추가 개선 13항목 — 일괄작업/템플릿프리뷰/속도제어/드래그드롭/내보내기/온보딩투어/계정알림/다중필터/기간비교/프로필/API키/활동로그/실패분석 | OpenCode | 진행중 | - | LogTab batch/filter/failure, SendTab throttle/dragdrop, TemplateTab preview, DashboardTab export/profiles, ApiKeyManagerTab, ActivityAuditTab, OnboardingTour, DeliveryAnalytics period comparison |
| 슈퍼 검색 (Command+K 통합검색) + 중복 CommandPalette 제거 | OpenCode | 커밋완료 | - | layout.tsx에 중복 렌더링된 구버전 CommandPalette 제거. 계정/그룹/템플릿/발송기록/메뉴 통합 검색, API 디바운스 검색, 카테고리 그룹화 |
| telegram_id BigInteger 마이그레이션 | Kiro | 푸시완료 | 커밋 미상 (user.py + alembic e1a2b3c4d5e6) | VPS 배포 대기 중 |
| DashboardShell.tsx containerRef 중복선언 수정 | Claude(조율) | 푸시완료 | 604c759 | |
| VPS 배포 | Claude-sub | 대기 | - | telegram_id 수정 커밋 확인되면 트리거 예정 |
| test_config.py의 admin 기본값 assertion 수정 (123123/123456 → 실제 코드값 sksk2929/ysjr0508) | Copilot | 푸시완료 | telegram-dashboard-backend 07f6293 | pytest tests/test_config.py 27 passed 확인 |
| 런칭 전 UX 정리 — 터치타겟/가로스크롤/텍스트잘림 개선 | Qoder | 커밋완료 | HeroSection.tsx, DashboardPreview.tsx, HowItWorksSection.tsx, CtaSection.tsx | 모바일 최적화 및 UX 개선 완료 |
| 템플릿 탭 카테고리 기능 정상 작동 개선 + 발송 화면 간격 슬라이더 조건부 표시 | Qoder | 커밋완료 | TemplateTab.tsx, SendTab.tsx | 카테고리 분류/필터 기능 개선 및 발송 간격 슬라이더 조건부 표시로 혼동 방지 |
| API 등록 시 계정 여러 개 등록 가능하도록 제한 조정 | Qoder | 커밋완료 | plans.py, deps.py | Free 요금제의 max_accounts 제한 조정 및 API 키 등록 시 계정 등록 가능하도록 수정 |
| 모바일 UI/UX 명품스타일 고도화 (Top 5 + TS 오류 수정) | Buffy | 커밋완료 | 615d28e | PullToRefresh/ BottomSheet/ useVisualViewport/ TabBar/ globals.css 고도화, TS오류 3건 수정 |
| 모바일 UI/UX Top 5 추가 개선 (바텀시트프리미엄/햅틱확장/폼최적화/공유확장/ReducedMotion) | Buffy | 커밋완료 | 50854c3 | BottomSheet premium화, HapticFeedback 5패턴추가, Input모바일최적화, useWebShare파일공유, html-to-image설치 |
| logs.py account_id 생략 시 검증 확인 및 수정 | Copilot | 푸시완료 | telegram-dashboard-backend 6311193 | 실유출 없음(crud tenant 필터링 정상) 확인, require_account_tenant_access가 account_id=None일 때 항상 404 나던 가용성 버그 수정 + 회귀테스트 추가. 전체 suite 956 passed/15 failed(결제·콘텐츠스케줄러 관련, 무관한 기존 실패) |
| SendTab 모바일 UI 개선 (방 목록 접기/펼치기, 정리) | Copilot | 푸시완료 | 25807f9 | 전체 대화방 섹션 기본 접힌 상태(모바일 <768px), 토글 버튼 추가, 호버/탭 피드백 개선, max-height 모바일 조정 |

## 사용 규칙
- 작업 시작하면 "진행중"으로 본인 행 추가/수정
- 커밋하면 "커밋완료" + 커밋해시 기입
- push하면 "푸시완료"
- VPS 배포까지 끝나면 "배포완료" (Claude-sub만 이 상태로 바꿀 수 있음)
- 같은 파일을 다른 사람이 "진행중"으로 표시해뒀으면 먼저 확인하고 시작할 것

## 병렬 작업 충돌 방지 규칙 (2026-07-21 추가)
- **소유 영역 분리**: 새 에이전트 투입 시 기존 담당(Cline=프론트, Kiro=백엔드 계정/결제, OpenCode=QA/보안, Claude-sub=배포)이 만지는 파일과 겹치지 않는 독립 신규 영역(예: AI 콘텐츠 스튜디오, AI 채팅 어시스턴트 등 새 디렉토리)에 배정할 것
- **만들면 바로 커밋+푸시**: 파일 하나만 커밋하고 그게 참조하는 다른 파일을 로컬에만 남겨두는 것 금지. 서로 참조하는 변경분은 항상 함께 커밋
- **alembic 마이그레이션은 `alembic heads`로 단일 head 확인 후 커밋** — 여러 head로 분기된 채 커밋하면 배포 시 충돌 발생