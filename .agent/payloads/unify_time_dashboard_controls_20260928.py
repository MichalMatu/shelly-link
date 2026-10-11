from pathlib import Path

root = Path('.')

def read(path):
    return (root / path).read_text()

def write(path, text):
    p = root / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

def replace_once(path, old, new):
    text = read(path)
    if old not in text:
        raise SystemExit(f'missing replacement in {path}: {old[:120]!r}')
    if text.count(old) != 1:
        raise SystemExit(f'non-unique replacement in {path}: {text.count(old)}')
    write(path, text.replace(old, new, 1))

write('apps/mobile/src/features/plugs/components/PlugAutomationModeControl.tsx', '''import { useTranslation } from '../../../app/i18n.js';

export type PlugAutomationModeControlProps = {
  autoActive: boolean;
  manualActive: boolean;
  disabled: boolean;
  onAuto(): void;
  onManual(): void;
};

export const PlugAutomationModeControl = ({
  autoActive,
  manualActive,
  disabled,
  onAuto,
  onManual
}: PlugAutomationModeControlProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="automation-control-group automation-card__mode-control"
      role="group"
      aria-label={t('detail.automation')}
    >
      <button
        className="automation-control-button"
        type="button"
        aria-pressed={autoActive}
        disabled={disabled}
        onClick={onAuto}
      >
        AUTO
      </button>
      <button
        className="automation-control-button"
        type="button"
        aria-pressed={manualActive}
        disabled={disabled}
        onClick={onManual}
      >
        MANUAL
      </button>
    </div>
  );
};
''')

# Public Plug feature surface: add exactly one reusable presentation export.
replace_once(
    'apps/mobile/src/features/plugs/index.ts',
    "export { PlugDeviceSettingsSurface } from './components/PlugDeviceSettingsSurface.js';\n",
    "export { PlugDeviceSettingsSurface } from './components/PlugDeviceSettingsSurface.js';\nexport { PlugAutomationModeControl } from './components/PlugAutomationModeControl.js';\n"
)

# Climate switches to the shared component without changing rendered markup/classes.
replace_once(
    'apps/mobile/src/screens/AutomationDashboardScreen.tsx',
    "  PlugAddSpeedDial,\n  PlugDashboardCardShell,\n",
    "  PlugAddSpeedDial,\n  PlugAutomationModeControl,\n  PlugDashboardCardShell,\n"
)
old_mode = '''      <div
        className="automation-control-group automation-card__mode-control"
        role="group"
        aria-label={t('detail.automation')}
      >
        <button
          className="automation-control-button"
          type="button"
          aria-pressed={automationRunning}
          disabled={action.isPending || !runtimeControllable}
          onClick={() => {
            if (controlStatus?.automationMode !== 'auto') action.mutate('auto');
          }}
        >
          AUTO
        </button>
        <button
          className="automation-control-button"
          type="button"
          aria-pressed={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onClick={() => {
            if (!manualControl) action.mutate('manual');
          }}
        >
          MANUAL
        </button>
      </div>
'''
new_mode = '''      <PlugAutomationModeControl
        autoActive={automationRunning}
        manualActive={manualControl}
        disabled={action.isPending || !runtimeControllable}
        onAuto={() => {
          if (controlStatus?.automationMode !== 'auto') action.mutate('auto');
        }}
        onManual={() => {
          if (!manualControl) action.mutate('manual');
        }}
      />
'''
replace_once('apps/mobile/src/screens/AutomationDashboardScreen.tsx', old_mode, new_mode)

# Time runtime snapshot now carries the same already-fetched Plug telemetry.
replace_once(
    'apps/mobile/src/features/automations/data/timeAutomationRuntimeState.ts',
    "export type TimeAutomationRuntimeSnapshot = {\n  relayOn: boolean;\n  clock: ShellyStatus['clock'];\n",
    "export type TimeAutomationRuntimeSnapshot = {\n  relayOn: boolean;\n  telemetry: ShellyStatus['telemetry'];\n  clock: ShellyStatus['clock'];\n"
)
replace_once(
    'apps/mobile/src/features/automations/data/timeAutomationRuntimeState.ts',
    "  return {\n    relayOn: status.relayOn,\n    clock: status.clock,\n",
    "  return {\n    relayOn: status.relayOn,\n    telemetry: status.telemetry,\n    clock: status.clock,\n"
)

# Manual relay control belongs to Time automation runtime and is guarded by paused schedules.
replace_once(
    'apps/mobile/src/features/automations/data/timeAutomationRuntime.ts',
    "  | 'resume-unconfirmed'\n  | 'update-unconfirmed'\n",
    "  | 'resume-unconfirmed'\n  | 'manual-relay-requires-paused'\n  | 'update-unconfirmed'\n"
)
marker = '''export const resumeTimeAutomation = async (
  installation: OwnedTimeAutomationRuntimeInstallation,
  clients = createTimeAutomationClients(installation.shelly.baseUrl)
): Promise<TimeAutomationRuntimeSnapshot> => {
  await requireStoredTimeAutomationDeviceIdentity(installation, clients);
  const status = await setRelayStateAndConfirm(
    clients,
    installation.config.relayId,
    false
  );
  const localTime = requireSyncedClock(status);
  await updatePairEnabled(installation, clients, true);
  const expectedOn = expectedRelayOnForClockTime(installation.config, localTime);
  await setRelayStateAndConfirm(clients, installation.config.relayId, expectedOn);
  const runtime = await readTimeAutomationRuntime(installation, clients);
  if (runtime.scheduleState !== 'running') {
    throw runtimeError(
      'resume-unconfirmed',
      'Shelly did not confirm a running time automation.'
    );
  }
  return runtime;
};
'''
addition = marker + '''
export const setTimeAutomationManualRelay = async (
  installation: OwnedTimeAutomationRuntimeInstallation,
  on: boolean,
  clients = createTimeAutomationClients(installation.shelly.baseUrl)
): Promise<TimeAutomationRuntimeSnapshot> => {
  await requireStoredTimeAutomationDeviceIdentity(installation, clients);
  const before = await readTimeAutomationRuntime(installation, clients);
  if (before.scheduleState !== 'paused') {
    throw runtimeError(
      'manual-relay-requires-paused',
      'Manual relay control requires a paused time automation.'
    );
  }
  await setRelayStateAndConfirm(clients, installation.config.relayId, on);
  return readTimeAutomationRuntime(installation, clients);
};
'''
replace_once('apps/mobile/src/features/automations/data/timeAutomationRuntime.ts', marker, addition)

replace_once(
    'apps/mobile/src/features/automations/index.ts',
    "  pauseTimeAutomation,\n  resumeTimeAutomation,\n",
    "  pauseTimeAutomation,\n  resumeTimeAutomation,\n  setTimeAutomationManualRelay,\n"
)

# One mutation hook owns Time AUTO/MANUAL/ON/OFF orchestration and query synchronization.
write('apps/mobile/src/flows/time-automation/useTimeAutomationRuntime.ts', '''import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pauseTimeAutomation,
  readTimeAutomationRuntime,
  resumeTimeAutomation,
  setTimeAutomationManualRelay
} from '../../features/automations/index.js';
import type { TimeInstalledAutomation } from '../installations/model.js';

export const timeAutomationRuntimeQueryKey = (installation: TimeInstalledAutomation) =>
  [
    'time-automation-runtime',
    installation.id,
    installation.shelly.baseUrl,
    installation.schedule.onJobId,
    installation.schedule.offJobId,
    installation.config.onTime,
    installation.config.offTime,
    installation.updatedAtMs
  ] as const;

export const useTimeAutomationRuntime = (
  installation: TimeInstalledAutomation,
  options: { enabled?: boolean } = {}
) =>
  useQuery({
    queryKey: timeAutomationRuntimeQueryKey(installation),
    queryFn: () => readTimeAutomationRuntime(installation),
    enabled: options.enabled ?? true,
    retry: false,
    refetchInterval: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

export type TimeAutomationAction = 'auto' | 'manual' | 'on' | 'off';

export const useTimeAutomationActions = (installation: TimeInstalledAutomation) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (action: TimeAutomationAction) => {
      switch (action) {
        case 'auto':
          return resumeTimeAutomation(installation);
        case 'manual':
          return pauseTimeAutomation(installation);
        case 'on':
          return setTimeAutomationManualRelay(installation, true);
        case 'off':
          return setTimeAutomationManualRelay(installation, false);
      }
    },
    onSuccess: (runtime) => {
      queryClient.setQueryData(timeAutomationRuntimeQueryKey(installation), runtime);
    }
  });
};
''')

# Replace old Time-only card composition with the Climate card pattern.
write('apps/mobile/src/screens/TimeAutomationCard.tsx', '''import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from '../app/i18n.js';
import {
  PlugAutomationModeControl,
  PlugDashboardCardShell
} from '../features/plugs/index.js';
import type { TimeInstalledAutomation } from '../flows/installations/model.js';
import {
  useTimeAutomationActions,
  useTimeAutomationRuntime
} from '../flows/time-automation/useTimeAutomationRuntime.js';

type TimeAutomationCardProps = {
  installation: TimeInstalledAutomation;
  onOpen(installationId: string): void;
  onNameChange(value: string): void;
};

export const TimeAutomationCard = ({
  installation,
  onOpen,
  onNameChange
}: TimeAutomationCardProps) => {
  const { t } = useTranslation();
  const query = useTimeAutomationRuntime(installation);
  const action = useTimeAutomationActions(installation);
  const runtimeState = query.isPending
    ? 'loading'
    : query.isError
      ? 'offline'
      : (query.data?.scheduleState ?? 'attention');
  const automationRunning = runtimeState === 'running';
  const manualControl = runtimeState === 'paused';
  const runtimeControllable = automationRunning || manualControl;

  const body = (
    <div className="automation-card__main" aria-label={t('time.scheduleSummary')}>
      <div className="automation-card__primary-metric">
        <strong aria-label={`${t('time.onTime')}: ${installation.config.onTime}`}>
          {installation.config.onTime}
        </strong>
        <small>
          <span>{t('time.onTime')}</span>
        </small>
      </div>

      <div className="automation-card__secondary-metrics">
        <div>
          <span>{t('time.offTime')}</span>
          <strong>{installation.config.offTime}</strong>
        </div>
        <div>
          <span>{t('dashboard.output')}</span>
          <strong>{query.data ? (query.data.relayOn ? 'ON' : 'OFF') : '—'}</strong>
        </div>
      </div>

      <PlugAutomationModeControl
        autoActive={automationRunning}
        manualActive={manualControl}
        disabled={action.isPending || !runtimeControllable}
        onAuto={() => {
          if (!automationRunning) action.mutate('auto');
        }}
        onManual={() => {
          if (!manualControl) action.mutate('manual');
        }}
      />
    </div>
  );

  const warningLabel =
    runtimeState === 'offline'
      ? t('dashboard.health.offline')
      : runtimeState === 'attention'
        ? t('dashboard.health.attention')
        : null;
  const footer =
    warningLabel || action.isError ? (
      <footer className="automation-card__footer">
        {warningLabel && (
          <div
            className={`automation-card__status automation-card__status--${
              runtimeState === 'offline' ? 'offline' : 'attention'
            }`}
            role="status"
          >
            <IconAlertTriangle aria-hidden="true" />
            <span>{warningLabel}</span>
          </div>
        )}
        {action.isError && (
          <span className="automation-control-error" role="alert">
            {t('detail.actionFailed')}
          </span>
        )}
      </footer>
    ) : undefined;

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={query.data?.relayOn}
      busy={action.isPending}
      telemetry={{
        powerW: query.data?.telemetry.powerW,
        voltageV: query.data?.telemetry.voltageV,
        energyWh: query.data?.telemetry.energyWh,
        localTime: query.data?.clock.localTime
      }}
      body={body}
      className="automation-card automation-card--time"
      detailContext="Wi-Fi"
      footer={footer}
      openDetailsOnCardClick={false}
      relayControlsDisabled={!manualControl}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
      onTurnRelayOn={() => action.mutate('on')}
      onTurnRelayOff={() => action.mutate('off')}
    />
  );
};
''')

# Runtime tests cover the new manual-control invariant and telemetry.
replace_once(
    'apps/mobile/src/features/automations/data/timeAutomationRuntime.test.ts',
    "  pauseTimeAutomation,\n  resumeTimeAutomation,\n  updateDailyTimeAutomation\n",
    "  pauseTimeAutomation,\n  resumeTimeAutomation,\n  setTimeAutomationManualRelay,\n  updateDailyTimeAutomation\n"
)
replace_once(
    'apps/mobile/src/features/automations/data/timeAutomationRuntime.test.ts',
    "      () => resumeTimeAutomation(installation, fake.bundle()),\n      () =>\n",
    "      () => resumeTimeAutomation(installation, fake.bundle()),\n      () => setTimeAutomationManualRelay(installation, true, fake.bundle()),\n      () =>\n"
)
insert_after = '''  it('pauses, resumes and restores the correct live relay state', async () => {
    const fake = new FakeTimeAutomationClients();
    const ids = await installDailyTimeAutomation({
      clients: fake.bundle(),
      config: { relayId: 0, onTime: '08:00', offTime: '20:00' }
    });
    const installation = installationFor(fake, ids.onJobId, ids.offJobId);

    const paused = await pauseTimeAutomation(installation, fake.bundle());
    expect(paused.scheduleState).toBe('paused');
    expect(fake.relayOn).toBe(false);
    expect(fake.jobs.every((job) => !job.enable)).toBe(true);

    const resumed = await resumeTimeAutomation(installation, fake.bundle());
    expect(resumed.scheduleState).toBe('running');
    expect(fake.relayOn).toBe(true);
    expect(fake.jobs.every((job) => job.enable)).toBe(true);
  });
'''
manual_test = insert_after + '''
  it('allows explicit relay control only while the Time automation is in MANUAL', async () => {
    const fake = new FakeTimeAutomationClients();
    const ids = await installDailyTimeAutomation({
      clients: fake.bundle(),
      config: { relayId: 0, onTime: '08:00', offTime: '20:00' }
    });
    const installation = installationFor(fake, ids.onJobId, ids.offJobId);

    await expect(
      setTimeAutomationManualRelay(installation, false, fake.bundle())
    ).rejects.toMatchObject({ code: 'manual-relay-requires-paused' });

    await pauseTimeAutomation(installation, fake.bundle());
    const onRuntime = await setTimeAutomationManualRelay(installation, true, fake.bundle());
    expect(onRuntime.scheduleState).toBe('paused');
    expect(onRuntime.relayOn).toBe(true);
    expect(fake.jobs.every((job) => !job.enable)).toBe(true);

    const offRuntime = await setTimeAutomationManualRelay(
      installation,
      false,
      fake.bundle()
    );
    expect(offRuntime.scheduleState).toBe('paused');
    expect(offRuntime.relayOn).toBe(false);
  });
'''
replace_once('apps/mobile/src/features/automations/data/timeAutomationRuntime.test.ts', insert_after, manual_test)

# Unit fixture exposes the telemetry that the Time card must now render.
replace_once(
    'apps/mobile/src/__tests__/automation-dashboard.test.tsx',
    "        'switch:0': { id: 0, output: true },\n",
    "        'switch:0': {\n          id: 0,\n          output: true,\n          apower: 42.3,\n          voltage: 230.1,\n          current: 0.2,\n          aenergy: { total: 1234 }\n        },\n"
)
old_time_expect = '''    expect(await screen.findByText('Harmonogram dzienny')).toBeVisible();
    expect(screen.getByText('Lampa')).toBeVisible();
    expect(screen.getByText('08:00')).toBeVisible();
    expect(screen.getByText('20:00')).toBeVisible();
    expect(screen.getByText('Natywny Shelly Schedule')).toBeVisible();
    expect(await screen.findByText('Działa')).toBeVisible();
    expect(screen.getByText('ON')).toBeVisible();
    const timeCard = screen.getByText('Lampa').closest('article') as HTMLElement;
    const timeLeadingIcon = timeCard.querySelector('.automation-card__leading-icon');
    expect(timeLeadingIcon?.querySelector('.tabler-icon-plug')).not.toBeNull();
    expect(timeLeadingIcon).toHaveClass('automation-card__leading-icon--active');
    rerenderKind('time');
    expect(screen.getByRole('main', { name: 'Termometry' })).toBeVisible();
    rerenderKind('climate');
    expect(screen.getByText('Harmonogram dzienny')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Szczegóły: Lampa · Wi-Fi' }));
'''
new_time_expect = '''    const timeCard = (await screen.findByText('Lampa')).closest('article') as HTMLElement;
    expect(within(timeCard).getByText('08:00')).toBeVisible();
    expect(within(timeCard).getByText('20:00')).toBeVisible();
    expect(within(timeCard).queryByText('Harmonogram dzienny')).toBeNull();
    expect(within(timeCard).queryByText('Działa')).toBeNull();
    expect(within(timeCard).queryByText('Natywny Shelly Schedule')).toBeNull();
    expect(within(timeCard).getByText('42.3 W')).toBeVisible();
    expect(within(timeCard).getByText('230 V')).toBeVisible();
    expect(within(timeCard).getByText('1.23 kWh')).toBeVisible();
    expect(within(timeCard).getByText('12:00')).toBeVisible();
    expect(within(timeCard).getByRole('button', { name: 'AUTO' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(within(timeCard).getByRole('button', { name: 'MANUAL' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(within(timeCard).getByRole('button', { name: 'ON' })).toBeDisabled();
    expect(within(timeCard).getByRole('button', { name: 'OFF' })).toBeDisabled();
    const timeLeadingIcon = timeCard.querySelector('.automation-card__leading-icon');
    expect(timeLeadingIcon?.querySelector('.tabler-icon-plug')).not.toBeNull();
    expect(timeLeadingIcon).toHaveClass('automation-card__leading-icon--active');
    rerenderKind('time');
    expect(screen.getByRole('main', { name: 'Termometry' })).toBeVisible();
    rerenderKind('climate');
    expect(screen.queryByText('Harmonogram dzienny')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Szczegóły: Lampa · Wi-Fi' }));
'''
replace_once('apps/mobile/src/__tests__/automation-dashboard.test.tsx', old_time_expect, new_time_expect)

# E2E: default Time dashboard is visually captured in AUTO, then real MANUAL/ON/OFF/AUTO is exercised.
old_e2e = '''    await page.getByRole('button', { name: 'Zapisz harmonogram w Shelly' }).click();
    await expect(page.getByRole('main', { name: 'Gniazdka' })).toBeVisible();
    await expect(page.getByText('Harmonogram dzienny')).toBeVisible();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '10-time-dashboard');
    }
    await expect(page.getByText('08:00')).toBeVisible();
    await expect(page.getByText('20:00')).toBeVisible();
    await expect(page.getByText('Działa')).toBeVisible();
    expect(rpcState.createCount).toBe(2);

    const timeCard = page
      .getByRole('heading', { name: 'Shelly Plug S Gen3' })
      .locator('xpath=ancestor::article[1]');
    await timeCard
'''
new_e2e = '''    await page.getByRole('button', { name: 'Zapisz harmonogram w Shelly' }).click();
    await expect(page.getByRole('main', { name: 'Gniazdka' })).toBeVisible();
    const timeCard = page
      .getByRole('heading', { name: 'Shelly Plug S Gen3' })
      .locator('xpath=ancestor::article[1]');
    await expect(timeCard.getByText('08:00')).toBeVisible();
    await expect(timeCard.getByText('20:00')).toBeVisible();
    await expect(timeCard.getByText('Harmonogram dzienny')).toHaveCount(0);
    await expect(timeCard.getByText('Działa')).toHaveCount(0);
    await expect(timeCard.getByText('42.3 W')).toBeVisible();
    await expect(timeCard.getByText('230 V')).toBeVisible();
    await expect(timeCard.getByText('1.25 kWh')).toBeVisible();
    const auto = timeCard.getByRole('button', { name: 'AUTO', exact: true });
    const manual = timeCard.getByRole('button', { name: 'MANUAL', exact: true });
    const on = timeCard.getByRole('button', { name: 'ON', exact: true });
    const off = timeCard.getByRole('button', { name: 'OFF', exact: true });
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
    await expect(manual).toHaveAttribute('aria-pressed', 'false');
    await expect(on).toBeDisabled();
    await expect(off).toBeDisabled();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '10-time-dashboard');
      await manual.click();
      await expect(manual).toHaveAttribute('aria-pressed', 'true');
      await expect(off).toHaveAttribute('aria-pressed', 'true');
      await expect(on).toBeEnabled();
      await on.click();
      await expect(on).toHaveAttribute('aria-pressed', 'true');
      await off.click();
      await expect(off).toHaveAttribute('aria-pressed', 'true');
      await auto.click();
      await expect(auto).toHaveAttribute('aria-pressed', 'true');
    }
    expect(rpcState.createCount).toBe(2);

    await timeCard
'''
replace_once('apps/mobile/e2e/responsive.spec.ts', old_e2e, new_e2e)

print('Time dashboard unification patch applied')
