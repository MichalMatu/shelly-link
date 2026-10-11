from pathlib import Path

root = Path('.')

shell_path = root / 'apps/mobile/src/features/plugs/components/PlugDashboardCardShell.tsx'
shell = shell_path.read_text()
old = """  openDetailsOnCardClick?: boolean;\n  relayActionState?: boolean | undefined;\n  relayControlsDisabled?: boolean;\n"""
new = """  openDetailsOnCardClick?: boolean;\n  showTelemetry?: boolean;\n  showRelayControls?: boolean;\n  relayActionState?: boolean | undefined;\n  relayControlsDisabled?: boolean;\n"""
if old not in shell:
    raise SystemExit('PlugDashboardCardShell props anchor missing')
shell = shell.replace(old, new, 1)
old = """  openDetailsOnCardClick = true,\n  relayActionState,\n  relayControlsDisabled = false,\n"""
new = """  openDetailsOnCardClick = true,\n  showTelemetry = true,\n  showRelayControls = true,\n  relayActionState,\n  relayControlsDisabled = false,\n"""
if old not in shell:
    raise SystemExit('PlugDashboardCardShell destructuring anchor missing')
shell = shell.replace(old, new, 1)
old = """      <div\n        className=\"automation-card__plug-runtime\"\n        aria-label={t('hardware.shelly.statusMetricsLabel')}\n      >\n        <span>{formatMetric(telemetry.powerW, ' W', 1)}</span>\n        <span>{formatMetric(telemetry.voltageV, ' V', 0)}</span>\n        <span>{formatEnergy(telemetry.energyWh)}</span>\n        <span>{telemetry.localTime ?? '—'}</span>\n      </div>\n\n      <div\n        className=\"automation-relay-actions automation-card__relay-actions\"\n        role=\"group\"\n        aria-label={t('dashboard.output')}\n      >\n        <button\n          className=\"automation-relay-button\"\n          type=\"button\"\n          aria-pressed={relayState === true}\n          disabled={busy || relayControlsDisabled}\n          onClick={() => {\n            if (requestedRelayState !== true) onTurnRelayOn();\n          }}\n        >\n          ON\n        </button>\n        <button\n          className=\"automation-relay-button\"\n          type=\"button\"\n          aria-pressed={relayState === false}\n          disabled={busy || relayControlsDisabled}\n          onClick={() => {\n            if (requestedRelayState !== false) onTurnRelayOff();\n          }}\n        >\n          OFF\n        </button>\n      </div>\n"""
new = """      {showTelemetry && (\n        <div\n          className=\"automation-card__plug-runtime\"\n          aria-label={t('hardware.shelly.statusMetricsLabel')}\n        >\n          <span>{formatMetric(telemetry.powerW, ' W', 1)}</span>\n          <span>{formatMetric(telemetry.voltageV, ' V', 0)}</span>\n          <span>{formatEnergy(telemetry.energyWh)}</span>\n          <span>{telemetry.localTime ?? '—'}</span>\n        </div>\n      )}\n\n      {showRelayControls && (\n        <div\n          className=\"automation-relay-actions automation-card__relay-actions\"\n          role=\"group\"\n          aria-label={t('dashboard.output')}\n        >\n          <button\n            className=\"automation-relay-button\"\n            type=\"button\"\n            aria-pressed={relayState === true}\n            disabled={busy || relayControlsDisabled}\n            onClick={() => {\n              if (requestedRelayState !== true) onTurnRelayOn();\n            }}\n          >\n            ON\n          </button>\n          <button\n            className=\"automation-relay-button\"\n            type=\"button\"\n            aria-pressed={relayState === false}\n            disabled={busy || relayControlsDisabled}\n            onClick={() => {\n              if (requestedRelayState !== false) onTurnRelayOff();\n            }}\n          >\n            OFF\n          </button>\n        </div>\n      )}\n"""
if old not in shell:
    raise SystemExit('PlugDashboardCardShell body anchor missing')
shell = shell.replace(old, new, 1)
shell_path.write_text(shell)

time_card_path = root / 'apps/mobile/src/screens/TimeAutomationCard.tsx'
time_card_path.write_text("""import { useTranslation } from '../app/i18n.js';
import { PlugDashboardCardShell } from '../features/plugs/index.js';
import type { TimeInstalledAutomation } from '../flows/installations/model.js';
import { useTimeAutomationRuntime } from '../flows/time-automation/useTimeAutomationRuntime.js';

type TimeAutomationCardProps = {
  installation: TimeInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
};

const healthClass = (state: 'running' | 'paused' | 'attention' | 'offline' | 'loading') =>
  `automation-health automation-health--${
    state === 'running'
      ? 'ok'
      : state === 'paused'
        ? 'paused'
        : state === 'offline'
          ? 'offline'
          : state === 'loading'
            ? 'unknown'
            : 'attention'
  }`;

export const TimeAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: TimeAutomationCardProps) => {
  const { t } = useTranslation();
  const query = useTimeAutomationRuntime(installation);
  const state = query.isPending
    ? 'loading'
    : query.isError
      ? 'offline'
      : (query.data?.scheduleState ?? 'attention');
  const stateLabel =
    state === 'running'
      ? t('dashboard.health.ok')
      : state === 'paused'
        ? t('dashboard.health.paused')
        : state === 'offline'
          ? t('dashboard.health.offline')
          : state === 'loading'
            ? t('dashboard.health.loading')
            : t('dashboard.health.attention');

  const body = (
    <>
      <div className="automation-status-row">
        <span className={healthClass(state)}>{stateLabel}</span>
        <span className="automation-status-mode">{t('time.family')}</span>
      </div>

      <div className="automation-metrics" aria-label={t('time.scheduleSummary')}>
        <div>
          <span>{t('time.onTime')}</span>
          <strong>{installation.config.onTime}</strong>
        </div>
        <div>
          <span>{t('time.offTime')}</span>
          <strong>{installation.config.offTime}</strong>
        </div>
        <div>
          <span>{t('dashboard.output')}</span>
          <strong>{query.data ? (query.data.relayOn ? 'ON' : 'OFF') : '—'}</strong>
        </div>
      </div>

      <dl className="automation-summary">
        <div>
          <dt>{t('time.clock')}</dt>
          <dd>{query.data?.clock.localTime ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('time.owner')}</dt>
          <dd>{t('time.nativeSchedule')}</dd>
        </div>
      </dl>
    </>
  );

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={query.data?.relayOn}
      busy={query.isFetching}
      telemetry={{
        powerW: undefined,
        voltageV: undefined,
        energyWh: undefined,
        localTime: query.data?.clock.localTime
      }}
      body={body}
      className="automation-card automation-card--time"
      detailContext="Wi-Fi"
      openDetailsOnCardClick={false}
      showTelemetry={false}
      showRelayControls={false}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
      onTurnRelayOn={() => undefined}
      onTurnRelayOff={() => undefined}
    />
  );
};
""")

dashboard_path = root / 'apps/mobile/src/screens/AutomationDashboardScreen.tsx'
dashboard = dashboard_path.read_text()
old = """  installation.kind === 'time' ? (\n    <TimeAutomationCard installation={installation} onOpen={onOpen} />\n  ) : (\n"""
new = """  installation.kind === 'time' ? (\n    <TimeAutomationCard\n      installation={installation}\n      onOpen={onOpen}\n      onNameChange={(value) => onNameChange(installation, value)}\n    />\n  ) : (\n"""
if old not in dashboard:
    raise SystemExit('AutomationDashboardScreen Time card anchor missing')
dashboard_path.write_text(dashboard.replace(old, new, 1))

time_detail_path = root / 'apps/mobile/src/screens/TimeInstallationDetail.tsx'
time_detail_path.write_text("""import { FeedbackPanel, Modal, type ToastMessage, type ToastTone } from '@lcl/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from '../app/i18n.js';
import { AppToastViewport } from '../components/AppToastViewport.js';
import {
  deleteTimeAutomation,
  pauseTimeAutomation,
  resumeTimeAutomation,
  useInstalledAutomationStore,
  type TimeInstalledAutomation
} from '../features/automations/index.js';
import {
  PlugDeviceSettingsSurface,
  PlugDetailTop,
  PlugInfoPanel,
  usePlugInformationFlow,
  type PlugDetailTab
} from '../features/plugs/index.js';
import {
  timeAutomationRuntimeQueryKey,
  useTimeAutomationRuntime
} from '../flows/time-automation/useTimeAutomationRuntime.js';

const TIME_DETAIL_TABS = ['automation', 'device', 'info'] as const satisfies readonly PlugDetailTab[];

const healthClass = (state: 'running' | 'paused' | 'attention' | 'offline' | 'loading') =>
  `automation-health automation-health--${
    state === 'running'
      ? 'ok'
      : state === 'paused'
        ? 'paused'
        : state === 'offline'
          ? 'offline'
          : state === 'loading'
            ? 'unknown'
            : 'attention'
  }`;

type TimeInstallationDetailProps = {
  installation: TimeInstalledAutomation;
  onBack(): void;
  onEdit?: () => void;
};

export const TimeInstallationDetail = ({
  installation,
  onBack,
  onEdit
}: TimeInstallationDetailProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PlugDetailTab>('automation');
  const runtimeQuery = useTimeAutomationRuntime(installation);
  const informationQuery = usePlugInformationFlow(installation.shelly, {
    enabled: activeTab === 'info'
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

  const pauseMutation = useMutation({
    mutationFn: () => pauseTimeAutomation(installation),
    onSuccess: async (runtime) => {
      queryClient.setQueryData(timeAutomationRuntimeQueryKey(installation), runtime);
      pushToast('ok', t('time.detail.pauseSuccess'));
    },
    onError: () => pushToast('warning', t('time.detail.actionFailed'))
  });

  const resumeMutation = useMutation({
    mutationFn: () => resumeTimeAutomation(installation),
    onSuccess: async (runtime) => {
      queryClient.setQueryData(timeAutomationRuntimeQueryKey(installation), runtime);
      pushToast('ok', t('time.detail.resumeSuccess'));
    },
    onError: () => pushToast('warning', t('time.detail.actionFailed'))
  });

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
  const stateLabel =
    runtimeState === 'running'
      ? t('dashboard.health.ok')
      : runtimeState === 'paused'
        ? t('dashboard.health.paused')
        : runtimeState === 'offline'
          ? t('dashboard.health.offline')
          : runtimeState === 'loading'
            ? t('dashboard.health.loading')
            : t('dashboard.health.attention');
  const actionBusy = pauseMutation.isPending || resumeMutation.isPending;

  return (
    <main className="demo-shell installation-detail-shell">
      <PlugDetailTop
        tabs={[activeTab, setActiveTab]}
        availableTabs={TIME_DETAIL_TABS}
      />

      <section className="plug-detail-surface" aria-label={t('detail.currentState')}>
        {activeTab === 'automation' && (
          <>
            <article className="automation-card installation-detail-live">
              <div className="installation-section-heading">
                <div>
                  <div className="automation-status-row">
                    <span className={healthClass(runtimeState)}>{stateLabel}</span>
                    <span className="automation-status-mode">{t('time.family')}</span>
                  </div>
                  <h2>{t('time.scheduleSummary')}</h2>
                </div>
              </div>

              <div className="automation-metrics" aria-label={t('time.scheduleSummary')}>
                <div>
                  <span>{t('time.onTime')}</span>
                  <strong>{installation.config.onTime}</strong>
                </div>
                <div>
                  <span>{t('time.offTime')}</span>
                  <strong>{installation.config.offTime}</strong>
                </div>
                <div>
                  <span>{t('dashboard.output')}</span>
                  <strong>
                    {runtimeQuery.data ? (runtimeQuery.data.relayOn ? 'ON' : 'OFF') : '—'}
                  </strong>
                </div>
              </div>

              <dl className="automation-summary installation-detail-summary">
                <div>
                  <dt>{t('time.clock')}</dt>
                  <dd>{runtimeQuery.data?.clock.localTime ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('time.owner')}</dt>
                  <dd>{t('time.nativeSchedule')}</dd>
                </div>
              </dl>

              <div className="installation-detail-actions">
                {runtimeState === 'paused' ? (
                  <button
                    className="primary-action"
                    type="button"
                    disabled={actionBusy}
                    onClick={() => resumeMutation.mutate()}
                  >
                    {actionBusy ? t('detail.changingState') : t('detail.resume')}
                  </button>
                ) : (
                  <button
                    className="secondary-action"
                    type="button"
                    disabled={actionBusy || runtimeState !== 'running'}
                    onClick={() => pauseMutation.mutate()}
                  >
                    {actionBusy ? t('detail.changingState') : t('detail.pause')}
                  </button>
                )}
              </div>
            </article>

            <article className="automation-card installation-detail-config">
              <div className="installation-section-heading">
                <h2>{t('time.detail.editTitle')}</h2>
              </div>
              <div className="installation-detail-actions">
                {onEdit && (
                  <button className="primary-action" type="button" onClick={onEdit}>
                    {t('detail.edit')}
                  </button>
                )}
                <button
                  className="secondary-action secondary-action--danger"
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('time.detail.delete')}
                </button>
              </div>

              {runtimeState === 'attention' && (
                <p className="installation-detail-note">{t('time.detail.needsAttention')}</p>
              )}
            </article>
          </>
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
          if (!deleteMutation.isPending) {
            setDeleteOpen(false);
          }
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
""")

ux_path = root / 'scripts/quality/ux-gate.mjs'
ux = ux_path.read_text()
old = """    [\n      'apps/mobile/src/screens/TimeInstallationDetail.tsx',\n      'installation-detail-header app-page-header'\n    ]\n"""
if old not in ux:
    raise SystemExit('ux-gate Time page header contract anchor missing')
ux_path.write_text(ux.replace(old, '', 1))

test_path = root / 'apps/mobile/src/__tests__/automation-dashboard.test.tsx'
test_source = test_path.read_text()
old = "fireEvent.click(screen.getByRole('button', { name: 'Szczegóły' }));"
new = "fireEvent.click(screen.getByRole('button', { name: 'Szczegóły: Lampa · Wi-Fi' }));"
if old not in test_source:
    raise SystemExit('automation-dashboard Time details button anchor missing')
test_path.write_text(test_source.replace(old, new, 1))

e2e_path = root / 'apps/mobile/e2e/responsive.spec.ts'
e2e = e2e_path.read_text()
old = """const expectTimeDetailHierarchy = async (page: Page) => {\n  const [gridBox, liveBox, refreshBox] = await Promise.all([\n    requiredBox(page.locator('.installation-detail-grid')),\n    requiredBox(page.locator('.installation-detail-live')),\n    requiredBox(\n      page.locator('.installation-detail-header').getByRole('button', { name: 'Odśwież' })\n    )\n  ]);\n\n  expect(Math.abs(liveBox.x - gridBox.x)).toBeLessThanOrEqual(2);\n  expect(Math.abs(liveBox.width - gridBox.width)).toBeLessThanOrEqual(2);\n  expect(refreshBox.width).toBeLessThanOrEqual(48);\n  await expect(page.getByRole('button', { name: /Wróć do automatyki/ })).toHaveCount(0);\n};\n"""
new = """const expectTimeDetailHierarchy = async (page: Page) => {\n  const [tabsBox, surfaceBox, liveBox] = await Promise.all([\n    requiredBox(page.locator('.plug-detail-tabs')),\n    requiredBox(page.locator('.plug-detail-surface')),\n    requiredBox(page.locator('.installation-detail-live'))\n  ]);\n\n  expect(Math.abs(tabsBox.x - surfaceBox.x)).toBeLessThanOrEqual(2);\n  expect(Math.abs(tabsBox.width - surfaceBox.width)).toBeLessThanOrEqual(2);\n  expect(liveBox.x).toBeGreaterThanOrEqual(surfaceBox.x - 1);\n  expect(liveBox.x + liveBox.width).toBeLessThanOrEqual(\n    surfaceBox.x + surfaceBox.width + 1\n  );\n  await expect(page.locator('.installation-detail-header')).toHaveCount(0);\n  await expect(page.locator('.app-page-back-row')).toHaveCount(0);\n};\n"""
if old not in e2e:
    raise SystemExit('responsive Time hierarchy helper anchor missing')
e2e = e2e.replace(old, new, 1)
e2e = e2e.replace(
    "await timeCard.getByRole('button', { name: 'Szczegóły' }).click();",
    "await timeCard.getByRole('button', { name: 'Szczegóły: Shelly Plug S Gen3 · Wi-Fi' }).click();"
)
e2e = e2e.replace(
    "    await expect(page.getByRole('heading', { name: 'Shelly Plug S Gen3' })).toBeVisible();\n    await expect(page.getByRole('heading', { name: 'Harmonogram' })).toBeVisible();",
    "    await expect(page.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();\n    await expect(page.getByRole('heading', { name: 'Shelly Plug S Gen3' })).toHaveCount(0);\n    await expect(page.getByRole('heading', { name: 'Harmonogram' })).toBeVisible();",
    1
)
e2e_path.write_text(e2e)
