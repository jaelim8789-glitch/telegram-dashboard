import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
  scope?: string; // 'global', 'editor', 'modal', etc.
}

export function useIntelligentShortcuts(shortcuts: Shortcut[], deps: any[] = []) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const isCtrlPressed = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
      const isShiftPressed = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const isAltPressed = shortcut.alt ? e.altKey : !e.altKey;

      if (
        e.key.toLowerCase() === shortcut.key.toLowerCase() &&
        isCtrlPressed &&
        isShiftPressed &&
        isAltPressed
      ) {
        e.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, ...deps]);

  // 사용 가능한 단축키 목록 반환
  const getAvailableShortcuts = (scope: string = 'global') => {
    return shortcuts.filter(s => !s.scope || s.scope === scope);
  };

  return { getAvailableShortcuts };
}

// 기본 단축키 정의
export const defaultShortcuts: Shortcut[] = [
  {
    key: 'k',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('openCommandPalette');
      window.dispatchEvent(event);
    },
    description: '명령 팔레트 열기',
    scope: 'global'
  },
  {
    key: 'm',
    ctrl: true,
    action: () => {
      window.location.hash = '#/send';
    },
    description: '메시지 보내기 페이지로 이동',
    scope: 'global'
  },
  {
    key: 'r',
    ctrl: true,
    action: () => {
      window.location.hash = '#/auto-reply';
    },
    description: '자동 응답 설정 페이지로 이동',
    scope: 'global'
  },
  {
    key: 'a',
    ctrl: true,
    action: () => {
      window.location.hash = '#/accounts';
    },
    description: '계정 관리 페이지로 이동',
    scope: 'global'
  },
  {
    key: 's',
    ctrl: true,
    action: () => {
      window.location.hash = '#/broadcast';
    },
    description: '방송 예약 페이지로 이동',
    scope: 'global'
  },
  {
    key: 'i',
    ctrl: true,
    action: () => {
      window.location.hash = '#/ai';
    },
    description: 'AI 어시스턴트 페이지로 이동',
    scope: 'global'
  },
  {
    key: 'b',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('openOneClickBusinessModal');
      window.dispatchEvent(event);
    },
    description: '원클릭 비즈니스 생성 모달 열기',
    scope: 'global'
  },
  {
    key: 'Enter',
    ctrl: true,
    scope: 'editor',
    action: () => {
      // 편집기에서 Ctrl+Enter는 저장 또는 전송
      const event = new CustomEvent('saveOrSubmit');
      window.dispatchEvent(event);
    },
    description: '저장 또는 전송'
  },
  {
    key: 'z',
    ctrl: true,
    scope: 'editor',
    action: () => {
      // 실행 취소
      const event = new CustomEvent('undoAction');
      window.dispatchEvent(event);
    },
    description: '실행 취소'
  },
  {
    key: 'y',
    ctrl: true,
    scope: 'editor',
    action: () => {
      // 다시 실행
      const event = new CustomEvent('redoAction');
      window.dispatchEvent(event);
    },
    description: '다시 실행'
  },
  {
    key: '/',
    scope: 'editor',
    action: () => {
      // 빠른 명령
      const event = new CustomEvent('quickCommand');
      window.dispatchEvent(event);
    },
    description: '빠른 명령 실행'
  }
];