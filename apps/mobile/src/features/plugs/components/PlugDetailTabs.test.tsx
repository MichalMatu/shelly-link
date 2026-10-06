import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { automationDetailTabs, PlugDetailTabs } from './PlugDetailTabs.js';

const renderTabs = (onChange = vi.fn()) =>
  render(
    <I18nProvider>
      <PlugDetailTabs
        activeTab="info"
        disabledTabs={['automation', 'ble', 'script']}
        onChange={onChange}
      />
    </I18nProvider>
  );

describe('PlugDetailTabs', () => {
  beforeEach(() => setLocalePreference('en'));
  afterEach(() => setLocalePreference('system'));

  it('keeps unavailable transport features in the shared tab skeleton', () => {
    const onChange = vi.fn();
    renderTabs(onChange);

    expect(screen.getByRole('button', { name: 'Automation' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bluetooth' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Script' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Plug settings' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Info' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Info' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Plug settings' }));
    expect(onChange).toHaveBeenCalledWith('device');
  });
  it('derives optional detail capabilities without changing the base tab order', () => {
    expect(automationDetailTabs()).toEqual(['automation', 'ble', 'device', 'info']);
    expect(automationDetailTabs({ hasScript: true })).toEqual([
      'automation',
      'ble',
      'device',
      'script',
      'info'
    ]);
    expect(automationDetailTabs({ hasHistory: true, hasScript: true })).toEqual([
      'automation',
      'history',
      'ble',
      'device',
      'script',
      'info'
    ]);
  });

  it('uses a distinct Pulse automation icon', () => {
    render(
      <I18nProvider>
        <PlugDetailTabs
          activeTab="automation"
          automationIcon="pulse"
          availableTabs={automationDetailTabs({ hasScript: true })}
          onChange={vi.fn()}
        />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'Automation' })).toHaveAttribute(
      'data-automation-icon',
      'pulse'
    );
  });

  it('shows History only when the caller opts into that tab', () => {
    render(
      <I18nProvider>
        <PlugDetailTabs activeTab="history" showHistory onChange={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('navigation')).toHaveAttribute('data-tab-count', '6');
  });
});
