# TeleMon 실시간 작업 현황판

각 AI는 작업 시작/커밋/푸시할 때마다 이 파일을 갱신합니다. 상태값: `진행중` / `커밋완료` / `푸시완료` / `배포완료`

| 작업 | 담당 | 상태 | 파일/커밋 | 비고 |
|---|---|---|---|---|
| 랜딩페이지 (public) 라우트그룹 전체 404 | Qoder | 진행중 | - | (public) Route Group이 루트 경로(/)를 제대로 처리하지 못함. Next.js의 Route Groups 기능이 의도한 대로 작동하지 않는 것으로 확인. Route Groups는 URL에 영향을 주지 않아야 하지만 현재 구조에서는 루트 경로가 (public)/page.tsx를 참조하지 못하고 있음. |
| AI Function Calling 실제 시나리오 테스트 | Cline | 진행중 | app/api/ai_tools.py 등 | "발송현황", "그룹A 발송" 시나리오 확인 후 커밋 예정 |
| 런칭 전 최종 점검 (결제3종/로그인3종/테넌트격리/마이그레이션) | Kiro | 진행중 | - | 완료되면 "런칭 준비 완료" 보고 예정 |
| 모바일 최적화(10항목) + P0/P1 기능 | OpenCode | 푸시완료 | `mobile: 전면적 모바일 최적화 및 UX 개선`, `feat: P0/P1 모바일 개선 및 신규 기능 추가` | |
| 슈퍼 검색 (Command+K 통합검색) + 중복 CommandPalette 제거 | OpenCode | 커밋완료 | - | layout.tsx에 중복 렌더링된 구버전 CommandPalette 제거. 계정/그룹/템플릿/발송기록/메뉴 통합 검색, API 디바운스 검색, 카테고리 그룹화 |
| telegram_id BigInteger 마이그레이션 | Kiro | 푸시완료 | 커밋 미상 (user.py + alembic e1a2b3c4d5e6) | VPS 배포 대기 중 |
| DashboardShell.tsx containerRef 중복선언 수정 | Claude(조율) | 푸시완료 | 604c759 | |
| VPS 배포 | Claude-sub | 대기 | - | telegram_id 수정 커밋 확인되면 트리거 예정 |

## 사용 규칙
- 작업 시작하면 "진행중"으로 본인 행 추가/수정
- 커밋하면 "커밋완료" + 커밋해시 기입
- push하면 "푸시완료"
- VPS 배포까지 끝나면 "배포완료" (Claude-sub만 이 상태로 바꿀 수 있음)
- 같은 파일을 다른 사람이 "진행중"으로 표시해뒀으면 먼저 확인하고 시작할 것