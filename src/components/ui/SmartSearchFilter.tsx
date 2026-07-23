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
  placeholder = 'Í≤Ä??..',
  filterOptions = []
}: SmartSearchFilterProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useLocalStorage<SearchHistoryItem[]>('search-history', []);
  const [openFilter, setOpenFilter] = useState(false);
  const [openSuggestions, setOpenSuggestions] = useState(false);

  // Í∏∞Î≥∏ ?ÑÌÑ∞ ?µÏÖò
  const defaultFilterOptions: FilterOption[] = [
    { id: 'status:success', label: '?±Í≥µ', category: 'status', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
    { id: 'status:failed', label: '?§Ìå®', category: 'status', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
    { id: 'status:pending', label: '?ÄÍ∏∞Ï§ë', category: 'status', icon: <Clock className="w-4 h-4 text-yellow-500" /> },
    { id: 'type:message', label: 'Î©îÏãúÏßÄ', category: 'type', icon: <MessageCircle className="w-4 h-4" /> },
    { id: 'type:auto-reply', label: '?êÎèô?ëÎãµ', category: 'type', icon: <Bot className="w-4 h-4" /> },
    { id: 'type:broadcast', label: 'Î∞©ÏÜ°', category: 'type', icon: <MessageCircle className="w-4 h-4" /> },
  ];

  const allFilterOptions = [...defaultFilterOptions, ...filterOptions];

  // Í≤Ä???úÏïà ?ùÏÑ±
  const suggestions = useMemo(() => {
    // ÏµúÍ∑º Í≤Ä?âÏñ¥ Í∏∞Î∞ò ?úÏïà
    const recentQueries = searchHistory
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(item => ({
        id: `recent:${item.query}`,
        label: item.query,
        category: 'recent',
        icon: <Search className="w-4 h-4 text-blue-500" />
      }));

    // ?êÏ£º ?¨Ïö©?òÎäî ?ÑÌÑ∞ ?úÏïà
    const popularFilters = allFilterOptions
      .filter(option => option.label.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return [...recentQueries, ...popularFilters];
  }, [query, searchHistory, allFilterOptions]);

  // Í≤Ä???∏Îì§??  const handleSearch = useCallback(() => {
    onSearch(query, filters);

    // Í≤Ä??Í∏∞Î°ù ?ÖÎç∞?¥Ìä∏
    if (query.trim()) {
      const newHistoryItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        category: filters.length > 0 ? filters[0].split(':')[0] : 'general'
      };

      setSearchHistory(prev => [
        newHistoryItem,
        ...prev.filter(item => item.query !== query.trim()).slice(0, 9) // ÏµúÍ∑º 10Í∞úÎßå ?†Ï?
      ]);
    }
  }, [query, filters, onSearch, setSearchHistory]);

  // ?ÑÌÑ∞ Ï∂îÍ?
  const addFilter = (filterId: string) => {
    if (!filters.includes(filterId)) {
      setFilters(prev => [...prev, filterId]);
      setOpenFilter(false);
    }
  };

  // ?ÑÌÑ∞ ?úÍ±∞
  const removeFilter = (filterId: string) => {
    setFilters(prev => prev.filter(id => id !== filterId));
  };

  // Enter ???¥Î≤§???∏Îì§??  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // ÏµúÍ∑º Í≤Ä?âÏñ¥ ?¥Î¶≠ ?∏Îì§??  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
    setTimeout(() => {
      handleSearch();
    }, 0);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 flex-wrap">
        {/* ?ÑÌÑ∞ Î∞∞Ï? */}
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

        {/* Í≤Ä???ÖÎ†• ?ÑÎìú */}
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
          
          {/* ?ÑÌÑ∞ Ï∂îÍ? Î≤ÑÌäº */}
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
                <CommandInput placeholder="?ÑÌÑ∞ Í≤Ä??.." />
                <CommandList>
                  <CommandEmpty>?ÑÌÑ∞Î•?Ï∞æÏùÑ ???ÜÏäµ?àÎã§.</CommandEmpty>
                  <CommandGroup heading="?ÅÌÉú">
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
                  <CommandGroup heading="?†Ìòï">
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

        {/* Í≤Ä??Î≤ÑÌäº */}
        <Button onClick={handleSearch} className="whitespace-nowrap">
          Í≤Ä??        </Button>
      </div>

      {/* Í≤Ä???úÏïà ?ùÏò§Î≤?*/}
      {openSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-2">
          <div className="space-y-1">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">ÏµúÍ∑º Í≤Ä??/div>
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
