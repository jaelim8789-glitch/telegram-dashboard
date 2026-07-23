"use client";
import { useState, useMemo } from "react";
import { Users, Search, Filter, TrendingUp, Activity, Clock, Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface Group {
  id: string;
  title: string;
  memberCount: number;
  lastActivity?: Date;
  avgResponseTime?: number; // Ï¥??®ÏúÑ
  engagementRate?: number; // 0-1 ?¨Ïù¥ Í∞?  favorite?: boolean;
  isActive?: boolean;
}

interface SmartGroupFilterProps {
  groups: Group[];
  selectedGroupIds: string[];
  onGroupToggle: (groupId: string) => void;
  className?: string;
}

export function SmartGroupFilter({ 
  groups, 
  selectedGroupIds, 
  onGroupToggle,
  className 
}: SmartGroupFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'activity' | 'response' | 'engagement'>('activity');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'popular' | 'favorites'>('all');

  // ?ïÎ†¨ Í∏∞Ï????∞Îùº Í∑∏Î£π ?ïÎ†¨
  const sortedAndFilteredGroups = useMemo(() => {
    let filteredGroups = [...groups];

    // Í≤Ä???ÑÌÑ∞
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredGroups = filteredGroups.filter(
        group => 
          group.title.toLowerCase().includes(query) ||
          group.memberCount.toString().includes(query)
      );
    }

    // Í∑∏Î£π ?ÅÌÉú ?ÑÌÑ∞
    if (filterBy === 'active') {
      filteredGroups = filteredGroups.filter(group => group.isActive);
    } else if (filterBy === 'popular') {
      filteredGroups = filteredGroups.filter(group => group.engagementRate && group.engagementRate > 0.5);
    } else if (filterBy === 'favorites') {
      filteredGroups = filteredGroups.filter(group => group.favorite);
    }

    // ?ïÎ†¨
    return filteredGroups.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'members':
          return b.memberCount - a.memberCount;
        case 'activity':
          if (!a.lastActivity && !b.lastActivity) return 0;
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return b.lastActivity.getTime() - a.lastActivity.getTime();
        case 'response':
          if (a.avgResponseTime === undefined && b.avgResponseTime === undefined) return 0;
          if (a.avgResponseTime === undefined) return 1;
          if (b.avgResponseTime === undefined) return -1;
          return a.avgResponseTime - b.avgResponseTime; // ??? ?ëÎãµ ?úÍ∞Ñ????Ï¢ãÏùå
        case 'engagement':
          if (a.engagementRate === undefined && b.engagementRate === undefined) return 0;
          if (a.engagementRate === undefined) return 1;
          if (b.engagementRate === undefined) return -1;
          return b.engagementRate - a.engagementRate; // ?íÏ? Ï∞∏Ïó¨?®Ïù¥ ??Ï¢ãÏùå
        default:
          return 0;
      }
    });
  }, [groups, searchQuery, sortBy, filterBy]);

  return (
    <div className={cn("rounded-xl border bg-app-card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2" style={{ color: "var(--tg-theme-text-color, #f5f5f5)" }}>
          <Users className="h-5 w-5" />
          <h3 className="font-semibold">Í∑∏Î£π ?ÑÌÑ∞</h3>
        </div>
        <div className="text-xs text-app-text-muted">
          {selectedGroupIds.length}/{groups.length} ?†ÌÉù??        </div>
      </div>

      {/* Í≤Ä??Î∞??ÑÌÑ∞ */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
          <input
            type="text"
            placeholder="Í∑∏Î£π Í≤Ä??.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border bg-app-bg pl-10 pr-4 py-2 text-sm outline-none"
            style={{ 
              borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
              backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
              color: "var(--tg-theme-text-color, #f5f5f5)"
            }}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            <span>?ïÎ†¨:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 rounded-lg border bg-app-bg px-2 py-1 text-xs outline-none"
            style={{ 
              borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
              backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
              color: "var(--tg-theme-text-color, #f5f5f5)"
            }}
          >
            <option value="activity">ÏµúÍ∑º ?úÎèô</option>
            <option value="name">?¥Î¶Ñ</option>
            <option value="members">Î©§Î≤Ñ ??/option>
            <option value="engagement">Ï∞∏Ïó¨??/option>
            <option value="response">?ëÎãµ ?çÎèÑ</option>
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5" />
            <span>?ÑÌÑ∞:</span>
          </div>
          <div className="flex gap-1 flex-1">
            {(['all', 'active', 'popular', 'favorites'] as const).map(option => (
              <button
                key={option}
                onClick={() => setFilterBy(option)}
                className={`flex-1 py-1 px-2 rounded text-xs ${
                  filterBy === option
                    ? 'bg-[var(--tg-theme-button-color,#5288c1)] text-white'
                    : 'bg-app-card-hover text-app-text'
                }`}
              >
                {option === 'all' && '?ÑÏ≤¥'}
                {option === 'active' && '?úÏÑ±'}
                {option === 'popular' && '?∏Í∏∞'}
                {option === 'favorites' && 'Ï¶êÍ≤®Ï∞æÍ∏∞'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Í∑∏Î£π Î™©Î°ù */}
      <div className="max-h-60 overflow-y-auto space-y-2">
        {sortedAndFilteredGroups.length === 0 ? (
          <div className="py-4 text-center text-sm text-app-text-muted">
            {searchQuery ? 'Í≤Ä??Í≤∞Í≥ºÍ∞Ä ?ÜÏäµ?àÎã§' : 'Í∑∏Î£π???ÜÏäµ?àÎã§'}
          </div>
        ) : (
          sortedAndFilteredGroups.map(group => (
            <button
              key={group.id}
              onClick={() => onGroupToggle(group.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors",
                selectedGroupIds.includes(group.id)
                  ? "bg-[var(--tg-theme-button-color,#5288c1)] text-white"
                  : "bg-app-card-hover hover:bg-app-card-active text-app-text"
              )}
            >
              <div className="flex items-center gap-3">
                {group.favorite && (
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                )}
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{group.title}</span>
                    {group.isActive && (
                      <Activity className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs opacity-70 mt-1">
                    <span>{group.memberCount}Î™?/span>
                    {group.engagementRate !== undefined && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-2.5 w-2.5" />
                        {(group.engagementRate * 100).toFixed(0)}%
                      </span>
                    )}
                    {group.avgResponseTime !== undefined && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {(group.avgResponseTime / 60).toFixed(0)}Î∂?                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedGroupIds.includes(group.id) && (
                <div className="h-2 w-2 rounded-full bg-white" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}