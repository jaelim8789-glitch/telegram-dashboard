// 키보드 내비게이션 및 접근성 향상 유틸리티
export interface AccessibilityOptions {
  enableKeyboardNavigation?: boolean;
  enableScreenReaderSupport?: boolean;
  enableFocusManagement?: boolean;
  enableSkipLinks?: boolean;
  enableHighContrast?: boolean;
  enableReducedMotion?: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description: string;
  category: 'navigation' | 'action' | 'utility';
}

class AccessibilityManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private focusHistory: HTMLElement[] = [];
  private isKeyboardNavigation: boolean = false;
  private isHighContrast: boolean = false;
  private isReducedMotion: boolean = false;
  private skipLinks: HTMLElement[] = [];
  private focusTrapStack: HTMLElement[][] = [];

  constructor(private options: AccessibilityOptions = {}) {
    this.setupAccessibilityFeatures();
  }

  private setupAccessibilityFeatures(): void {
    // 키보드 네비게이션 감지
    document.addEventListener('keydown', (event) => {
      if (!this.isKeyboardNavigation) {
        this.isKeyboardNavigation = true;
        document.body.classList.add('keyboard-navigation');
      }
    });

    document.addEventListener('mousedown', () => {
      this.isKeyboardNavigation = false;
      document.body.classList.remove('keyboard-navigation');
    });

    // 단축키 등록
    this.registerDefaultShortcuts();

    // 고대비 모드 감지
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastMediaQuery.addEventListener('change', (e) => {
      this.isHighContrast = e.matches;
      this.toggleHighContrast(e.matches);
    });
    this.isHighContrast = highContrastMediaQuery.matches;

    // 애니메이션 감소 모드 감지
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionMediaQuery.addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      this.toggleReducedMotion(e.matches);
    });
    this.isReducedMotion = reducedMotionMediaQuery.matches;

    // 포커스 관리
    if (this.options.enableFocusManagement) {
      this.setupFocusManagement();
    }

    // 스킵 링크
    if (this.options.enableSkipLinks) {
      this.setupSkipLinks();
    }
  }

  // 기본 단축키 등록
  private registerDefaultShortcuts(): void {
    this.registerShortcut({
      key: 'k',
      ctrl: true,
      description: '검색창 열기',
      category: 'utility',
      handler: (event) => {
        event.preventDefault();
        const searchInput = document.querySelector('input[type="search"], [role="search"] input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    this.registerShortcut({
      key: 'Escape',
      description: '모달 닫기',
      category: 'utility',
      handler: (event) => {
        const modals = document.querySelectorAll('[role="dialog"]:not([aria-hidden="true"])');
        if (modals.length > 0) {
          const lastModal = modals[modals.length - 1] as HTMLElement;
          lastModal.setAttribute('aria-hidden', 'true');
          lastModal.style.display = 'none';
        }
      }
    });

    this.registerShortcut({
      key: 'Tab',
      shift: true,
      description: '이전 요소로 이동',
      category: 'navigation',
      handler: (event) => {
        if (event.shiftKey) {
          this.focusPreviousElement();
        }
      }
    });
  }

  // 단축키 등록
  registerShortcut(shortcut: KeyboardShortcut): void {
    const keyCombo = this.getKeyComboString(shortcut);
    this.shortcuts.set(keyCombo, shortcut);
  }

  // 단축키 해제
  unregisterShortcut(keyCombo: string): void {
    this.shortcuts.delete(keyCombo);
  }

  // 단축키 문자열 생성
  private getKeyComboString(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Meta');
    parts.push(shortcut.key);
    return parts.join('+');
  }

  // 키 이벤트 핸들러
  private handleKeyEvent(event: KeyboardEvent): void {
    const keyCombo = this.getKeyComboString({
      key: event.key,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
      handler: () => {},
      description: '',
      category: 'utility'
    });

    const shortcut = this.shortcuts.get(keyCombo);
    if (shortcut) {
      shortcut.handler(event);
    }
  }

  // 포커스 관리 설정
  private setupFocusManagement(): void {
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.focusHistory.push(target);
      }
    });
  }

  // 이전 요소로 포커스 이동
  private focusPreviousElement(): void {
    if (this.focusHistory.length > 1) {
      const previousElement = this.focusHistory[this.focusHistory.length - 2];
      if (previousElement && previousElement.focus) {
        previousElement.focus();
      }
    }
  }

  // 스킵 링크 설정
  private setupSkipLinks(): void {
    const skipLinkHTML = `
      <nav class="skip-links visually-hidden-focusable" aria-label="메인 콘텐츠 바로가기">
        <a href="#main-content" class="skip-link">메인 콘텐츠로 이동</a>
        <a href="#navigation" class="skip-link">주요 네비게이션으로 이동</a>
        <a href="#footer" class="skip-link">푸터로 이동</a>
      </nav>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = skipLinkHTML;
    document.body.insertBefore(container.firstElementChild!, document.body.firstChild);
  }

  // 포커스 트랩 설정
  setupFocusTrap(element: HTMLElement): void {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapFunction = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    element.addEventListener('keydown', trapFunction);
    this.focusTrapStack.push([element, firstElement, lastElement]);
  }

  // 포커스 트랩 해제
  removeFocusTrap(element: HTMLElement): void {
    const trapIndex = this.focusTrapStack.findIndex(trap => trap[0] === element);
    if (trapIndex !== -1) {
      this.focusTrapStack.splice(trapIndex, 1);
    }
  }

  // 고대비 모드 토글
  private toggleHighContrast(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  // 애니메이션 감소 모드 토글
  private toggleReducedMotion(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  // 포커스 표시 설정
  setFocusIndicator(type: 'auto' | 'always' | 'never'): void {
    const style = document.createElement('style');
    style.textContent = `
      :focus:not(:focus-visible) {
        outline: none;
      }
      :focus-visible {
        outline: 2px solid var(--app-primary, #3b82f6);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  // 스크린 리더용 텍스트 생성
  createScreenReaderOnly(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  // 라이브 리전 생성 (스크린 리더에 실시간 업데이트 전달)
  createLiveRegion(options: { polite?: boolean; assertive?: boolean } = {}): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', options.assertive ? 'assertive' : 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.setAttribute('aria-hidden', 'true');
    return region;
  }

  // 접근성 테스트 도우미
  runAccessibilityAudit(): Array<{ type: string; message: string; element?: HTMLElement }> {
    const issues: Array<{ type: string; message: string; element?: HTMLElement }> = [];

    // 포커스 가능한 요소에 레이블이 있는지 확인
    const focusableElements = document.querySelectorAll(
      'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(el => {
      const element = el as HTMLElement;
      const hasLabel = this.hasAccessibleLabel(element);
      if (!hasLabel) {
        issues.push({
          type: 'missing-label',
          message: '포커스 가능한 요소에 접근 가능한 레이블이 없습니다',
          element
        });
      }
    });

    // 이미지에 대체 텍스트가 있는지 확인
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const image = img as HTMLImageElement;
      if (!image.alt && !image.title) {
        issues.push({
          type: 'missing-alt',
          message: '이미지에 대체 텍스트가 없습니다',
          element: image
        });
      }
    });

    return issues;
  }

  // 접근 가능한 레이블 확인
  private hasAccessibleLabel(element: HTMLElement): boolean {
    // aria-label 사용
    if (element.getAttribute('aria-label')) return true;
    
    // aria-labelledby 사용
    const labelledby = element.getAttribute('aria-labelledby');
    if (labelledby) {
      const labelElement = document.getElementById(labelledby);
      if (labelElement && labelElement.textContent?.trim()) {
        return true;
      }
    }
    
    // 레이블 요소 사용
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && (label.textContent?.trim() || (label as HTMLElement).innerText.trim())) {
        return true;
      }
    }
    
    // 자식 텍스트 사용
    if (element.textContent?.trim() || (element as HTMLInputElement).value?.trim()) {
      return true;
    }
    
    return false;
  }

  // 현재 접근성 상태 가져오기
  getStatus(): {
    keyboardNavigation: boolean;
    highContrast: boolean;
    reducedMotion: boolean;
    focusManagement: boolean;
    screenReaderSupport: boolean;
  } {
    return {
      keyboardNavigation: this.isKeyboardNavigation,
      highContrast: this.isHighContrast,
      reducedMotion: this.isReducedMotion,
      focusManagement: !!this.options.enableFocusManagement,
      screenReaderSupport: !!this.options.enableScreenReaderSupport
    };
  }

  // 단축키 목록 가져오기
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // 메모리 정리
  destroy(): void {
    // 이벤트 리스너 제거
    document.removeEventListener('keydown', this.handleKeyEvent.bind(this));
    
    // 포커스 트랩 해제
    this.focusTrapStack.forEach(trap => {
      const [element] = trap;
      element.removeEventListener('keydown', () => {});
    });
    
    this.shortcuts.clear();
    this.focusHistory = [];
    this.skipLinks = [];
    this.focusTrapStack = [];
  }
}

// 전역 접근성 관리자 인스턴스
export const accessibilityManager = new AccessibilityManager({
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  enableFocusManagement: true,
  enableSkipLinks: true,
  enableHighContrast: true,
  enableReducedMotion: true
});

// React 훅 형태
export function useAccessibility() {
  const [status, setStatus] = useState(accessibilityManager.getStatus());

  useEffect(() => {
    const updateStatus = () => {
      setStatus(accessibilityManager.getStatus());
    };

    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqContrast = window.matchMedia("(prefers-contrast: more)");
    mqReduced.addEventListener("change", updateStatus);
    mqContrast.addEventListener("change", updateStatus);
    document.addEventListener("keydown", updateStatus);
    document.addEventListener("mousedown", updateStatus);

    return () => {
      mqReduced.removeEventListener("change", updateStatus);
      mqContrast.removeEventListener("change", updateStatus);
      document.removeEventListener("keydown", updateStatus);
      document.removeEventListener("mousedown", updateStatus);
    };
  }, []);

  return { ...status, manager: accessibilityManager };
}

// 키보드 네비게이션 감지 훅
export function useKeyboardNavigation() {
  const [isKeyboard, setIsKeyboard] = useState(false);

  useEffect(() => {
    const handleKeyDown = () => setIsKeyboard(true);
    const handleMouseDown = () => setIsKeyboard(false);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isKeyboard;
}

// 포커스 관리 훅
export function useFocusManagement(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (ref.current) {
      accessibilityManager.setupFocusTrap(ref.current);
    }

    return () => {
      if (ref.current) {
        accessibilityManager.removeFocusTrap(ref.current);
      }
    };
  }, [ref]);
}

// 스타일 가이드 - CSS 클래스 정의
export const accessibilityStyles = `
  /* 스크린 리더 전용 */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* 스크린 리더 전용 (포커스 시 표시) */
  .visually-hidden-focusable {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  .visually-hidden-focusable:focus,
  .visually-hidden-focusable:active {
    position: static !important;
    width: auto !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    clip: auto !important;
    white-space: normal !important;
  }

  /* 키보드 네비게이션 표시 */
  .keyboard-navigation :focus {
    outline: 2px solid var(--app-primary, #3b82f6);
    outline-offset: 2px;
  }

  /* 고대비 모드 */
  .high-contrast {
    filter: contrast(1.5);
  }

  /* 애니메이션 감소 */
  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
`;