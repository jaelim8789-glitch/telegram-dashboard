import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Plus, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/cn';

interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

interface QuickTemplateSelectorProps {
  templates: Template[];
  onTemplateSelect: (template: Template) => void;
  onAddTemplate: (name: string, content: string) => void;
  className?: string;
}

export function QuickTemplateSelector({
  templates,
  onTemplateSelect,
  onAddTemplate,
  className
}: QuickTemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setShowAddForm(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTemplate = () => {
    if (newTemplateName.trim() && newTemplateContent.trim()) {
      onAddTemplate(newTemplateName.trim(), newTemplateContent.trim());
      setNewTemplateName('');
      setNewTemplateContent('');
      setShowAddForm(false);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        <span>템플릿</span>
      </Button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-80 max-h-96 overflow-hidden rounded-xl border border-app-border bg-app-card shadow-xl">
          <div className="p-3 border-b border-app-border">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-app-text">빠른 템플릿</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                className="p-1"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {showAddForm && (
              <div className="mt-3 p-2 border border-app-border rounded-lg">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="템플릿 이름"
                  className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-sm text-app-text mb-2"
                />
                <textarea
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="템플릿 내용"
                  rows={3}
                  className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-sm text-app-text mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1"
                  >
                    취소
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddTemplate}
                    className="flex-1"
                  >
                    저장
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="p-4 text-center text-app-text-muted text-sm">
                저장된 템플릿이 없습니다
              </div>
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onTemplateSelect(template);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left border-b border-app-border/50 last:border-b-0 hover:bg-app-card-hover transition-colors"
                >
                  <div className="font-medium text-app-text truncate">{template.name}</div>
                  <div className="text-xs text-app-text-muted mt-1 line-clamp-2">
                    {template.content}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}