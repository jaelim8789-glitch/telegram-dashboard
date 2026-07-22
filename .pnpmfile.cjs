# pnpm 설정 — npm보다 2~3배 빠른 패키지 설치
packageManager: pnpm@10.8.1

pnpm:
  # 허용되는 의존성 호이스팅 패턴 (Next.js 호환성)
  onlyBuiltDependencies:
    - esbuild
    - sharp
  # 엄격한 peer dependency 모드 (누락된 peer dep 자동 실패)
  strictPeerDependencies: false
  # .npmrc와 동일한 레지스트리
