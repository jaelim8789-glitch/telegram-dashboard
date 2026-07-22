import { memo, useRef, useCallback } from "react";
import { Check, Megaphone, Plus, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { type Group, type GroupType } from "@/types";

const TYPE_LABEL: Record<GroupType, string> = {
  group: "그룹",
  megagroup: "슈퍼그룹",
  channel: "채널",
};

interface GroupSelectCardProps {
  group: Group;
  selected: boolean;
  isFavorite: boolean;
  isRecent: boolean;
  tags: string[];
  onToggleSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onAddTag: (id: string) => void;
  disabled?: boolean;
}

export const GroupSelectCard = memo(function GroupSelectCard({
  group,
  selected,
  isFavorite,
  isRecent,
  tags,
  onToggleSelect,
  onToggleFavorite,
  onAddTag,
}: GroupSelectCardProps) {
  const Icon = group.type === "channel" ? Megaphone : Users;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const handleTouchStart = useCallback(() => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => { longPressTriggered.current = true; }, 500);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!longPressTriggered.current) {
      onToggleSelect(group.id);
    }
    longPressTriggered.current = false;
  }, [group.id, onToggleSelect]);

  return (
    <div
      role="button"
      tabIndex={0}
      title={undefined}
      onClick={() => onToggleSelect(group.id)}
      onKeyDown={(e) => e.key === "Enter" && onToggleSelect(group.id)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "group flex cursor-pointer flex-col gap-2 rounded-2xl border p-4 transition-all duration-150 active:scale-[0.98]",
        selected
          ? "border-app-primary/50 bg-app-primary-muted"
          : "border-app-border bg-app-card hover:border-app-border-strong hover:bg-app-card-hover"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              selected ? "bg-app-primary/20 text-app-primary-hover" : "bg-app-card-hover text-app-text-subtle"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-app-text">{group.title}</div>
            <div className="text-[11px] text-app-text-subtle">
              {group.participantsCount != null ? (
                <span className="inline-flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" />
                  {group.participantsCount.toLocaleString()}명
                </span>
              ) : "-"}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(group.id);
            }}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150",
              isFavorite
                ? "text-app-warning"
                : "text-app-text-subtle hover:text-app-warning"
            )}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
          </button>
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-150",
              selected ? "border-app-primary bg-app-primary text-white" : "border-app-border-strong text-transparent"
            )}
          >
            <Check className="h-4 w-4" />
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
          className="flex h-9 w-9 items-center justify-center rounded-full text-app-text-subtle transition-colors duration-150 hover:text-app-text"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
},
(prevProps, nextProps) =>
  prevProps.group.id === nextProps.group.id &&
  prevProps.selected === nextProps.selected &&
  prevProps.disabled === nextProps.disabled
);

export function SkeletonGroupSelectCard() {
  return (
    <div className="flex animate-pulse flex-col gap-2 rounded-2xl border border-app-border bg-app-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-app-card-hover" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-28 rounded bg-app-card-hover" />
            <div className="h-3 w-16 rounded bg-app-card-hover" />
          </div>
        </div>
        <div className="h-7 w-7 rounded-full bg-app-card-hover" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 w-12 rounded-full bg-app-card-hover" />
        <div className="h-5 w-16 rounded-full bg-app-card-hover" />
      </div>
    </div>
  );
}
