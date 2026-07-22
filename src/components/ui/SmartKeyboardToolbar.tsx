import { useState, useEffect } from 'react';
import { Smile, Hash, AtSign, Clipboard, Clock } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';
import { useTemplates } from '@/hooks/useTemplates';

interface SmartKeyboardToolbarProps {
  onInsert: (text: string) => void;
  className?: string;
}

export function SmartKeyboardToolbar({ onInsert, className }: SmartKeyboardToolbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'template' | 'emoji' | 'special' | 'recent'>('template');
  const { templates, getRecentMessages } = useTemplates();

  const recentMessages = getRecentMessages();

  const emojiList = ['😊', '👍', '❤️', '🎉', '👏', '🔥', '💯', '👌', '🙏', '😎'];
  const specialChars = ['@', '#', '&', '%', '$', '€', '£', '¥', '₩', '₹'];

  // 키보드가 활성화될 때 자동으로 열기
  useEffect(() => {
    const handleFocusIn = () => setIsOpen(true);
    const handleFocusOut = () => {
      // 잠시 대기 후 닫힘 처리 (다른 요소에 포커스가 이동할 수 있으므로)
      setTimeout(() => {
        if (!document.activeElement?.matches('input, textarea, [contenteditable]')) {
          setIsOpen(false);
        }
      }, 100);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className={cn('bg-app-card border-t border-app-border p-2', className)}>
      {/* 탭 네비게이션 */}
      <div className="flex border-b border-app-border mb-2">
        <button
          className={cn(
            'flex-1 py-2 text-center text-sm font-medium',
            activeTab === 'template' && 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
          )}
          onClick={() => setActiveTab('template')}
        >
          템플릿
        </button>
        <button
          className={cn(
            'flex-1 py-2 text-center text-sm font-medium',
            activeTab === 'recent' && 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
          )}
          onClick={() => setActiveTab('recent')}
        >
          최근
        </button>
        <button
          className={cn(
            'flex-1 py-2 text-center text-sm font-medium',
            activeTab === 'emoji' && 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
          )}
          onClick={() => setActiveTab('emoji')}
        >
          이모지
        </button>
        <button
          className={cn(
            'flex-1 py-2 text-center text-sm font-medium',
            activeTab === 'special' && 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
          )}
          onClick={() => setActiveTab('special')}
        >
          특수문자
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="max-h-32 overflow-y-auto">
        {activeTab === 'template' && (
          <div className="grid grid-cols-2 gap-1">
            {templates.length > 0 ? (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onInsert(template.content)}
                  className="p-2 text-left text-xs bg-app-card-hover rounded-lg truncate"
                  title={template.name}
                >
                  <div className="font-medium truncate">{template.name}</div>
                  <div className="text-app-text-muted truncate">{template.content.substring(0, 20)}...</div>
                </button>
              ))
            ) : (
              <div className="col-span-2 text-center text-app-text-muted text-sm py-4">
                저장된 템플릿이 없습니다
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="grid grid-cols-2 gap-1">
            {recentMessages.length > 0 ? (
              recentMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => onInsert(msg)}
                  className="p-2 text-left text-xs bg-app-card-hover rounded-lg truncate"
                >
                  <div className="truncate">{msg.substring(0, 20)}...</div>
                </button>
              ))
            ) : (
              <div className="col-span-2 text-center text-app-text-muted text-sm py-4">
                최근 메시지가 없습니다
              </div>
            )}
          </div>
        )}

        {activeTab === 'emoji' && (
          <div className="grid grid-cols-5 gap-1">
            {emojiList.map((emoji, index) => (
              <button
                key={index}
                onClick={() => onInsert(emoji)}
                className="h-10 flex items-center justify-center text-xl hover:bg-app-card-hover rounded-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'special' && (
          <div className="grid grid-cols-5 gap-1">
            {specialChars.map((char, index) => (
              <button
                key={index}
                onClick={() => onInsert(char)}
                className="h-10 flex items-center justify-center text-lg font-bold hover:bg-app-card-hover rounded-lg"
              >
                {char}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}