from pathlib import Path

root = Path('.')

def read(path): return (root / path).read_text()
def write(path, text):
    p = root / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
def replace_once(path, old, new):
    s = read(path)
    if s.count(old) != 1:
        raise SystemExit(f'{path}: expected one match, got {s.count(old)} for {old[:120]!r}')
    write(path, s.replace(old, new, 1))

write('apps/mobile/src/features/plugs/components/PlugRelayControls.tsx', '''import { useTranslation } from '../../../app/i18n.js';

export type PlugRelayControlsProps = {
  relayState: boolean | undefined;
  busy: boolean;
  disabled?: boolean;
  requestedState?: boolean | undefined;
  onTurnOn(): void;
  onTurnOff(): void;
};

export const PlugRelayControls = ({
  relayState,
  busy,
  disabled = false,
  requestedState,
  onTurnOn,
  onTurnOff
}: PlugRelayControlsProps) => {
  const { t } = useTranslation();
  const requestedRelayState = requestedState ?? relayState;

  return (
    <div
      className="automation-relay-actions automation-card__relay-actions"
      role="group"
      aria-label={t('dashboard.output')}
    >
      <button
        className="automation-relay-button"
        type="button"
        aria-pressed={relayState === true}
        disabled={busy || disabled}
        onClick={() => {
          if (requestedRelayState !== true) onTurnOn();
        }}
      >
        ON
      </button>
      <button
        className="automation-relay-button"
        type="button"
        aria-pressed={relayState === false}
        disabled={busy || disabled}
        onClick={() => {
          if (requestedRelayState !== false) onTurnOff();
        }}
      >
        OFF
      </button>
    </div>
  );
};
''')

write('apps/mobile/src/features/plugs/components/PlugBleDetailSurface.tsx', '''import { DiagnosticRow } from '@lcl/ui';
import { IconBluetooth } from '@tabler/icons-react';
import { useTranslation } from '../../../app/i18n.js';
import type { PlugInformation } from '../data/plugInformation.js';

export type PlugBleDetailSurfaceProps = {
  information: PlugInformation | undefined;
  loading: boolean;
  error: boolean;
  onScan?: () => void;
};

export const PlugBleDetailSurface = ({
  information,
  loading,
  error,
  onScan
}: PlugBleDetailSurfaceProps) => {
  const { t } = useTranslation();
  const bluetoothState = information?.status.bluetooth;

  return (
    <section className="plug-detail-framed-section">
      <h3 className="plug-detail-framed-section__title">{t('common.bluetooth')}</h3>
      {loading && (
        <div className="plug-detail-loading" role="status">
          <span className="plug-detail-loading__spinner" aria-hidden="true" />
          <span>{t('common.refreshing')}</span>
        </div>
      )}
      {error && (
        <p className="plug-settings-feedback plug-settings-feedback--warning">
          {t('dashboard.readFailed')}
        </p>
      )}
      {information && (
        <div className="plug-info-grid">
          <DiagnosticRow
            label={t('common.bluetooth')}
            value={
              bluetoothState === 'enabled'
                ? t('common.enabled')
                : bluetoothState === 'disabled'
                  ? t('common.disabled')
                  : t('common.missing')
            }
          />
        </div>
      )}
      {onScan && (
        <div className="plug-settings-actions">
          <button
            className="secondary-action"
            type="button"
            title={t('hardware.shelly.scanBleViaShellyTitle')}
            onClick={onScan}
          >
            <IconBluetooth className="icon-action__svg" aria-hidden="true" />
            <span>{t('hardware.shelly.scanBleViaShellyTitle')}</span>
          </button>
        </div>
      )}
    </section>
  );
};
''')

# Export shared Plug surfaces.
replace_once(
    'apps/mobile/src/features/plugs/index.ts',
    "export { PlugAutomationModeControl } from './components/PlugAutomationModeControl.js';\n",
    "export { PlugAutomationModeControl } from './components/PlugAutomationModeControl.js';\nexport { PlugRelayControls } from './components/PlugRelayControls.js';\nexport { PlugBleDetailSurface } from './components/PlugBleDetailSurface.js';\n"
)

# PlugDashboardCardShell delegates relay-control DOM to the common component with identical classes/markup.
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDashboardCardShell.tsx',
    "import { EditablePlugName } from '../../../components/EditablePlugName.js';\n",
    "import { EditablePlugName } from '../../../components/EditablePlugName.js';\nimport { PlugRelayControls } from './PlugRelayControls.js';\n"
)
replace_once(
    'apps/mobile/src/features/plugs/components/PlugDashboardCardShell.tsx',
    "  const requestedRelayState = relayActionState ?? relayState;\n\n",
    ""
)
old_relay = '''      {showRelayControls && (
        <div
          className="automation-relay-actions automation-card__relay-actions"
          role="group"
          aria-label={t('dashboard.output')}
        >
          <button
            className="automation-relay-button"
            type="button"
            aria-pressed={relayState === true}
            disabled={busy || relayControlsDisabled}
            onClick={() => {
              if (requestedRelayState !== true) onTurnRelayOn();
            }}
          >
            ON
          </button>
          <button
            className="automation-relay-button"
            type="button"
            aria-pressed={relayState === false}
            disabled={busy || relayControlsDisabled}
            onClick={() => {
              if (requestedRelayState !== false) onTurnRelayOff();
            }}
          >
            OFF
          </button>
        </div>
      )}
'''
new_relay = '''      {showRelayControls && (
        <PlugRelayControls
          relayState={relayState}
          busy={busy}
          disabled={relayControlsDisabled}
          requestedState={relayActionState}
          onTurnOn={onTurnRelayOn}
          onTurnOff={onTurnRelayOff}
        />
      )}
'''
replace_once('apps/mobile/src/features/plugs/components/PlugDashboardCardShell.tsx', old_relay, new_relay)

# Plain Wi-Fi Plug BLE tab now uses the same component that Time will use.
text = read('apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx')
text = text.replace("import { DiagnosticRow } from '@lcl/ui';\n", '')
text = text.replace("import { IconBluetooth, IconTrash } from '@tabler/icons-react';\n", "import { IconTrash } from '@tabler/icons-react';\n")
text = text.replace("import { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';\n", "import { PlugBleDetailSurface } from '../components/PlugBleDetailSurface.js';\nimport { PlugDeleteConfirmModal } from '../components/PlugDeleteConfirmModal.js';\n")
old_ble = '''        {activeTab === 'ble' && (
          <section className="plug-detail-framed-section">
            <h3 className="plug-detail-framed-section__title">{t('common.bluetooth')}</h3>
            {informationQuery.isPending && (
              <div className="plug-detail-loading" role="status">
                <span className="plug-detail-loading__spinner" aria-hidden="true" />
                <span>{t('common.refreshing')}</span>
              </div>
            )}
            {informationQuery.isError && (
              <p className="plug-settings-feedback plug-settings-feedback--warning">
                {t('dashboard.readFailed')}
              </p>
            )}
            {informationQuery.data && (
              <div className="plug-info-grid">
                <DiagnosticRow
                  label={t('common.bluetooth')}
                  value={
                    bluetoothState === 'enabled'
                      ? t('common.enabled')
                      : bluetoothState === 'disabled'
                        ? t('common.disabled')
                        : t('common.missing')
                  }
                />
              </div>
            )}
            <div className="plug-settings-actions">
              <button
                className="secondary-action"
                type="button"
                title={t('hardware.shelly.scanBleViaShellyTitle')}
                onClick={() => onOpenBleDiscovery(device.deviceId)}
              >
                <IconBluetooth className="icon-action__svg" aria-hidden="true" />
                <span>{t('hardware.shelly.scanBleViaShellyTitle')}</span>
              </button>
            </div>
          </section>
        )}
'''
new_ble = '''        {activeTab === 'ble' && (
          <PlugBleDetailSurface
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
            onScan={() => onOpenBleDiscovery(device.deviceId)}
          />
        )}
'''
if text.count(old_ble) != 1: raise SystemExit('Wifi BLE block not found')
text = text.replace(old_ble, new_ble, 1)
text = text.replace("  const bluetoothState = informationQuery.data?.status.bluetooth;\n", '')
write('apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx', text)

# InstallationDetailScreen forwards the already-existing BLE navigation callback to Time.
old_time_render = '''      <TimeInstallationDetail
        installation={installation}
        onBack={onBack}
        {...(onEdit ? { onEdit } : {})}
      />
'''
new_time_render = '''      <TimeInstallationDetail
        installation={installation}
        onBack={onBack}
        {...(onEdit ? { onEdit } : {})}
        {...(onOpenBleDiscovery ? { onOpenBleDiscovery } : {})}
      />
'''
replace_once('apps/mobile/src/screens/InstallationDetailScreen.tsx', old_time_render, new_time_render)

# Replace old Time-specific framed cards with the shared Plug detail composition.
write('apps/mobile/src/screens/TimeInstallationDetail.tsx', '''import { FeedbackPanel, Modal, type ToastMessage, type ToastTone } from '@lcl/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport } from '../components/AppToastViewport.js';
import {
  deleteTimeAutomation,
  useInstalledAutomationStore,
  type TimeInstalledAutomation
} from '../features/automations/index.js';
import {
  PlugAutomationModeControl,
  PlugBleDetailSurface,
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  PlugRelayControls,
  usePlugInformationFlow,
  type PlugDetailTab
} from '../features/plugs/index.js';
import {
  timeAutomationRuntimeQueryKey,
  useTimeAutomationActions,
  useTimeAutomationRuntime,
  type TimeAutomationAction
} from '../flows/time-automation/useTimeAutomationRuntime.js';

const TIME_DETAIL_TABS = [
  'automation',
  'ble',
  'device',
  'info'
] as const satisfies readonly PlugDetailTab[];

type TimeInstallationDetailProps = {
  installation: TimeInstalledAutomation;
  onBack(): void;
  onEdit?: () => void;
  onOpenBleDiscovery?: (deviceId: string) => void;
};

export const TimeInstallationDetail = ({
  installation,
  onBack,
  onEdit,
  onOpenBleDiscovery
}: TimeInstallationDetailProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const runtimeQuery = useTimeAutomationRuntime(installation);
  const runtimeAction = useTimeAutomationActions(installation);
  const informationQuery = usePlugInformationFlow(installation.shelly, {
    enabled: activeTab === 'ble' || activeTab === 'info'
  });
  const removeInstallation = useInstalledAutomationStore(
    (state) => state.removeInstallation
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const pushToast = useCallback((tone: ToastTone, title: string) => {
    toastIdRef.current += 1;
    setToasts((current) => [
      ...current.slice(-2),
      { id: `time-toast-${toastIdRef.current}`, tone, title }
    ]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const deleteMutation = useMutation({
    mutationFn: () => deleteTimeAutomation(installation),
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: timeAutomationRuntimeQueryKey(installation),
        exact: true
      });
      removeInstallation(installation.id);
      setDeleteOpen(false);
      onBack();
    },
    onError: () => pushToast('warning', t('time.detail.deleteFailed'))
  });

  const runtimeState = runtimeQuery.isPending
    ? 'loading'
    : runtimeQuery.isError
      ? 'offline'
      : (runtimeQuery.data?.scheduleState ?? 'attention');
  const automationRunning = runtimeState === 'running';
  const manualControl = runtimeState === 'paused';
  const runtimeControllable = automationRunning || manualControl;
  const actionBusy = runtimeAction.isPending;
  const runRuntimeAction = (action: TimeAutomationAction) => {
    runtimeAction.mutate(action, {
      onError: () => pushToast('warning', t('time.detail.actionFailed'))
    });
  };

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop tabs={[activeTab, setActiveTab]} availableTabs={TIME_DETAIL_TABS} />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'automation' && (
          <>
            {runtimeState === 'loading' && (
              <div className="plug-detail-loading plug-detail-loading--section" role="status">
                <span className="plug-detail-loading__spinner" aria-hidden="true" />
                <span>{t('common.refreshing')}</span>
              </div>
            )}
            {(runtimeState === 'offline' || runtimeState === 'attention') && (
              <FeedbackPanel
                tone="warning"
                title={
                  runtimeState === 'offline'
                    ? t('dashboard.health.offline')
                    : t('dashboard.health.attention')
                }
              >
                {t('time.detail.needsAttention')}
              </FeedbackPanel>
            )}

            <section className="installation-automation-live-state plug-detail-section">
              <dl className="automation-summary installation-detail-summary installation-detail-summary--flush">
                <div>
                  <dt>{t('time.onTime')}</dt>
                  <dd>{installation.config.onTime}</dd>
                </div>
                <div>
                  <dt>{t('time.offTime')}</dt>
                  <dd>{installation.config.offTime}</dd>
                </div>
                <div>
                  <dt>{t('dashboard.output')}</dt>
                  <dd>{runtimeQuery.data ? (runtimeQuery.data.relayOn ? 'ON' : 'OFF') : '—'}</dd>
                </div>
                <div>
                  <dt>{t('time.clock')}</dt>
                  <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>
                </div>
              </dl>

              <PlugAutomationModeControl
                autoActive={automationRunning}
                manualActive={manualControl}
                disabled={actionBusy || !runtimeControllable}
                onAuto={() => {
                  if (!automationRunning) runRuntimeAction('auto');
                }}
                onManual={() => {
                  if (!manualControl) runRuntimeAction('manual');
                }}
              />

              <PlugRelayControls
                relayState={runtimeQuery.data?.relayOn}
                busy={actionBusy}
                disabled={!manualControl}
                onTurnOn={() => runRuntimeAction('on')}
                onTurnOff={() => runRuntimeAction('off')}
              />
            </section>

            {onEdit && (
              <div className="installation-detail-actions">
                <button className="primary-action" type="button" onClick={onEdit}>
                  {t('detail.edit')}
                </button>
              </div>
            )}

            <div className="installation-detail-delete-action">
              <button
                className="secondary-action secondary-action--danger"
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleteOpen(true)}
              >
                {t('time.detail.delete')}
              </button>
            </div>
          </>
        )}

        {activeTab === 'ble' && (
          <PlugBleDetailSurface
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
            {...(onOpenBleDiscovery
              ? { onScan: () => onOpenBleDiscovery(installation.shelly.deviceId) }
              : {})}
          />
        )}

        {activeTab === 'device' && (
          <PlugDeviceSettingsSurface target={installation.shelly} />
        )}

        {activeTab === 'info' && (
          <PlugInfoPanel
            connection={{
              transport: 'wifi',
              baseUrl: installation.shelly.baseUrl
            }}
            information={informationQuery.data}
            loading={informationQuery.isPending}
            error={informationQuery.isError}
          />
        )}
      </section>

      <Modal
        actions={
          <button
            className="secondary-action secondary-action--danger"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? t('time.deleting') : t('common.confirmDelete')}
          </button>
        }
        busy={deleteMutation.isPending}
        closeLabel={t('common.close')}
        open={deleteOpen}
        title={t('time.detail.deleteConfirmTitle')}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteOpen(false);
        }}
      >
        <FeedbackPanel tone="warning" title={t('time.detail.delete')}>
          {t('time.detail.deleteConfirmDetail')}
        </FeedbackPanel>
      </Modal>

      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />
    </main>
  );
};
''')

# E2E contract: Time detail now follows the same flat hierarchy and uses AUTO/MANUAL instead of legacy pause/resume copy.
replace_once(
    'apps/mobile/e2e/responsive.spec.ts',
    '''const expectTimeDetailHierarchy = async (page: Page) => {
  const [tabsBox, surfaceBox, liveBox] = await Promise.all([
    requiredBox(page.locator('.plug-detail-tabs')),
    requiredBox(page.locator('.plug-detail-surface')),
    requiredBox(page.locator('.installation-detail-live'))
  ]);

  expect(Math.abs(tabsBox.x - surfaceBox.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(tabsBox.width - surfaceBox.width)).toBeLessThanOrEqual(2);
  expect(liveBox.x).toBeGreaterThanOrEqual(surfaceBox.x - 1);
  expect(liveBox.x + liveBox.width).toBeLessThanOrEqual(
    surfaceBox.x + surfaceBox.width + 1
  );
  await expect(page.locator('.installation-detail-header')).toHaveCount(0);
  await expect(page.locator('.app-page-back-row')).toHaveCount(0);
};
''',
    '''const expectTimeDetailHierarchy = async (page: Page) => {
  const [tabsBox, surfaceBox, liveStateBox] = await Promise.all([
    requiredBox(page.locator('.plug-detail-tabs')),
    requiredBox(page.locator('.plug-detail-surface')),
    requiredBox(page.locator('.installation-automation-live-state'))
  ]);

  expect(Math.abs(tabsBox.x - surfaceBox.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(tabsBox.width - surfaceBox.width)).toBeLessThanOrEqual(2);
  expect(liveStateBox.x).toBeGreaterThanOrEqual(surfaceBox.x - 1);
  expect(liveStateBox.x + liveStateBox.width).toBeLessThanOrEqual(
    surfaceBox.x + surfaceBox.width + 1
  );
  await expect(page.locator('.installation-detail-header')).toHaveCount(0);
  await expect(page.locator('.installation-detail-live')).toHaveCount(0);
  await expect(page.locator('.app-page-back-row')).toHaveCount(0);
};
'''
)
replace_once(
    'apps/mobile/e2e/responsive.spec.ts',
    "    await expect(page.getByText('Natywny Shelly Schedule')).toBeVisible();\n",
    "    await expect(page.getByText('Natywny Shelly Schedule')).toHaveCount(0);\n"
)
old_lifecycle = '''  await page.getByRole('button', { name: 'Wstrzymaj automatykę' }).click();
  await expect(
    page.getByText('Harmonogram wstrzymany, wyjście potwierdzone jako OFF.')
  ).toBeVisible();
  await expect(page.getByText('Wstrzymana')).toBeVisible();
  await expect(page.getByText('OFF', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Wznów automatykę' }).click();
  await expect(
    page.getByText('Harmonogram wznowiony i stan wyjścia dopasowany do bieżącej godziny.')
  ).toBeVisible();
  await expect(page.getByText('Działa')).toBeVisible();

'''
new_lifecycle = '''  const detailAuto = page.getByRole('button', { name: 'AUTO', exact: true });
  const detailManual = page.getByRole('button', { name: 'MANUAL', exact: true });
  const detailOn = page.getByRole('button', { name: 'ON', exact: true });
  const detailOff = page.getByRole('button', { name: 'OFF', exact: true });
  await expect(detailAuto).toHaveAttribute('aria-pressed', 'true');
  await expect(detailOn).toBeDisabled();
  await expect(detailOff).toBeDisabled();

  await detailManual.click();
  await expect(detailManual).toHaveAttribute('aria-pressed', 'true');
  await expect(detailOff).toHaveAttribute('aria-pressed', 'true');
  await expect(detailOn).toBeEnabled();
  await detailOn.click();
  await expect(detailOn).toHaveAttribute('aria-pressed', 'true');
  await detailOff.click();
  await expect(detailOff).toHaveAttribute('aria-pressed', 'true');

  await detailAuto.click();
  await expect(detailAuto).toHaveAttribute('aria-pressed', 'true');

'''
replace_once('apps/mobile/e2e/responsive.spec.ts', old_lifecycle, new_lifecycle)

print('Time detail surface unification patch applied')
