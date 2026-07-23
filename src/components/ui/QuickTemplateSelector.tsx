"use client";
import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Star, Clock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface Template {
  id: string;
  name: string;
  content: string;
  category?: string;
  favorite?: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount?: number;
}

interface QuickTemplateSelectorProps {
  templates: Template[];
  onTemplateSelect: (template: Template) => void;
  onTemplateAdd?: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onTemplateDelete?: (id: string) => void;
  className?: string;
  maxVisible?: number;
}

export function QuickTemplateSelector({ 
  templates, 
  onTemplateSelect, 
  onTemplateAdd,
  onTemplateDelete,
  className,
  maxVisible = 5
}: QuickTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  // ?„í„°ë§ëœ ?œí”Œë¦?
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          template.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !showFavorites || template.favorite;
    return matchesSearch && matchesFavorite;
  });

  // ?¬ìš© ë¹ˆë„ ?œìœ¼ë¡??•ë ¬
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    return (b.usageCount || 0) - (a.usageCount || 0);
  });

  // ìµœê·¼ ?¬ìš©???œí”Œë¦??œìœ¼ë¡??•ë ¬ (ìµœê·¼ 5ê°?
  const recentTemplates = [...templates]
    .filter(t => t.updatedAt)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, maxVisible);

  const handleAddTemplate = useCallback(() => {
    if (!newTemplateName.trim() || !newTemplateContent.trim() || !onTemplateAdd) return;
    
    onTemplateAdd({
      name: newTemplateName.trim(),
      content: newTemplateContent.trim(),
      usageCount: 0
    });
    
    setNewTemplateName("");
    setNewTemplateContent("");
    setShowAddForm(false);
  }, [newTemplateName, newTemplateContent, onTemplateAdd]);

  const handleTemplateClick = useCallback((template: Template) => {
    onTemplateSelect({
      ...template,
      usageCount: (template.usageCount || 0) + 1,
      updatedAt: new Date()
    });
  }, [onTemplateSelect]);

  return (
    <div className={cn("rounded-xl border bg-app-card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2" style={{ color: "var(--tg-theme-text-color, #f5f5f5)" }}>
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">?œí”Œë¦?/h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowFavorites(!showFavorites)}
            className={`p-1.5 rounded ${showFavorites ? 'text-yellow-400' : 'text-app-text-muted'}`}
          >
            <Star className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1.5 rounded text-app-text-muted hover:text-app-text"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ê²€??*/}
      <div className="mb-3">
        <input
          type="text"
          placeholder="?œí”Œë¦?ê²€??.."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border bg-app-bg px-3 py-2 text-sm outline-none"
          style={{ 
            borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
            backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
            color: "var(--tg-theme-text-color, #f5f5f5)"
          }}
        />
      </div>

      {/* ?œí”Œë¦?ì¶”ê? ??*/}
      {showAddForm && (
        <div className="mb-4 p-3 rounded-lg bg-app-card-hover">
          <div className="mb-2">
            <input
              type="text"
              placeholder="?œí”Œë¦??´ë¦„"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              className="w-full rounded border bg-app-bg px-2 py-1.5 text-sm outline-none mb-2"
              style={{ 
                borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
                backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                color: "var(--tg-theme-text-color, #f5f5f5)"
              }}
            />
            <textarea
              placeholder="?œí”Œë¦??´ìš©"
              value={newTemplateContent}
              onChange={(e) => setNewTemplateContent(e.target.value)}
              rows={2}
              className="w-full rounded border bg-app-bg px-2 py-1.5 text-sm outline-none"
              style={{ 
                borderColor: "var(--tg-theme-section-separator-color, #3a4a5a)",
                backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                color: "var(--tg-theme-text-color, #f5f5f5)"
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm rounded bg-app-card text-app-text-muted"
            >
              ì·¨ì†Œ
            </button>
            <button
              onClick={handleAddTemplate}
              className="px-3 py-1.5 text-sm rounded bg-[var(--tg-theme-button-color,#5288c1)] text-white"
            >
              ì¶”ê?
            </button>
          </div>
        </div>
      )}

      {/* ìµœê·¼ ?¬ìš©???œí”Œë¦?*/}
      {recentTemplates.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-app-text-muted">
            <Clock className="h-3.5 w-3.5" />
            <span>ìµœê·¼ ?¬ìš©</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentTemplates.slice(0, 3).map(template => (
              <button
                key={`recent-${template.id}`}
                onClick={() => handleTemplateClick(template)}
                className="flex-1 min-w-[120px] px-3 py-2 text-xs rounded-lg bg-app-card-hover text-left hover:bg-app-card-active transition-colors truncate"
                style={{ 
                  backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                  color: "var(--tg-theme-text-color, #f5f5f5)"
                }}
                title={template.content}
              >
                <div className="font-medium truncate">{template.name}</div>
                <div className="truncate opacity-70">{template.content.substring(0, 20)}{template.content.length > 20 ? '...' : ''}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ?œí”Œë¦?ëª©ë¡ */}
      <div className="max-h-60 overflow-y-auto">
        {sortedTemplates.length === 0 ? (
          <div className="py-4 text-center text-sm text-app-text-muted">
            {searchQuery ? 'ê²€??ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤' : '?œí”Œë¦¿ì´ ?†ìŠµ?ˆë‹¤'}
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTemplates.slice(0, maxVisible).map(template => (
              <div 
                key={template.id} 
                className="flex items-start justify-between p-3 rounded-lg bg-app-card-hover hover:bg-app-card-active transition-colors"
                style={{ 
                  backgroundColor: "var(--tg-theme-secondary-bg-color, #232e3c)",
                  color: "var(--tg-theme-text-color, #f5f5f5)"
                }}
              >
                <button
                  onClick={() => handleTemplateClick(template)}
                  className="flex-1 text-left"
                >
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs opacity-70 mt-1 line-clamp-2">{template.content}</div>
                  {template.usageCount && template.usageCount > 0 && (
                    <div className="text-xs opacity-50 mt-1">?¬ìš© {template.usageCount}??/div>
                  )}
                </button>
                
                <div className="flex items-center gap-1 ml-2">
                  {template.favorite && (
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
                  )}
                  
                  {onTemplateDelete && (
                    <button
                      onClick={() => onTemplateDelete(template.id)}
                      className="p-1 text-app-text-muted hover:text-app-danger rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}