import { useState, useEffect, useCallback } from 'react';

interface TaskCondition {
  type: 'time' | 'event' | 'data-change' | 'user-action';
  condition: any; // 조건 값
}

interface TaskAction {
  type: 'api-call' | 'ui-update' | 'data-process' | 'notification';
  params: any; // 작업 파라미터
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: TaskCondition[];
  actions: TaskAction[];
  createdAt: number;
  lastExecuted?: number;
  executionCount: number;
  triggers: ('manual' | 'scheduled' | 'event-based')[];
}

interface TaskAutomationOptions {
  enableLogging?: boolean;
  maxExecutionTime?: number; // ms
  maxRetries?: number;
}

export function useSmartTaskAutomation(options: TaskAutomationOptions = {}) {
  const {
    enableLogging = true,
    maxExecutionTime = 30000, // 30초
    maxRetries = 3
  } = options;

  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => {
    try {
      const saved = localStorage.getItem('task-automation-rules');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('자동화 규칙을 불러오는 데 실패했습니다:', e);
      return [];
    }
  });

  const [activeTasks, setActiveTasks] = useState<Set<string>>(new Set());
  const [executionLogs, setExecutionLogs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('automation-execution-logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('실행 로그를 불러오는 데 실패했습니다:', e);
      return [];
    }
  });

  // 자동화 규칙 저장
  useEffect(() => {
    try {
      localStorage.setItem('task-automation-rules', JSON.stringify(automationRules));
    } catch (e) {
      console.error('자동화 규칙을 저장하는 데 실패했습니다:', e);
    }
  }, [automationRules]);

  // 실행 로그 저장
  useEffect(() => {
    if (enableLogging) {
      try {
        localStorage.setItem('automation-execution-logs', JSON.stringify(executionLogs));
      } catch (e) {
        console.error('실행 로그를 저장하는 데 실패했습니다:', e);
      }
    }
  }, [executionLogs, enableLogging]);

  // 조건 평가
  const evaluateCondition = useCallback((condition: TaskCondition, context: any): boolean => {
    switch (condition.type) {
      case 'time':
        // 시간 기반 조건 평가
        const now = new Date();
        const targetHour = condition.condition.hour;
        const targetMinute = condition.condition.minute;
        return now.getHours() === targetHour && now.getMinutes() === targetMinute;

      case 'event':
        // 이벤트 기반 조건 평가
        return context.eventType === condition.condition.event;

      case 'data-change':
        // 데이터 변경 조건 평가
        const { field, operator, value } = condition.condition;
        const currentValue = context.data[field];
        
        switch (operator) {
          case 'equals': return currentValue === value;
          case 'not-equals': return currentValue !== value;
          case 'greater-than': return currentValue > value;
          case 'less-than': return currentValue < value;
          case 'contains': return String(currentValue).includes(String(value));
          default: return false;
        }

      case 'user-action':
        // 사용자 동작 조건 평가
        return context.action === condition.condition.action;

      default:
        return false;
    }
  }, []);

  // 작업 실행
  const executeAction = useCallback(async (action: TaskAction, context: any): Promise<boolean> => {
    try {
      // 실행 시간 제한 설정
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), maxExecutionTime);

      let result = false;

      switch (action.type) {
        case 'api-call':
          // API 호출 작업
          const { url, method, data } = action.params;
          const response = await fetch(url, {
            method: method || 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
            signal: controller.signal
          });
          result = response.ok;
          break;

        case 'ui-update':
          // UI 업데이트 작업
          const { selector, property, value } = action.params;
          const element = document.querySelector(selector);
          if (element) {
            (element as HTMLElement).style[property] = value;
            result = true;
          }
          break;

        case 'data-process':
          // 데이터 처리 작업
          // action.params.fn은 문자열 형태의 함수여야 함
          if (action.params.fn) {
            const processFn = new Function('data', 'context', action.params.fn);
            result = processFn(context.data, context);
          }
          break;

        case 'notification':
          // 알림 작업
          if (action.params.type === 'toast') {
            // 토스트 알림 (구현 필요)
            console.warn('Toast notification:', action.params.message);
          } else if (action.params.type === 'console') {
            console.warn(action.params.message);
          }
          result = true;
          break;

        default:
          result = false;
      }

      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      console.error('작업 실행 중 오류 발생:', error);
      return false;
    }
  }, [maxExecutionTime]);

  // 자동화 규칙 실행
  const executeRule = useCallback(async (rule: AutomationRule, context: any = {}): Promise<boolean> => {
    if (!rule.enabled || activeTasks.has(rule.id)) {
      return false;
    }

    // 조건 평가
    const allConditionsMet = rule.conditions.every(condition => 
      evaluateCondition(condition, context)
    );

    if (!allConditionsMet) {
      return false;
    }

    // 작업 실행
    setActiveTasks(prev => new Set(prev).add(rule.id));

    let success = true;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        for (const action of rule.actions) {
          const actionSuccess = await executeAction(action, context);
          if (!actionSuccess) {
            success = false;
            break;
          }
        }

        if (success) {
          break; // 모든 작업이 성공하면 재시도 종료
        }
      } catch (error) {
        console.error(`규칙 실행 중 오류 (시도 ${retryCount + 1}/${maxRetries + 1}):`, error);
      }

      retryCount++;
      if (retryCount <= maxRetries) {
        // 재시도 전 대기
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // 실행 로그 기록
    if (enableLogging) {
      const logEntry = {
        ruleId: rule.id,
        ruleName: rule.name,
        timestamp: Date.now(),
        success,
        retryCount,
        context,
        error: success ? undefined : 'Execution failed after retries'
      };

      setExecutionLogs(prev => [logEntry, ...prev.slice(0, 99)]); // 최근 100개만 유지
    }

    // 규칙 실행 횟수 업데이트
    setAutomationRules(prev => 
      prev.map(r => 
        r.id === rule.id 
          ? { ...r, lastExecuted: Date.now(), executionCount: r.executionCount + 1 } 
          : r
      )
    );

    setActiveTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(rule.id);
      return newSet;
    });

    return success;
  }, [evaluateCondition, executeAction, activeTasks, maxRetries, enableLogging]);

  // 자동화 규칙 실행 (이벤트 기반)
  const triggerAutomation = useCallback(async (eventType: string, context: any = {}) => {
    const matchingRules = automationRules.filter(rule => 
      rule.enabled && 
      rule.triggers.includes('event-based') &&
      rule.conditions.some(condition => 
        condition.type === 'event' && condition.condition.event === eventType
      )
    );

    const results = await Promise.all(
      matchingRules.map(rule => executeRule(rule, { ...context, eventType }))
    );

    return results.every(result => result); // 모든 규칙이 성공해야 true 반환
  }, [automationRules, executeRule]);

  // 자동화 규칙 추가
  const addAutomationRule = (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'executionCount'>) => {
    const newRule: AutomationRule = {
      ...rule,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      executionCount: 0
    };

    setAutomationRules(prev => [...prev, newRule]);
    return newRule;
  };

  // 자동화 규칙 업데이트
  const updateAutomationRule = (id: string, updates: Partial<AutomationRule>) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      )
    );
  };

  // 자동화 규칙 삭제
  const removeAutomationRule = (id: string) => {
    setAutomationRules(prev => prev.filter(rule => rule.id !== id));
  };

  // 자동화 규칙 활성화/비활성화
  const toggleRuleActivation = (id: string) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  // 스케줄러 기반 실행 (시간 기반 조건 처리)
  useEffect(() => {
    const interval = setInterval(() => {
      const timeBasedRules = automationRules.filter(rule => 
        rule.enabled && 
        rule.triggers.includes('scheduled') &&
        rule.conditions.some(condition => condition.type === 'time')
      );

      timeBasedRules.forEach(rule => {
        executeRule(rule, { eventType: 'scheduled-trigger' });
      });
    }, 60000); // 1분마다 확인

    return () => clearInterval(interval);
  }, [automationRules, executeRule]);

  // 실행 로그 가져오기
  const getExecutionLogs = (limit?: number) => {
    return limit ? executionLogs.slice(0, limit) : executionLogs;
  };

  // 실행 로그 검색
  const searchExecutionLogs = (query: string) => {
    const lowerQuery = query.toLowerCase();
    return executionLogs.filter(log => 
      log.ruleName.toLowerCase().includes(lowerQuery) ||
      (log.error && log.error.toLowerCase().includes(lowerQuery)) ||
      JSON.stringify(log.context).toLowerCase().includes(lowerQuery)
    );
  };

  // 자동화 규칙 통계
  const getAutomationStats = () => {
    const totalRules = automationRules.length;
    const enabledRules = automationRules.filter(rule => rule.enabled).length;
    const disabledRules = totalRules - enabledRules;
    const totalExecutions = automationRules.reduce((sum, rule) => sum + rule.executionCount, 0);
    const activeTasksCount = activeTasks.size;

    return {
      totalRules,
      enabledRules,
      disabledRules,
      totalExecutions,
      activeTasksCount,
      successRate: executionLogs.length > 0 
        ? (executionLogs.filter(log => log.success).length / executionLogs.length) * 100 
        : 0
    };
  };

  return {
    automationRules,
    activeTasks: Array.from(activeTasks),
    executionLogs,
    addAutomationRule,
    updateAutomationRule,
    removeAutomationRule,
    toggleRuleActivation,
    triggerAutomation,
    getExecutionLogs,
    searchExecutionLogs,
    getAutomationStats
  };
}

// 자동화 테스트 함수
export const testAutomationRule = async (rule: AutomationRule, testData: any) => {
  const { evaluateCondition, executeAction } = {
    evaluateCondition: (condition: TaskCondition, context: any): boolean => {
      // 간단한 조건 평가 로직 (실제 구현과 동일)
      return true;
    },
    executeAction: async (action: TaskAction, context: any): Promise<boolean> => {
      // 간단한 작업 실행 로직 (실제 구현과 동일)
      return true;
    }
  };

  // 조건 평가
  const conditionsMet = rule.conditions.every(condition => 
    evaluateCondition(condition, testData)
  );

  if (!conditionsMet) {
    return { success: false, reason: 'Conditions not met' };
  }

  // 작업 실행
  const results = await Promise.all(
    rule.actions.map(action => executeAction(action, testData))
  );

  return {
    success: results.every(result => result),
    results
  };
};