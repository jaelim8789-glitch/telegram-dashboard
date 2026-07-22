import { useState } from 'react';
import { Bot, Bell, Moon, Sun, MonitorCog } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

interface StateItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
  onToggle: () => void;
  color: string;
  bgColor: string;
}

interface OneTouchStateToggleProps {
  states: StateItem[];
  className?: string;
}

export function OneTouchStateToggle({ states, className }: OneTouchStateToggleProps) {
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>(
    states.reduce((acc, state) => {
      acc[state.id] = state.enabled;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const handleToggle = (state: StateItem) => {
    state.onToggle();
    setActiveStates(prev => ({
      ...prev,
      [state.id]: !prev[state.id]
    }));
  };

  return (
    <div className={cn("flex items-center gap-2 p-2 bg-app-card border border-app-border rounded-xl", className)}>
      {states.map((state) => (
        <button
          key={state.id}
          type="button"
          onClick={() => handleToggle(state)}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
            activeStates[state.id] 
              ? state.bgColor 
              : "bg-app-card-hover hover:bg-app-card-hover/80",
            "min-w-[50px]"
          )}
          aria-label={`${state.name} ${activeStates[state.id] ? '끄기' : '켜기'}`}
        >
          <state.icon 
            className={cn(
              "h-4 w-4",
              activeStates[state.id] 
                ? state.color 
                : "text-app-text-muted"
            )} 
          />
          <span className="text-[10px] mt-1 text-app-text truncate max-w-[50px]">
            {activeStates[state.id] ? '켜짐' : '꺼짐'}
          </span>
        </button>
      ))}
    </div>
  );
}