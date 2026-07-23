import { useState, useEffect, useRef } from 'react';

interface SaveState {
  data: any;
  lastSaved: number;
  isSaving: boolean;
  error?: string;
}

export function useSmartAutoSave(
  key: string,
  data: any,
  options: {
    delay?: number; // 자동 저장 지연 시간(ms)
    debounce?: boolean; // 디바운스 사용 여부
    validate?: (data: any) => boolean; // 유효성 검사 함수
    onSave?: (data: any) => void; // 저장 완료 콜백
    onError?: (error: any) => void; // 오류 콜백
  } = {}
) {
  const {
    delay = 2000,
    debounce = true,
    validate = () => true,
    onSave = () => {},
    onError = () => {}
  } = options;

  const [state, setState] = useState<SaveState>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          data: parsed.data,
          lastSaved: parsed.lastSaved,
          isSaving: false
        };
      }
    } catch (e) {
      console.error('로컬 저장소에서 데이터를 불러오는 데 실패했습니다:', e);
    }
    
    return {
      data: null,
      lastSaved: 0,
      isSaving: false
    };
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeRef = useRef<number>(Date.now());

  // 데이터 변경 감지
  useEffect(() => {
    lastChangeRef.current = Date.now();
    
    if (!validate(data)) {
      return;
    }

    if (debounce) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        saveData();
      }, delay);
    } else {
      saveData();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, debounce, validate]);

  const saveData = async () => {
    if (!validate(data)) {
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isSaving: true,
        error: undefined
      }));

      // 로컬 스토리지에 저장
      const saveData = {
        data,
        lastSaved: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(saveData));

      setState({
        data,
        lastSaved: Date.now(),
        isSaving: false
      });

      onSave(data);
    } catch (error) {
      console.error('자동 저장에 실패했습니다:', error);
      
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error.message : '저장에 실패했습니다'
      }));

      onError(error);
    }
  };

  const forceSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    saveData();
  };

  const clearSavedData = () => {
    localStorage.removeItem(key);
    setState({
      data: null,
      lastSaved: 0,
      isSaving: false
    });
  };

  const hasUnsavedChanges = () => {
    if (!state.data) return data !== null && data !== undefined;
    return JSON.stringify(state.data) !== JSON.stringify(data);
  };

  // 컴포넌트 언마운트 시 저장
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        saveData();
      }
    };
  }, []);

  return {
    ...state,
    hasUnsavedChanges: hasUnsavedChanges(),
    forceSave,
    clearSavedData
  };
}

// 사용 예시를 위한 커스텀 훅
export function useFormAutoSave(
  formKey: string,
  formData: any,
  options?: Parameters<typeof useSmartAutoSave>[2]
) {
  return useSmartAutoSave(
    `form-${formKey}`,
    formData,
    {
      delay: 3000,
      debounce: true,
      validate: (data) => data !== null && typeof data === 'object',
      ...options
    }
  );
}