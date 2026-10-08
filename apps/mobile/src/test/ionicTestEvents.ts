import { fireEvent } from '@testing-library/react';

const normalizedText = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

const byAccessibleName = (element: Element, name: string): boolean =>
  element.getAttribute('aria-label') === name ||
  normalizedText(element.textContent) === normalizedText(name);

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

export const queryIonicButton = (
  root: ParentNode,
  name: string
): HTMLElement | null => findIonic<HTMLElement>(root, 'ion-button', name);

export const getIonicSelect = (root: ParentNode, name: string): HTMLElement => {
  const element = findIonic<HTMLElement>(root, 'ion-select', name);
  if (!element) throw new Error(`Ionic select missing: ${name}`);
  return element;
};

export const queryIonicSelect = (
  root: ParentNode,
  name: string
): HTMLElement | null => findIonic<HTMLElement>(root, 'ion-select', name);

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

export const fireIonChange = (element: Element, value: unknown): void => {
  fireEvent(
    element,
    new CustomEvent('ionChange', {
      bubbles: true,
      detail: { value }
    })
  );
};

export const fireIonToggleChange = (element: Element, checked: boolean): void => {
  fireEvent(
    element,
    new CustomEvent('ionChange', {
      bubbles: true,
      detail: { checked }
    })
  );
};

export const fireIonInput = (element: Element, value: string): void => {
  fireEvent(
    element,
    new CustomEvent('ionInput', {
      bubbles: true,
      detail: { value }
    })
  );
};
