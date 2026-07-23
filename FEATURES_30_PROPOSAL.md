# TeleMon — 출시 후 고ROI 기능 30선

> CTO 관점 분석. 각 기능은 독립 브랜치에서 개발하며 기존 기능에 영향을 주지 않음.
> 전면: 100% frontend-only (Next.js App Router, Zustand, Tailwind v4, TypeScript)
> 후면: 기존 API 엔드포인트 활용 또는 새 탭/UI 컴포넌트 추가만 허용

| # | 기능명 | ROI | 예상시간 | 영향 파일 | 충돌 | 우선순위 |
|---|--------|-----|----------|----------|------|---------|
| 1 | 다크모드 시스템 감지 + localStorage persist | ⭐⭐⭐⭐⭐ | 15분 | useTheme.ts, ThemeToggle.tsx | 없음 | P0 |
| 2 | 계정 즐겨찾기/태깅 (로컬) | ⭐⭐⭐⭐⭐ | 20분 | accountLabels.ts, AccountCard.tsx, Sidebar.tsx | 없음 | P0 |
| 3 | 발송 템플릿 라이브러리 고도화 (검색/즐겨찾기) | ⭐⭐⭐⭐⭐ | 25분 | messageTemplates.ts, SendTab.tsx | 없음 | P0 |
| 4 | 대시보드 위젯 커스터마이징 (reorder/hide) | ⭐⭐⭐⭐⭐ | 30분 | DashboardTab.tsx, useDashboardStore.ts | 없음 | P0 |
| 5 | 발송그룹 즐겨찾기 + 최근사용 정렬 | ⭐⭐⭐⭐⭐ | 20분 | SendTab.tsx, groupPreferences.ts | 없음 | P0 |
| 6 | 단축키 도움말 모달 (Cheatsheet) | ⭐⭐⭐⭐ | 15분 | useKeyboardShortcuts.ts, CommandPalette.tsx | 없음 | P0 |
| 7 | 계정 건강상태 트렌드 차트 (7일) | ⭐⭐⭐⭐⭐ | 30분 | DashboardTab.tsx | 없음 | P0 |
| 8 | CSV 일괄 계정 가져오기 | ⭐⭐⭐⭐ | 25분 | AccountRegisterTab.tsx | 없음 | P0 |
| 9 | 발송 이력 필터 저장 (로컬) | ⭐⭐⭐⭐ | 15분 | SendTab.tsx | 없음 | P1 |
| 10 | 계정 검색 고도화 (상태+이름 동시 필터) | ⭐⭐⭐⭐ | 10분 | Sidebar.tsx | 없음 | P1 |
| 11 | 전체 화면 모드 토글 | ⭐⭐⭐ | 10분 | DashboardShell.tsx, useKeyboardShortcuts.ts | 없음 | P1 |
| 12 | 계정별 활동 타임라인 뷰 | ⭐⭐⭐⭐ | 25분 | ProfileTab.tsx | 없음 | P1 |
| 13 | 인라인 버튼 비주얼 빌더 | ⭐⭐⭐⭐ | 20분 | SendTab.tsx | 없음 | P1 |
| 14 | 브로드캐스트 복제 + 수정 (Clone) | ⭐⭐⭐⭐ | 15분 | SendTab.tsx | 없음 | P1 |
| 15 | 전달분석 CSV 내보내기 | ⭐⭐⭐ | 15분 | DeliveryAnalyticsTab.tsx, exportCsv.ts | 없음 | P1 |
| 16 | 관리자 사용자 검색 고도화 | ⭐⭐⭐ | 10분 | admin/users/page.tsx | 없음 | P1 |
| 17 | 메시지 변수 미리보기 (Preview) | ⭐⭐⭐⭐⭐ | 15분 | SendTab.tsx | 없음 | P1 |
| 18 | 계정 그룹 동기화 타임스탬프 표시 | ⭐⭐⭐ | 10분 | SendTab.tsx | 없음 | P1 |
| 19 | 오토리플라이 로그 상세 뷰 | ⭐⭐⭐ | 15분 | AutoReplyTab.tsx | 없음 | P1 |
| 20 | 발송 중 진행률 Progress Bar | ⭐⭐⭐⭐ | 15분 | SendTab.tsx | 없음 | P1 |
| 21 | 반복 발송 히트맵 캘린더 | ⭐⭐⭐ | 20분 | RecurringScheduleTab.tsx | 없음 | P2 |
| 22 | 계정 일괄 활성화/비활성화 | ⭐⭐⭐ | 10분 | Sidebar.tsx | 없음 | P2 |
| 23 | 알림 설정 (Browser Notification) | ⭐⭐⭐⭐ | 20분 | useNotification.ts (신규), DashboardShell.tsx | 없음 | P2 |
| 24 | 로그 탭 상세 필터 (날짜범위/계정) | ⭐⭐⭐ | 15분 | LogTab.tsx | 없음 | P2 |
| 25 | API 키 발급 로그 보기 | ⭐⭐ | 10분 | admin/api-keys/page.tsx | 없음 | P2 |
| 26 | 사용자 온보딩 진행률 체크리스트 | ⭐⭐⭐⭐ | 20분 | OnboardingTour.tsx, useOnboarding.ts | 없음 | P2 |
| 27 | 계정 삭제 전 확인 강화 | ⭐⭐⭐ | 10분 | AccountCard.tsx, ConfirmDialog.tsx | 없음 | P2 |
| 28 | 전역 로딩 상태 개선 (Skeleton) | ⭐⭐⭐ | 15분 | loading.tsx, Workspace.tsx | 없음 | P2 |
| 29 | 사이드바 접기 (Collapse) | ⭐⭐⭐ | 10분 | DashboardShell.tsx, Sidebar.tsx | 없음 | P2 |
| 30 | 메시지 템플릿 버전 히스토리 | ⭐⭐⭐ | 20분 | messageTemplates.ts, SendTab.tsx | 없음 | P2 |

> ⚡ P0: 즉시 사용자 체감도 높음, P1: 기능 완성도 향상, P2: 있으면 좋음
> 모든 기능은 독립 브랜치(feat/NN-기능명)에서 개발 후 Commit까지만 진행.
> Push/Merge 금지. 기존 기능 영향 금지.