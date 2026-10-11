import { I18nProvider, setLocalePreference } from '../../../app/i18n.js';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShellySetupFlow } from '../pageContracts.js';
import { ShellyBleDiscoveryModal } from './ShellyBleDiscoveryModal.js';

vi.mock('./ShellyBleDiscoveryContent.js', () => ({
  ShellyBleDiscoveryContent: () => <p>BLE content</p>
}));

const flowWith = (session: boolean, running: boolean, restartBusy = false) =>
  ({
    startBleDiscoveryMutation: { isPending: false },
    refreshBleDiscoveryMutation: { isPending: false },
    restartBleDiscoveryMutation: { isPending: restartBusy },
    stopBleDiscoveryMutation: { isPending: false },
    bleDiscoverySession: session ? { id: 'session-1' } : null,
    bleDiscoverySnapshot: { running }
  }) as unknown as ShellySetupFlow;

describe('ShellyBleDiscoveryModal Ionic restart action', () => {
  beforeEach(() => setLocalePreference('pl'));
  afterEach(() => cleanup());

  it('shows retry only for an ended discovery session and preserves busy behavior', () => {
    const onRestart = vi.fn();
    const onClose = vi.fn();
    const renderModal = (flow: ShellySetupFlow) => (
      <I18nProvider>
        <ShellyBleDiscoveryModal
          flow={flow}
          device={null}
          open
          onClose={onClose}
          onRestart={onRestart}
          onSaveCandidate={vi.fn()}
        />
      </I18nProvider>
    );
    const { rerender } = render(renderModal(flowWith(false, false)));
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('ion-button')).toBeNull();

    rerender(renderModal(flowWith(true, true)));
    expect(dialog.querySelector('ion-button')).toBeNull();

    rerender(renderModal(flowWith(true, false)));
    const action = dialog.querySelector('ion-button');
    expect(action).not.toBeNull();
    expect(action).toHaveAttribute('fill', 'outline');
    expect((action as HTMLElement & { disabled?: boolean }).disabled).not.toBe(true);
    fireEvent.click(action!);
    expect(onRestart).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    rerender(renderModal(flowWith(true, false, true)));
    const busyAction = dialog.querySelector('ion-button') as HTMLElement & {
      disabled?: boolean;
    };
    expect(busyAction.disabled).toBe(true);
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(busyAction).not.toHaveAttribute('aria-busy');
  });
});
