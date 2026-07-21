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