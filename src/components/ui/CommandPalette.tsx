import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Send, MessageSquare, Settings, Zap, Users, Clock, Bot, LayoutDashboard, Moon, RotateCcw } from 'lucide-react';
import { MiniAppTab } from "@/app/miniapp/MiniAppNav";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountStateStore } from "@/store/useAccountStateStore";
import { cn } from '@/lib/cn';

interface Command {
  id: string;
  title: string;
  description: string;
  shortcut: string[];
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange?: (tab: MiniAppTab) => void;
}

export function CommandPalette({ isOpen, onClose, onTabChange }: CommandPaletteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { fetchAccounts: refreshDashboard } = useDashboardStore();
  const { getCurrentAccountState, updateAccountState } = useAccountStateStore();
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  
  // 계정 목록 가져오기 (가상의 데이터 사용)
  const accounts = useMemo(() => {
    // 실제 애플리케이션에서는 API 호출을 통해 계정 목록을 가져와야 합니다
    return [
      { id: "acc1", phone: "010-1234-5678", name: "계정 1" },
      { id: "acc2", phone: "010-9876-5432", name: "계정 2" },
      { id: "acc3", phone: "010-1111-2222", name: "계정 3" },
    ];
  }, []);

  // 명령어 목록 정의
  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      {
        id: "dashboard",
        title: "대시보드 보기",
        description: "계정 상태 및 통계 대시보드로 이동",
        shortcut: ["d"],
        category: "네비게이션",
        action: () => { 
          onTabChange?.("dashboard"); 
          onClose(); 
        }
      },
      {
        id: "chat",
        title: "AI 채팅",
        description: "AI 어시스턴트와 대화 시작",
        shortcut: ["c"],
        category: "기능",
        action: () => { 
          onTabChange?.("chat"); 
          onClose(); 
        }
      },
      {
        id: "send",
        title: "메시지 발송",
        description: "새 메시지 발송 화면으로 이동",
        shortcut: ["s"],
        category: "기능",
        action: () => { 
          onTabChange?.("send"); 
          onClose(); 
        }
      },
      {
        id: "profile",
        title: "프로필 설정",
        description: "계정 및 설정 관리",
        shortcut: ["p"],
        category: "설정",
        action: () => { 
          onTabChange?.("profile"); 
          onClose(); 
        }
      },
      {
        id: "refresh",
        title: "데이터 새로고침",
        description: "계정 및 그룹 정보 새로고침",
        shortcut: ["r"],
        category: "기능",
        action: () => { 
          refreshDashboard(); 
          onClose(); 
        }
      },
      {
        id: "theme-toggle",
        title: "테마 전환",
        description: "라이트/다크 모드 전환",
        shortcut: ["t"],
        category: "설정",
        action: () => { 
          const currentTheme = localStorage.getItem("theme") || "dark";
          localStorage.setItem("theme", currentTheme === "dark" ? "light" : "dark");
          document.documentElement.classList.toggle("dark");
          onClose(); 
        }
      }
    ];

    // 계정 전환 명령 추가
    const accountSwitchCommands: Command[] = accounts.map((account, index) => ({
      id: `switch-${account.id}`,
      title: `${account.name}(${account.phone})로 전환`,
      description: "현재 계정 전환",
      shortcut: [`Shift+${index + 1}`],
      category: "계정",
      action: () => {
        // 계정 상태 업데이트
        updateAccountState(account.id, { lastUsedTab: onTabChange ? "send" : "dashboard" });
        onClose();
      }
    }));

    return [...baseCommands, ...accountSwitchCommands];
  }, [onTabChange, refreshDashboard, accounts, updateAccountState, onClose]);

  // 필터링된 명령어
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [commands, searchQuery]);

  // 단축키 이벤트 핸들러
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      onClose(); // 기존 팔레트 닫기
      setIsOpen(true); // 새로운 팔레트 열기
    }
    
    if (isOpen) {
      if (e.key === 'Escape') {
        onClose();
        setSearchTerm('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
          setSearchTerm('');
        }
      }
    }
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 팔레트가 열릴 때 포커스 설정
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const searchInput = document.getElementById("command-palette-search");
        if (searchInput) searchInput.focus();
      }, 0);
    }
  }, [isOpen]);

  // 추가된 UI 요소를 위한 함수
  const handleCommandSelect = (command: Command) => {
    command.action();
    onClose();
    setSearchTerm('');
  };
  
  // 단축키 표시를 위한 함수
  const renderShortcut = (shortcut: string[]) => {
    return shortcut.map((key, idx) => (
      <kbd 
        key={idx}
        className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
      >
        {key}
      </kbd>
    ));
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-xl border bg-app-card p-0 shadow-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ 
          borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
          backgroundColor: "var(--tg-theme-bg-color, #17212b)",
          color: "var(--tg-theme-text-color, #f5f5f5)"
        }}
      >
        {/* 명령 팔레트 헤더 */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="command-palette-search"
              type="text"
              placeholder="명령 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              className="pl-10 pr-4 py-3 text-lg border-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              style={{ 
                backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                color: "var(--tg-theme-text-color, #f5f5f5)"
              }}
              autoFocus
            />
          </div>
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {filteredCommands.length > 0 ? (
            <ul>
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent cursor-pointer",
                    index === selectedIndex && "bg-accent"
                  )}
                  onClick={handleCommandSelect}
                  style={{ 
                    color: "var(--tg-theme-text-color, #f5f5f5)",
                    backgroundColor: "var(--tg-theme-bg-color, #17212b)"
                  }}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cmd.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{cmd.description}</div>
                  </div>
                  <div className="flex-shrink-0 flex gap-1">
                    {cmd.shortcut.map((key, idx) => (
                      <kbd 
                        key={idx}
                        className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </button>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-app-text-muted">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
        
        {/* 명령 팔레트 푸터 */}
        <div className="border-t p-3 text-xs text-app-text-muted flex justify-between" 
          style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <span>↑↓ 이동 • Enter 선택 • Esc 닫기</span>
        </div>
      </div>
    </div>
  );
}