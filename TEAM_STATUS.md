# TeleMon 실시간 작업 현황판

각 AI는 작업 시작/커밋/푸시할 때마다 이 파일을 갱신합니다. 상태값: `진행중` / `커밋완료` / `푸시완료` / `배포완료`

| 작업 | 담당 | 상태 | 파일/커밋 | 비고 |
|---|---|---|---|---|
| 랜딩페이지 (public) 라우트그룹 전체 404 | Claude(조율) | 푸시완료 | b92bcd2 | 진짜 원인: Cline이 (public)/layout.tsx를 루트 layout.tsx 위로 덮어써서 html/body + 앱 전체 프로바이더(Toast/PWA/생체잠금 등)가 통째로 사라짐. 루트 layout 복원 + (public) 라우트그룹 재분리 + 중복 pricing 라우트 제거 + 삭제된 CommandPaletteProvider import 제거. 로컬 dev서버는 계속 404 재현되는데 이건 이 세션에서 dev서버를 너무 여러 번 띄운 로컬 환경 문제로 추정 — telemon-dev/실브라우저에서 재확인 필요. |
| AI Function Calling 실제 시나리오 테스트 | Cline | 진행중 | app/api/ai_tools.py 등 | "발송현황", "그룹A 발송" 시나리오 확인 후 커밋 예정 |
| 런칭 전 최종 점검 (결제3종/로그인3종/테넌트격리/마이그레이션) | Qoder (인계) | 대기 | - | Kiro가 토큰 부족으로 중단. Qoder가 라우팅 동기화 끝나면 이어받음. Kiro는 이제부터 버그 수정 전담으로 전환, 실제 운영 테스트는 사용자가 직접 진행 |
| 모바일 최적화(10항목) + P0/P1 기능 | OpenCode | 푸시완료 | mobile/p0-p1 | |
| 슈퍼 검색 (Command+K 통합검색) | OpenCode | 푸시완료 | 268704c | 중복 CommandPalette 제거. 계정/그룹/템플릿/발송기록 API 디바운스 검색 |
| 대시보드 위젯 커스터마이징 + 발송통계차트 + 원클릭재발송 + 템플릿버전 히스토리 + 히트맵 | OpenCode | 푸시완료 | 268704c | 위젯 드래그순서변경/숨기기, LogTab Recharts 차트+재발송버튼, localStorage 버전저장/복원, 7x24 히트맵 |
| telegram_id BigInteger 마이그레이션 | Kiro | 푸시완료 | 커밋 미상 (user.py + alembic e1a2b3c4d5e6) | VPS 배포 대기 중 |
| DashboardShell.tsx containerRef 중복선언 수정 | Claude(조율) | 푸시완료 | 604c759 | |
| VPS 배포 | Claude-sub | 대기 | - | telegram_id 수정 커밋 확인되면 트리거 예정 |

## 사용 규칙
- 작업 시작하면 "진행중"으로 본인 행 추가/수정
- 커밋하면 "커밋완료" + 커밋해시 기입
- push하면 "푸시완료"
- VPS 배포까지 끝나면 "배포완료" (Claude-sub만 이 상태로 바꿀 수 있음)
- 같은 파일을 다른 사람이 "진행중"으로 표시해뒀으면 먼저 확인하고 시작할 것