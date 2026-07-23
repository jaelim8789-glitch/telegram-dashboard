# Nicegram CTO 분석 — TeleMon 흡수 통합 설계

> **작성일**: 2026-07-15  
> **대상**: TeleMon (Telegram Mass Communication Dashboard)  
> **분석 기준**: Nicegram (iOS/Android Telegram 클라이언트) v24+  
> **목적**: Nicegram의 강점을 TeleMon의 B2B mass communication 플랫폼 관점에서 재해석하여 흡수할 기능을 설계

---

## 목차

1. [Nicegram 개요 및 핵심 철학](#1-nicegram-개요-및-핵심-철학)
2. [멀티 계정 UX](#2-멀티-계정-ux)
3. [계정 전환 방식](#3-계정-전환-방식)
4. [채팅 목록 관리](#4-채팅-목록-관리)
5. [폴더/필터 시스템](#5-폴더필터-시스템)
6. [채팅 검색](#6-채팅-검색)
7. [그룹 관리](#7-그룹-관리)
8. [미디어 관리](#8-미디어-관리)
9. [알림 시스템](#9-알림-시스템)
10. [성능 최적화](#10-성능-최적화)
11. [Session 관리](#11-session-관리)
12. [백그라운드 동작 방식](#12-백그라운드-동작-방식)
13. [Telegram Premium 기능](#13-telegram-premium-기능)
14. [생산성 기능](#14-생산성-기능)
15. [숨겨진 편의 기능](#15-숨겨진-편의-기능)
16. [UI/UX 디테일](#16-uiux-디테일)
17. [애니메이션](#17-애니메이션)
18. [설정 구조](#18-설정-구조)
19. [TeleMon 통합 우선순위 매트릭스](#19-telemon-통합-우선순위-매트릭스)
20. [TeleMon만의 차별화 UX 아이디어](#20-telemon만의-차별화-ux-아이디어)

---

## 1. Nicegram 개요 및 핵심 철학

### 1.1 Nicegram이란?

Nicegram은 오픈소스 Telegram 클라이언트를 기반으로 한 **3rd-party 클라이언트**로, 공식 Telegram 앱이 제공하지 않는 고급 기능을 제공한다. 특히 **멀티 계정**, **폴더 관리**, **숨김 채팅**, **메시지 자동 번역**, **다운로드 관리** 등에서 차별화된다.

### 1.2 Nicegram의 핵심 철학

| 철학 | 설명 | TeleMon 관점 해석 |
|------|------|-------------------|
| **멀티 계정 네이티브** | 계정 전환이 앱의 기본 UX | TeleMon은 이미 멀티 계정이 핵심이지만, UX가 관리자 도구에 치우침 |
| **프라이버시 우선** | 숨김 채팅, 비밀번호 잠금, 프라이빗 폴더 | B2B에서는 고객 데이터 보호 관점으로 재해석 |
| **커스터마이징** | 폴더, 테마, 알림을 사용자 마음대로 | TeleMon은 운영자 워크플로우 최적화로 재해석 |
| **배치 작업** | 여러 채팅/메시지 일괄 처리 | TeleMon의 핵심 가치와 일치 |
| **성능** | 네이티브 수준의 빠른 UI 반응 | Web 기반 TeleMon의 가장 큰 과제 |

### 1.3 TeleMon과의 근본적 차이

| 차원 | Nicegram | TeleMon |
|------|----------|---------|
| **사용자** | 일반 사용자 (개인) | 비즈니스 운영자 (B2B) |
| **핵심 작업** | 메시지 읽기/보내기 | 대량 발송/모니터링/자동화 |
| **계정 수** | 1~10개 | 10~100+개 |
| **UI 패러다임** | 채팅 중심 | 대시보드/테이블 중심 |
| **플랫폼** | 모바일 네이티브 | 웹 (Next.js) |
| **백엔드** | 로컬 (기기 내) | 서버 (FastAPI + Telethon) |

> **결론**: Nicegram의 기능을 그대로 복사하는 것이 아니라, **B2B mass communication 관점에서 재해석**하여 TeleMon에 통합해야 한다.

---

## 2. 멀티 계정 UX

### 2.1 Nicegram의 멀티 계정 UX 분석

| 기능 | Nicegram 방식 | 평가 |
|------|---------------|------|
| 계정 추가 | 설정 → 계정 추가 → 전화번호 인증 | 표준적 |
| 계정 목록 | 사이드 메뉴 하단에 아바타 원형 리스트 | **모바일에 최적화** |
| 계정 표시 | 아바타 + 이름 + 전화번호 마지막 4자리 | 간결함 |
| 계정 순서 | 드래그로 순서 변경 가능 | **유연함** |
| 계정 색상 | 각 계정에 자동 할당된 accent color | **시각적 구분에 탁월** |
| 계정별 설정 | 각 계정마다 알림, 폴더, 언어 독립 설정 | **고급 기능** |

### 2.2 TeleMon 현재 상태 분석

**현재 Sidebar (src/components/layout/Sidebar.tsx)**:
- 좌측 256px 고정 사이드바
- 계정 카드 리스트 (AccountCard 컴포넌트)
- 건강 상태 필터 (전체/정상/세션만료/제한됨/오류/미설정/차단)
- 계정 그룹 필터 (localStorage 기반)
- 검색 바 (이름/전화번호)
- 즐겨찾기 정렬
- 일괄 선택 모드 (활성화/비활성화)

**문제점**:
1. 계정이 50개 이상이면 스크롤이 너무 길어짐
2. 계정 간 시각적 구분이 약함 (색상 없음)
3. 계정 순서를 변경할 수 없음
4. 계정별 요약 정보가 부족함 (오늘 발송 수, 그룹 수만 표시)

### 2.3 TeleMon 통합 설계안

#### P0: 계정 색상 시스템 도입

```typescript
// src/types/index.ts 추가
export interface AccountAppearance {
  accountId: string;
  color: string; // HSL string
  emoji: string | null; // 사용자 지정 이모지
  order: number; // 정렬 순서
}

// src/lib/accountAppearance.ts (신규)
const STORAGE_KEY = "telemon-account-appearance";

export function getAccountAppearances(): Record<string, AccountAppearance> {
  // localStorage에서 로드, 없으면 계정 ID 기반 해시로 자동 생성
}

export function getAccountColor(accountId: string): string {
  // 계정 ID의 해시를 기반으로 HSL 색상 자동 생성
  // hue = (hash % 360), saturation = 65%, lightness = 55%
}
```

**변경 파일**:
- `src/types/index.ts` — `AccountAppearance` 타입 추가
- `src/lib/accountAppearance.ts` — 신규 파일
- `src/components/sidebar/AccountCard.tsx` — 색상 accent 적용
- `src/components/layout/Sidebar.tsx` — 드래그 앤 드롭 순서 변경

**구현 난이도**: 중 (2시간)  
**예상 개발 시간**: 2시간

#### P1: 계정 그리드 뷰 (접이식)

사이드바 하단에 계정이 많을 때 **그리드/컴팩트 뷰**로 전환 가능:

```tsx
// Sidebar.tsx에 추가
type AccountViewMode = "list" | "grid" | "compact";

// grid 모드: 2열 아바타 + 상태 표시
// compact 모드: 한 줄에 4개 아바타 (이름 숨김)
```

**변경 파일**: `src/components/layout/Sidebar.tsx`, `src/components/sidebar/AccountCard.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 계정별 독립 설정 패널

각 계정마다 다음 설정을 독립적으로 관리:
- 알림 on/off
- 자동 응답 on/off
- 언어 설정
- 폴더 동기화 주기

**변경 파일**: `src/components/sidebar/AccountCard.tsx` (확장 패널), `src/store/useDashboardStore.ts`  
**구현 난이도**: 중상 (4시간)  
**예상 개발 시간**: 4시간

---

## 3. 계정 전환 방식

### 3.1 Nicegram 분석

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **탭 전환** | 상단 아바타 탭을 좌우 스와이프 | 직관적, 빠름 | 계정 5개 이상이면 복잡 |
| **사이드 메뉴** | 햄버거 메뉴 → 계정 선택 | 계정 정보 함께 표시 | 2단계 필요 |
| **프로필 탭** | 현재 계정 아바타 탭 → 계정 목록 | 시각적 | 추가 탭 필요 |
| **키보드 단축키** | Cmd+1, Cmd+2, ... | 파워 유저용 | 발견 어려움 |

### 3.2 TeleMon 현재 상태

**현재 방식** (src/store/useDashboardStore.ts):
```typescript
selectAccount: (id) => {
  set({ selectedAccountId: id });
  RuntimeManager.getInstance().selectAccount(id);
},
```

- 사이드바에서 계정 카드 클릭 → 즉시 전환
- RuntimeManager가 캐시된 데이터를 즉시 반환
- API 재호출 없음 (이미 설계 잘 되어 있음)

**문제점**:
1. 키보드 단축키로 계정 전환 불가
2. 전환 시 애니메이션 없음 (갑작스러운 UI 변경)
3. 계정 전환 히스토리 없음 (뒤로 가기 불가)

### 3.3 TeleMon 통합 설계안

#### P0: 키보드 단축키 계정 전환

```typescript
// src/lib/useKeyboardShortcuts.ts 확장
// Alt+1, Alt+2, ... Alt+9: 계정 전환
// Alt+`: 이전 계정으로 전환 (토글)
```

**변경 파일**: `src/lib/useKeyboardShortcuts.ts`  
**구현 난이도**: 하 (30분)  
**예상 개발 시간**: 30분

#### P1: 계정 전환 애니메이션

```tsx
// DashboardShell.tsx 또는 Workspace.tsx
// 계정 전환 시 콘텐츠 영역에 fade transition 적용
// framer-motion의 AnimatePresence 사용
```

**변경 파일**: `src/components/layout/Workspace.tsx`  
**구현 난이도**: 중 (1.5시간)  
**예상 개발 시간**: 1.5시간

#### P1: 계정 전환 히스토리 (뒤로/앞으로)

```typescript
// RuntimeManager에 히스토리 추가
private _accountHistory: string[] = [];
private _historyIndex: number = -1;

goBack(): void {
  if (this._historyIndex > 0) {
    this._historyIndex--;
    this.selectAccount(this._accountHistory[this._historyIndex]);
  }
}

goForward(): void {
  if (this._historyIndex < this._accountHistory.length - 1) {
    this._historyIndex++;
    this.selectAccount(this._accountHistory[this._historyIndex]);
  }
}
```

**변경 파일**: `src/lib/runtimeManager.ts`, `src/lib/useKeyboardShortcuts.ts`  
**구현 난이도**: 중 (2시간)  
**예상 개발 시간**: 2시간

---

## 4. 채팅 목록 관리

### 4.1 Nicegram 분석

| 기능 | 설명 | TeleMon 관점 |
|------|------|--------------|
| **채팅 고정** | 최대 5개 채팅을 상단에 고정 | **발송 대상 그룹 즐겨찾기**로 재해석 |
| **채팅 숨김** | 비밀번호로 보호된 숨김 폴더 | **민감 그룹 보호** (B2B에서 규정 준수) |
| **채팅 음소거** | 개별 채팅 알림 차단 | **발송 대상 그룹 모니터링** |
| **채팅 읽음 상태** | 읽음/안읽음 구분 | **발송 결과 확인**으로 재해석 |
| **채팅 아카이브** | 오래된 채팅 보관 | **비활성 그룹 아카이브** |
| **채팅 목록 커스터마이징** | 폴더별로 다른 정렬/표시 | **운영 워크플로우별 그룹 분류** |

### 4.2 TeleMon 현재 상태

**현재 그룹 관리** (src/lib/accountGroups.ts):
- localStorage 기반 계정 그룹
- 그룹 생성/수정/삭제
- 계정을 그룹에 할당/해제
- 색상 지정 가능

**발송 대상 그룹** (SendTab):
- 그룹 목록을 API에서 로드
- 체크박스로 다중 선택
- 최근 발송 대상 저장 (localStorage)

**문제점**:
1. 그룹과 발송 대상이 분리되어 있음
2. 그룹에 대한 상세 정보 부족 (마지막 활동, 멤버 수 등)
3. 그룹 검색이 계정 검색에 비해 부족함
4. 그룹 폴더/카테고리 개념 없음

### 4.3 TeleMon 통합 설계안

#### P0: 그룹 폴더/카테고리 시스템

```typescript
// src/types/index.ts 추가
export interface GroupFolder {
  id: string;
  name: string;
  description: string;
  groupIds: string[];
  color: string;
  icon: string; // lucide icon name
  order: number;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

// src/lib/groupFolders.ts (신규)
// localStorage 기반, accountGroups.ts와 동일 패턴
```

**변경 파일**:
- `src/types/index.ts` — `GroupFolder` 타입 추가
- `src/lib/groupFolders.ts` — 신규 파일
- `src/components/workspace/tabs/SendTab.tsx` — 폴더별 그룹 표시
- `src/components/workspace/tabs/GroupTab.tsx` — 폴더 관리 UI

**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P1: 그룹 상세 정보 패널

```tsx
// 그룹 선택 시 인스펙터에 상세 정보 표시
interface GroupDetail {
  id: string;
  title: string;
  type: string;
  participantsCount: number;
  lastMessage: string | null;
  lastActivity: string | null;
  isMuted: boolean;
  isArchived: boolean;
  folders: string[];
  lastBroadcastAt: string | null;
  broadcastCount: number;
}
```

**변경 파일**: `src/components/layout/Inspector.tsx`, `src/lib/api.ts`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 그룹 아카이브

30일 이상 발송하지 않은 그룹을 자동 아카이브:
- 아카이브된 그룹은 기본 목록에서 숨김
- "아카이브" 탭에서 확인 가능
- 발송 시 자동으로 아카이브 해제

**변경 파일**: `src/components/workspace/tabs/SendTab.tsx`, `src/lib/groupPreferences.ts`  
**구현 난이도**: 중 (2시간)  
**예상 개발 시간**: 2시간

---

## 5. 폴더/필터 시스템

### 5.1 Nicegram 분석

Nicegram의 폴더 시스템은 공식 Telegram의 **채팅 폴더**를 확장:

| 기능 | 설명 |
|------|------|
| **커스텀 폴더** | 사용자 정의 조건으로 채팅 자동 분류 |
| **스마트 폴더** | 읽지 않음, 개인, 그룹, 채널 등 자동 폴더 |
| **폴더 아이콘** | 이모지/아이콘 지정 가능 |
| **폴더 순서** | 드래그로 재정렬 |
| **폴더 공유** | 폴더 설정을 링크로 공유 |
| **폴더별 알림** | 폴더 단위로 알림 설정 |
| **숨김 폴더** | Face ID/Touch ID로 보호 |

### 5.2 TeleMon 현재 상태

**현재 필터 시스템** (Sidebar.tsx):
- 건강 상태 필터 (7가지)
- 계정 그룹 필터 (사용자 정의)
- 검색 필터 (이름/전화번호)

**문제점**:
1. 필터가 계정에만 적용됨 (그룹/발송 로그에는 부족)
2. 복합 필터 불가 (상태 + 그룹 + 검색은 가능하지만 UI가 직관적이지 않음)
3. 필터 저장 불가 (매번 다시 설정)
4. 폴더 개념 없음 (계정 그룹이 유일한 분류)

### 5.3 TeleMon 통합 설계안

#### P0: 스마트 필터 시스템

```typescript
// src/lib/smartFilters.ts (신규)
export interface SmartFilter {
  id: string;
  name: string;
  icon: string;
  scope: "accounts" | "groups" | "broadcasts" | "all";
  conditions: FilterCondition[];
  order: number;
}

export interface FilterCondition {
  field: string; // "status" | "group" | "lastActivity" | "todaySent" | ...
  operator: "eq" | "neq" | "gt" | "lt" | "contains" | "in";
  value: unknown;
}
```

**프리셋 스마트 필터**:
1. **주의 필요 계정**: 상태가 "unauthorized" 또는 "rate_limited" 또는 "banned"
2. **오늘 활동 없음**: lastActivity가 24시간 이상 지남
3. **발송 많은 계정**: todaySent > 50
4. **자동 응답 활성 계정**: autoReplyEnabled === true
5. **최근 오류 계정**: recentFailureCount > 0

**변경 파일**:
- `src/lib/smartFilters.ts` — 신규 파일
- `src/components/layout/Sidebar.tsx` — 스마트 필터 탭 추가
- `src/store/useDashboardStore.ts` — 필터 상태 추가

**구현 난이도**: 중상 (4시간)  
**예상 개발 시간**: 4시간

#### P1: 필터 저장/공유

```typescript
// localStorage에 저장된 필터를 JSON으로 내보내기/가져오기
export function exportFilters(): string { /* JSON */ }
export function importFilters(json: string): void { /* parse */ }
```

**변경 파일**: `src/lib/smartFilters.ts`  
**구현 난이도**: 하 (1시간)  
**예상 개발 시간**: 1시간

#### P2: 조건부 자동 태깅

계정이 특정 조건을 만족하면 자동으로 태그/그룹 할당:
- "7일 이상 미사용" → "휴면" 태그
- "오늘 3회 이상 rate limited" → "주의" 태그
- "세션 만료" → "재인증 필요" 태그

**변경 파일**: `src/lib/accountLabels.ts`, `src/lib/accountGroups.ts`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

---

## 6. 채팅 검색

### 6.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **전역 검색** | 모든 채팅/메시지/파일 통합 검색 |
| **고급 필터** | 날짜, 발신자, 파일 타입, 채팅 필터 |
| **검색 제안** | 최근 검색어, 인기 검색어 |
| **메시지 내 검색** | 특정 채팅 내에서만 검색 |
| **검색 결과 그룹화** | 채팅별, 날짜별 그룹화 |
| **클라우드 검색** | 서버 측 검색 (모든 메시지) |

### 6.2 TeleMon 현재 상태

**현재 검색**:
- 계정 검색: 이름/전화번호 (Sidebar.tsx)
- 그룹 검색: GroupSearchTab (별도 탭)
- 발송 로그 필터: 계정/상태 (LogTab.tsx)

**문제점**:
1. 통합 검색 부재 (계정/그룹/발송 로그를 한 번에 검색 불가)
2. 검색 결과가 실시간이 아님
3. 고급 필터 부재
4. 검색 기록 없음

### 6.3 TeleMon 통합 설계안

#### P1: 통합 검색 (Command Palette 고도화)

```typescript
// src/store/useCommandPaletteStore.ts 확장
interface SearchResult {
  type: "account" | "group" | "broadcast" | "template" | "action";
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => void;
}
```

**검색 범위**:
1. 계정 (이름/전화번호)
2. 그룹 (이름/타입)
3. 발송 로그 (메시지 내용/상태)
4. 메시지 템플릿 (이름/내용)
5. 단축 액션 (탭 전환, 설정 등)

**변경 파일**:
- `src/store/useCommandPaletteStore.ts` — 검색 결과 타입 확장
- `src/components/workspace/CommandPalette.tsx` — 통합 검색 UI
- `src/lib/api.ts` — 검색 API 엔드포인트 추가

**구현 난이도**: 중상 (5시간)  
**예상 개발 시간**: 5시간

#### P2: 발송 로그 전문 검색

```python
# backend/routers/search.py (신규)
@router.get("/api/search/broadcasts")
async def search_broadcasts(
    q: str,
    account_id: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    # SQLite FTS5 또는 LIKE 검색
    # 결과: 메시지 내용, 발송 시간, 상태, 계정 정보
```

**변경 파일**: `backend/routers/search.py` (신규), `src/lib/api.ts`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

---

## 7. 그룹 관리

### 7.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **그룹 생성** | 앱 내에서 직접 그룹 생성 |
| **그룹 관리** | 멤버 추가/제거, 권한 설정 |
| **그룹 통계** | 멤버 수, 활동 통계 |
| **그룹 검색** | 그룹 이름/설명 검색 |
| **그룹 폴더** | 폴더별 그룹 분류 |
| **그룹 음소거** | 알림 차단 |
| **그룹 내 검색** | 그룹 메시지 검색 |

### 7.2 TeleMon 현재 상태

**현재 그룹 관리**:
- GroupTab: 계정별 그룹 목록 조회
- GroupSearchTab: 그룹 검색 및 발송 대상 추가
- 그룹 생성/관리 기능 없음 (Telegram 앱에서 직접 해야 함)

**문제점**:
1. 그룹 생성/관리 불가 (Telegram 앱 의존)
2. 그룹 통계 부족
3. 그룹 간 멤버 비교 불가
4. 그룹 내 메시지 검색 불가

### 7.3 TeleMon 통합 설계안

#### P1: 그룹 대시보드

```typescript
// GroupTab 고도화
interface GroupDashboard {
  totalGroups: number;
  activeGroups: number; // 최근 7일 내 활동
  totalMembers: number;
  avgMembersPerGroup: number;
  topGroups: GroupDetail[]; // 멤버 수 기준
  recentActivity: GroupActivity[];
}
```

**변경 파일**: `src/components/workspace/tabs/GroupTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 그룹 멤버 분석

```python
# backend/routers/groups.py 확장
@router.get("/api/groups/{account_id}/{group_id}/members")
async def get_group_members(account_id: str, group_id: str):
    """그룹 멤버 목록과 각 멤버의 활동 상태"""
    runtime = manager.get_runtime(account_id)
    members = await runtime.client.get_participants(int(group_id))
    return [
        {
            "id": m.id,
            "name": f"{m.first_name or ''} {m.last_name or ''}".strip(),
            "username": m.username,
            "is_bot": m.bot,
            "is_admin": m.admin_rights is not None,
        }
        for m in members
    ]
```

**변경 파일**: `backend/routers/groups.py`, `src/lib/api.ts`, `src/components/workspace/tabs/GroupTab.tsx`  
**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

#### P2: 그룹 간 멤버 중복 분석

```typescript
// 여러 그룹 간 멤버 중복을 분석하여 교차 발송 최적화
interface GroupOverlap {
  groupA: string;
  groupB: string;
  overlapCount: number;
  overlapPercentage: number;
}
```

**변경 파일**: `backend/routers/groups.py`, `src/components/workspace/tabs/GroupTab.tsx`  
**구현 난이도**: 중상 (5시간)  
**예상 개발 시간**: 5시간

---

## 8. 미디어 관리

### 8.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **미디어 갤러리** | 채팅별 사진/비디오 모아보기 |
| **파일 브라우저** | 모든 파일 타입별 정리 |
| **다운로드 관리자** | 다운로드 상태, 재개, 일시정지 |
| **인라인 미디어** | 메시지 내 미리보기 |
| **자동 다운로드** | Wi-Fi/모바일 데이터별 설정 |
| **미디어 검색** | 파일명/타입/날짜 검색 |

### 8.2 TeleMon 현재 상태

**현재 미디어 관리**:
- 발송 시 이미지 첨부 가능 (SendTab.tsx)
- 미디어 관리 기능 없음
- 미디어 발송 이력 없음

**문제점**:
1. 미디어 라이브러리 부재
2. 이미지/파일 재사용 불가
3. 미디어 발송 통계 없음
4. 대량 미디어 발송 시 성능 이슈

### 8.3 TeleMon 통합 설계안

#### P1: 미디어 라이브러리

```typescript
// src/lib/mediaLibrary.ts (신규)
interface MediaItem {
  id: string;
  fileName: string;
  fileType: "image" | "video" | "document" | "audio";
  fileSize: number;
  thumbnailUrl: string | null;
  uploadedAt: string;
  usedCount: number;
  lastUsedAt: string | null;
  tags: string[];
}
```

**기능**:
1. 발송에 사용한 미디어 자동 저장
2. 썸네일 미리보기
3. 태그/검색
4. 재사용 카운트 (인기 미디어 파악)

**변경 파일**:
- `src/lib/mediaLibrary.ts` — 신규 파일
- `src/components/workspace/tabs/SendTab.tsx` — 미디어 선택 UI
- `src/components/workspace/tabs/MediaTab.tsx` — 신규 탭

**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

#### P2: 미디어 최적화

```python
# backend/media_optimizer.py (신규)
class MediaOptimizer:
    """발송 전 미디어 자동 최적화"""
    
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    
    async def optimize(self, file_path: str) -> str:
        """이미지 리사이즈/압축, 비디오 트랜스코딩"""
        # PIL로 이미지 최적화
        # ffmpeg로 비디오 압축
        pass
```

**변경 파일**: `backend/media_optimizer.py` (신규), `backend/account_runtime.py`  
**구현 난이도**: 중상 (6시간)  
**예상 개발 시간**: 6시간

---

## 9. 알림 시스템

### 9.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **채팅별 알림** | 개별 채팅 알림 설정 |
| **폴더별 알림** | 폴더 단위 알림 설정 |
| **스마트 알림** | 중요 채팅만 알림 (AI 기반) |
| **알림 그룹화** | 같은 발신자 알림 묶기 |
| **방해 금지** | 시간대별 알림 차단 |
| **긴급 알림** | 특정 키워드 포함 시 무조건 알림 |
| **알림 커스터마이징** | 사운드, 진동, LED 색상 |

### 9.2 TeleMon 현재 상태

**현재 알림** (DashboardShell.tsx):
```typescript
// Browser Notification (Web API)
notify({
  title: "✅ 발송 완료",
  body: `새로운 발송이 완료되었습니다 (${totalNow - prev}건)`,
  tag: "broadcast-sent",
});
```

**문제점**:
1. 발송 완료 알림만 있음
2. 계정별 알림 설정 불가
3. 알림 우선순위 없음
4. 알림 이력 없음
5. 방해 금지 모드 없음

### 9.3 TeleMon 통합 설계안

#### P0: 알림 센터

```typescript
// src/store/useNotificationStore.ts (신규)
interface Notification {
  id: string;
  type: "broadcast_complete" | "account_error" | "rate_limit" | "session_expired" | "auto_reply" | "system";
  title: string;
  body: string;
  severity: "info" | "warning" | "error" | "success";
  accountId: string | null;
  timestamp: string;
  read: boolean;
  action: (() => void) | null; // 클릭 시 이동할 액션
}

// 알림 센터 UI: Header에 벨 아이콘 + 드롭다운
```

**알림 타입**:
1. 발송 완료 (성공/실패 건수 포함)
2. 계정 오류 (세션 만료, 차단, rate limit)
3. 자동 응답 트리거 (하루 요약)
4. 시스템 알림 (업데이트, 백업)

**변경 파일**:
- `src/store/useNotificationStore.ts` — 신규 파일
- `src/components/layout/Header.tsx` — 알림 벨 아이콘
- `src/components/ui/NotificationCenter.tsx` — 신규 컴포넌트
- `src/lib/useNotification.ts` — 확장

**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

#### P1: 알림 규칙 엔진

```typescript
interface NotificationRule {
  id: string;
  name: string;
  condition: {
    type: "account_error" | "broadcast_result" | "rate_limit" | "custom";
    accountIds: string[]; // 빈 배열 = 전체
    threshold: number | null; // 실패 횟수 등
  };
  action: {
    type: "browser" | "sound" | "email" | "webhook";
    config: Record<string, unknown>;
  };
  enabled: boolean;
}
```

**변경 파일**: `src/lib/notificationRules.ts` (신규), `src/components/settings/NotificationSettings.tsx`  
**구현 난이도**: 중상 (5시간)  
**예상 개발 시간**: 5시간

#### P2: 방해 금지 모드

```typescript
interface DoNotDisturb {
  enabled: boolean;
  schedule: {
    start: string; // "22:00"
    end: string;   // "08:00"
    timezone: string;
  };
  exceptions: {
    accountIds: string[];
    notificationTypes: string[];
  };
}
```

**변경 파일**: `src/store/useNotificationStore.ts`, `src/components/settings/NotificationSettings.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

---

## 10. 성능 최적화

### 10.1 Nicegram 분석

| 최적화 | 설명 |
|--------|------|
| **연결 유지** | WebSocket keep-alive, 자동 재연결 |
| **메시지 캐싱** | SQLite 로컬 DB에 메시지 저장 |
| **지연 로딩** | 스크롤 시 추가 메시지 로드 |
| **이미지 캐싱** | 썸네일 로컬 캐싱,渐进式 로드 |
| **메모리 관리** | 오래된 메시지 메모리에서 제거 |
| **배터리 최적화** | 백그라운드 작업 최소화 |
| **데이터 사용량** | 미디어 자동 다운로드 설정 |

### 10.2 TeleMon 현재 상태

**현재 성능 상태**:
- RuntimeManager: 30초 간격 폴링, 캐시 우선
- AccountRuntime: 5분 간격 그룹 캐시 갱신
- BroadcastQueue: 1초 간격 발송
- RateLimiter: 토큰 버킷 알고리즘

**문제점**:
1. 폴링 간격이 고정 (동적 조절 불가)
2. 캐시 무효화 전략 부재
3. 대량 계정(50+)에서 초기 로딩 느림
4. 메모리 사용량 증가 추세
5. WebSocket 미사용 (HTTP 폴링만)

### 10.3 TeleMon 통합 설계안

#### P0: 동적 폴링 간격

```typescript
// RuntimeManager.ts
private _getPollInterval(): number {
  const activeCount = this._accounts.filter(a => a.status === "active").length;
  const inFlightBroadcasts = this._accounts.some(a => 
    this._caches.get(a.id)?.broadcasts.some(b => b.status === "sending")
  );
  
  if (inFlightBroadcasts) return 5_000;  // 5초
  if (activeCount > 20) return 60_000;   // 60초 (계정 많을 때)
  if (activeCount > 10) return 45_000;   // 45초
  return 30_000;                          // 기본 30초
}
```

**변경 파일**: `src/lib/runtimeManager.ts`  
**구현 난이도**: 하 (1시간)  
**예상 개발 시간**: 1시간

#### P1: WebSocket 도입

```python
# backend/websocket.py (신규)
from fastapi import WebSocket, WebSocketDisconnect

class RuntimeWebSocket:
    """각 계정 Runtime의 이벤트를 WebSocket으로 실시간 전송"""
    
    async def broadcast_event(self, account_id: str, event: dict):
        """특정 계정의 이벤트를 해당 계정을 구독한 클라이언트에 전송"""
        pass
```

**이벤트 종류**:
1. `broadcast.progress` — 발송 진행률
2. `broadcast.complete` — 발송 완료
3. `account.health_changed` — 계정 상태 변경
4. `auto_reply.triggered` — 자동 응답 트리거
5. `rate_limit.hit` — Rate limit 도달

**변경 파일**:
- `backend/websocket.py` — 신규 파일
- `backend/main.py` — WebSocket 라우터 등록
- `src/lib/runtimeManager.ts` — WebSocket 구독 로직
- `src/lib/useWebSocket.ts` — 신규 훅

**구현 난이도**: 상 (8시간)  
**예상 개발 시간**: 8시간

#### P1: 가상 스크롤 (계정 목록)

```tsx
// @tanstack/react-virtual 도입
// 계정이 50개 이상일 때 가상 스크롤로 전환
import { useVirtualizer } from "@tanstack/react-virtual";
```

**변경 파일**: `src/components/layout/Sidebar.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 캐시 워밍 전략

```typescript
// RuntimeManager 초기화 시 계정을 배치로 나누어 순차 Prefetch
private async _warmCache(): Promise<void> {
  const batchSize = 5;
  const accounts = [...this._accounts];
  
  for (let i = 0; i < accounts.length; i += batchSize) {
    const batch = accounts.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(a => this._prefetchAccount(a.id))
    );
    // 배치 간 500ms 지연 (서버 부하 방지)
    if (i + batchSize < accounts.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
}
```

**변경 파일**: `src/lib/runtimeManager.ts`  
**구현 난이도**: 중 (2시간)  
**예상 개발 시간**: 2시간

---

## 11. Session 관리

### 11.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **세션 유지** | 앱 종료 후에도 로그인 유지 |
| **세션 동기화** | iCloud/Google Drive로 기기 간 동기화 |
| **세션 복구** | 손상된 세션 자동 복구 |
| **2FA 지원** | 클라우드 비밀번호 입력 |
| **로그아웃** | 특정 세션만 선택적 로그아웃 |
| **세션 정보** | 로그인 시간, 기기 정보 |

### 11.2 TeleMon 현재 상태

**현재 세션 관리** (backend/account_runtime.py):
- Telethon `.session` 파일을 `sessions/` 디렉토리에 저장
- `send_code()` → `verify_code()` → `verify_2fa()` 플로우
- `re_auth()`: 재인증
- `get_auth_status()`: 세션 상태 확인
- HealthMonitor가 세션 상태 추적

**문제점**:
1. 세션 파일 백업/복원 불가
2. 세션 만료 시 자동 복구 실패 (수동 재인증 필요)
3. 세션 정보 표시 부족 (생성일, 마지막 사용일)
4. 대량 계정 세션 관리 어려움

### 11.3 TeleMon 통합 설계안

#### P0: 세션 상태 대시보드

```typescript
// ProfileTab 또는 별도 SessionTab
interface SessionInfo {
  accountId: string;
  phone: string;
  name: string | null;
  sessionCreatedAt: string | null;
  sessionLastUsedAt: string | null;
  sessionFileSize: number; // bytes
  isAuthenticated: boolean;
  requires2FA: boolean;
  lastAuthAttempt: string | null;
  authAttemptCount: number;
}
```

**변경 파일**:
- `src/components/workspace/tabs/ProfileTab.tsx` — 세션 정보 섹션
- `backend/routers/accounts.py` — 세션 정보 API
- `src/lib/api.ts` — 세션 API 함수

**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P1: 세션 백업/복원

```python
# backend/routers/sessions.py (신규)
@router.post("/api/sessions/{account_id}/export")
async def export_session(account_id: str):
    """세션 파일을 암호화된 형태로 내보내기"""
    # session 파일을 읽어 base64로 인코딩
    # AES 암호화 (사용자 제공 비밀번호)
    pass

@router.post("/api/sessions/{account_id}/import")
async def import_session(account_id: str, data: dict):
    """암호화된 세션 데이터를 복원"""
    pass
```

**변경 파일**: `backend/routers/sessions.py` (신규), `src/lib/api.ts`  
**구현 난이도**: 중상 (5시간)  
**예상 개발 시간**: 5시간

#### P2: 자동 세션 복구

```python
# backend/account_runtime.py — AutoRecovery 확장
class AutoRecovery:
    async def attempt_session_recovery(self) -> bool:
        """세션 파일이 있지만 인증이 안 된 경우 자동 복구 시도"""
        if not self._health_monitor._state.has_session:
            # 세션 파일 존재 확인
            if os.path.exists(self._session_path):
                try:
                    await self._client.connect()
                    me = await self._client.get_me()
                    if me:
                        self._health_monitor.set_session_status(True)
                        return True
                except Exception:
                    pass
        return False
```

**변경 파일**: `backend/account_runtime.py`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

---

## 12. 백그라운드 동작 방식

### 12.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **푸시 알림** | iOS/Android 푸시로 메시지 수신 |
| **백그라운드 새로고침** | 제한적 백그라운드 작업 |
| **워치 독** | 연결 끊김 감지 및 자동 재연결 |
| **데이터 세이버** | 백그라운드 데이터 사용량 제한 |
| **배터리 최적화** | OS 배터리 최적화 가이드 |

### 12.2 TeleMon 현재 상태

**현재 백그라운드 동작**:
- 모든 계정 Runtime이 서버에서 동시 실행
- 30초 간격 프론트엔드 폴링
- 5분 간격 그룹 캐시 갱신
- 1분 간격 헬스 체크
- BroadcastQueue가 비동기로 발송 처리

**장점** (Nicegram 대비):
- 서버 기반이므로 기기 제약 없음
- 100+ 계정 동시 운영 가능
- 24/7 백그라운드 동작

**문제점**:
1. 프론트엔드가 열려 있어야 실시간 업데이트
2. 서버 리소스 사용량 선형 증가
3. 비활성 계정도 Runtime 유지

### 12.3 TeleMon 통합 설계안

#### P1: 계정 Runtime 수명 주기 관리

```python
# backend/runtime_manager.py 확장
class RuntimeManager:
    async def _auto_scale_runtimes(self):
        """사용량에 따라 Runtime 수 동적 조절"""
        # 30분 이상 미사용 계정 → Runtime 일시 중지 (세션 유지)
        # 사용 재개 시 → Runtime 재시작
        # 피크 시간대 → 모든 Runtime 활성
        pass
    
    async def suspend_runtime(self, account_id: str):
        """Runtime 일시 중지 (세션 파일 유지, 메모리만 해제)"""
        runtime = self._runtimes.pop(account_id, None)
        if runtime:
            await runtime.stop()
            # 세션 파일은 유지
    
    async def resume_runtime(self, account_id: str):
        """Runtime 재개 (세션 파일로 복원)"""
        # DB에서 계정 정보 로드
        # 새 AccountRuntime 생성 및 시작
```

**변경 파일**: `backend/runtime_manager.py`, `backend/account_runtime.py`  
**구현 난이도**: 상 (8시간)  
**예상 개발 시간**: 8시간

#### P2: 서버 상태 모니터링 대시보드

```python
# backend/routers/monitoring.py (신규)
@router.get("/api/monitoring/runtime-stats")
async def get_runtime_stats():
    """각 Runtime의 CPU/메모리 사용량, 연결 상태"""
    pass
```

**변경 파일**: `backend/routers/monitoring.py` (신규), `src/components/admin/MonitoringDashboard.tsx`  
**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

---

## 13. Telegram Premium 기능

### 13.1 Nicegram 분석

Nicegram은 Premium 기능을 **무료로 사용할 수 있도록** 하는 것이 주요 특징 중 하나였으나, 현재는 Telegram의 정책 변경으로 제한적.

| Premium 기능 | Nicegram 지원 | TeleMon 활용 |
|-------------|---------------|--------------|
| **더 빠른 다운로드** | ✅ | 불필요 (서버 기반) |
| **4GB 파일 업로드** | ✅ | **대용량 미디어 발송** |
| **음성→텍스트** | ✅ | **발송 로그 분석** |
| **스티커/이모지** | ✅ | 불필요 |
| **채팅 폴더 10+** | ✅ | **그룹 폴더 무제한** |
| **프로필 배경** | ✅ | 불필요 |
| **읽음 상태 숨김** | ✅ | **발송 확인 숨김** (운영상 필요) |
| **프리미엄 스티커** | ✅ | 불필요 |

### 13.2 TeleMon 통합 설계안

#### P1: Premium 기능 활용 전략

TeleMon은 Premium 계정을 **발송 최적화** 관점에서 활용:

```python
# backend/premium_optimizer.py (신규)
class PremiumOptimizer:
    """Premium 계정의 추가 혜택을 발송에 활용"""
    
    async def send_large_file(self, account_id: str, file_path: str, chat_id: int):
        """Premium 계정은 4GB 파일 전송 가능"""
        runtime = self._get_runtime(account_id)
        if await self._is_premium(runtime):
            # 4GB 파일 직접 전송
            pass
        else:
            # 일반 계정은 2GB 제한, 분할 전송
            pass
    
    async def use_premium_stickers(self, account_id: str, chat_id: int):
        """Premium 스티커를 마케팅에 활용"""
        pass
```

**변경 파일**: `backend/premium_optimizer.py` (신규), `backend/account_runtime.py`  
**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

#### P2: Premium 계정 태깅 및 우선 발송

```typescript
// Premium 계정에 자동 태그
// Premium 계정을 우선 발송 경로로 사용
// 대용량 파일 발송 시 Premium 계정 자동 할당
```

**변경 파일**: `src/lib/accountLabels.ts`, `src/components/workspace/tabs/SendTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

---

## 14. 생산성 기능

### 14.1 Nicegram 분석

| 기능 | 설명 |
|------|------|
| **메시지 번역** | 인라인 번역 (Google Translate) |
| **메시지 예약** | 특정 시간에 메시지 전송 |
| **자동 삭제** | 메시지 자동 삭제 타이머 |
| **통계** | 메시지 전송 통계 |
| **즐겨찾기** | 자주 연락하는 사람/채팅 |
| **최근 액션** | 최근 작업 빠르게 재실행 |
| **메시지 서식** | 굵게, 기울임, 코드 등 |

### 14.2 TeleMon 현재 상태

**현재 생산성 기능**:
- 발송 템플릿 (messageTemplates.ts)
- 메시지 변수 ({{name}}, {{phone}} 등)
- 예약 발송 (scheduledAt)
- 반복 발송 (recurringIntervalMinutes)
- 단축키 (useKeyboardShortcuts.ts)
- 명령 팔레트 (CommandPalette)

**문제점**:
1. 메시지 템플릿에 변수 미리보기 부족
2. 템플릿 버전 관리 없음
3. 템플릿 공유 불가
4. 발송 전 미리보기 부족
5. A/B 테스트 불가

### 14.3 TeleMon 통합 설계안

#### P0: 메시지 템플릿 고도화

```typescript
// src/lib/messageTemplates.ts 확장
interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[]; // 추출된 변수 목록
  category: string;
  tags: string[];
  preview: string; // 변수 치환된 미리보기
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

**변경 파일**: `src/lib/messageTemplates.ts`, `src/components/workspace/tabs/SendTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P1: A/B 테스트 발송

```typescript
interface ABTestConfig {
  name: string;
  variants: {
    id: string;
    message: string;
    mediaPath: string | null;
    weight: number; // 0-100
  }[];
  targetGroups: string[];
  sampleSize: number; // 테스트 발송 수
  duration: number; // 테스트 기간 (분)
  successMetric: "open_rate" | "reply_rate" | "click_rate";
}
```

**변경 파일**:
- `src/types/index.ts` — `ABTestConfig` 타입
- `src/components/workspace/tabs/SendTab.tsx` — A/B 테스트 UI
- `backend/routers/broadcast.py` — A/B 테스트 API
- `backend/account_runtime.py` — A/B 테스트 로직

**구현 난이도**: 상 (10시간)  
**예상 개발 시간**: 10시간

#### P1: 발송 전 미리보기

```tsx
// MessagePreviewModal 고도화
// - 모바일/데스크톱 미리보기
// - 변수 치환 결과 표시
// - 인라인 버튼 미리보기
// - 미디어 첨부 미리보기
// - 여러 계정으로 보낼 때 각각 미리보기
```

**변경 파일**: `src/components/workspace/MessagePreviewModal.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 템플릿 공유 (팀 협업)

```python
# backend/routers/templates.py (신규)
@router.get("/api/templates")
async def get_templates():
    """팀 공유 템플릿 목록"""
    pass

@router.post("/api/templates/share")
async def share_template(template_id: str, target_user_id: str):
    """템플릿을 다른 사용자와 공유"""
    pass
```

**변경 파일**: `backend/routers/templates.py` (신규), `src/lib/messageTemplates.ts`, `src/lib/api.ts`  
**구현 난이도**: 중상 (6시간)  
**예상 개발 시간**: 6시간

---

## 15. 숨겨진 편의 기능

### 15.1 Nicegram 분석

| 기능 | 설명 | TeleMon 버전 |
|------|------|-------------|
| **대화 검색 기록** | 최근 검색어 저장 | **발송 패턴 저장** |
| **메시지 드래그** | 메시지를 다른 채팅으로 이동 | **발송 대상 드래그 앤 드롭** |
| **링크 프리뷰** | 링크 자동 미리보기 | **링크 인스펙터 고도화** |
| **인라인 봇** | @bot 인라인 검색 | **@template 변수 삽입** |
| **메시지 포워드** | 여러 메시지 일괄 포워드 | **일괄 발송 고도화** |
| **채팅 검색 제안** | 입력 중 자동 완성 | **그룹/템플릿 자동 완성** |
| **제스처** | 스와이프로 액션 | **키보드 단축키 + 제스처** |

### 15.2 TeleMon 통합 설계안

#### P0: 입력 자동 완성

```tsx
// SendTab.tsx — 메시지 입력 영역
// @ 입력 시 템플릿 변수 자동 완성
// # 입력 시 템플릿 이름 자동 완성
// / 입력 시 명령어 자동 완성
```

**변경 파일**: `src/components/workspace/tabs/SendTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P1: 발송 패턴 저장

```typescript
// 자주 사용하는 발송 패턴을 저장하고 재사용
interface SendPattern {
  id: string;
  name: string;
  message: string;
  mediaPath: string | null;
  targetGroupIds: string[];
  deliveryMode: "normal" | "cycle" | "bulk";
  delay: number;
  inlineButtons: InlineButton[];
  useCount: number;
  lastUsedAt: string | null;
}
```

**변경 파일**: `src/lib/sendPatterns.ts` (신규), `src/components/workspace/tabs/SendTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 발송 취소/롤백

```typescript
// 발송 중인 브로드캐스트를 취소하거나 롤백
// (Telegram 특성상 진정한 롤백은 불가능하지만,
//  추가 발송 중단 + 취소 메시지 전송으로 대체)
interface BroadcastRollback {
  broadcastId: string;
  stopFurtherSends: boolean;
  sendCancellationMessage: boolean;
  cancellationMessage: string;
}
```

**변경 파일**: `src/components/workspace/tabs/LogTab.tsx`, `backend/routers/broadcast.py`  
**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

---

## 16. UI/UX 디테일

### 16.1 Nicegram 분석

| 디테일 | 설명 | TeleMon 적용 |
|--------|------|-------------|
| **아바타 배지** | 읽지 않은 메시지 수 배지 | **계정 상태 배지** (이미 있음) |
| **스크롤바 커스텀** | 채팅 목록 커스텀 스크롤바 | **사이드바 스크롤바 개선** |
| **풀투리프레시** | 당겨서 새로고침 | **스크롤 최상단에서 새로고침** |
| **스켈레톤 로딩** | 콘텐츠 모양의 로딩 UI | **이미 사용 중** |
| **컨텍스트 메뉴** | 길게 누르면 메뉴 | **우클릭 컨텍스트 메뉴** |
| **스와이프 액션** | 좌/우 스와이프 | **모바일 대응** |
| **다크 모드** | 시스템/수동 전환 | **이미 구현됨** |
| **폰트 커스텀** | 폰트 크기/스타일 변경 | **대시보드 폰트 설정** |

### 16.2 TeleMon 통합 설계안

#### P0: 우클릭 컨텍스트 메뉴

```tsx
// src/components/ui/ContextMenu.tsx (신규)
// 계정 카드, 그룹 목록, 발송 로그 등에 우클릭 메뉴 추가

// 계정 우클릭 메뉴:
// - 계정 전환
// - 상태 복사
// - 그룹 할당
// - 즐겨찾기 토글
// - 계정 비활성화
// - 계정 삭제

// 발송 로그 우클릭 메뉴:
// - 재발송
// - 편집 후 재발송
// - 복제
// - 상세 보기
```

**변경 파일**: `src/components/ui/ContextMenu.tsx` (신규), `src/components/sidebar/AccountCard.tsx`, `src/components/workspace/tabs/LogTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P1: 모바일 반응형 개선

```tsx
// DashboardShell.tsx — 모바일에서 사이드바/인스펙터가 오버레이로 표시
// 현재는 sm:hidden/block으로 처리되어 있지만,
// 더 세련된 모바일 UX 필요

// 개선:
// - 하단 탭 네비게이션 (모바일)
// - 스와이프로 계정 전환
// - 풀다운 새로고침
// - 터치 최적화 (버튼 크기, 간격)
```

**변경 파일**: `src/components/layout/DashboardShell.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/workspace/TabBar.tsx`  
**구현 난이도**: 중상 (6시간)  
**예상 개발 시간**: 6시간

#### P2: 대시보드 커스터마이징

```typescript
// DashboardTab에 위젯 그리드 시스템
// 사용자가 위젯을 추가/제거/재배열 가능
interface DashboardWidget {
  id: string;
  type: "stats" | "chart" | "recent_activity" | "health_summary" | "quick_actions";
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
}
```

**변경 파일**: `src/components/workspace/tabs/DashboardTab.tsx`, `src/store/useDashboardStore.ts`  
**구현 난이도**: 중상 (6시간)  
**예상 개발 시간**: 6시간

---

## 17. 애니메이션

### 17.1 Nicegram 분석

| 애니메이션 | 설명 |
|-----------|------|
| **채팅 전환** | 좌우 슬라이드 전환 |
| **메시지 전송** | 메시지가 위로 올라가는 애니메이션 |
| **폴더 전환** | 폴더 탭 전환 시 부드러운 전환 |
| **아바타 확대** | 아바타 탭 시 확대 애니메이션 |
| **스크롤** | 부드러운 스크롤 (iOS 네이티브) |
| **로딩** | Telegram 특유의 원형 로딩 |

### 17.2 TeleMon 현재 상태

**현재 애니메이션** (framer-motion 사용):
- TabBar: 활성 탭 밑줄 애니메이션 (layoutId)
- 로딩: Skeleton 컴포넌트
- 기타: 최소한의 transition

**문제점**:
1. 계정 전환 시 애니메이션 없음
2. 탭 전환 시 애니메이션 없음
3. 리스트 아이템 추가/제거 시 애니메이션 없음
4. 모달/패널 오픈 시 애니메이션 부족

### 17.3 TeleMon 통합 설계안

#### P1: 페이지 전환 애니메이션

```tsx
// Workspace.tsx — 탭 전환 시 fade/slide 애니메이션
import { AnimatePresence, motion } from "framer-motion";

<motion.div
  key={activeTab}
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.15 }}
>
  {TAB_CONTENT[activeTab]}
</motion.div>
```

**변경 파일**: `src/components/layout/Workspace.tsx`  
**구현 난이도**: 중 (2시간)  
**예상 개발 시간**: 2시간

#### P1: 리스트 애니메이션

```tsx
// 계정 목록, 발송 로그 등 리스트 아이템에 애니메이션 추가
// framer-motion의 AnimatePresence + layout prop 사용
// 아이템 추가/제거/재정렬 시 부드러운 전환
```

**변경 파일**: `src/components/layout/Sidebar.tsx`, `src/components/workspace/tabs/LogTab.tsx`  
**구현 난이도**: 중 (3시간)  
**예상 개발 시간**: 3시간

#### P2: 마이크로 인터랙션

```tsx
// 버튼 클릭 시 ripple 효과
// 토글 스위치 애니메이션
// 알림 배지 카운트 업데이트 애니메이션
// 프로그레스 바 애니메이션
// 툴팁 fade in/out
```

**변경 파일**: 여러 UI 컴포넌트  
**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

---

## 18. 설정 구조

### 18.1 Nicegram 분석

| 설정 카테고리 | 세부 항목 |
|--------------|----------|
| **계정** | 계정 추가/제거, 프로필 편집, 세션 관리 |
| **알림** | 채팅별, 폴더별, 방해 금지, 사운드 |
| **데이터** | 자동 다운로드, 데이터 사용량, 캐시 관리 |
| **프라이버시** | 마지막 접속, 프로필 사진, 읽음 확인 |
| **폴더** | 폴더 생성/편집/순서/아이콘 |
| **채팅** | 채팅 배경, 폰트 크기, 스티커 제안 |
| **언어** | 앱 언어, 번역 설정 |
| **고급** | 실험적 기능, 프록시, 연결 설정 |

### 18.2 TeleMon 현재 상태

**현재 설정 구조**:
- 설정 페이지 없음 (별도 Settings 탭 없음)
- 계정 등록: RegisterTab
- 프로필: ProfileTab
- 기타 설정은 각 탭에 분산

**문제점**:
1. 중앙 설정 페이지 부재
2. 설정이 여러 탭에 분산되어 있어 찾기 어려움
3. 글로벌 설정 (알림, 테마, 언어) 관리 불편
4. 설정 검색 불가

### 18.3 TeleMon 통합 설계안

#### P0: 통합 설정 페이지

```typescript
// src/components/workspace/tabs/SettingsTab.tsx (신규)
// TabId에 "settings" 추가

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  type: "toggle" | "select" | "input" | "button" | "link";
  label: string;
  description: string;
  value: unknown;
  onChange: (value: unknown) => void;
}
```

**설정 섹션**:
1. **일반**: 테마 (다크/라이트/시스템), 언어, 시간대
2. **알림**: 브라우저 알림, 알림 규칙, 방해 금지
3. **발송**: 기본 지연 시간, 재시도 횟수, 동시 발송 수
4. **계정**: 계정 색상, 정렬 순서, 그룹 관리
5. **데이터**: 캐시 정리, 로그 보관 기간, CSV 내보내기
6. **고급**: API 키, Webhook, 실험적 기능

**변경 파일**:
- `src/types/index.ts` — `TabId`에 "settings" 추가
- `src/components/workspace/tabs/SettingsTab.tsx` — 신규 파일
- `src/components/workspace/TabBar.tsx` — 설정 탭 추가
- `src/store/useDashboardStore.ts` — 설정 상태 추가

**구현 난이도**: 중 (5시간)  
**예상 개발 시간**: 5시간

#### P1: 설정 검색

```tsx
// SettingsTab 내 검색 바
// 입력 시 관련 설정만 필터링하여 표시
// 설정 ID, 제목, 설명을 검색 대상으로
```

**변경 파일**: `src/components/workspace/tabs/SettingsTab.tsx`  
**구현 난이도**: 하 (1시간)  
**예상 개발 시간**: 1시간

#### P2: 설정 프로필

```typescript
// 여러 설정 프로필을 저장하고 상황에 따라 전환
interface SettingsProfile {
  id: string;
  name: string;
  settings: Record<string, unknown>;
}

// 예: "업무 시간" 프로필 (알림 on, 빠른 발송)
// 예: "심야" 프로필 (방해 금지, 지연 발송)
```

**변경 파일**: `src/lib/settingsProfiles.ts` (신규), `src/components/workspace/tabs/SettingsTab.tsx`  
**구현 난이도**: 중 (4시간)  
**예상 개발 시간**: 4시간

---

## 19. TeleMon 통합 우선순위 매트릭스

### 19.1 전체 우선순위 요약

| 우선순위 | 기능 | 구현 난이도 | 예상 시간 | Nicegram 영향도 | TeleMon ROI |
|---------|------|------------|----------|----------------|------------|
| **P0** | 계정 색상 시스템 | 중 | 2h | 중 | ⭐⭐⭐⭐⭐ |
| **P0** | 키보드 단축키 계정 전환 | 하 | 0.5h | 하 | ⭐⭐⭐⭐⭐ |
| **P0** | 알림 센터 | 중 | 4h | 중 | ⭐⭐⭐⭐⭐ |
| **P0** | 동적 폴링 간격 | 하 | 1h | 하 | ⭐⭐⭐⭐ |
| **P0** | 세션 상태 대시보드 | 중 | 3h | 중 | ⭐⭐⭐⭐⭐ |
| **P0** | 통합 설정 페이지 | 중 | 5h | 중 | ⭐⭐⭐⭐⭐ |
| **P0** | 메시지 템플릿 고도화 | 중 | 3h | 중 | ⭐⭐⭐⭐⭐ |
| **P0** | 입력 자동 완성 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P0** | 우클릭 컨텍스트 메뉴 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P0** | 스마트 필터 시스템 | 중상 | 4h | 상 | ⭐⭐⭐⭐⭐ |
| **P1** | 계정 그리드 뷰 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P1** | 계정 전환 애니메이션 | 중 | 1.5h | 중 | ⭐⭐⭐ |
| **P1** | 계정 전환 히스토리 | 중 | 2h | 중 | ⭐⭐⭐⭐ |
| **P1** | 그룹 폴더/카테고리 | 중 | 3h | 상 | ⭐⭐⭐⭐⭐ |
| **P1** | 그룹 상세 정보 패널 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P1** | 통합 검색 (Command Palette) | 중상 | 5h | 상 | ⭐⭐⭐⭐⭐ |
| **P1** | 그룹 대시보드 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P1** | 미디어 라이브러리 | 중 | 4h | 상 | ⭐⭐⭐⭐ |
| **P1** | 알림 규칙 엔진 | 중상 | 5h | 상 | ⭐⭐⭐⭐ |
| **P1** | WebSocket 도입 | 상 | 8h | 중 | ⭐⭐⭐⭐⭐ |
| **P1** | 가상 스크롤 | 중 | 3h | 하 | ⭐⭐⭐⭐ |
| **P1** | 세션 백업/복원 | 중상 | 5h | 중 | ⭐⭐⭐⭐ |
| **P1** | 계정 Runtime 수명 주기 | 상 | 8h | 중 | ⭐⭐⭐⭐⭐ |
| **P1** | A/B 테스트 발송 | 상 | 10h | 중 | ⭐⭐⭐⭐⭐ |
| **P1** | 발송 전 미리보기 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P1** | 발송 패턴 저장 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P1** | 페이지 전환 애니메이션 | 중 | 2h | 중 | ⭐⭐⭐ |
| **P1** | 리스트 애니메이션 | 중 | 3h | 중 | ⭐⭐⭐ |
| **P1** | 설정 검색 | 하 | 1h | 하 | ⭐⭐⭐ |
| **P1** | 모바일 반응형 개선 | 중상 | 6h | 중 | ⭐⭐⭐⭐ |
| **P1** | 필터 저장/공유 | 하 | 1h | 중 | ⭐⭐⭐ |
| **P1** | Premium 기능 활용 | 중 | 4h | 중 | ⭐⭐⭐ |
| **P2** | 계정별 독립 설정 | 중상 | 4h | 상 | ⭐⭐⭐ |
| **P2** | 그룹 아카이브 | 중 | 2h | 중 | ⭐⭐⭐ |
| **P2** | 조건부 자동 태깅 | 중 | 3h | 상 | ⭐⭐⭐⭐ |
| **P2** | 발송 로그 전문 검색 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P2** | 그룹 멤버 분석 | 중 | 4h | 중 | ⭐⭐⭐ |
| **P2** | 그룹 간 멤버 중복 분석 | 중상 | 5h | 중 | ⭐⭐⭐⭐ |
| **P2** | 미디어 최적화 | 중상 | 6h | 중 | ⭐⭐⭐ |
| **P2** | 방해 금지 모드 | 중 | 3h | 중 | ⭐⭐⭐ |
| **P2** | 캐시 워밍 전략 | 중 | 2h | 하 | ⭐⭐⭐⭐ |
| **P2** | 자동 세션 복구 | 중 | 3h | 중 | ⭐⭐⭐⭐ |
| **P2** | 서버 상태 모니터링 | 중 | 4h | 하 | ⭐⭐⭐ |
| **P2** | Premium 계정 태깅 | 중 | 3h | 중 | ⭐⭐⭐ |
| **P2** | 템플릿 공유 (팀 협업) | 중상 | 6h | 중 | ⭐⭐⭐⭐ |
| **P2** | 발송 취소/롤백 | 중 | 4h | 중 | ⭐⭐⭐ |
| **P2** | 대시보드 커스터마이징 | 중상 | 6h | 중 | ⭐⭐⭐⭐ |
| **P2** | 마이크로 인터랙션 | 중 | 4h | 중 | ⭐⭐⭐ |
| **P2** | 설정 프로필 | 중 | 4h | 중 | ⭐⭐⭐ |

### 19.2 우선순위별 총 예상 시간

| 우선순위 | 기능 수 | 총 예상 시간 |
|---------|--------|-------------|
| **P0** | 10 | 28.5시간 |
| **P1** | 22 | 88.5시간 |
| **P2** | 16 | 60시간 |
| **합계** | **48** | **177시간** |

### 19.3 추천 로드맵

#### Phase 1 (1-2주, P0 only): Quick Wins
1. 계정 색상 시스템 (2h)
2. 키보드 단축키 계정 전환 (0.5h)
3. 동적 폴링 간격 (1h)
4. 세션 상태 대시보드 (3h)
5. 메시지 템플릿 고도화 (3h)
6. 입력 자동 완성 (3h)
7. 우클릭 컨텍스트 메뉴 (3h)
8. 스마트 필터 시스템 (4h)
9. 통합 설정 페이지 (5h)
10. 알림 센터 (4h)

**Phase 1 총 예상 시간**: 28.5시간

#### Phase 2 (3-4주, P1): Core Experience
1. WebSocket 도입 (8h)
2. 계정 Runtime 수명 주기 (8h)
3. A/B 테스트 발송 (10h)
4. 통합 검색 (5h)
5. 그룹 폴더/카테고리 (3h)
6. 미디어 라이브러리 (4h)
7. 알림 규칙 엔진 (5h)
8. 모바일 반응형 개선 (6h)
9. 계정 전환 히스토리 (2h)
10. 발송 전 미리보기 (3h)

**Phase 2 총 예상 시간**: 54시간

#### Phase 3 (5-6주, P1-P2): Advanced Features
1. 가상 스크롤 (3h)
2. 세션 백업/복원 (5h)
3. 그룹 대시보드 (3h)
4. 그룹 상세 정보 패널 (3h)
5. 발송 패턴 저장 (3h)
6. 페이지 전환/리스트 애니메이션 (5h)
7. 설정 검색 (1h)
8. 필터 저장/공유 (1h)
9. Premium 기능 활용 (4h)
10. 계정 그리드 뷰 (3h)

**Phase 3 총 예상 시간**: 31시간

#### Phase 4 (7-8주, P2): Polish
1. 조건부 자동 태깅 (3h)
2. 발송 로그 전문 검색 (3h)
3. 그룹 멤버 분석 (4h)
4. 그룹 간 멤버 중복 분석 (5h)
5. 미디어 최적화 (6h)
6. 방해 금지 모드 (3h)
7. 캐시 워밍 전략 (2h)
8. 자동 세션 복구 (3h)
9. 서버 상태 모니터링 (4h)
10. Premium 계정 태깅 (3h)
11. 템플릿 공유 (6h)
12. 발송 취소/롤백 (4h)
13. 대시보드 커스터마이징 (6h)
14. 마이크로 인터랙션 (4h)
15. 설정 프로필 (4h)
16. 계정별 독립 설정 (4h)
17. 그룹 아카이브 (2h)

**Phase 4 총 예상 시간**: 66시간

---

## 20. TeleMon만의 차별화 UX 아이디어

### 20.1 Nicegram을 넘어서는 혁신

#### 1. AI 기반 발송 최적화

```typescript
// Nicegram에는 없는 TeleMon만의 기능
interface AISendOptimizer {
  // 최적 발송 시간 추천
  bestTimeToSend: (groupId: string) => string[];
  
  // 메시지 톤 분석
  messageToneAnalysis: (message: string) => "formal" | "friendly" | "urgent" | "promotional";
  
  // 대상 그룹 세그먼트 추천
  recommendedSegments: (message: string) => string[];
  
  // 예상 성공률
  predictedSuccessRate: (message: string, groupIds: string[]) => number;
}
```

**차별화 포인트**: Nicegram은 AI 기능이 없음. TeleMon은 발송 데이터를 기반으로 AI 최적화 가능.

#### 2. 멀티 계정 통합 받은편지함

```typescript
// 모든 계정의 메시지를 하나의 타임라인으로 통합
interface UnifiedInbox {
  messages: UnifiedMessage[];
  filters: {
    accountId: string[];
    type: "all" | "unread" | "replied" | "auto_replied";
    dateRange: [string, string];
  };
  bulkActions: {
    reply: (messageIds: string[], templateId: string) => Promise<void>;
    markRead: (messageIds: string[]) => Promise<void>;
    forward: (messageIds: string[], targetAccountId: string) => Promise<void>;
  };
}
```

**차별화 포인트**: Nicegram은 계정별로 채팅이 분리됨. TeleMon은 모든 계정의 메시지를 통합 관리.

#### 3. 발송 파이프라인 시각화

```typescript
// 발송 과정을 단계별 시각화
interface SendPipeline {
  stages: {
    id: string;
    name: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number; // 0-100
    metrics: {
      total: number;
      success: number;
      failed: number;
      rateLimited: number;
    };
    startedAt: string | null;
    completedAt: string | null;
  }[];
  // DAG (Directed Acyclic Graph) 형태로 파이프라인 표시
  // 각 단계를 병렬/직렬로 연결 가능
}
```

**차별화 포인트**: Nicegram은 단순 메시지 전송. TeleMon은 복잡한 발송 파이프라인을 시각화.

#### 4. 계정 건강 예측

```typescript
// 머신러닝 기반 계정 건강 예측
interface AccountHealthPrediction {
  accountId: string;
  riskScore: number; // 0-100
  riskFactors: {
    factor: string;
    impact: "high" | "medium" | "low";
    description: string;
  }[];
  recommendedActions: {
    action: string;
    priority: "immediate" | "soon" | "monitor";
    description: string;
  }[];
  predictedBanProbability: number; // 0-1
  predictedRateLimitProbability: number; // 0-1
}
```

**차별화 포인트**: Nicegram은 현재 상태만 표시. TeleMon은 미래 위험을 예측하여 선제 대응 가능.

#### 5. 팀 협업 워크스페이스

```typescript
// 여러 운영자가 함께 사용하는 워크스페이스
interface TeamWorkspace {
  members: TeamMember[];
  roles: {
    admin: "full_access";
    operator: "send_and_monitor";
    viewer: "read_only";
  };
  activities: ActivityLog[];
  comments: Comment[]; // 발송/계정에 댓글
  approvals: Approval[]; // 발송 전 승인 프로세스
}
```

**차별화 포인트**: Nicegram은 싱글 사용자. TeleMon은 B2B 팀 협업이 핵심 가치.

#### 6. 발송 캘린더

```typescript
// 모든 예약/반복 발송을 캘린더 뷰로 통합
interface SendCalendar {
  events: CalendarEvent[];
  view: "month" | "week" | "day" | "agenda";
  filters: {
    accountId: string[];
    type: ("scheduled" | "recurring" | "auto_reply")[];
  };
  conflicts: Conflict[]; // 동시 발송 충돌 감지
  suggestions: Suggestion[]; // 발송 시간 분산 추천
}
```

**차별화 포인트**: Nicegram은 단순 예약 발송. TeleMon은 전체 발송 일정을 캘린더로 관리.

#### 7. 스마트 그룹 (자동 그룹화)

```typescript
// 조건에 따라 자동으로 그룹화
interface SmartGroup {
  id: string;
  name: string;
  description: string;
  rules: GroupRule[];
  memberCount: number;
  lastUpdated: string;
  isAutoUpdate: boolean; // 주기적으로 자동 업데이트
}

interface GroupRule {
  field: "members" | "activity" | "type" | "language" | "location";
  operator: "gt" | "lt" | "eq" | "contains" | "in";
  value: unknown;
}

// 예: "멤버 1000명 이상 활성 그룹"
// 예: "한국어 사용자 그룹"
// 예: "지난 7일간 메시지 있는 그룹"
```

**차별화 포인트**: Nicegram은 수동 폴더만 지원. TeleMon은 조건 기반 자동 그룹화.

#### 8. 발송 분석 대시보드 (Nicegram 통계의 10배)

```typescript
interface AdvancedAnalytics {
  // 시간대별 발송 성공률
  hourlySuccessRate: Record<string, number>;
  
  // 요일별 최적 발송 시간
  bestDayTime: { day: string; hour: number; successRate: number };
  
  // 계정별 발송 한도 소진율
  accountLimitUsage: { accountId: string; used: number; limit: number; resetAt: string };
  
  // 메시지 길이별 성공률
  messageLengthImpact: { length: number; successRate: number }[];
  
  // 미디어 vs 텍스트 성공률 비교
  mediaVsText: { media: number; text: number };
  
  // 그룹 타입별 성공률
  groupTypeSuccess: { group: number; megagroup: number; channel: number };
  
  // 발송 지연 분석
  latencyDistribution: { p50: number; p90: number; p99: number; max: number };
}
```

**차별화 포인트**: Nicegram은 기본 통계만 제공. TeleMon은 발송 최적화를 위한 고급 분석 제공.

#### 9. 원클릭 재발송 워크플로우

```typescript
// 실패한 발송을 한 번의 클릭으로 재발송
// 실패 원인 분석 → 자동 수정 → 재발송
interface OneClickResend {
  failedBroadcast: Broadcast;
  analysis: {
    failureReason: string;
    autoFixable: boolean;
    autoFix: (() => Promise<void>) | null;
    estimatedSuccessRate: number;
  };
  options: {
    resendToAll: boolean;
    resendToFailedOnly: boolean;
    modifyMessage: boolean;
    changeAccount: boolean;
  };
}
```

**차별화 포인트**: Nicegram은 재발송 개념 없음. TeleMon은 실패한 발송을 지능적으로 복구.

#### 10. 글로벌 발송 모니터링 월

```typescript
// 모든 계정의 모든 발송을 하나의 월(벽)에 실시간 표시
interface GlobalSendWall {
  entries: SendEntry[];
  filters: {
    accountId: string[];
    status: BroadcastStatus[];
    timeRange: [string, string];
  };
  realtime: boolean; // WebSocket 실시간 업데이트
  alerts: Alert[]; // 이상 징후 알림
}
```

**차별화 포인트**: Nicegram은 개인 메시지에 집중. TeleMon은 전체 발송 상황을 한눈에 모니터링.

### 20.2 Nicegram 대비 TeleMon의 핵심 경쟁력

| 영역 | Nicegram | TeleMon (목표) |
|------|----------|---------------|
| **계정 관리** | 1-10개 계정 | 10-100+ 계정 |
| **발송** | 1:1 메시지 | 1:N 대량 발송 |
| **자동화** | 기본 없음 | AutoReply + ReplyMacro + Scheduler |
| **분석** | 기본 통계 | 고급 분석 + AI 예측 |
| **협업** | 싱글 사용자 | 팀 워크스페이스 |
| **모니터링** | 개인 알림 | 실시간 대시보드 + 알림 |
| **최적화** | 수동 | AI 기반 자동 최적화 |
| **확장성** | 모바일 기기 한정 | 서버 기반 무제한 |

---

## 부록: 변경 영향 파일 목록

### 신규 파일 (18개)

| 파일 | 설명 | 우선순위 |
|------|------|---------|
| `src/lib/accountAppearance.ts` | 계정 색상/이모지/순서 관리 | P0 |
| `src/lib/smartFilters.ts` | 스마트 필터 시스템 | P0 |
| `src/store/useNotificationStore.ts` | 알림 센터 상태 관리 | P0 |
| `src/components/ui/NotificationCenter.tsx` | 알림 센터 UI | P0 |
| `src/components/ui/ContextMenu.tsx` | 우클릭 컨텍스트 메뉴 | P0 |
| `src/components/workspace/tabs/SettingsTab.tsx` | 통합 설정 페이지 | P0 |
| `src/lib/groupFolders.ts` | 그룹 폴더/카테고리 | P1 |
| `src/lib/sendPatterns.ts` | 발송 패턴 저장 | P1 |
| `src/lib/useWebSocket.ts` | WebSocket 훅 | P1 |
| `backend/websocket.py` | WebSocket 서버 | P1 |
| `backend/routers/sessions.py` | 세션 백업/복원 API | P1 |
| `backend/premium_optimizer.py` | Premium 기능 최적화 | P1 |
| `backend/media_optimizer.py` | 미디어 최적화 | P2 |
| `backend/routers/search.py` | 발송 로그 검색 API | P2 |
| `backend/routers/monitoring.py` | 서버 모니터링 API | P2 |
| `backend/routers/templates.py` | 템플릿 공유 API | P2 |
| `src/lib/settingsProfiles.ts` | 설정 프로필 | P2 |
| `src/lib/mediaLibrary.ts` | 미디어 라이브러리 | P1 |

### 수정 파일 (25개)

| 파일 | 변경 내용 | 우선순위 |
|------|---------|---------|
| `src/types/index.ts` | 신규 타입 추가 (AccountAppearance, SmartFilter, GroupFolder 등) | P0 |
| `src/store/useDashboardStore.ts` | 설정 상태, 필터 상태 추가 | P0 |
| `src/lib/runtimeManager.ts` | 동적 폴링, 계정 히스토리, 캐시 워밍 | P0 |
| `src/lib/useKeyboardShortcuts.ts` | 계정 전환 단축키 | P0 |
| `src/lib/messageTemplates.ts` | 템플릿 고도화 (변수, 버전, 카테고리) | P0 |
| `src/lib/api.ts` | 신규 API 함수 추가 | P0 |
| `src/components/layout/Sidebar.tsx` | 계정 색상, 그리드 뷰, 스마트 필터 | P0 |
| `src/components/sidebar/AccountCard.tsx` | 색상 accent, 확장 패널 | P0 |
| `src/components/layout/Header.tsx` | 알림 벨 아이콘 | P0 |
| `src/components/layout/Workspace.tsx` | 페이지 전환 애니메이션 | P1 |
| `src/components/workspace/TabBar.tsx` | 설정 탭 추가 | P0 |
| `src/components/workspace/tabs/SendTab.tsx` | 자동 완성, A/B 테스트, 미리보기, 패턴 저장 | P0 |
| `src/components/workspace/tabs/LogTab.tsx` | 컨텍스트 메뉴, 발송 취소 | P0 |
| `src/components/workspace/tabs/GroupTab.tsx` | 그룹 대시보드, 폴더 관리 | P1 |
| `src/components/workspace/tabs/DashboardTab.tsx` | 위젯 커스터마이징 | P2 |
| `src/components/workspace/tabs/ProfileTab.tsx` | 세션 정보 섹션 | P0 |
| `src/components/workspace/CommandPalette.tsx` | 통합 검색 | P1 |
| `src/components/workspace/MessagePreviewModal.tsx` | 발송 전 미리보기 고도화 | P1 |
| `src/components/layout/Inspector.tsx` | 그룹 상세 정보 | P1 |
| `src/components/layout/DashboardShell.tsx` | 모바일 반응형 개선 | P1 |
| `src/lib/accountLabels.ts` | 조건부 자동 태깅 | P2 |
| `src/lib/accountGroups.ts` | 자동 그룹화 | P2 |
| `backend/main.py` | 신규 라우터 등록 | P1 |
| `backend/runtime_manager.py` | Runtime 수명 주기 관리 | P1 |
| `backend/account_runtime.py` | 자동 세션 복구, Premium 최적화 | P1 |

---

> **문서 버전**: 1.0  
> **작성자**: CTO (AI Assistant)  
> **다음 단계**: Phase 1 (P0) 기능부터 독립 브랜치에서 개발 시작. 각 기능은 기존 기능에 영향을 주지 않도록 설계됨.