'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/Command';
import { Filter, X, Plus, Search, Clock, CheckCircle, AlertCircle, MessageCircle, Bot } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  category: string;
}

interface FilterOption {
  id: string;
  label: string;
  category: string;
  icon: React.ReactNode;
}

interface SmartSearchFilterProps {
  onSearch: (query: string, filters: string[]) => void;
  placeholder?: string;
  filterOptions?: FilterOption[];
}

export function SmartSearchFilter({
  onSearch,
  placeholder = '검색...',
  filterOptions = []
}: SmartSearchFilterProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useLocalStorage<SearchHistoryItem[]>('search-history', []);
  const [openFilter, setOpenFilter] = useState(false);
  const [openSuggestions, setOpenSuggestions] = useState(false);

  // 기본 필터 옵션
  const defaultFilterOptions: FilterOption[] = [
    { id: 'status:success', label: '성공', category: 'status', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
    { id: 'status:failed', label: '실패', category: 'status', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
    { id: 'status:pending', label: '대기중', category: 'status', icon: <Clock className="w-4 h-4 text-yellow-500" /> },
    { id: 'type:message', label: '메시지', category: 'type', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'type:auto-reply', label: '자동응답', category: 'type', icon: <Bot className="w-4 h-4" /> },
    { id: 'type:broadcast', label: '방송', category: 'type', icon: <MessageCircle className="w-4 h-4" /> },
  ];

  const allFilterOptions = [...defaultFilterOptions, ...filterOptions];

  // 검색 제안 생성
  const suggestions = useMemo(() => {
    // 최근 검색어 기반 제안
    const recentQueries = searchHistory
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(item => ({
        id: `recent:${item.query}`,
        label: item.query,
        category: 'recent',
        icon: <Search className="w-4 h-4 text-blue-500" />
      }));

    // 자주 사용하는 필터 제안
    const popularFilters = allFilterOptions
      .filter(option => option.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return [...recentQueries, ...popularFilters];
  }, [query, searchHistory, allFilterOptions]);

  // 검색 핸들러
  const handleSearch = useCallback(() => {
    onSearch(query, filters);

    // 검색 기록 업데이트
    if (query.trim()) {
      const newHistoryItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        category: filters.length > 0 ? filters[0].split(':')[0] : 'general'
      };

      setSearchHistory(prev => [
        newHistoryItem,
        ...prev.filter(item => item.query !== query.trim()).slice(0, 9) // 최근 10개만 유지
      ]);
    }
  }, [query, filters, onSearch, setSearchHistory]);

  // 필터 추가
  const addFilter = (filterId: string) => {
    if (!filters.includes(filterId)) {
      setFilters(prev => [...prev, filterId]);
      setOpenFilter(false);
    }
  };

  // 필터 제거
  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(id => id !== filterId));
  };

  // Enter 키 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // 최근 검색어 클릭 핸들러
  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    setTimeout(() => {
      handleSearch();
    }, 0);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        {/* 필터 배지 */}
        {filters.map(filterId => {
          const filter = allFilterOptions.find(opt => opt.id === filterId);
          return filter ? (
            <Badge key={filterId} variant="secondary" className="flex items-center gap-1">
              {filter.icon}
              {filter.label}
              <button
                onClick={() => removeFilter(filterId)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ) : null;
        })}

        {/* 검색 입력 필드 */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpenSuggestions(true)}
            className="pl-10 pr-16 py-2"
          />
          
          {/* 필터 추가 버튼 */}
          <Popover open={openFilter} onOpenChange={setOpenFilter}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" align="end">
              <Command>
                <CommandInput placeholder="필터 검색..." />
                <CommandList>
                  <CommandEmpty>필터를 찾을 수 없습니다.</CommandEmpty>
                  <CommandGroup heading="상태">
                    {allFilterOptions
                      .filter(opt => opt.category === 'status')
                      .map(option => (
                        <CommandItem
                          key={option.id}
                          onSelect={() => addFilter(option.id)}
                        >
                          {option.icon}
                          <span className="ml-2">{option.label}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                  <CommandGroup heading="유형">
                    {allFilterOptions
                      .filter(opt => opt.category === 'type')
                      .map(option => (
                        <CommandItem
                          key={option.id}
                          onSelect={() => addFilter(option.id)}
                        >
                          {option.icon}
                          <span className="ml-2">{option.label}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* 검색 버튼 */}
        <Button onClick={handleSearch} className="whitespace-nowrap">
          검색
        </Button>
      </div>

      {/* 검색 제안 팝오버 */}
      {openSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-2">
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">최근 검색</div>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                className="w-full text-left px-2 py-2 rounded hover:bg-accent flex items-center gap-2"
                onClick={() => {
                  if (suggestion.category === 'recent') {
                    handleRecentSearchClick(suggestion.label);
                  } else {
                    addFilter(suggestion.id);
                  }
                  setOpenSuggestions(false);
                }}
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}