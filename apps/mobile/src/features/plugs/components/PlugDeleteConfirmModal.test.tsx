import { I18nProvider, setLocalePreference, t } from '../../../app/i18n.js';
import { getIonicButton } from '../../../test/ionicTestEvents.js';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlugDeleteConfirmModal } from './PlugDeleteConfirmModal.js';

describe('PlugDeleteConfirmModal destructive action guard', () => {
  beforeEach(() => setLocalePreference('pl'));
  afterEach(() => cleanup());

  it('does not delete on open or cancel and calls confirm exactly once on Ionic click', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <I18nProvider>
        <PlugDeleteConfirmModal
          deviceName="Salon"
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18nProvider>
    );
    const dialog = screen.getByRole('dialog', {
      name: t('hardware.shelly.deleteConfirmTitle')
    });
    expect(dialog).toHaveTextContent('Salon');
    expect(onConfirm).not.toHaveBeenCalled();
    const confirm = getIonicButton(dialog, t('common.delete'));
    expect(confirm).toHaveClass('plug-settings-ionic-action--danger');
    expect(confirm).toHaveAttribute('title');
    fireEvent.click(within(dialog).getByRole('button', { name: t('common.cancel') }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
    rerender(
      <I18nProvider>
        <PlugDeleteConfirmModal
          deviceName={null}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </I18nProvider>
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
