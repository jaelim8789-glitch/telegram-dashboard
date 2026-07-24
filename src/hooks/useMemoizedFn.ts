import { useRef, useCallback } from 'react';

/**
 * 함수를 메모이제이션하여 동일한 함수 참조를 유지합니다.
 * 불필요한 리렌더링을 방지하고 콜백 함수의 안정성을 보장합니다.
 */
export function useMemoizedFn<T extends (...args: unknown[]) => any>(fn: T): T {
  const fnRef = useRef<T>(fn);
  
  // 함수가 변경될 때마다 ref를 업데이트
  if (fnRef.current !== fn) {
    fnRef.current = fn;
  }
  
  // 동일한 함수 참조를 유지하면서 최신 fn을 호출
  return useCallback(((...args: unknown[]) => fnRef.current(...args)) as T, []) as T;
}

/**
 * 객체를 메모이제이션하여 동일한 값이면 동일한 참조를 반환합니다.
 */
export function useMemoizedObj<T extends Record<string, unknown>>(obj: T): T {
  const objRef = useRef<T>(obj);
  
  // 얕은 비교를 통해 객체가 동일한지 확인
  const isSame = Object.keys(obj).every(key => 
    obj[key as keyof T] === objRef.current[key as keyof T]
  );
  
  if (isSame) {
    return objRef.current;
  }
  
  objRef.current = obj;
  return obj;
}

/**
 * 배열을 메모이제이션하여 동일한 값이면 동일한 참조를 반환합니다.
 */
export function useMemoizedArray<T>(arr: T[]): T[] {
  const arrRef = useRef<T[]>(arr);
  
  if (arr.length === arrRef.current.length && 
      arr.every((val, idx) => val === arrRef.current[idx])) {
    return arrRef.current;
  }
  
  arrRef.current = arr;
  return arr;
}