import { Star } from "lucide-react";
import { Panel } from "@/components/ui/Panel";

export function GroupInspector() {
  return (
    <div className="space-y-4">
      <Panel title="안내">
        <ul className="space-y-2 text-xs text-app-text-muted">
          <li className="flex items-start gap-1.5">
            <Star className="mt-0.5 h-3 w-3 shrink-0 text-app-warning" />
            그룹 카드에 마우스를 올리면 즐겨찾기 버튼이 나타납니다. 즐겨찾기는 발송 화면의 대상
            선택에서도 함께 표시됩니다.
          </li>
          <li>검색과 정렬(멤버 많은순 / 즐겨찾기 우선)로 원하는 그룹을 빠르게 찾을 수 있습니다.</li>
        </ul>
      </Panel>
    </div>
  );
}
