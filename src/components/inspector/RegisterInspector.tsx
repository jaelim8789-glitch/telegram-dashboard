import { Panel } from "@/components/ui/Panel";

const STEPS = [
  { title: "전화번호 등록", body: "국가 코드를 포함한 전화번호를 입력하면 Telegram이 인증번호를 보냅니다." },
  { title: "인증번호 확인", body: "Telegram 앱으로 온 코드를 입력합니다. 실패 시 재전송할 수 있습니다." },
  { title: "2단계 인증(해당 시)", body: "계정에 클라우드 비밀번호가 설정되어 있으면 추가로 입력합니다." },
  { title: "완료", body: "인증이 끝나면 사이드바에 계정이 추가되고, 바로 발송/자동응답에 사용할 수 있습니다." },
];

export function RegisterInspector() {
  return (
    <div className="space-y-4">
      <Panel title="등록 절차">
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-primary-muted text-[11px] font-semibold text-app-primary-hover">
                {i + 1}
              </span>
              <div>
                <div className="text-xs font-medium text-app-text">{step.title}</div>
                <div className="text-[11px] text-app-text-subtle">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
      <Panel title="필요한 것">
        <p className="text-xs text-app-text-muted">
          서버(.env)에 <code className="text-app-text">TELEGRAM_API_ID</code> /{" "}
          <code className="text-app-text">TELEGRAM_API_HASH</code>가 설정되어 있어야 인증번호가 실제로
          발송됩니다. 계정마다 다시 발급받을 필요는 없습니다.
        </p>
      </Panel>
    </div>
  );
}
