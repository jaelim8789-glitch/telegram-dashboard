import { useState, useEffect, useRef } from 'react';
import { Search, X, Command as CommandIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useDashboardStore } from '@/store/useDashboardStore';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: string;
  route: string;
}

interface GlobalSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchPanel({ isOpen, onClose }: GlobalSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setActiveTab } = useDashboardStore();

  // 샘플 검색 결과
  const allResults: SearchResult[] = [
    { id: 'dashboard', title: '대시보드', description: '작업 공간 대시보드', category: '탭', route: '/workspace/dashboard' },
    { id: 'send', title: '메시지 발송', description: '그룹에 메시지 보내기', category: '탭', route: '/workspace/send' },
    { id: 'autoreply', title: '자동 응답', description: '자동 응답 규칙 관리', category: '탭', route: '/workspace/autoreply' },
    { id: 'group', title: '그룹 관리', description: '그룹 목록 및 관리', category: '탭', route: '/workspace/group' },
    { id: 'myai', title: 'AI 비서', description: 'AI 기반 채팅 및 도우미', category: '탭', route: '/workspace/myai' },
    { id: 'settings', title: '설정', description: '계정 및 앱 설정', category: '탭', route: '/workspace/settings' },
    { id: 'help', title: '도움말', description: '도움말 및 FAQ', category: '지원', route: '/workspace/help' },
    { id: 'contact', title: '문의하기', description: '고객 지원 문의', category: '지원', route: '/workspace/contact' },
  ];

  // 검색 로직
  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const filtered = allResults.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered);
    setSelectedIndex(filtered.length > 0 ? 0 : -1);
  }, [query]);

  // 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // 검색 패널 열기 로직은 부모 컴포넌트에서 처리
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 결과 선택
  const handleSelect = (result: SearchResult) => {
    setActiveTab(result.id as any);
    onClose();
    setQuery('');
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : results.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // 포커스 관리
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className="relative z-10 w-full max-w-2xl mx-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="기능, 탭, 설정 등을 검색하세요 (Ctrl+K)"
            className="w-full rounded-xl border border-app-border bg-app-card pl-12 pr-10 py-3 text-sm text-app-text placeholder-app-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-app-card-hover"
          >
            <X className="h-4 w-4 text-app-text-subtle" />
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-app-border bg-app-card shadow-xl">
            <div className="divide-y divide-app-border">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-app-card-hover transition-colors",
                    index === selectedIndex && "bg-[var(--color-accent)]/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-app-text">{result.title}</div>
                      <div className="text-sm text-app-text-muted mt-1">{result.description}</div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded bg-app-bg text-app-text-subtle">
                      {result.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && (
          <div className="mt-2 rounded-xl border border-app-border bg-app-card p-8 text-center">
            <div className="text-app-text-muted">검색 결과가 없습니다</div>
            <div className="text-sm text-app-text-subtle mt-1">
              "{query}"에 대한 결과를 찾을 수 없습니다
            </div>
          </div>
        )}
      </div>
    </div>
  );
}