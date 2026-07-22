# ONBOARDING.md — 신규 AI 에이전트 5분 시작 가이드

이 문서 하나만 읽으면 첫 커밋까지 갈 수 있습니다. 더 깊은 내용은 각 단계에서 링크한 문서로.

---

## 1단계 (1분) — 당신이 누구인지 확인

아래 표에서 자신의 이름을 찾아 **그 워크트리 경로로만** 이동하세요. 다른 워크트리는 절대 건드리지 않습니다.

| 나는... | 이동할 경로 | 체크아웃되는 브랜치 | 할 수 있는 일 |
|---|---|---|---|
| Cline | `c:\Dev\TeleMon-cline` | `worktree/cline` | 개발 / commit / push만 |
| OpenCode | `c:\Dev\TeleMon-opencode` | `worktree/opencode` | 개발 / commit / push만 |
| Kiro | `c:\Dev\TeleMon-kiro` | `worktree/kiro` | 개발 / commit / push만 |
| Codex | `c:\Dev\TeleMon-codex` (합류 예정) | `worktree/codex` | 개발 / commit / push만 |
| Claude Code | `c:\Dev\TeleMon-release` | `worktree/release` | merge / test / build / deploy만 |

확실하지 않으면 실행:
```bash
git worktree list        # 현재 존재하는 모든 워크트리와 경로
git branch --show-current  # 지금 내가 어느 브랜치에 있는지
```

**`c:\Dev\TeleMon`(parent, `master`)에서는 절대 개발하지 않습니다** — 참조 전용입니다.

---

## 2단계 (1분) — 프로젝트가 뭔지 3줄 요약

- Telegram 계정/채널 관리 대시보드. **프론트엔드**(Next.js, 이 저장소)와 **백엔드**(FastAPI, `telegram-dashboard-backend/`, 별도 git 저장소)로 나뉩니다.
- 프로덕션은 VPS 1대의 Docker Compose로 `api.telemon.online` / `app.telemon.online`을 서비스합니다.
- 더 깊은 아키텍처는 [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) 참고 (지금 당장 읽을 필요는 없음).

---

## 3단계 (1분) — 개발 서버 띄우기

프론트엔드만:
```bash
npm install
npm run dev        # http://localhost:3000
```
백엔드가 필요한 기능을 만진다면 백엔드도 별도로 띄워야 합니다 — `telegram-dashboard-backend/README.md` 참고.

자세한 스크립트 목록은 [README.md](README.md#스크립트) 참고.

---

## 4단계 (1분) — 지켜야 할 규칙 (필수 읽기 링크)

| 문서 | 언제 읽나 |
|---|---|
| **[AGENTS.md](AGENTS.md)** | **지금, 필수.** 워크트리 규칙(MANDATORY), MCP 우선순위, 배포 절차의 정본. |
| [WORKTREE_WORKFLOW.md](WORKTREE_WORKFLOW.md) | 브랜치를 새로 만들거나, merge/release/deploy를 다룰 때 — "왜"와 상세 절차. |
| [PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md) | **무슨 기능을 만들지 정할 때** — 내 담당 영역, 병렬 가능한 작업, 충돌 위험 파일 확인. |
| [ALEMBIC_CONVENTIONS.md](ALEMBIC_CONVENTIONS.md) | **백엔드 migration을 만들 때** — revision ID 자동 생성, 멀티헤드 방지 규칙. |

지금 당장 외워야 할 3가지:
1. **내 워크트리 밖은 수정하지 않는다.**
2. **개발 워크트리에서는 merge/rebase/deploy를 하지 않는다** — 그건 `TeleMon-release`(Claude Code)의 일.
3. **일상적인 커밋은 내 고정 브랜치(`worktree/<나>`)에 직접 쌓는다.** PR 리뷰가 필요한 큰 작업만 거기서 `feat/*`로 분기(WORKTREE_WORKFLOW.md §3).

---

## 5단계 (1분) — 커밋 → 푸시 → 보고

```bash
git status                          # 내가 건드린 파일이 맞는지 확인
git add <파일...>                    # -A / . 대신 파일을 명시
git commit -m "feat: 설명"           # type: 설명 형식
git push origin worktree/<나>
```
개발 완료 시 보고는 **commit hash만**이면 충분합니다(AGENTS.md 규칙 5). 배포·머지는 요청하지 마세요 — `TeleMon-release`의 역할입니다.

---

## 막히면

- 워크트리/브랜치 구조가 헷갈리면 → [WORKTREE_WORKFLOW.md](WORKTREE_WORKFLOW.md)
- MCP 도구를 언제 쓰는지 → [AGENTS.md](AGENTS.md#core-rule-mcp-first) / [MCP_GUIDE.md](MCP_GUIDE.md)
- 배포/프로덕션 이슈 → [AGENTS.md](AGENTS.md#production-deployment)
- 그래도 모르겠으면 코드/DB/로그를 MCP로 직접 확인하고, 그래도 안 되면 사용자에게 질문하세요(AGENTS.md §Core rule).
