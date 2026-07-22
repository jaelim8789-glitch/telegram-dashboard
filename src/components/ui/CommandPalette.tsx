import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Send, MessageSquare, User, LayoutDashboard, Settings, Moon, Sun, RotateCcw } from "lucide-react";
import { MiniAppTab } from "@/app/miniapp/MiniAppNav";
import { useDashboardStore } from "@/store/useDashboardStore";
import { useAccountStateStore } from "@/store/useAccountStateStore";

interface Command {
  id: string;
  title: string;
  description: string;
  shortcut: string[];
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange?: (tab: MiniAppTab) => void;
}

export function CommandPalette({ isOpen, onClose, onTabChange }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
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

  // 단축키 처리
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // 명령어 단축키 처리
      const matchedCommand = commands.find(cmd => 
        cmd.shortcut.some(shortcut => {
          if (shortcut === e.key.toLowerCase()) return true;
          if (shortcut.startsWith("Shift+") && e.shiftKey && shortcut.endsWith(e.key)) return true;
          return false;
        })
      );

      if (matchedCommand) {
        e.preventDefault();
        matchedCommand.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, commands, onClose]);

  // 팔레트가 열릴 때 포커스 설정
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const searchInput = document.getElementById("command-palette-search");
        if (searchInput) searchInput.focus();
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        <div className="p-3 border-b" style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
            <input
              id="command-palette-search"
              type="text"
              placeholder="명령 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border bg-app-bg pl-10 pr-4 py-2 text-sm outline-none"
              style={{ 
                borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
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
                <li key={cmd.id}>
                  <button
                    onClick={cmd.action}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-app-card-hover active:scale-[0.98] transition-colors"
                    style={{ 
                      color: "var(--tg-theme-text-color, #f5f5f5)",
                      backgroundColor: "var(--tg-theme-bg-color, #17212b)"
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {cmd.id.includes("dashboard") && <LayoutDashboard className="h-4 w-4" />}
                      {cmd.id.includes("chat") && <MessageSquare className="h-4 w-4" />}
                      {cmd.id.includes("send") && <Send className="h-4 w-4" />}
                      {cmd.id.includes("profile") && <User className="h-4 w-4" />}
                      {cmd.id.includes("refresh") && <RotateCcw className="h-4 w-4" />}
                      {cmd.id.includes("theme") && <Moon className="h-4 w-4" />}
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{cmd.title}</span>
                        <span className="text-xs text-app-text-muted">{cmd.description}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {cmd.shortcut.map((s, idx) => (
                        <kbd 
                          key={idx}
                          className="rounded bg-app-card px-2 py-0.5 text-xs font-medium"
                          style={{ 
                            backgroundColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
                            color: "var(--tg-theme-hint-color, #708499)"
                          }}
                        >
                          {s}
                        </kbd>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-8 text-center">
              <p className="text-app-text-muted">검색 결과가 없습니다</p>
            </div>
          )}
        </div>
        
        <div className="border-t p-3 text-xs text-app-text-muted flex justify-between" 
          style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <span>↑↓ 이동 • Enter 선택</span>
          <span>Esc 닫기</span>
        </div>
      </div>
    </div>
  );
}