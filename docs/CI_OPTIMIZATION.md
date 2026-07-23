# TeleMon CI 파이프라인 최적화 노트

## Self-hosted Runner 검토

### 현재 상황
- GitHub Actions ubuntu-latest (기본 2코어) 사용 중
- Docker 이미지를 GHCR에 빌드/푸시 후 VPS에서 pull
- 대기 시간 요소: runner 부팅(~10s), pnpm install(~20s), Docker buildx(~60s), GHCR pull(~10s)

### Self-hosted Runner 도입시 장점
1. **러너 부팅 시간 제거** — 항상 뜨있는 runner
2. **pnpm store 캐시 영구 보관** — 최초 1회만 install
3. **Docker layer cache 영구** — `type=gha`보다 빠름
4. **VPS와 같은 리전** — GHCR pull 속도 향상 (현재 VPS가 runner와 다른 리전이면 ~5-10s 단축)

### 구성 제안
```yaml
runs-on: [self-hosted, linux, x64]
```

1. VPS 옆 같은 리전에 t3.medium(2코어 4GB) 또는 t3.large(4코어 8GB) 인스턴스 추가
2. `actions-runner` 설치 및 등록
3. Runner label: `self-hosted`, `linux`, `x64`
4. 워크플로에서 `runs-on: [self-hosted, linux, x64]`로 전환

### 비용
- t3.medium: ~$30/월 (온디맨드) or ~$18/월 (1년 예약)
- t3.large(4코어): ~$60/월 or ~$38/월 (1년 예약)
- GitHub Actions 무료 할당량(2000분/월) 초과 방지 효과

### 결정 시점
프로젝트 규모가 커져서:
- CI 실행이 하루 10회 이상
- 각 실행 5분 이상 소요
- GitHub Actions 무료 할당량 초과
하는 시점에 도입 검토.
