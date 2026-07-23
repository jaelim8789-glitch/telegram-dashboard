// ?�보???�비게이??�??�근???�생 ?�틸리티
import { useState, useEffect } from "react";
import type React from "react";

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
    // ?�보???�비게이??객�?
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

    // ?�축???�록
    this.registerDefaultShortcuts();

    // 고�?�?모드 객�?
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastMediaQuery.addEventListener('change', (e) => {
      this.isHighContrast = e.matches;
      this.toggleHighContrast(e.matches);
    });
    this.isHighContrast = highContrastMediaQuery.matches;

    // ?�니메이??객소 모드 객�?
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionMediaQuery.addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      this.toggleReducedMotion(e.matches);
    });
    this.isReducedMotion = reducedMotionMediaQuery.matches;

    // ?�커??관�?
    if (this.options.enableFocusManagement) {
      this.setupFocusManagement();
    }

    // ?�킵 망희
    if (this.options.enableSkipLinks) {
      this.setupSkipLinks();
    }
  }

  // 기본 ?�축???�록
  private registerDefaultShortcuts(): void {
    this.registerShortcut({
      key: 'k',
      ctrl: true,
      description: '검?�창 ?�기',
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
      description: '모달 ?�기',
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
      description: '?�전 ?�소�??�띙',
      category: 'navigation',
      handler: (event) => {
        if (event.shiftKey) {
          this.focusPreviousElement();
        }
      }
    });
  }

  // ?�축???�록
  registerShortcut(shortcut: KeyboardShortcut): void {
    const keyCombo = this.getKeyComboString(shortcut);
    this.shortcuts.set(keyCombo, shortcut);
  }

  // ?�축???�제
  unregisterShortcut(keyCombo: string): void {
    this.shortcuts.delete(keyCombo);
  }

  // ?�축??문잝???�성
  private getKeyComboString(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Meta');
    parts.push(shortcut.key);
    return parts.join('+');
  }

  // ???�벤???�들??
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

  // ?�커??관�??�정
  private setupFocusManagement(): void {
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.focusHistory.push(target);
      }
    });
  }

  // ?�전 ?�소�??�커???�띙
  private focusPreviousElement(): void {
    if (this.focusHistory.length > 1) {
      const previousElement = this.focusHistory[this.focusHistory.length - 2];
      if (previousElement && previousElement.focus) {
        previousElement.focus();
      }
    }
  }

  // ?�킵 망희 ?�정
  private setupSkipLinks(): void {
    const skipLinkHTML = `
      <nav class="skip-links visually-hidden-focusable" aria-label="메인 콘텝�?바로가�?>
        <a href="#main-content" class="skip-link">메인 콘텝츠로 ?�띙</a>
        <a href="#navigation" class="skip-link">주요 ?�비게이?�으�??�띙</a>
        <a href="#footer" class="skip-link">?�터�??�띙</a>
      </nav>
    `;
    
    const container = document.createElement('div');
    container.insertAdjacentHTML('afterbegin', skipLinkHTML);
    document.body.insertBefore(container.firstElementChild!, document.body.firstChild);
  }

  // ?�커???�랩 ?�정
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

  // ?�커???�랩 ?�제
  removeFocusTrap(element: HTMLElement): void {
    const trapIndex = this.focusTrapStack.findIndex(trap => trap[0] === element);
    if (trapIndex !== -1) {
      this.focusTrapStack.splice(trapIndex, 1);
    }
  }

  // 고�?�?모드 ?��?
  private toggleHighContrast(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  // ?�니메이??객소 모드 ?��?
  private toggleReducedMotion(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  // ?�커???�시 ?�정
  setFocusIndicator(type: 'auto' | 'always' | 'never'): void {
    if (typeof document === 'undefined') return;
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
    document.head?.appendChild(style);
  }

  // ?�희�?리띔???�스???�성
  createScreenReaderOnly(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  // ?�이�?리전 ?�성 (?�희�?리띔???�시�??�띰?�트 ?�달)
  createLiveRegion(options: { polite?: boolean; assertive?: boolean } = {}): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', options.assertive ? 'assertive' : 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.setAttribute('aria-hidden', 'true');
    return region;
  }

  // ?�근???�스???�우�?
  runAccessibilityAudit(): Array<{ type: string; message: string; element?: HTMLElement }> {
    const issues: Array<{ type: string; message: string; element?: HTMLElement }> = [];

    // ?�커??가?�한 ?�소???�이블이 ?�는지 ?�인
    const focusableElements = document.querySelectorAll(
      'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(el => {
      const element = el as HTMLElement;
      const hasLabel = this.hasAccessibleLabel(element);
      if (!hasLabel) {
        issues.push({
          type: 'missing-label',
          message: '?�커??가?�한 ?�소???�근 가?�한 ?�이블이 ?�습?�다',
          element
        });
      }
    });

    // ?��?지???��??�스?��? ?�는지 ?�인
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const image = img as HTMLImageElement;
      if (!image.alt && !image.title) {
        issues.push({
          type: 'missing-alt',
          message: '?��?지???��??�스?��? ?�습?�다',
          element: image
        });
      }
    });

    return issues;
  }

  // ?�근 가?�한 ?�이�??�인
  private hasAccessibleLabel(element: HTMLElement): boolean {
    // aria-label ?�용
    if (element.getAttribute('aria-label')) return true;
    
    // aria-labelledby ?�용
    const labelledby = element.getAttribute('aria-labelledby');
    if (labelledby) {
      const labelElement = document.getElementById(labelledby);
      if (labelElement && labelElement.textContent?.trim()) {
        return true;
      }
    }
    
    // ?�이�??�소 ?�용
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && (label.textContent?.trim() || (label as HTMLElement).innerText.trim())) {
        return true;
      }
    }
    
    // ?�식 ?�스???�용
    if (element.textContent?.trim() || (element as HTMLInputElement).value?.trim()) {
      return true;
    }
    
    return false;
  }

  // ?�재 ?�근???�태 가?�오�?
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

  // ?�축??목록 가?�오�?
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // 메모�??�리
  destroy(): void {
    // ?�벤??리스???�거
    if (this._boundHandleKeyEvent) {
      document.removeEventListener('keydown', this._boundHandleKeyEvent);
    }
    
    // ?�커???�랩 ?�제
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

// ?�역 ?�근??관리잝 ?�스?�스
export const accessibilityManager = new AccessibilityManager({
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  enableFocusManagement: true,
  enableSkipLinks: true,
  enableHighContrast: true,
  enableReducedMotion: true
});

// React ???�태
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

// ?�보???�비게이??객�? ??
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

// ?�커??관�???
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

// ?��???가?�드 - CSS ?�래???�의
export const accessibilityStyles = `
  /* ?�희�?리띔 ?�용 */
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

  /* ?�희�?리띔 ?�용 (?�커?????�시) */
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

  /* ?�보???�비게이???�시 */
  .keyboard-navigation :focus {
    outline: 2px solid var(--app-primary, #3b82f6);
    outline-offset: 2px;
  }

  /* 고�?�?모드 */
  .high-contrast {
    filter: contrast(1.5);
  }

  /* ?�니메이??객소 */
  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
`;
