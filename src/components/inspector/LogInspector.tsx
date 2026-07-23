import { RefreshCw } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

export function LogInspector() {
  return (
    <div className="space-y-4">
      <Panel title="안내">
        <ul className="space-y-2 text-xs text-app-text-muted">
          <li>목록 위쪽의 계정/상태 드롭다운으로 필터링합니다.</li>
          <li className="flex items-start gap-1.5">
            <RefreshCw className="mt-0.5 h-3 w-3 shrink-0 text-app-text-subtle" />
            대기 중이거나 발송 중인 작업이 있으면 5초마다 자동으로 갱신됩니다.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
