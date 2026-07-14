"use client";

import { Info, Link as LinkIcon, Pin } from "lucide-react";

export function ChannelHubInspector() {
  return (
    <div className="space-y-4 text-xs text-app-text-muted">
      <p className="leading-relaxed">
        채널 허브 빌더를 사용하면 <strong className="text-app-text">인라인 버튼이 포함된 메시지</strong>를
        Telegram 채널에 직접 발행할 수 있습니다.
      </p>

      <div className="space-y-3">
        <h3 className="text-[11px] font-semibold text-app-text uppercase tracking-wider">사용 방법</h3>
        <ol className="list-decimal pl-4 space-y-2 leading-relaxed">
          <li>게시글 제목과 본문을 작성합니다.</li>
          <li>필요한 버튼을 추가하고 이름과 URL을 설정합니다.</li>
          <li>발행할 Telegram 채널의 ID 또는 @username을 입력합니다.</li>
          <li>필요시 메시지 고정(Pin)을 선택합니다.</li>
          <li>우측 미리보기를 확인한 후 발행합니다.</li>
        </ol>
      </div>

      <div className="rounded-xl border border-app-border bg-app-surface p-3 space-y-2">
        <h3 className="text-[11px] font-semibold text-app-text">참고</h3>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <LinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-primary" />
            <span>버튼 URL은 반드시 https://로 시작해야 합니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-warning" />
            <span>고정 메시지는 채널당 하나만 가능합니다. 기존 고정 메시지는 해제됩니다.</span>
          </div>
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>현재 백엔드 API 연동 전입니다. 발행 버튼은 UI 시뮬레이션으로 동작합니다.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
