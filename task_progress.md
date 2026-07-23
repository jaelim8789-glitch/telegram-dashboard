# SendTab.tsx 수정 사항

## 1. 반복 발송 / 예약 발송 disabled 제거
- `isScheduled` 체크박스 (1658-1660): `disabled` 제거, `opacity-50` 제거
- `isRecurring` 체크박스 (1679-1681): `disabled` 제거, `opacity-50` 제거
- `disabled` 속성이 체크박스 input에 있어 모바일 터치가 안 됨
- `opacity-50`으로 흐리게 보여 사용자 인지 어려움

## 2. 이미지 업로드 accept에 동영상 포맷 추가
- `accept="image/jpeg,image/png,image/webp,image/gif"` → 동영상 포맵 추가
- 백엔드 media.py에서 지원하는 video/mp4, video/quicktime, video/x-msvideo, video/x-matroska 추가

## 3. 답장 매크로 전송 시 delivery_mode "reply" 추가
- handleSubmit에서 `replyMacroEnabled && replyToMessageId`가 있을 때 delivery_mode를 "reply"로 설정
- createBroadcast 호출 시 API에 전달

## 4. 백엔드 media.py 이미지 MIME 타입 확장
- 텔레그램에서 다운로드한 이미지의 MIME 타입 처리 (image/webp 등)
- _EXTENSION_BY_CONTENT_TYPE 맵에 누락된 타입 추가