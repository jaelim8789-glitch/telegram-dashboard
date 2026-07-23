'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { 
  MessageCircle, 
  Clock, 
  TrendingUp, 
  Star, 
  Heart, 
  ThumbsUp, 
  Calendar,
  Target,
  Bot,
  Zap
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
  usageCount: number;
  lastUsed: number;
  rating: number;
  tags: string[];
  recommended: boolean;
}

export function SmartTemplateRecommendation() {
  const [templates, setTemplates] = useLocalStorage<Template[]>('smart-templates', [
    {
      id: 'welcome-message',
      title: '?°ì»´ ë©”ì‹œì§€',
      content: '?ˆë…•?˜ì„¸?? ë°©ë¬¸??ì£¼ì…”??ê°ì‚¬?©ë‹ˆ??\në¬¸ì˜?¬í•­???ˆìœ¼?œë©´ ?¸ì œ? ì? ë§ì??´ì£¼?¸ìš”.',
      category: 'greeting',
      usageCount: 120,
      lastUsed: Date.now() - 86400000, // ?˜ë£¨ ??      rating: 4.5,
      tags: ['?°ì»´', '?¸ì‚¬', 'ê³ ê°'],
      recommended: true
    },
    {
      id: 'business-inquiry',
      title: 'ë¹„ì¦ˆ?ˆìŠ¤ ë¬¸ì˜',
      content: 'ë¬¸ì˜ ì£¼ì…”??ê°ì‚¬?©ë‹ˆ??\në¹ ë¥¸ ?œì¼ ?´ì— ?µë? ?œë¦¬ê² ìŠµ?ˆë‹¤.\nê°ì‚¬?©ë‹ˆ??',
      category: 'inquiry',
      usageCount: 85,
      lastUsed: Date.now() - 172800000, // ?´í? ??      rating: 4.2,
      tags: ['ë¬¸ì˜', 'ë¹„ì¦ˆ?ˆìŠ¤', '?µë?'],
      recommended: true
    },
    {
      id: 'appointment-confirmation',
      title: '?ˆì•½ ?•ì¸',
      content: '?ˆì•½???±ê³µ?ìœ¼ë¡??‘ìˆ˜?˜ì—ˆ?µë‹ˆ??\n?ˆì•½ ?¼ì‹œ: [DATE]\n?¥ì†Œ: [LOCATION]\nê°ì‚¬?©ë‹ˆ??',
      category: 'appointment',
      usageCount: 67,
      lastUsed: Date.now() - 259200000, // ?¬í˜ ??      rating: 4.7,
      tags: ['?ˆì•½', '?•ì¸', '?¼ì •'],
      recommended: true
    },
    {
      id: 'thank-you-message',
      title: 'ê°ì‚¬ ë©”ì‹œì§€',
      content: '?Œì¤‘???œê°„??ë³´ë‚´ì£¼ì…”??ì§„ì‹¬?¼ë¡œ ê°ì‚¬?œë¦½?ˆë‹¤.\n?¸ì œ??ê³ ê°?˜ì„ ìµœìš°? ìœ¼ë¡??ê°?˜ëŠ” [?Œì‚¬ëª????˜ê² ?µë‹ˆ??',
      category: 'thankyou',
      usageCount: 52,
      lastUsed: Date.now() - 345600000, // ?·ì§¸ ????      rating: 4.8,
      tags: ['ê°ì‚¬', 'ê³ ê°', 'ë§ˆë¬´ë¦?],
      recommended: true
    },
    {
      id: 'follow-up-message',
      title: '?”ë¡œ?°ì—… ë©”ì‹œì§€',
      content: '?ˆë…•?˜ì„¸?? ?´ì „ ë¬¸ì˜???€??ì¶”ê? ?ˆë‚´?œë¦½?ˆë‹¤.\në¬¸ì˜?˜ì‹  ?´ìš©???€???µë??€ ?¤ìŒê³?ê°™ìŠµ?ˆë‹¤:\n[CONTENT]',
      category: 'followup',
      usageCount: 43,
      lastUsed: Date.now() - 432000000, // ?¤ì„¯ì§?????      rating: 4.3,
      tags: ['?”ë¡œ?°ì—…', 'ì¶”ê?', '?ˆë‚´'],
      recommended: true
    }
  ]);

  const [recommendedTemplates, setRecommendedTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // ?¬ìš© ?¨í„´ ë¶„ì„ ë°?ì¶”ì²œ ?œí”Œë¦??ì„±
  const analyzeUsagePatterns = useCallback(() => {
    // ìµœê·¼ ?¬ìš©???œí”Œë¦?ê¸°ë°˜ ì¶”ì²œ
    const recentlyUsed = templates
      .filter(t => t.lastUsed > Date.now() - 7 * 86400000) // 7???´ë‚´ ?¬ìš©
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 2);

    // ê°€??ë§ì´ ?¬ìš©???œí”Œë¦?ê¸°ë°˜ ì¶”ì²œ
    const popular = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 3);

    // ?’ì? ?‰ì  ê¸°ë°˜ ì¶”ì²œ
    const highlyRated = templates
      .filter(t => t.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 2);

    // ì¤‘ë³µ ?œê±° ??ì¶”ì²œ ?œí”Œë¦??ì„±
    const uniqueRecommended = Array.from(
      new Set([...recentlyUsed, ...popular, ...highlyRated].map(t => t.id))
    ).map(id => templates.find(t => t.id === id)!);

    setRecommendedTemplates(uniqueRecommended);
  }, [templates]);

  useEffect(() => {
    analyzeUsagePatterns();
  }, [analyzeUsagePatterns]);

  // ì¹´í…Œê³ ë¦¬ ëª©ë¡
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  // ?„í„°ë§ëœ ?œí”Œë¦?  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // ?œí”Œë¦??¬ìš© ê¸°ë¡
  const useTemplate = (templateId: string) => {
    setTemplates(prev => prev.map(template => 
      template.id === templateId 
        ? { 
            ...template, 
            usageCount: template.usageCount + 1, 
            lastUsed: Date.now() 
          } 
        : template
    ));
  };

  // ?œí”Œë¦??½ì…
  const insertTemplate = (content: string) => {
    // ?œí”Œë¦¿ì„ ë¶€ëª?ì»´í¬?ŒíŠ¸???„ë‹¬ (?? ?ë””?°ì— ?½ì…)
    const event = new CustomEvent('insertTemplate', { detail: content });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="?œí”Œë¦?ê²€??.."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'ëª¨ë“  ì¹´í…Œê³ ë¦¬' : category}
            </option>
          ))}
        </select>
      </div>

      {recommendedTemplates.length > 0 && (
        <div>
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            ë§ì¶¤ ì¶”ì²œ ?œí”Œë¦?          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendedTemplates.map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{template.title}</span>
                    <Badge variant="secondary">{template.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.content}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Heart className="w-3 h-3" />
                    <span>{template.rating}</span>
                    <ThumbsUp className="w-3 h-3 ml-2" />
                    <span>{template.usageCount}???¬ìš©</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => insertTemplate(template.content)}
                    >
                      ?½ì…
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        useTemplate(template.id);
                        insertTemplate(template.content);
                      }}
                    >
                      ?¬ìš©
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium flex items-center gap-2 mb-2">
          <MessageCircle className="w-4 h-4" />
          ?„ì²´ ?œí”Œë¦?        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{template.title}</span>
                  <Badge variant="secondary">{template.category}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.content}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {template.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Heart className="w-3 h-3" />
                  <span>{template.rating}</span>
                  <ThumbsUp className="w-3 h-3 ml-2" />
                  <span>{template.usageCount}???¬ìš©</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => insertTemplate(template.content)}
                  >
                    ?½ì…
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      useTemplate(template.id);
                      insertTemplate(template.content);
                    }}
                  >
                    ?¬ìš©
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
