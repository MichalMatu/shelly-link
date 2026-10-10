import { useEffect, useId, useRef, type ReactNode } from 'react';
import { InfoPopover } from '../feedback/InfoPopover.js';

type ModalInitialFocus = 'dialog' | 'first-control';

export interface ModalTitleInfo {
  label: string;
  title?: string;
  content: ReactNode;
}

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  closeLabel: string;
  busy?: boolean;
  dismissible?: boolean;
  initialFocus?: ModalInitialFocus;
  children: ReactNode;
  titleInfo?: ModalTitleInfo;
  headerActions?: ReactNode;
  actions?: ReactNode;
  onClose(): void;
}

const nativeFocusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const ionicFocusableSelector = [
  'ion-button',
  'ion-input',
  'ion-select',
  'ion-textarea',
  'ion-toggle',
  'ion-checkbox',
  'ion-radio',
  'ion-range',
  'ion-segment-button'
].join(',');

const focusableSelector = nativeFocusableSelector + ',' + ionicFocusableSelector;

const isEnabled = (element: HTMLElement): boolean =>
  !element.hasAttribute('disabled') &&
  !(element as HTMLElement & { disabled?: boolean }).disabled &&
  element.getAttribute('aria-disabled') !== 'true' &&
  !element.closest('[hidden], [aria-hidden="true"]');

const focusTarget = (element: HTMLElement): HTMLElement | null => {
  if (!isEnabled(element)) return null;
  if (element.tabIndex >= 0) return element;
  if (!element.tagName.startsWith('ION-')) return null;

  // Ionic may put the tabbable control in Shadow DOM while the host
  // stays tabIndex=-1 (IonButton, IonSelect and IonRange in Chromium).
  return (
    Array.from(
      element.shadowRoot?.querySelectorAll<HTMLElement>(nativeFocusableSelector) ?? []
    ).find((target) => target.tabIndex >= 0 && isEnabled(target)) ?? null
  );
};

const focusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => focusTarget(element) !== null
  );

const focusElement = (element: HTMLElement): void => {
  (focusTarget(element) ?? element).focus();
};

export const Modal = ({
  open,
  title,
  description,
  closeLabel,
  busy = false,
  dismissible = true,
  initialFocus = 'dialog',
  children,
  titleInfo,
  headerActions,
  actions,
  onClose
}: ModalProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const canDismiss = dismissible && !busy;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (canDismiss) {
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      const focusable = focusableElements(modal);
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (!firstElement || !lastElement) {
        return;
      }

      if (!modal.contains(activeElement)) {
        event.preventDefault();
        focusElement(firstElement);
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        focusElement(lastElement);
        return;
      }

      if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        focusElement(firstElement);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => {
      const modal = modalRef.current;
      if (!modal) {
        return;
      }
      if (initialFocus === 'first-control') {
        focusElement(focusableElements(modal)[0] ?? modal);
        return;
      }
      modal.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      const previouslyFocusedElement = previouslyFocusedElementRef.current;
      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
      previouslyFocusedElementRef.current = null;
    };
  }, [canDismiss, initialFocus, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="lcl-modal-backdrop"
      role="presentation"
      onClick={canDismiss ? onClose : undefined}
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-modal="true"
        aria-labelledby={titleId}
        className="lcl-modal"
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="lcl-modal__header">
          <div className="lcl-modal__heading">
            <div className="lcl-modal__title-row">
              <h2 id={titleId}>{title}</h2>
              {titleInfo && (
                <InfoPopover label={titleInfo.label} title={titleInfo.title}>
                  {titleInfo.content}
                </InfoPopover>
              )}
            </div>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          {headerActions && (
            <div className="lcl-modal__header-actions">{headerActions}</div>
          )}
        </header>

        <div className="lcl-modal__body">{children}</div>

        <footer className="lcl-modal__footer">
          {actions}
          <button className="lcl-modal__close" type="button" onClick={onClose}>
            {closeLabel}
          </button>
        </footer>
      </section>
    </div>
  );
};
