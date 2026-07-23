import { useState, useEffect, useCallback, useRef } from 'react';

interface NavigationItem {
  id: string;
  label: string;
  element: HTMLElement | null;
  parent?: string;
  children?: string[];
  disabled?: boolean;
}

interface NavigationState {
  items: NavigationItem[];
  currentIndex: number;
  focusedElement: string | null;
  navigationMode: boolean; // 현재 키보드 네비게이션 모드 여부
}

export function useSmartKeyboardNavigation() {
  const [state, setState] = useState<NavigationState>({
    items: [],
    currentIndex: -1,
    focusedElement: null,
    navigationMode: false
  });

  const registeredElements = useRef<Map<string, HTMLElement>>(new Map());
  const observer = useRef<MutationObserver | null>(null);

  // 요소 등록
  const registerElement = useCallback((id: string, element: HTMLElement, label: string, parent?: string) => {
    registeredElements.current.set(id, element);

    setState(prev => {
      const existingIndex = prev.items.findIndex(item => item.id === id);
      const newItem: NavigationItem = {
        id,
        label,
        element,
        parent,
        disabled: element.getAttribute('aria-disabled') === 'true'
      };

      if (existingIndex >= 0) {
        const newItems = [...prev.items];
        newItems[existingIndex] = newItem;
        return { ...prev, items: newItems };
      }

      return {
        ...prev,
        items: [...prev.items, newItem]
      };
    });
  }, []);

  // 요소 등록 해제
  const unregisterElement = useCallback((id: string) => {
    registeredElements.current.delete(id);

    setState(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id),
      currentIndex: prev.currentIndex >= prev.items.length - 1 ? Math.max(0, prev.items.length - 2) : prev.currentIndex
    }));
  }, []);

  // 포커스 이동
  const focusNext = useCallback(() => {
    setState(prev => {
      if (prev.items.length === 0) return prev;

      let nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.items.length) nextIndex = 0;

      // 비활성 요소 건너뛰기
      while (nextIndex !== prev.currentIndex && prev.items[nextIndex]?.disabled) {
        nextIndex = (nextIndex + 1) % prev.items.length;
        if (nextIndex === prev.currentIndex) break; // 모든 요소가 비활성인 경우
      }

      const nextItem = prev.items[nextIndex];
      if (nextItem && nextItem.element) {
        nextItem.element.focus();
        return {
          ...prev,
          currentIndex: nextIndex,
          focusedElement: nextItem.id,
          navigationMode: true
        };
      }

      return prev;
    });
  }, []);

  const focusPrevious = useCallback(() => {
    setState(prev => {
      if (prev.items.length === 0) return prev;

      let prevIndex = prev.currentIndex - 1;
      if (prevIndex < 0) prevIndex = prev.items.length - 1;

      // 비활성 요소 건너뛰기
      while (prevIndex !== prev.currentIndex && prev.items[prevIndex]?.disabled) {
        prevIndex = (prevIndex - 1 + prev.items.length) % prev.items.length;
        if (prevIndex === prev.currentIndex) break; // 모든 요소가 비활성인 경우
      }

      const prevItem = prev.items[prevIndex];
      if (prevItem && prevItem.element) {
        prevItem.element.focus();
        return {
          ...prev,
          currentIndex: prevIndex,
          focusedElement: prevItem.id,
          navigationMode: true
        };
      }

      return prev;
    });
  }, []);

  // 특정 요소로 포커스 이동
  const focusElement = useCallback((id: string) => {
    setState(prev => {
      const targetIndex = prev.items.findIndex(item => item.id === id);
      if (targetIndex === -1) return prev;

      const targetItem = prev.items[targetIndex];
      if (targetItem && targetItem.element && !targetItem.disabled) {
        targetItem.element.focus();
        return {
          ...prev,
          currentIndex: targetIndex,
          focusedElement: targetItem.id,
          navigationMode: true
        };
      }

      return prev;
    });
  }, []);

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Tab 키 감지 - 네비게이션 모드 활성화
    if (e.key === 'Tab') {
      setState(prev => ({
        ...prev,
        navigationMode: true
      }));
      return;
    }

    // 네비게이션 모드에서만 작동
    if (!state.navigationMode) return;

    // 방향키로 이동
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      focusNext();
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      focusPrevious();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setState(prev => {
        if (prev.items.length === 0) return prev;
        
        const firstEnabledIndex = prev.items.findIndex(item => !item.disabled);
        if (firstEnabledIndex === -1) return prev;

        const firstItem = prev.items[firstEnabledIndex];
        if (firstItem && firstItem.element) {
          firstItem.element.focus();
          return {
            ...prev,
            currentIndex: firstEnabledIndex,
            focusedElement: firstItem.id
          };
        }
        return prev;
      });
    } else if (e.key === 'End') {
      e.preventDefault();
      setState(prev => {
        if (prev.items.length === 0) return prev;
        
        const lastEnabledIndex = prev.items.findLastIndex(item => !item.disabled);
        if (lastEnabledIndex === -1) return prev;

        const lastItem = prev.items[lastEnabledIndex];
        if (lastItem && lastItem.element) {
          lastItem.element.focus();
          return {
            ...prev,
            currentIndex: lastEnabledIndex,
            focusedElement: lastItem.id
          };
        }
        return prev;
      });
    } else if (e.key === 'Escape') {
      // ESC 키로 네비게이션 모드 종료
      setState(prev => ({
        ...prev,
        navigationMode: false,
        focusedElement: null
      }));
    }
  }, [state.navigationMode, focusNext, focusPrevious]);

  // 요소의 활성화 상태 변경 감지
  const setupMutationObserver = useCallback(() => {
    if (observer.current) {
      observer.current.disconnect();
    }

    observer.current = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-disabled') {
          const target = mutation.target as HTMLElement;
          const id = Array.from(registeredElements.current.entries())
            .find(([_, el]) => el === target)?.[0];

          if (id) {
            setState(prev => {
              const itemIndex = prev.items.findIndex(item => item.id === id);
              if (itemIndex === -1) return prev;

              const updatedItems = [...prev.items];
              updatedItems[itemIndex] = {
                ...updatedItems[itemIndex],
                disabled: target.getAttribute('aria-disabled') === 'true'
              };

              return { ...prev, items: updatedItems };
            });
          }
        }
      });
    });

    // 문서 전체 감시
    observer.current.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-disabled']
    });
  }, []);

  // 초기화 및 정리
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    setupMutationObserver();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [handleKeyDown, setupMutationObserver]);

  // 포커스된 요소 변경 감지
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const id = Array.from(registeredElements.current.entries())
        .find(([_, el]) => el === target)?.[0];

      if (id) {
        setState(prev => ({
          ...prev,
          focusedElement: id,
          navigationMode: true
        }));
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  return {
    ...state,
    registerElement,
    unregisterElement,
    focusNext,
    focusPrevious,
    focusElement,
    activateNavigation: () => setState(prev => ({ ...prev, navigationMode: true })),
    deactivateNavigation: () => setState(prev => ({ ...prev, navigationMode: false }))
  };
}

// 키보드 네비게이션을 위한 HOC
export function withKeyboardNavigation<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  idPrefix: string = 'nav'
) {
  return function WithKeyboardNavigation(props: T & { navigationId?: string }) {
    const navigation = useSmartKeyboardNavigation();
    const elementId = props.navigationId || `${idPrefix}-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <WrappedComponent
        {...props}
        navigation={{
          ...navigation,
          elementId,
          registerElement: (element: HTMLElement, label: string) => 
            navigation.registerElement(elementId, element, label),
          focusSelf: () => navigation.focusElement(elementId)
        }}
      />
    );
  };
}