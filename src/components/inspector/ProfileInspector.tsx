import { Info } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

export function ProfileInspector() {
  return (
    <div className="space-y-4">
      <Panel title="안내">
        <div className="flex items-start gap-2 text-xs text-app-text-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-text-subtle" />
          <p>프로필 편집은 아직 목업 화면입니다 — 저장해도 실제로 반영되지 않습니다.</p>
        </div>
      </Panel>
    </div>
  );
}
