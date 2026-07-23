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
      title: '웰컴 메시지',
      content: '안녕하세요! 방문해 주셔서 감사합니다.\n문의사항이 있으시면 언제든지 말씀해주세요.',
      category: 'greeting',
      usageCount: 120,
      lastUsed: Date.now() - 86400000, // 하루 전
      rating: 4.5,
      tags: ['웰컴', '인사', '고객'],
      recommended: true
    },
    {
      id: 'business-inquiry',
      title: '비즈니스 문의',
      content: '문의 주셔서 감사합니다.\n빠른 시일 내에 답변 드리겠습니다.\n감사합니다.',
      category: 'inquiry',
      usageCount: 85,
      lastUsed: Date.now() - 172800000, // 이틀 전
      rating: 4.2,
      tags: ['문의', '비즈니스', '답변'],
      recommended: true
    },
    {
      id: 'appointment-confirmation',
      title: '예약 확인',
      content: '예약이 성공적으로 접수되었습니다.\n예약 일시: [DATE]\n장소: [LOCATION]\n감사합니다.',
      category: 'appointment',
      usageCount: 67,
      lastUsed: Date.now() - 259200000, // 사흘 전
      rating: 4.7,
      tags: ['예약', '확인', '일정'],
      recommended: true
    },
    {
      id: 'thank-you-message',
      title: '감사 메시지',
      content: '소중한 시간을 보내주셔서 진심으로 감사드립니다.\n언제나 고객님을 최우선으로 생각하는 [회사명]이 되겠습니다.',
      category: 'thankyou',
      usageCount: 52,
      lastUsed: Date.now() - 345600000, // 넷째 날 전
      rating: 4.8,
      tags: ['감사', '고객', '마무리'],
      recommended: true
    },
    {
      id: 'follow-up-message',
      title: '팔로우업 메시지',
      content: '안녕하세요, 이전 문의에 대해 추가 안내드립니다.\n문의하신 내용에 대한 답변은 다음과 같습니다:\n[CONTENT]',
      category: 'followup',
      usageCount: 43,
      lastUsed: Date.now() - 432000000, // 다섯째 날 전
      rating: 4.3,
      tags: ['팔로우업', '추가', '안내'],
      recommended: true
    }
  ]);

  const [recommendedTemplates, setRecommendedTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 사용 패턴 분석 및 추천 템플릿 생성
  const analyzeUsagePatterns = useCallback(() => {
    // 최근 사용한 템플릿 기반 추천
    const recentlyUsed = templates
      .filter(t => t.lastUsed > Date.now() - 7 * 86400000) // 7일 이내 사용
      .sort((a, b) => b.lastUsed - a.lastUsed)
      .slice(0, 2);

    // 가장 많이 사용된 템플릿 기반 추천
    const popular = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 3);

    // 높은 평점 기반 추천
    const highlyRated = templates
      .filter(t => t.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 2);

    // 중복 제거 후 추천 템플릿 생성
    const uniqueRecommended = Array.from(
      new Set([...recentlyUsed, ...popular, ...highlyRated].map(t => t.id))
    ).map(id => templates.find(t => t.id === id)!);

    setRecommendedTemplates(uniqueRecommended);
  }, [templates]);

  useEffect(() => {
    analyzeUsagePatterns();
  }, [analyzeUsagePatterns]);

  // 카테고리 목록
  const categories = ['all', ...new Set(templates.map(t => t.category))];

  // 필터링된 템플릿
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // 템플릿 사용 기록
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

  // 템플릿 삽입
  const insertTemplate = (content: string) => {
    // 템플릿을 부모 컴포넌트에 전달 (예: 에디터에 삽입)
    const event = new CustomEvent('insertTemplate', { detail: content });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="템플릿 검색..."
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
              {category === 'all' ? '모든 카테고리' : category}
            </option>
          ))}
        </select>
      </div>

      {recommendedTemplates.length > 0 && (
        <div>
          <h3 className="font-medium flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            맞춤 추천 템플릿
          </h3>
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
                    <span>{template.usageCount}회 사용</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => insertTemplate(template.content)}
                    >
                      삽입
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        useTemplate(template.id);
                        insertTemplate(template.content);
                      }}
                    >
                      사용
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
          전체 템플릿
        </h3>
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
                  <span>{template.usageCount}회 사용</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => insertTemplate(template.content)}
                  >
                    삽입
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      useTemplate(template.id);
                      insertTemplate(template.content);
                    }}
                  >
                    사용
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