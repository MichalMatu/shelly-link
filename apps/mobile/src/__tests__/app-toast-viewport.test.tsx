import { act, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../app/i18n.js';
import { AppShell } from '../components/AppShell.js';
import { AppToastViewport, useToastQueue } from '../components/AppToastViewport.js';

const noop = vi.fn();

describe('AppToastViewport', () => {
  it('portals an initial toast into the shell host without rendering it in page content', () => {
    render(
      <I18nProvider>
        <AppShell
          activeSection="plugs"
          onOpenPlugs={noop}
          onOpenThermometers={noop}
          onOpenSettings={noop}
        >
          <section className="demo-panel">
            <AppToastViewport
              autoDismissMs={0}
              dismissLabel="Zamknij"
              label="Powiadomienia"
              onDismiss={noop}
              toasts={[
                {
                  id: 'initial-toast',
                  tone: 'ok',
                  title: 'Gotowe'
                }
              ]}
            />
          </section>
        </AppShell>
      </I18nProvider>
    );

    expect(
      document.querySelector('#app-toast-host > .lcl-toast-viewport')
    ).not.toBeNull();
    expect(
      document.querySelector('.app-root-shell__content .lcl-toast-viewport')
    ).toBeNull();
  });
  it('keeps the latest three toasts and supports dismissal', () => {
    const { result } = renderHook(() => useToastQueue('toast-test'));

    act(() => {
      result.current.pushToast('ok', 'One');
      result.current.pushToast('warning', 'Two', 'Second detail');
      result.current.pushToast('ok', 'Three');
      result.current.pushToast('warning', 'Four');
    });

    expect(result.current.toasts).toEqual([
      { id: 'toast-test-2', tone: 'warning', title: 'Two', detail: 'Second detail' },
      { id: 'toast-test-3', tone: 'ok', title: 'Three' },
      { id: 'toast-test-4', tone: 'warning', title: 'Four' }
    ]);

    act(() => {
      result.current.dismissToast('toast-test-3');
    });

    expect(result.current.toasts.map((toast) => toast.id)).toEqual([
      'toast-test-2',
      'toast-test-4'
    ]);
  });
});
