// ?¤ë³´???´ë¹„ê²Œì´??ë°??‘ê·¼???¥ìƒ ? í‹¸ë¦¬í‹°
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
    // ?¤ë³´???¤ë¹„ê²Œì´??ê°ì?
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

    // ?¨ì¶•???±ë¡
    this.registerDefaultShortcuts();

    // ê³ ë?ë¹?ëª¨ë“œ ê°ì?
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    highContrastMediaQuery.addEventListener('change', (e) => {
      this.isHighContrast = e.matches;
      this.toggleHighContrast(e.matches);
    });
    this.isHighContrast = highContrastMediaQuery.matches;

    // ? ë‹ˆë©”ì´??ê°ì†Œ ëª¨ë“œ ê°ì?
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionMediaQuery.addEventListener('change', (e) => {
      this.isReducedMotion = e.matches;
      this.toggleReducedMotion(e.matches);
    });
    this.isReducedMotion = reducedMotionMediaQuery.matches;

    // ?¬ì»¤??ê´€ë¦?
    if (this.options.enableFocusManagement) {
      this.setupFocusManagement();
    }

    // ?¤í‚µ ë§í¬
    if (this.options.enableSkipLinks) {
      this.setupSkipLinks();
    }
  }

  // ê¸°ë³¸ ?¨ì¶•???±ë¡
  private registerDefaultShortcuts(): void {
    this.registerShortcut({
      key: 'k',
      ctrl: true,
      description: 'ê²€?‰ì°½ ?´ê¸°',
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
      description: 'ëª¨ë‹¬ ?«ê¸°',
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
      description: '?´ì „ ?”ì†Œë¡??´ë™',
      category: 'navigation',
      handler: (event) => {
        if (event.shiftKey) {
          this.focusPreviousElement();
        }
      }
    });
  }

  // ?¨ì¶•???±ë¡
  registerShortcut(shortcut: KeyboardShortcut): void {
    const keyCombo = this.getKeyComboString(shortcut);
    this.shortcuts.set(keyCombo, shortcut);
  }

  // ?¨ì¶•???´ì œ
  unregisterShortcut(keyCombo: string): void {
    this.shortcuts.delete(keyCombo);
  }

  // ?¨ì¶•??ë¬¸ì???ì„±
  private getKeyComboString(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Meta');
    parts.push(shortcut.key);
    return parts.join('+');
  }

  // ???´ë²¤???¸ë“¤??
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

  // ?¬ì»¤??ê´€ë¦??¤ì •
  private setupFocusManagement(): void {
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target) {
        this.focusHistory.push(target);
      }
    });
  }

  // ?´ì „ ?”ì†Œë¡??¬ì»¤???´ë™
  private focusPreviousElement(): void {
    if (this.focusHistory.length > 1) {
      const previousElement = this.focusHistory[this.focusHistory.length - 2];
      if (previousElement && previousElement.focus) {
        previousElement.focus();
      }
    }
  }

  // ?¤í‚µ ë§í¬ ?¤ì •
  private setupSkipLinks(): void {
    const skipLinkHTML = `
      <nav class="skip-links visually-hidden-focusable" aria-label="ë©”ì¸ ì½˜í…ì¸?ë°”ë¡œê°€ê¸?>
        <a href="#main-content" class="skip-link">ë©”ì¸ ì½˜í…ì¸ ë¡œ ?´ë™</a>
        <a href="#navigation" class="skip-link">ì£¼ìš” ?¤ë¹„ê²Œì´?˜ìœ¼ë¡??´ë™</a>
        <a href="#footer" class="skip-link">?¸í„°ë¡??´ë™</a>
      </nav>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = skipLinkHTML;
    document.body.insertBefore(container.firstElementChild!, document.body.firstChild);
  }

  // ?¬ì»¤???¸ë© ?¤ì •
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

  // ?¬ì»¤???¸ë© ?´ì œ
  removeFocusTrap(element: HTMLElement): void {
    const trapIndex = this.focusTrapStack.findIndex(trap => trap[0] === element);
    if (trapIndex !== -1) {
      this.focusTrapStack.splice(trapIndex, 1);
    }
  }

  // ê³ ë?ë¹?ëª¨ë“œ ? ê?
  private toggleHighContrast(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  // ? ë‹ˆë©”ì´??ê°ì†Œ ëª¨ë“œ ? ê?
  private toggleReducedMotion(enabled: boolean): void {
    if (enabled) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  // ?¬ì»¤???œì‹œ ?¤ì •
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

  // ?¤í¬ë¦?ë¦¬ë”???ìŠ¤???ì„±
  createScreenReaderOnly(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'sr-only';
    span.textContent = text;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  // ?¼ì´ë¸?ë¦¬ì „ ?ì„± (?¤í¬ë¦?ë¦¬ë”???¤ì‹œê°??…ë°?´íŠ¸ ?„ë‹¬)
  createLiveRegion(options: { polite?: boolean; assertive?: boolean } = {}): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', options.assertive ? 'assertive' : 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.setAttribute('aria-hidden', 'true');
    return region;
  }

  // ?‘ê·¼???ŒìŠ¤???„ìš°ë¯?
  runAccessibilityAudit(): Array<{ type: string; message: string; element?: HTMLElement }> {
    const issues: Array<{ type: string; message: string; element?: HTMLElement }> = [];

    // ?¬ì»¤??ê°€?¥í•œ ?”ì†Œ???ˆì´ë¸”ì´ ?ˆëŠ”ì§€ ?•ì¸
    const focusableElements = document.querySelectorAll(
      'input:not([type="hidden"]), select, textarea, button, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(el => {
      const element = el as HTMLElement;
      const hasLabel = this.hasAccessibleLabel(element);
      if (!hasLabel) {
        issues.push({
          type: 'missing-label',
          message: '?¬ì»¤??ê°€?¥í•œ ?”ì†Œ???‘ê·¼ ê°€?¥í•œ ?ˆì´ë¸”ì´ ?†ìŠµ?ˆë‹¤',
          element
        });
      }
    });

    // ?´ë?ì§€???€ì²??ìŠ¤?¸ê? ?ˆëŠ”ì§€ ?•ì¸
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const image = img as HTMLImageElement;
      if (!image.alt && !image.title) {
        issues.push({
          type: 'missing-alt',
          message: '?´ë?ì§€???€ì²??ìŠ¤?¸ê? ?†ìŠµ?ˆë‹¤',
          element: image
        });
      }
    });

    return issues;
  }

  // ?‘ê·¼ ê°€?¥í•œ ?ˆì´ë¸??•ì¸
  private hasAccessibleLabel(element: HTMLElement): boolean {
    // aria-label ?¬ìš©
    if (element.getAttribute('aria-label')) return true;
    
    // aria-labelledby ?¬ìš©
    const labelledby = element.getAttribute('aria-labelledby');
    if (labelledby) {
      const labelElement = document.getElementById(labelledby);
      if (labelElement && labelElement.textContent?.trim()) {
        return true;
      }
    }
    
    // ?ˆì´ë¸??”ì†Œ ?¬ìš©
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label && (label.textContent?.trim() || (label as HTMLElement).innerText.trim())) {
        return true;
      }
    }
    
    // ?ì‹ ?ìŠ¤???¬ìš©
    if (element.textContent?.trim() || (element as HTMLInputElement).value?.trim()) {
      return true;
    }
    
    return false;
  }

  // ?„ì¬ ?‘ê·¼???íƒœ ê°€?¸ì˜¤ê¸?
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

  // ?¨ì¶•??ëª©ë¡ ê°€?¸ì˜¤ê¸?
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // ë©”ëª¨ë¦??•ë¦¬
  destroy(): void {
    // ?´ë²¤??ë¦¬ìŠ¤???œê±°
    document.removeEventListener('keydown', this.handleKeyEvent.bind(this));
    
    // ?¬ì»¤???¸ë© ?´ì œ
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

// ?„ì—­ ?‘ê·¼??ê´€ë¦¬ì ?¸ìŠ¤?´ìŠ¤
export const accessibilityManager = new AccessibilityManager({
  enableKeyboardNavigation: true,
  enableScreenReaderSupport: true,
  enableFocusManagement: true,
  enableSkipLinks: true,
  enableHighContrast: true,
  enableReducedMotion: true
});

// React ???•íƒœ
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

// ?¤ë³´???¤ë¹„ê²Œì´??ê°ì? ??
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

// ?¬ì»¤??ê´€ë¦???
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

// ?¤í???ê°€?´ë“œ - CSS ?´ë˜???•ì˜
export const accessibilityStyles = `
  /* ?¤í¬ë¦?ë¦¬ë” ?„ìš© */
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

  /* ?¤í¬ë¦?ë¦¬ë” ?„ìš© (?¬ì»¤?????œì‹œ) */
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

  /* ?¤ë³´???¤ë¹„ê²Œì´???œì‹œ */
  .keyboard-navigation :focus {
    outline: 2px solid var(--app-primary, #3b82f6);
    outline-offset: 2px;
  }

  /* ê³ ë?ë¹?ëª¨ë“œ */
  .high-contrast {
    filter: contrast(1.5);
  }

  /* ? ë‹ˆë©”ì´??ê°ì†Œ */
  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
`;
