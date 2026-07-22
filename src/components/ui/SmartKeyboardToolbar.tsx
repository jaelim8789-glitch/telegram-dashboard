import { useState, useEffect } from 'react';
import { Smile, Hash, Star, Clock, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

interface SmartKeyboardToolbarProps {
  onInsertTemplate: (template: string) => void;
  onInsertEmoji: (emoji: string) => void;
  onInsertSpecialChar: (char: string) => void;
  onInsertRecentMessage: (message: string) => void;
  templates: { id: string; name: string; content: string }[];
  recentMessages: string[];
  isVisible: boolean;
  onClose: () => void;
}

export function SmartKeyboardToolbar({
  onInsertTemplate,
  onInsertEmoji,
  onInsertSpecialChar,
  onInsertRecentMessage,
  templates,
  recentMessages,
  isVisible,
  onClose
}: SmartKeyboardToolbarProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'emojis' | 'special' | 'recent'>('templates');

  // 자주 사용하는 이모지 목록
  const commonEmojis = ['😀', '😂', '😍', '👍', '❤️', '🔥', '😊', '🎉', '👏', '🙌'];
  
  // 특수문자 목록
  const specialChars = ['@', '#', '$', '%', '&', '*', '+', '=', '|', '※', '○', '●'];

  if (!isVisible) return null;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-app-card border-t border-app-border",
      "transform transition-transform duration-300 ease-in-out",
      isVisible ? "translate-y-0" : "translate-y-full"
    )}>
      <div className="flex items-center justify-between p-2 border-b border-app-border">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs",
              activeTab === 'templates' 
                ? "bg-[var(--color-accent)] text-white" 
                : "bg-app-card-hover text-app-text-muted"
            )}
          >
            템플릿
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('emojis')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs",
              activeTab === 'emojis' 
                ? "bg-[var(--color-accent)] text-white" 
                : "bg-app-card-hover text-app-text-muted"
            )}
          >
            이모지
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('special')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs",
              activeTab === 'special' 
                ? "bg-[var(--color-accent)] text-white" 
                : "bg-app-card-hover text-app-text-muted"
            )}
          >
            특수문자
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recent')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs",
              activeTab === 'recent' 
                ? "bg-[var(--color-accent)] text-white" 
                : "bg-app-card-hover text-app-text-muted"
            )}
          >
            최근
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-app-card-hover"
          aria-label="툴바 닫기"
        >
          <X className="h-4 w-4 text-app-text-muted" />
        </button>
      </div>

      <div className="max-h-32 overflow-y-auto p-2">
        {activeTab === 'templates' && (
          <div className="flex flex-wrap gap-1">
            {templates.slice(0, 8).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onInsertTemplate(template.content)}
                className="px-2 py-1.5 text-xs bg-app-card-hover rounded-lg text-app-text truncate max-w-[120px] hover:bg-[var(--color-accent)]/20"
                title={template.name}
              >
                {template.name}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'emojis' && (
          <div className="flex flex-wrap gap-1">
            {commonEmojis.map((emoji, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onInsertEmoji(emoji)}
                className="p-2 text-lg hover:bg-app-card-hover rounded-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'special' && (
          <div className="flex flex-wrap gap-1">
            {specialChars.map((char, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onInsertSpecialChar(char)}
                className="px-2 py-1.5 text-sm bg-app-card-hover rounded-lg text-app-text hover:bg-[var(--color-accent)]/20"
              >
                {char}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="flex flex-wrap gap-1">
            {recentMessages.slice(0, 6).map((msg, index) => (
              <button
                key={index}
                type="button"
                onClick={() => onInsertRecentMessage(msg)}
                className="px-2 py-1.5 text-xs bg-app-card-hover rounded-lg text-app-text truncate max-w-[120px] hover:bg-[var(--color-accent)]/20"
              >
                {msg.substring(0, 15)}...
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}