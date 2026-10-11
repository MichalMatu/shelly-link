from pathlib import Path

p = Path('apps/mobile/src/features/automations/data/timeAutomationRuntimeState.ts')
s = p.read_text()
s = s.replace(
"""export type TimeAutomationRuntimeSnapshot = {\n  relayOn: boolean;\n  clock: ShellyStatus['clock'];\n""",
"""export type TimeAutomationRuntimeSnapshot = {\n  relayOn: boolean;\n  telemetry: ShellyStatus['telemetry'];\n  clock: ShellyStatus['clock'];\n""",
1)
s = s.replace(
"""  return {\n    relayOn: status.relayOn,\n    clock: status.clock,\n""",
"""  return {\n    relayOn: status.relayOn,\n    telemetry: status.telemetry,\n    clock: status.clock,\n""",
1)
p.write_text(s)

p = Path('apps/mobile/src/flows/time-automation/useTimeAutomationRuntime.ts')
s = p.read_text()
anchor = "import { readTimeAutomationRuntime } from '../../features/automations/index.js';\n\n"
assert anchor in s
s = s.replace(anchor, anchor + "export const TIME_AUTOMATION_RUNTIME_REFRESH_MS = 5_000;\n\n", 1)
s = s.replace("    refetchInterval: 30_000,\n", "    refetchInterval: TIME_AUTOMATION_RUNTIME_REFRESH_MS,\n    refetchIntervalInBackground: false,\n", 1)
p.write_text(s)

p = Path('apps/mobile/src/features/plugs/components/PlugDashboardCardShell.tsx')
s = p.read_text()
s = s.replace(
"""  relayControlsDisabled?: boolean;\n  onNameChange(value: string): void;\n  onOpenDetails(): void;\n  onTurnRelayOn(): void;\n  onTurnRelayOff(): void;\n};\n""",
"""  relayControlsDisabled?: boolean;\n  showRelayControls?: boolean;\n  onNameChange(value: string): void;\n  onOpenDetails(): void;\n  onTurnRelayOn?: () => void;\n  onTurnRelayOff?: () => void;\n};\n""",
1)
s = s.replace(
"""  relayActionState,\n  relayControlsDisabled = false,\n  onNameChange,\n""",
"""  relayActionState,\n  relayControlsDisabled = false,\n  showRelayControls = true,\n  onNameChange,\n""",
1)
old = """      <div\n        className=\"automation-relay-actions automation-card__relay-actions\"\n        role=\"group\"\n        aria-label={t('dashboard.output')}\n      >\n        <button\n          className=\"automation-relay-button\"\n          type=\"button\"\n          aria-pressed={relayState === true}\n          disabled={busy || relayControlsDisabled}\n          onClick={() => {\n            if (requestedRelayState !== true) onTurnRelayOn();\n          }}\n        >\n          ON\n        </button>\n        <button\n          className=\"automation-relay-button\"\n          type=\"button\"\n          aria-pressed={relayState === false}\n          disabled={busy || relayControlsDisabled}\n          onClick={() => {\n            if (requestedRelayState !== false) onTurnRelayOff();\n          }}\n        >\n          OFF\n        </button>\n      </div>\n"""
new = """      {showRelayControls && (\n        <div\n          className=\"automation-relay-actions automation-card__relay-actions\"\n          role=\"group\"\n          aria-label={t('dashboard.output')}\n        >\n          <button\n            className=\"automation-relay-button\"\n            type=\"button\"\n            aria-pressed={relayState === true}\n            disabled={busy || relayControlsDisabled || !onTurnRelayOn}\n            onClick={() => {\n              if (requestedRelayState !== true) onTurnRelayOn?.();\n            }}\n          >\n            ON\n          </button>\n          <button\n            className=\"automation-relay-button\"\n            type=\"button\"\n            aria-pressed={relayState === false}\n            disabled={busy || relayControlsDisabled || !onTurnRelayOff}\n            onClick={() => {\n              if (requestedRelayState !== false) onTurnRelayOff?.();\n            }}\n          >\n            OFF\n          </button>\n        </div>\n      )}\n"""
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path('apps/mobile/src/screens/TimeAutomationCard.tsx')
p.write_text("""import type { TimeInstalledAutomation } from '../flows/installations/model.js';
import { useTimeAutomationRuntime } from '../flows/time-automation/useTimeAutomationRuntime.js';
import { useTranslation } from '../app/i18n.js';
import { PlugDashboardCardShell } from '../features/plugs/index.js';

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

      <div className="automation-card__secondary-metrics">
        <div>
          <span>{t('time.scheduleSummary')}</span>
          <strong>{stateLabel}</strong>
        </div>
      </div>
    </div>
  );

  return (
    <PlugDashboardCardShell
      name={installation.shelly.name}
      relayState={query.data?.relayOn}
      busy={query.isFetching}
      telemetry={{
        powerW: query.data?.telemetry.powerW,
        voltageV: query.data?.telemetry.voltageV,
        energyWh: query.data?.telemetry.energyWh,
        localTime: query.data?.clock.localTime
      }}
      body={body}
      className="automation-card automation-card--time"
      detailContext="Wi-Fi"
      openDetailsOnCardClick={false}
      showRelayControls={false}
      onNameChange={onNameChange}
      onOpenDetails={() => onOpen(installation.id)}
    />
  );
};
""")

p = Path('apps/mobile/src/screens/AutomationDashboardScreen.tsx')
s = p.read_text()
old = """  installation.kind === 'time' ? (\n    <TimeAutomationCard installation={installation} onOpen={onOpen} />\n  ) : (\n"""
new = """  installation.kind === 'time' ? (\n    <TimeAutomationCard\n      installation={installation}\n      onOpen={onOpen}\n      onNameChange={(value) => onNameChange(installation, value)}\n    />\n  ) : (\n"""
assert old in s
p.write_text(s.replace(old, new, 1))

p = Path('apps/mobile/src/__tests__/automation-dashboard.test.tsx')
s = p.read_text()
s = s.replace(
    "fireEvent.click(screen.getByRole('button', { name: 'Szczegóły' }));",
    "fireEvent.click(screen.getByRole('button', { name: 'Szczegóły: Lampa · Wi-Fi' }));",
    1,
)
s = s.replace("    expect(screen.getByText('Natywny Shelly Schedule')).toBeVisible();\n", "", 1)
p.write_text(s)
