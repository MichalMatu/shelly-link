import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference, t } from '../app/i18n.js';
import { fireIonInput, getIonicInput } from '../test/ionicTestEvents.js';
import { EditablePlugName } from './EditablePlugName.js';

describe('EditablePlugName Ionic input', () => {
  beforeEach(() => setLocalePreference('pl'));

  it('commits a trimmed name exactly once on blur', () => {
    const onCommit = vi.fn();
    render(
      <I18nProvider>
        <EditablePlugName name="Fan" variant="card" onCommit={onCommit} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /nazwa/i }));
    const input = getIonicInput(document, t('hardware.shelly.deviceNameLabel'));
    fireIonInput(input, '  Fan 2  ');
    fireEvent(input, new CustomEvent('ionBlur', { bubbles: true }));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('Fan 2');
  });

  it('cancels an edit on Escape without changing the device name', () => {
    const onCommit = vi.fn();
    render(
      <I18nProvider>
        <EditablePlugName name="Fan" variant="detail" onCommit={onCommit} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /nazwa/i }));
    const input = getIonicInput(document, t('hardware.shelly.deviceNameLabel'));
    fireIonInput(input, 'Other');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Fan' })).toBeVisible();
  });
});
