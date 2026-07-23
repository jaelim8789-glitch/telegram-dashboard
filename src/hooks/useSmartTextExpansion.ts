import { useState, useEffect, useRef } from 'react';

interface TextExpansionRule {
  trigger: string; // 확장을 유발할 단어
  replacement: string; // 확장될 내용
  description: string; // 설명
  category: string; // 카테고리
}

export function useSmartTextExpansion(initialRules?: TextExpansionRule[]) {
  const [expansionRules, setExpansionRules] = useState<TextExpansionRule[]>([
    {
      trigger: '날짜',
      replacement: new Date().toLocaleDateString('ko-KR'),
      description: '현재 날짜',
      category: 'date'
    },
    {
      trigger: '시간',
      replacement: new Date().toLocaleTimeString('ko-KR'),
      description: '현재 시간',
      category: 'date'
    },
    {
      trigger: '성함',
      replacement: '고객님',
      description: '고객님',
      category: 'greeting'
    },
    {
      trigger: '감사',
      replacement: '감사합니다. 좋은 하루 되세요.',
      description: '감사 인사',
      category: 'greeting'
    },
    {
      trigger: '문의',
      replacement: '문의 주셔서 감사합니다. 빠른 시일 내에 답변 드리겠습니다.',
      description: '문의 응답',
      category: 'response'
    },
    {
      trigger: '예약',
      replacement: '예약이 성공적으로 접수되었습니다. 예약 시간에 맞춰 방문해 주시기 바랍니다.',
      description: '예약 확인',
      category: 'confirmation'
    },
    {
      trigger: '회사',
      replacement: '귀사의 무궁한 발전을 기원합니다.',
      description: '회사 인사',
      category: 'greeting'
    },
    {
      trigger: '이름',
      replacement: '홍길동',
      description: '기본 이름',
      category: 'personal'
    },
    {
      trigger: '주소',
      replacement: '서울특별시 강남구 테헤란로 123',
      description: '기본 주소',
      category: 'personal'
    },
    {
      trigger: '전화',
      replacement: '010-1234-5678',
      description: '기본 전화번호',
      category: 'personal'
    },
    ...(initialRules || [])
  ]);

  const [suggestions, setSuggestions] = useState<TextExpansionRule[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 텍스트 변경 시 확장 확인
  const handleTextChange = (value: string, onChange: (value: string) => void) => {
    // 마지막 단어가 확장 트리거인지 확인
    const words = value.split(/\s+/);
    const lastWord = words[words.length - 1];

    const matchedRule = expansionRules.find(rule => 
      rule.trigger === lastWord || lastWord.startsWith(rule.trigger)
    );

    if (matchedRule) {
      // 트리거 단어를 확장 내용으로 대체
      const newValue = value.substring(0, value.length - lastWord.length) + matchedRule.replacement;
      onChange(newValue);
      return true;
    }

    return false;
  };

  // 인접 단어 기반 제안 표시
  const showExpansionSuggestions = (value: string, cursorPosition: number) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    if (currentWord.length > 0) {
      const matchedSuggestions = expansionRules.filter(rule =>
        rule.trigger.includes(currentWord.toLowerCase()) ||
        rule.description.toLowerCase().includes(currentWord.toLowerCase())
      );

      setSuggestions(matchedSuggestions.slice(0, 5)); // 상위 5개만 표시
      setShowSuggestions(matchedSuggestions.length > 0);
      setActiveIndex(0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 제안 선택
  const selectSuggestion = (rule: TextExpansionRule, value: string, onChange: (value: string) => void) => {
    const words = value.split(/\s+/);
    const currentWord = words[words.length - 1];
    const textBeforeCurrentWord = value.substring(0, value.length - currentWord.length);

    const newValue = textBeforeCurrentWord + rule.replacement + ' ';
    onChange(newValue);

    setSuggestions([]);
    setShowSuggestions(false);
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent, value: string, onChange: (value: string) => void) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[activeIndex]) {
          selectSuggestion(suggestions[activeIndex], value, onChange);
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  // 새로운 확장 규칙 추가
  const addExpansionRule = (rule: TextExpansionRule) => {
    setExpansionRules(prev => [...prev, rule]);
  };

  // 확장 규칙 삭제
  const removeExpansionRule = (trigger: string) => {
    setExpansionRules(prev => prev.filter(rule => rule.trigger !== trigger));
  };

  // 확장 규칙 업데이트
  const updateExpansionRule = (trigger: string, updatedRule: Partial<TextExpansionRule>) => {
    setExpansionRules(prev =>
      prev.map(rule => rule.trigger === trigger ? { ...rule, ...updatedRule } : rule)
    );
  };

  return {
    expansionRules,
    suggestions,
    showSuggestions,
    activeIndex,
    handleTextChange,
    showExpansionSuggestions,
    selectSuggestion,
    handleKeyDown,
    addExpansionRule,
    removeExpansionRule,
    updateExpansionRule
  };
}

// 텍스트 에리어에 스마트 확장 기능 적용하는 훅
export function useTextAreaExpansion(
  initialValue: string,
  expansionRules?: TextExpansionRule[],
  onChange?: (value: string) => void
) {
  const [value, setValue] = useState(initialValue);
  const expansion = useSmartTextExpansion(expansionRules);

  const handleChange = (newValue: string) => {
    // 확장 처리
    const expanded = expansion.handleTextChange(newValue, setValue);
    
    if (!expanded) {
      setValue(newValue);
      onChange?.(newValue);
    } else {
      onChange?.(newValue);
    }
  };

  return {
    ...expansion,
    value,
    handleChange
  };
}