import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface AutoCompleteSearchProps {
  placeholder?: string;
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  onInputChange: (value: string) => void;
  inputValue: string;
  className?: string;
}

export function AutoCompleteSearch({
  placeholder = '검색...',
  suggestions,
  onSelect,
  onInputChange,
  inputValue,
  className
}: AutoCompleteSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onInputChange(value);
    setIsOpen(value.length > 0);
    setSelectedIndex(-1);
  };

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(filteredSuggestions[selectedIndex]);
      } else if (inputValue.trim()) {
        onSelect(inputValue);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearInput = () => {
    onInputChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-subtle" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-app-border bg-app-card pl-10 pr-8 py-2.5 text-sm text-app-text placeholder-app-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
        />
        {inputValue && (
          <button
            type="button"
            onClick={clearInput}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-app-text-subtle hover:text-app-text transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 mt-2 w-full max-h-60 overflow-auto rounded-xl border border-app-border bg-app-card shadow-lg py-1">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              ref={(el: HTMLLIElement | null) => { if (el) suggestionRefs.current[index] = el; }}
              onMouseDown={() => handleSelect(suggestion)}
              className={cn(
                'px-4 py-2.5 text-sm cursor-pointer transition-colors',
                index === selectedIndex
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : 'hover:bg-app-card-hover text-app-text'
              )}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}