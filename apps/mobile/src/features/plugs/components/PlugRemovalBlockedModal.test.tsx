import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlugRemovalBlockedModal } from './PlugRemovalBlockedModal.js';

describe('PlugRemovalBlockedModal Ionic blocked-navigation action', () => {
  beforeEach(() => setLocalePreference('pl'));
  afterEach(() => cleanup());

  it('preserves the owner-blocked guard and opens only the requested automation', () => {
    const onClose = vi.fn();
    const onOpenAutomation = vi.fn();
    const { rerender } = render(
      <I18nProvider>
        <PlugRemovalBlockedModal
          automationName="Climate"
          deviceName="Plug A"
          onClose={onClose}
          onOpenAutomation={onOpenAutomation}
        />
      </I18nProvider>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Climate');
    const action = dialog.querySelector('ion-button');
    expect(action).not.toBeNull();
    expect(action).toHaveClass('plug-settings-ionic-action');
    fireEvent.click(action!);
    expect(onOpenAutomation).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <I18nProvider>
        <PlugRemovalBlockedModal
          automationName="Climate"
          deviceName="Plug A"
          onClose={onClose}
        />
      </I18nProvider>
    );
    expect(screen.getByRole('dialog').querySelector('ion-button')).toBeNull();

    rerender(
      <I18nProvider>
        <PlugRemovalBlockedModal
          automationName={null}
          deviceName="Plug A"
          onClose={onClose}
          onOpenAutomation={onOpenAutomation}
        />
      </I18nProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
