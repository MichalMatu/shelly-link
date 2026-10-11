import { I18nProvider, setLocalePreference, t } from '../../../app/i18n.js';
import { getIonicButton } from '../../../test/ionicTestEvents.js';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SensorRemovalBlockedModal,
  SensorRemovalConfirmModal
} from './SensorRemovalBlockedModal.js';

describe('SensorRemovalBlockedModal owner navigation', () => {
  beforeEach(() => setLocalePreference('pl'));
  afterEach(() => cleanup());

  it('confirms thermometer deletion only after explicit Ionic action, not Cancel', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <I18nProvider>
        <SensorRemovalConfirmModal
          deviceName="Thermometer A"
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18nProvider>
    );
    const dialog = screen.getByRole('dialog', {
      name: t('hardware.sensor.deleteConfirmTitle')
    });
    expect(dialog).toHaveTextContent('Thermometer A');
    expect(onConfirm).not.toHaveBeenCalled();
    const action = getIonicButton(dialog, t('common.delete'));
    expect(action).toHaveClass('sensor-removal-danger-action');
    expect(action).toHaveAttribute('title', t('hardware.sensor.deleteTitle'));
    fireEvent.click(within(dialog).getByRole('button', { name: t('common.cancel') }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(action);
    expect(onConfirm).toHaveBeenCalledOnce();

    rerender(
      <I18nProvider>
        <SensorRemovalConfirmModal
          deviceName={null}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18nProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

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
