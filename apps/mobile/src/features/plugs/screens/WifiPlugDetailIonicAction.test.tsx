import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../app/i18n.js';
import { WifiPlugDetailScreen } from './WifiPlugDetailScreen.js';

vi.mock('../flows/usePlugInformationFlow.js', () => ({
  usePlugInformationFlow: () => ({ data: undefined, isPending: false, isError: false })
}));

describe('WifiPlugDetailScreen Ionic primary action', () => {
  it('keeps Add automation inside the Plug-owned workflow', () => {
    const onAddAutomation = vi.fn();
    const { container } = render(
      <I18nProvider>
        <WifiPlugDetailScreen
          device={{
            deviceId: 'shelly-test',
            name: 'Test Plug',
            baseUrl: 'http://192.168.0.2'
          }}
          onBack={vi.fn()}
          onAddAutomation={onAddAutomation}
          onOpenBleDiscovery={vi.fn()}
          onRemove={vi.fn()}
        />
      </I18nProvider>
    );
    const action = container.querySelector('ion-button.plug-settings-ionic-action');
    expect(action).not.toBeNull();
    expect(action).toHaveAttribute('expand', 'block');
    fireEvent.click(action!);
    expect(onAddAutomation).toHaveBeenCalledOnce();
  });
});
