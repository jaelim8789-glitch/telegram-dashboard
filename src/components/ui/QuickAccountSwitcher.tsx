"use client";
import { useState, useEffect } from "react";
import { User, Monitor, Smartphone, RotateCcw, CircleDot, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

interface Account {
  id: string;
  name?: string;
  phone: string;
  status: 'active' | 'inactive' | 'error' | 'pending';
  lastUsed?: Date;
  unreadCount?: number;
}

interface QuickAccountSwitcherProps {
  accounts: Account[];
  currentAccountId?: string;
  onAccountChange: (accountId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export function QuickAccountSwitcher({ 
  accounts, 
  currentAccountId, 
  onAccountChange, 
  onRefresh,
  className 
}: QuickAccountSwitcherProps) {
  const [selectedAccount, setSelectedAccount] = useState<string | undefined>(currentAccountId);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSelectedAccount(currentAccountId);
  }, [currentAccountId]);

  const handleAccountChange = (accountId: string) => {
    setSelectedAccount(accountId);
    onAccountChange(accountId);
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // ìµê·¼ ?¬ì©??ê³ì  ?ì¼ë¡??ë ¬
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (!a.lastUsed && !b.lastUsed) return 0;
    if (!a.lastUsed) return 1;
    if (!b.lastUsed) return -1;
    return b.lastUsed!.getTime() - a.lastUsed!.getTime();
  });

  return (
    <div className={cn("rounded-xl border bg-app-card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2" style={{ color: "var(--tg-theme-text-color, #f5f5f5)" }}>
          <User className="h-5 w-5" />
          <h3 className="font-semibold">ê³ì  ?í</h3>
        </div>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded text-app-text-muted hover:text-app-text disabled:opacity-50"
          >
            {isRefreshing ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {sortedAccounts.map(account => (
          <button
            key={account.id}
            onClick={() => handleAccountChange(account.id)}
            className={cn(
              "flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors",
              selectedAccount === account.id
                ? "bg-[var(--tg-theme-button-color,#5288c1)] text-white"
                : "bg-app-card-hover hover:bg-app-card-active text-app-text"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {account.status === 'active' ? (
                  <Monitor className="h-5 w-5 text-emerald-500" />
                ) : account.status === 'pending' ? (
                  <Smartphone className="h-5 w-5 text-blue-500" />
                ) : (
                  <User className="h-5 w-5 text-gray-500" />
                )}
                
                {account.unreadCount && account.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
                    {account.unreadCount > 9 ? "9+" : account.unreadCount}
                  </span>
                )}
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {account.name || account.phone}
                  </span>
                  {account.status === 'active' && (
                    <CircleDot className="h-3 w-3 text-emerald-500" />
                  )}
                  {account.status === 'inactive' && (
                    <Circle className="h-3 w-3 text-gray-500" />
                  )}
                  {account.status === 'error' && (
                    <Circle className="h-3 w-3 text-red-500" />
                  )}
                  {account.status === 'pending' && (
                    <Circle className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
                <span className="text-xs opacity-70">
                  {account.phone}
                </span>
              </div>
            </div>
            
            {selectedAccount === account.id && (
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="py-4 text-center text-sm text-app-text-muted">
          ?±ë¡??ê³ì ???ìµ?ë¤
        </div>
      )}
    </div>
  );
}