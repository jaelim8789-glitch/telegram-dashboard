import { Check, Megaphone, Plus, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { MAX_BROADCAST_RECIPIENTS, type Group, type GroupType } from "@/types";

const TYPE_LABEL: Record<GroupType, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};

interface GroupSelectCardProps {
  group: Group;
  selected: boolean;
  disabled: boolean;
  isFavorite: boolean;
  isRecent: boolean;
  tags: string[];
  onToggleSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onAddTag: (id: string) => void;
}

export function GroupSelectCard({
  group,
  selected,
  disabled,
  isFavorite,
  isRecent,
  tags,
  onToggleSelect,
  onToggleFavorite,
  onAddTag,
}: GroupSelectCardProps) {
  const Icon = group.type === "channel" ? Megaphone : Users;

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={disabled ? `최대 ${MAX_BROADCAST_RECIPIENTS}개까지 선택 가능합니다.` : undefined}
      onClick={() => !disabled && onToggleSelect(group.id)}
      onKeyDown={(e) => e.key === "Enter" && !disabled && onToggleSelect(group.id)}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-2xl border p-3 transition-all duration-150",
        disabled && "cursor-not-allowed opacity-40",
        selected
          ? "border-app-primary/50 bg-app-primary-muted"
          : "border-app-border bg-app-card hover:border-app-border-strong hover:bg-app-card-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
              selected ? "bg-app-primary/20 text-app-primary-hover" : "bg-app-card-hover text-app-text-subtle"
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-app-text">{group.title}</div>
            <div className="text-[11px] text-app-text-subtle">
              {group.participantsCount != null ? `${group.participantsCount.toLocaleString()}명` : "-"}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(group.id);
            }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-150",
              isFavorite
                ? "text-app-warning"
                : "text-app-text-subtle opacity-0 hover:text-app-warning group-hover:opacity-100"
            )}
          >
            <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
          </button>
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-150",
              selected ? "border-app-primary bg-app-primary text-white" : "border-app-border-strong text-transparent"
            )}
          >
            <Check className="h-3 w-3" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Badge tone="neutral">{TYPE_LABEL[group.type]}</Badge>
        {isRecent && <Badge tone="info">최근 사용</Badge>}
        {tags.map((tag) => (
          <Badge key={tag} tone="success">
            {tag}
          </Badge>
        ))}
        <button
          type="button"
          title="태그 추가"
          onClick={(e) => {
            e.stopPropagation();
            onAddTag(group.id);
          }}
          className="flex h-4 w-4 items-center justify-center rounded-full text-app-text-subtle opacity-0 transition-opacity duration-150 hover:text-app-text group-hover:opacity-100"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
