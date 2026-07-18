# Mobile Optimization

2026-07-18~19 배포분에서 적용된 모바일 대응 내역. 커밋: `a565c26`, `034a2f4`, `07e7e39`.

## dvh 적용 (Safe Area)

**문제**: 최상위 레이아웃이 `h-screen`(`100vh`)을 사용하면, 모바일 브라우저 주소창이
떠 있거나 가상 키보드가 열렸을 때 실제 보이는 화면보다 레이아웃이 더 크게 계산된다.
`overflow-hidden`과 결합되면 화면 하단에 붙은 요소(예: 발송 버튼)가 화면 밖으로
밀려나 "버튼이 없다"처럼 보이는 문제가 발생한다.

**적용**: `100vh` → `100dvh`(dynamic viewport height)로 교체.

| 파일 | 변경 |
|---|---|
| `src/components/layout/DashboardShell.tsx` | 최상위 컨테이너 `h-screen` → `h-dvh` |
| `src/components/ui/Modal.tsx` | `max-h-[85vh]` → `max-h-[85dvh]` |

**주의(미완료 항목)**: 이번 변경은 뷰포트 높이 단위(`dvh`)만 다룬다. iOS 노치/홈 인디케이터를
위한 `env(safe-area-inset-*)` 패딩은 코드베이스 어디에도 아직 적용돼 있지 않다 — 필요 시
별도 작업으로 추가해야 한다.

## Bottom Sheet

**문제**: `AccountCard`의 그룹 지정 드롭다운이 `absolute` 위치로만 떠서, 모바일 좁은 화면에서
카드 위치에 따라 화면 밖으로 잘리거나 터치하기 어려운 위치에 렌더링될 수 있었다.

**적용**: `sm:` 브레이크포인트 기준으로 분기 — 모바일(`< 640px`)에서는 화면 하단에 고정된
바텀시트(`fixed inset-x-4 bottom-4`)로, 데스크톱에서는 기존 absolute 드롭다운으로 렌더링.

| 파일 | 변경 |
|---|---|
| `src/components/sidebar/AccountCard.tsx` | 그룹 지정 패널을 모바일 bottom sheet / 데스크톱 dropdown으로 분기, 각 그룹 항목 터치 영역 확대(`px-2 py-1.5` → `px-3 py-2.5`) |

## 44px Touch Target

**문제**: 탭바 버튼, 사이드바 검색창 아이콘/클리어 버튼 등 일부 인터랙티브 요소가 애플/구글의
최소 권장 터치 영역(44×44px)보다 작아 모바일에서 오탭이 잦았다.

**적용**:

| 파일 | 변경 |
|---|---|
| `src/components/workspace/TabBar.tsx` | 탭 버튼에 `min-h-[44px] min-w-[44px]` 추가 |
| `src/components/layout/Sidebar.tsx` | 검색창 클리어 버튼 `h-5 w-5` → `h-7 w-7`, 아이콘/패딩 재조정 |
| `src/components/sidebar/AccountCard.tsx` | 그룹 관리 버튼 `h-6 w-6` → `min-h-[28px] min-w-[28px]` |
| `src/components/workspace/tabs/RecurringScheduleTab.tsx` | 일시중지/재개/복제/즉시발송/기록/취소 버튼 전부 `min-h-[44px]` |

## Mobile Short Label

**문제**: 탭바가 11개 이상의 탭을 가로로 나열하는데, 전체 라벨("전달 분석", "그룹 검색" 등)을
좁은 화면에서 그대로 쓰면 가로 스크롤이 과도해지고 원하는 탭을 찾기 어려웠다.

**적용**: `TabDef`에 `shortLabel?: string` 필드 추가. `sm:` 이상에서는 기존 `label`,
그 미만에서는 `shortLabel`(없으면 `label`로 폴백)을 표시.

| 파일 | 변경 |
|---|---|
| `src/types/index.ts` | `TabDef.shortLabel` 필드 추가, 주요 탭에 짧은 라벨 지정 (대시/분석/등록/검색/링크/자동/매크로/건강/허브/팀) |
| `src/components/workspace/TabBar.tsx` | `hidden sm:inline` / `sm:hidden`으로 라벨 분기 렌더링 |

## Video Upload

**문제**: 발송(Send) 탭의 미디어 첨부 input이 이미지 MIME 타입만 허용해, 백엔드가 이미 지원하는
동영상(`mp4`/`mov`/`avi`/`mkv`)을 프론트엔드에서 아예 선택할 수 없었다.

**적용**: `accept` 속성에 동영상 MIME 타입 추가, 라벨을 "이미지 (선택)" → "이미지 또는 영상 (선택)"으로 변경.

| 파일 | 변경 |
|---|---|
| `src/components/workspace/tabs/SendTab.tsx` | `accept="image/jpeg,image/png,image/webp,image/gif"` → 동일 목록 + `video/mp4,video/quicktime,video/x-msvideo,video/x-matroska` |

## Reply Mode

**문제**: 발송 탭에서 "답장으로 보내기"(`replyMacroEnabled` + `replyToMessageId`)를 켠 상태로
발송해도, 서버에 전달되는 `delivery_mode`가 여전히 기존 값(`normal`/`cycle`/`bulk`)으로
고정돼 있어 답장 전용 배달 로직이 타지 않았다.

**적용**: 답장 모드가 켜져 있고 메시지 ID가 입력됐을 때 `delivery_mode`를 `"reply"`로 강제
설정하는 `effectiveDeliveryMode`를 계산해 API 호출에 사용.

| 파일 | 변경 |
|---|---|
| `src/components/workspace/tabs/SendTab.tsx` | `deliveryMode` 상태 타입에 `"reply"` 추가, `handleSubmit`에서 `effectiveDeliveryMode` 계산 후 `createBroadcast` 호출에 사용 |
| `src/lib/sendDraft.ts` | `SendDraft.deliveryMode` 타입에도 `"reply"` 추가 (누락 시 프로덕션 빌드 타입에러 — 2026-07-19 배포 중 발견/수정, 커밋 `f0d6fba`) |

## Toast Responsive

**문제**: 토스트 알림이 고정폭(`max-w-sm`)이라 좁은 화면에서는 좌우 여백이 과도하게 남거나
텍스트가 눌려 보였다.

**적용**: 모바일에서는 화면 너비에 맞춰 확장(`w-[calc(100vw-2rem)]`), `sm:` 이상에서는 기존
`max-w-sm` 유지.

| 파일 | 변경 |
|---|---|
| `src/components/ui/Toast.tsx` | 토스트 컨테이너 `max-w-sm` → `w-[calc(100vw-2rem)] sm:max-w-sm` |

## 함께 처리된 관련 이슈

발송 탭의 "예약 발송" / "반복 발송" 체크박스가 `disabled`로 하드 잠금돼 있던 것도 이번
배포에서 해제됐다 (`a565c26`). 백엔드(`telegram-dashboard-backend`)가 이미 반복/예약
발송을 완전히 지원하는데도, 과거 레거시 백엔드 기준으로 판단해 잠가둔 채 방치돼 있던
플래그였다 — 모바일 전용 이슈는 아니지만 "모바일에서 반복 발송이 안 된다"는 사용자
리포트의 실제 원인이었다.
