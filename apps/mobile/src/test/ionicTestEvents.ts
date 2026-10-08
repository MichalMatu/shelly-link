import { fireEvent } from '@testing-library/react';

type IonicHost = HTMLElement & {
  ariaLabel?: string | null;
  checked?: boolean;
  disabled?: boolean;
  value?: unknown;
};

const normalizedText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const hostAccessibleName = (element: IonicHost): string => {
  const direct =
    element.getAttribute('aria-label') ??
    (typeof element.ariaLabel === 'string' ? element.ariaLabel : null);
  if (direct) return normalizedText(direct);

  const shadowLabel = element.shadowRoot
    ?.querySelector<HTMLElement>('[aria-label]')
    ?.getAttribute('aria-label');
  if (shadowLabel) return normalizedText(shadowLabel);

  const labelledContainer = element.closest('label, .field');
  const visibleLabel = labelledContainer
    ? Array.from(labelledContainer.children).find(
        (child) => child.tagName.toLowerCase() === 'span'
      )
    : undefined;
  return normalizedText(visibleLabel?.textContent);
};

const byAccessibleName = (element: Element, name: string): boolean => {
  const host = element as IonicHost;
  const expected = normalizedText(name);
  const direct = hostAccessibleName(host);
  const text = normalizedText(element.textContent);

  return (
    direct === expected ||
    text === expected ||
    (direct.length > 0 && expected.startsWith(`${direct}:`))
  );
};

const findIonic = <T extends Element>(
  root: ParentNode,
  selector: string,
  name: string
): T | null =>
  Array.from(root.querySelectorAll<T>(selector)).find((element) =>
    byAccessibleName(element, name)
  ) ?? null;

export const getIonicButton = (root: ParentNode, name: string): HTMLElement => {
  const element = findIonic<HTMLElement>(root, 'ion-button', name);
  if (!element) throw new Error(`Ionic button missing: ${name}`);
  return element;
};

export const queryIonicButton = (root: ParentNode, name: string): HTMLElement | null =>
  findIonic<HTMLElement>(root, 'ion-button', name);

export const getIonicSelect = (root: ParentNode, name: string): HTMLElement => {
  const element = findIonic<HTMLElement>(root, 'ion-select', name);
  if (!element) throw new Error(`Ionic select missing: ${name}`);
  return element;
};

export const queryIonicSelect = (root: ParentNode, name: string): HTMLElement | null =>
  findIonic<HTMLElement>(root, 'ion-select', name);

export const getIonicInput = (root: ParentNode, name: string): HTMLElement => {
  const element = findIonic<HTMLElement>(root, 'ion-input', name);
  if (!element) throw new Error(`Ionic input missing: ${name}`);
  return element;
};

export const getIonicToggle = (root: ParentNode, name: string): HTMLElement => {
  const element = findIonic<HTMLElement>(root, 'ion-toggle', name);
  if (!element) throw new Error(`Ionic toggle missing: ${name}`);
  return element;
};

export const ionicValue = (element: Element): unknown =>
  (element as IonicHost).value ?? element.getAttribute('value');

export const isIonicChecked = (element: Element): boolean =>
  (element as IonicHost).checked ??
  element.getAttribute('aria-checked') === 'true';

export const isIonicDisabled = (element: Element): boolean =>
  (element as IonicHost).disabled ?? element.hasAttribute('disabled');

export const fireIonChange = (element: Element, value: unknown): void => {
  (element as IonicHost).value = value;
  fireEvent(
    element,
    new CustomEvent('ionChange', {
      bubbles: true,
      detail: { value }
    })
  );
};

export const fireIonToggleChange = (element: Element, checked: boolean): void => {
  (element as IonicHost).checked = checked;
  fireEvent(
    element,
    new CustomEvent('ionChange', {
      bubbles: true,
      detail: { checked }
    })
  );
};

export const fireIonInput = (element: Element, value: string): void => {
  (element as IonicHost).value = value;
  fireEvent(
    element,
    new CustomEvent('ionInput', {
      bubbles: true,
      detail: { value }
    })
  );
};
