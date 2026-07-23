"use client";
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
  
  // Í≥ÑÏ†ï Î™©Î°ù Í∞Ä?∏Ïò§Í∏?(Í∞Ä?ÅÏùò ?∞Ïù¥???¨Ïö©)
  const accounts = useMemo(() => {
    // ?§Ï†ú ?†ÌîåÎ¶¨Ï??¥ÏÖò?êÏÑú??API ?∏Ï∂ú???µÌï¥ Í≥ÑÏ†ï Î™©Î°ù??Í∞Ä?∏Ï????©Îãà??    return [
      { id: "acc1", phone: "010-1234-5678", name: "Í≥ÑÏ†ï 1" },
      { id: "acc2", phone: "010-9876-5432", name: "Í≥ÑÏ†ï 2" },
      { id: "acc3", phone: "010-1111-2222", name: "Í≥ÑÏ†ï 3" },
    ];
  }, []);

  // Î™ÖÎ†π??Î™©Î°ù ?ïÏùò
  const commands: Command[] = useMemo(() => {
    const baseCommands: Command[] = [
      {
        id: "dashboard",
        title: "?Ä?úÎ≥¥??Î≥¥Í∏∞",
        description: "Í≥ÑÏ†ï ?ÅÌÉú Î∞??µÍ≥Ñ ?Ä?úÎ≥¥?úÎ°ú ?¥Îèô",
        shortcut: ["d"],
        category: "?§ÎπÑÍ≤åÏù¥??,
        action: () => { 
          onTabChange?.("dashboard"); 
          onClose(); 
        }
      },
      {
        id: "chat",
        title: "AI Ï±ÑÌåÖ",
        description: "AI ?¥Ïãú?§ÌÑ¥?∏Ï? ?Ä???úÏûë",
        shortcut: ["c"],
        category: "Í∏∞Îä•",
        action: () => { 
          onTabChange?.("chat"); 
          onClose(); 
        }
      },
      {
        id: "send",
        title: "Î©îÏãúÏßÄ Î∞úÏÜ°",
        description: "??Î©îÏãúÏßÄ Î∞úÏÜ° ?îÎ©¥?ºÎ°ú ?¥Îèô",
        shortcut: ["s"],
        category: "Í∏∞Îä•",
        action: () => { 
          onTabChange?.("send"); 
          onClose(); 
        }
      },
      {
        id: "profile",
        title: "?ÑÎ°ú???§Ï†ï",
        description: "Í≥ÑÏ†ï Î∞??§Ï†ï Í¥ÄÎ¶?,
        shortcut: ["p"],
        category: "?§Ï†ï",
        action: () => { 
          onTabChange?.("profile"); 
          onClose(); 
        }
      },
      {
        id: "refresh",
        title: "?∞Ïù¥???àÎ°úÍ≥†Ïπ®",
        description: "Í≥ÑÏ†ï Î∞?Í∑∏Î£π ?ïÎ≥¥ ?àÎ°úÍ≥†Ïπ®",
        shortcut: ["r"],
        category: "Í∏∞Îä•",
        action: () => { 
          refreshDashboard(); 
          onClose(); 
        }
      },
      {
        id: "theme-toggle",
        title: "?åÎßà ?ÑÌôò",
        description: "?ºÏù¥???§ÌÅ¨ Î™®Îìú ?ÑÌôò",
        shortcut: ["t"],
        category: "?§Ï†ï",
        action: () => { 
          const currentTheme = localStorage.getItem("theme") || "dark";
          localStorage.setItem("theme", currentTheme === "dark" ? "light" : "dark");
          document.documentElement.classList.toggle("dark");
          onClose(); 
        }
      }
    ];

    // Í≥ÑÏ†ï ?ÑÌôò Î™ÖÎ†π Ï∂îÍ?
    const accountSwitchCommands: Command[] = accounts.map((account, index) => ({
      id: `switch-${account.id}`,
      title: `${account.name}(${account.phone})Î°??ÑÌôò`,
      description: "?ÑÏû¨ Í≥ÑÏ†ï ?ÑÌôò",
      shortcut: [`Shift+${index + 1}`],
      category: "Í≥ÑÏ†ï",
      action: () => {
        // Í≥ÑÏ†ï ?ÅÌÉú ?ÖÎç∞?¥Ìä∏
        updateAccountState(account.id, { lastUsedTab: onTabChange ? "send" : "dashboard" });
        onClose();
      }
    }));

    return [...baseCommands, ...accountSwitchCommands];
  }, [onTabChange, refreshDashboard, accounts, updateAccountState, onClose]);

  // ?ÑÌÑ∞ÎßÅÎêú Î™ÖÎ†π??  const filteredCommands = useMemo(() => {
    if (!searchQuery) return commands;
    
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [commands, searchQuery]);

  // ?®Ï∂ï???¥Î≤§???∏Îì§??  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      onClose(); // Í∏∞Ï°¥ ?îÎ†à???´Í∏∞
      setIsOpen(true); // ?àÎ°ú???îÎ†à???¥Í∏∞
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

  // ?îÎ†à?∏Í? ?¥Î¶¥ ???¨Ïª§???§Ï†ï
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const searchInput = document.getElementById("command-palette-search");
        if (searchInput) searchInput.focus();
      }, 0);
    }
  }, [isOpen]);

  // Ï∂îÍ???UI ?îÏÜåÎ•??ÑÌïú ?®Ïàò
  const handleCommandSelect = (command: Command) => {
    command.action();
    onClose();
    setSearchTerm('');
  };
  
  // ?®Ï∂ï???úÏãúÎ•??ÑÌïú ?®Ïàò
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
        {/* Î™ÖÎ†π ?îÎ†à???§Îçî */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="command-palette-search"
              type="text"
              placeholder="Î™ÖÎ†π Í≤Ä??.."
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
              <p className="text-app-text-muted">Í≤Ä??Í≤∞Í≥ºÍ∞Ä ?ÜÏäµ?àÎã§</p>
            </div>
          )}
        </div>
        
        {/* Î™ÖÎ†π ?îÎ†à???∏ÌÑ∞ */}
        <div className="border-t p-3 text-xs text-app-text-muted flex justify-between" 
          style={{ borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)" }}>
          <span>?ë‚Üì ?¥Îèô ??Enter ?†ÌÉù ??Esc ?´Í∏∞</span>
        </div>
      </div>
    </div>
  );
}