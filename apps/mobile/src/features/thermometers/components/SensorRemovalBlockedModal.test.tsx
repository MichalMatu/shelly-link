import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SensorRemovalBlockedModal } from './SensorRemovalBlockedModal.js';

describe('SensorRemovalBlockedModal owner navigation', () => {
  beforeEach(() => setLocalePreference('pl'));
  afterEach(() => cleanup());

  it('keeps removal blocked and passes the exact owning installation id', () => {
    const onClose = vi.fn();
    const onOpenAutomation = vi.fn();
    const { rerender } = render(
      <I18nProvider>
        <SensorRemovalBlockedModal
          deviceName="Thermometer A"
          usage={{ id: 'installation-17', name: 'Climate A' }}
          onClose={onClose}
          onOpenAutomation={onOpenAutomation}
        />
      </I18nProvider>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Climate A');
    const action = dialog.querySelector('ion-button');
    expect(action).not.toBeNull();
    fireEvent.click(action!);
    expect(onOpenAutomation).toHaveBeenCalledExactlyOnceWith('installation-17');
    expect(onClose).not.toHaveBeenCalled();

    rerender(
      <I18nProvider>
        <SensorRemovalBlockedModal
          deviceName="Thermometer A"
          usage={{ id: 'installation-17', name: 'Climate A' }}
          onClose={onClose}
        />
      </I18nProvider>
    );
    expect(screen.getByRole('dialog').querySelector('ion-button')).toBeNull();

    rerender(
      <I18nProvider>
        <SensorRemovalBlockedModal
          deviceName="Thermometer A"
          usage={null}
          onClose={onClose}
          onOpenAutomation={onOpenAutomation}
        />
      </I18nProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
