import { useEffect, useRef } from 'react';

interface EventDelegationOptions {
  selector: string;
  handler: (event: Event, target: Element) => void;
  event: string;
}

/**
 * 이벤트 위임을 사용하여 부모 요소에서 자식 요소의 이벤트를 처리합니다.
 * 많은 수의 이벤트 리스너를 등록하는 것을 방지하여 성능을 향상시킵니다.
 */
export function useEventDelegation(
  containerRef: React.RefObject<HTMLElement>,
  options: EventDelegationOptions[]
): void {
  const optionsRef = useRef(options);

  // 옵션이 변경될 때 ref 업데이트
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlers = optionsRef.current.map(({ event, selector, handler }) => {
      const eventHandler = (e: Event) => {
        // 이벤트 대상이 선택자와 일치하는지 확인
        const target = e.target as Element;
        if (target.matches(selector)) {
          handler(e, target);
        } else {
          // 부모 요소를 따라가면서 선택자와 일치하는 요소를 찾음
          const closestTarget = target.closest(selector);
          if (closestTarget) {
            handler(e, closestTarget);
          }
        }
      };

      container.addEventListener(event, eventHandler, { capture: true });
      return { event, handler: eventHandler };
    });

    return () => {
      // 클린업: 이벤트 리스너 제거
      handlers.forEach(({ event, handler }) => {
        container.removeEventListener(event, handler, { capture: true });
      });
    };
  }, [containerRef]);
}

/**
 * 리스트 아이템에 대한 이벤트 위임을 쉽게 사용할 수 있는 훅
 */
export function useListItemEventDelegation<T>(
  containerRef: React.RefObject<HTMLElement>,
  onItemClick?: (item: T, index: number, element: Element) => void,
  onItemDoubleClick?: (item: T, index: number, element: Element) => void,
  getItemData?: (element: Element) => T | undefined
): void {
  const eventOptions: EventDelegationOptions[] = [];

  if (onItemClick) {
    eventOptions.push({
      selector: '[data-list-item]',
      event: 'click',
      handler: (event, target) => {
        const index = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (index >= 0) {
          const item = getItemData ? getItemData(target) : undefined;
          if (item !== undefined) {
            onItemClick(item, index, target);
          }
        }
      }
    });
  }

  if (onItemDoubleClick) {
    eventOptions.push({
      selector: '[data-list-item]',
      event: 'dblclick',
      handler: (event, target) => {
        const index = parseInt(target.getAttribute('data-index') || '-1', 10);
        if (index >= 0) {
          const item = getItemData ? getItemData(target) : undefined;
          if (item !== undefined) {
            onItemDoubleClick(item, index, target);
          }
        }
      }
    });
  }

  useEventDelegation(containerRef, eventOptions);
}