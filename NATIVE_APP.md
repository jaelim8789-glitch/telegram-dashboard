# TeleMon Native App (Capacitor)

TeleMon은 Capacitor 기반 iOS/Android 네이티브 앱으로 빌드됩니다.  
PWA 기능(manifest, SW, push, share target, biometric)을 그대로 유지하면서 네이티브 API로 확장합니다.

## 요구사항

- Node.js 20+
- Android Studio (Android 빌드)
- Xcode (iOS 빌드, macOS 필요)

## 빌드 및 실행

### 1. 웹 앱 빌드 + 네이티브 복사

```bash
# 전체 빌드 (디버그)
npm run cap:build

# 또는 단계별:
cross-env CAPACITOR=1 next build      # Next.js 정적 내보내기 → dist/
npx cap copy                          # dist/ → android/app/src/main/assets/public
```

### 2. Android 실행

```bash
npm run cap:android
# 또는: npx cap open android
# Android Studio에서 실행 (실제 기기 또는 에뮬레이터)
```

### 3. iOS 실행 (macOS)

```bash
npm run cap:ios
# 또는: npx cap open ios
# Xcode에서 실행 (실제 기기 또는 시뮬레이터)
```

## 네이티브 기능

| 기능 | 구현 | 플러그인 |
|------|------|---------|
| Push 알림 | FCM 토큰 등록, 수신 처리 | `@capacitor/push-notifications` |
| 햅틱 피드백 | light/medium/heavy/success/warning/error | `@capacitor/haptics` |
| 공유 | 앱 내 공유시트 | `@capacitor/share` |
| 상태바 | 라이트/다크 모드 | `@capacitor/status-bar` |
| 앱 배지 | 발송 건수 아이콘 뱃지 | `@capacitor/badge` |
| 파일시스템 | 오프라인 캐시/내보내기 | `@capacitor/filesystem` |
| 스플래시 | 로딩 화면 (1초, 검정 배경) | `@capacitor/splash-screen` |

## 브릿지 API

웹 ↔ 네이티브 브릿지는 `src/lib/native-bridge.ts`에 추상화되어 있습니다.  
웹 환경에서는 graceful fallback, 네이티브에서는 진짜 기능을 사용합니다.

```ts
import { nativeHaptic, registerNativePush, nativeShare, setNativeBadge } from "@/lib/native-bridge";

// 진동
await nativeHaptic("success");

// 푸시 알림 등록
await registerNativePush();

// 배지 업데이트
await setNativeBadge(5);
```

## 주의사항

1. `next.config.ts`의 `output`은 `CAPACITOR=1` 환경변수로 `export`로 전환됩니다
2. Docker 빌드(`standalone`)와 Capacitor 빌드(`export`)가 충돌하지 않도록 환경변수로 분기
3. 빌드 전 `dist/` 디렉토리가 있으면 자동 삭제 후 재생성
