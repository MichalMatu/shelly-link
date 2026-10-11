import { IonButton } from '@ionic/react';
import { Modal } from '@lcl/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Modal dismissal policy', () => {
  afterEach(() => {
    cleanup();
  });

  it('dismisses an idle modal from the backdrop and Escape key', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal closeLabel="Close" open title="Idle modal" onClose={onClose}>
        <p>Body</p>
      </Modal>
    );

    const backdrop = document.querySelector('.lcl-modal-backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(
      <Modal closeLabel="Close" open title="Idle modal" onClose={onClose}>
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('includes an Ionic shadow button in initial focus and traps both Tab directions', async () => {
    const { container } = render(
      <Modal
        actions={<IonButton>Apply</IonButton>}
        closeLabel="Close"
        initialFocus="first-control"
        open
        title="Ionic modal"
        onClose={vi.fn()}
      >
        <p>Body</p>
      </Modal>
    );

    const ionicHost = container.querySelector<HTMLElement>('ion-button');
    expect(ionicHost).not.toBeNull();
    expect(ionicHost?.tabIndex).toBe(-1);
    const nativeButton = document.createElement('button');
    nativeButton.textContent = 'Apply';
    (ionicHost!.shadowRoot ?? ionicHost!.attachShadow({ mode: 'open' })).append(
      nativeButton
    );

    await waitFor(() => expect(document.activeElement).toBe(ionicHost));
    expect(ionicHost?.shadowRoot?.activeElement).toBe(nativeButton);

    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(ionicHost);
    expect(ionicHost?.shadowRoot?.activeElement).toBe(nativeButton);
  });

  it('ignores a disabled Ionic action when finding the first focusable control', async () => {
    const { container } = render(
      <Modal
        actions={
          <>
            <IonButton disabled>Disabled</IonButton>
            <IonButton>Continue</IonButton>
          </>
        }
        closeLabel="Close"
        initialFocus="first-control"
        open
        title="Disabled action"
        onClose={vi.fn()}
      >
        <p>Body</p>
      </Modal>
    );

    const [disabledHost, enabledHost] = Array.from(
      container.querySelectorAll<HTMLElement>('ion-button')
    );
    expect((disabledHost as HTMLElement & { disabled?: boolean }).disabled).toBe(true);
    for (const host of [disabledHost!, enabledHost!]) {
      const native = document.createElement('button');
      native.textContent = host.textContent;
      (host.shadowRoot ?? host.attachShadow({ mode: 'open' })).append(native);
    }

    await waitFor(() => expect(document.activeElement).toBe(enabledHost));
    expect(disabledHost?.shadowRoot?.activeElement).toBeNull();
  });

  it('renders one canonical modal shell without size variants', () => {
    const onClose = vi.fn();
    render(
      <Modal closeLabel="Close" open title="Canonical modal" onClose={onClose}>
        <p>Body</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog', { name: 'Canonical modal' });
    const backdrop = document.querySelector('.lcl-modal-backdrop');
    expect(dialog.className).toBe('lcl-modal');
    expect(backdrop?.className).toBe('lcl-modal-backdrop');
  });

  it('blocks ambient dismissal while a modal is busy', () => {
    const onClose = vi.fn();
    render(
      <Modal busy closeLabel="Close" open title="Busy modal" onClose={onClose}>
        <p>Body</p>
      </Modal>
    );

    const backdrop = document.querySelector('.lcl-modal-backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports explicit-only modals for safety gates', () => {
    const onClose = vi.fn();
    render(
      <Modal
        closeLabel="Close"
        dismissible={false}
        open
        title="Explicit modal"
        onClose={onClose}
      >
        <p>Body</p>
      </Modal>
    );

    const backdrop = document.querySelector('.lcl-modal-backdrop');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
