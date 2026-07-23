# Deployment Known Issues

## Docker Build Context

### 문제

Docker build context에 루트 `app/`, `backend/`가 포함되면 프론트엔드 빌드에 영향을 줄 수 있다.

구체적으로: Next.js는 App Router 디렉터리를 탐지할 때 `<root>/app`을 `<root>/src/app`보다
우선한다. 이 저장소 루트의 `app/`(레거시 Python 백엔드 코드, Next.js 프론트엔드와 무관)가
Docker build context에 포함돼 있으면, Next.js가 이 디렉터리를 App Router로 오인해
`src/app/`의 실제 페이지를 하나도 찾지 못한다. 빌드 자체는 에러 없이 "성공"하지만
`.next/routes-manifest.json`의 `staticRoutes`/`dynamicRoutes`가 0개, `.next/server/app`
디렉터리가 아예 생성되지 않아 배포된 사이트의 모든 경로가 404를 반환한다.

2026-07-19 배포 중 이 문제로 `telemon.online` / `app.telemon.online`의 모든 페이지가
404 상태였던 것을 발견하고 수정했다.

### 해결

`.dockerignore`에 다음을 추가한다:

```
/app
/backend
```

### 주의

- `src/app`은 제외 대상이 아니다 — 위 패턴은 리딩 슬래시로 저장소 **루트**에만 앵커링되므로
  `src/app/`과는 매칭되지 않는다. `app`처럼 슬래시 없이 쓰면 중첩된 모든 `app` 디렉터리
  (`src/app` 포함)에 매칭되어 실제 프론트엔드가 통째로 빠지니 반드시 `/app` 형태를 유지한다.
- 루트 `app/`, `backend/` 디렉터리 자체는 삭제하지 않는다 (다른 목적으로 저장소에 남아있는
  코드 — 별도 정리 작업 전까지는 존재 자체가 정상 상태).
- `Dockerfile`을 변경할 때는(특히 `COPY . .` 방식의 빌드 컨텍스트 사용 시) 이 이슈가
  재발하지 않는지 반드시 재검토한다. `.dockerignore` 없이 빌드 컨텍스트를 바꾸는 작업
  (예: BuildKit `--build-context`, 별도 `COPY src/ backend/` 방식으로의 전환 등)은 특히
  주의가 필요하다.
