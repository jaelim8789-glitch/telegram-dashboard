import { CheckCircle2, Phone, Shield, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";

const STEPS = [
  { icon: Phone, title: "전화번호 등록", body: "국가 코드를 포함한 전화번호를 입력합니다. 인증번호가 Telegram 앱으로 전송됩니다.", status: "입력" as const },
  { icon: Smartphone, title: "인증번호 확인", body: "Telegram 앱으로 온 5-6자리 인증번호를 입력합니다. 붙여넣기 지원.", status: "입력" as const },
  { icon: Shield, title: "2단계 인증(해당 시)", body: "계정에 클라우드 비밀번호가 설정되어 있으면 추가로 입력합니다. 비밀번호 표시 전환 가능.", status: "선택" as const },
  { icon: CheckCircle2, title: "완료", body: "인증 완료 후 계정이 사이드바에 추가됩니다. 대시보드로 이동하거나 새 계정을 등록할 수 있습니다.", status: "완료" as const },
];

const STATUS_STYLE = {
  입력: "bg-app-primary-muted text-app-primary",
  선택: "bg-app-warning-muted text-app-warning",
  완료: "bg-app-success-muted text-app-success",
} as const;

export function RegisterInspector() {
  return (
    <div className="space-y-4">
      <Panel title="등록 절차">
        <div className="space-y-0">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className={cn(
                "flex gap-3 py-2.5",
                i < STEPS.length - 1 && "border-b border-app-border"
              )}>
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    STATUS_STYLE[step.status]
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {i < STEPS.length - 1 && <div className="mt-1 h-full w-px bg-app-border" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-app-text">{step.title}</span>
                    <Badge tone={step.status === "완료" ? "success" : step.status === "선택" ? "warning" : "neutral"}>
                      {step.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-app-text-subtle">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="필요한 것">
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-xs text-app-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-app-primary shrink-0" />
            .env에 <code className="text-app-text text-[11px]">TELEGRAM_API_ID</code> / <code className="text-app-text text-[11px]">TELEGRAM_API_HASH</code> 설정 필요
          </li>
          <li className="flex items-center gap-2 text-xs text-app-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-app-primary shrink-0" />
            계정마다 API ID/Hash를 다시 발급받을 필요 없음
          </li>
          <li className="flex items-center gap-2 text-xs text-app-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-app-primary shrink-0" />
            인증 완료 후 바로 발송/자동응답에 사용 가능
          </li>
        </ul>
      </Panel>
      <Panel title="문제 해결">
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-xs text-app-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-app-warning shrink-0" />
            인증번호가 오지 않으면 재전송 버튼 사용 (30초 대기)
          </li>
          <li className="flex items-center gap-2 text-xs text-app-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-app-warning shrink-0" />
            2FA 비밀번호를 잊었다면 Telegram 앱에서 초기화 필요
          </li>
          <li className="flex items-center gap-2 text-xs text-app-text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-app-warning shrink-0" />
            계정이 차단된 경우 새 계정으로 재시도
          </li>
        </ul>
      </Panel>
    </div>
  );
}