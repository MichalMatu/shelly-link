from pathlib import Path

shell_path = Path('apps/mobile/src/features/plugs/components/PlugDashboardCardShell.tsx')
shell_path.write_text("""import { IconDotsVertical, IconPlug } from '@tabler/icons-react';
import type { Key, ReactNode } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { EditablePlugName } from '../../../components/EditablePlugName.js';

export type PlugDashboardTelemetry = {
  powerW: number | null | undefined;
  voltageV: number | null | undefined;
  energyWh: number | null | undefined;
  localTime: string | null | undefined;
};

export type PlugDashboardAutomationAction = {
  disabled: boolean;
  onClick?: () => void;
};

export type PlugDashboardCardShellProps = {
  name: string;
  relayState: boolean | undefined;
  busy: boolean;
  telemetry: PlugDashboardTelemetry;
  automationAction?: PlugDashboardAutomationAction;
  body?: ReactNode;
  className?: string;
  detailContext?: string;
  footer?: ReactNode;
  leadingIconFresh?: boolean;
  leadingIconKey?: Key;
  openDetailsOnCardClick?: boolean;
  relayActionState?: boolean | undefined;
  relayControlsDisabled?: boolean;
  onNameChange(value: string): void;
  onOpenDetails(): void;
  onTurnRelayOn(): void;
  onTurnRelayOff(): void;
};

const formatMetric = (
  value: number | null | undefined,
  suffix: string,
  fractionDigits: number
): string =>
  value == null || !Number.isFinite(value)
    ? '—'
    : `${value.toFixed(fractionDigits)}${suffix}`;

const formatEnergy = (value: number | null | undefined): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return value >= 1000 ? `${(value / 1000).toFixed(2)} kWh` : `${value.toFixed(0)} Wh`;
};

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element &&
  target.closest('button, a, input, textarea, select, [contenteditable="true"]') !== null;

export const PlugDashboardCardShell = ({
  name,
  relayState,
  busy,
  telemetry,
  automationAction,
  body,
  className = 'automation-card plug-card plug-card--unconfigured',
  detailContext,
  footer,
  leadingIconFresh = false,
  leadingIconKey,
  openDetailsOnCardClick = true,
  relayActionState,
  relayControlsDisabled = false,
  onNameChange,
  onOpenDetails,
  onTurnRelayOn,
  onTurnRelayOff
}: PlugDashboardCardShellProps) => {
  const { t } = useTranslation();
  const detailLabel = `${t('dashboard.openSystem')}: ${name}${
    detailContext ? ` · ${detailContext}` : ''
  }`;
  const requestedRelayState = relayActionState ?? relayState;

  return (
    <article
      className={className}
      aria-busy={busy}
      {...(openDetailsOnCardClick
        ? {
            onClick: (event: React.MouseEvent<HTMLElement>) => {
              if (!isInteractiveTarget(event.target)) onOpenDetails();
            }
          }
        : {})}
    >
      <header className="automation-card__header">
        <span
          className={`automation-card__leading-icon${
            relayState === true ? ' automation-card__leading-icon--active' : ''
          }${leadingIconFresh ? ' automation-card__leading-icon--fresh' : ''}`}
          aria-hidden="true"
        >
          <IconPlug key={leadingIconKey} className="automation-card__icon" />
        </span>
        <div className="automation-card__identity">
          <EditablePlugName name={name} variant="card" onCommit={onNameChange} />
        </div>
        <div className="automation-card__header-actions">
          <button
            className="automation-card__menu"
            type="button"
            aria-label={detailLabel}
            title={t('dashboard.openSystem')}
            onClick={onOpenDetails}
          >
            <IconDotsVertical className="automation-card__menu-icon" aria-hidden="true" />
          </button>
        </div>
      </header>

      {body}

      <div
        className="automation-card__plug-runtime"
        aria-label={t('hardware.shelly.statusMetricsLabel')}
      >
        <span>{formatMetric(telemetry.powerW, ' W', 1)}</span>
        <span>{formatMetric(telemetry.voltageV, ' V', 0)}</span>
        <span>{formatEnergy(telemetry.energyWh)}</span>
        <span>{telemetry.localTime ?? '—'}</span>
      </div>

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

      {automationAction && (
        <button
          className="primary-action plug-card__automation-action"
          type="button"
          disabled={automationAction.disabled}
          onClick={automationAction.onClick}
        >
          {t('dashboard.addAutomation')}
        </button>
      )}

      {footer}
    </article>
  );
};
""")

screen_path = Path('apps/mobile/src/screens/AutomationDashboardScreen.tsx')
s = screen_path.read_text()
s = s.replace(
    "import { IconAlertTriangle, IconDotsVertical, IconPlug } from '@tabler/icons-react';",
    "import { IconAlertTriangle } from '@tabler/icons-react';"
)
s = s.replace("import { EditablePlugName } from '../components/EditablePlugName.js';\n", "")
start = s.index('  return (\n    <article className="automation-card automation-card--climate">')
end_marker = '    </article>\n  );\n};\n\nconst AutomationCard'
end = s.index(end_marker, start)
replacement = '''  const body = (\n    <div className="automation-card__main" aria-label={t('dashboard.currentValues')}>\n      <div className="automation-card__primary-metric">\n        <strong aria-label={`${primaryMetric.label}: ${primaryMetric.value}`}>\n          {primaryMetric.value}\n        </strong>\n        <small aria-label={`${t('dashboard.thresholds')}: ${thresholdSummary}`}>\n          {thresholdLines.map((line) => (\n            <span key={line}>{line}</span>\n          ))}\n        </small>\n      </div>\n\n      <div className="automation-card__secondary-metrics">\n        <div>\n          <strong aria-label={`${secondaryMetric.label}: ${secondaryMetric.value}`}>\n            {secondaryMetric.value}\n          </strong>\n        </div>\n        <div>\n          <span>{t('dashboard.vpd')}</span>\n          <strong>{formatInstallationVpd(currentVpdKpa, targetVpdKpa)}</strong>\n        </div>\n      </div>\n\n      <div\n        className="automation-control-group automation-card__mode-control"\n        role="group"\n        aria-label={t('detail.automation')}\n      >\n        <button\n          className="automation-control-button"\n          type="button"\n          aria-pressed={automationRunning}\n          disabled={action.isPending || !runtimeControllable}\n          onClick={() => {\n            if (controlStatus?.automationMode !== 'auto') action.mutate('auto');\n          }}\n        >\n          AUTO\n        </button>\n        <button\n          className="automation-control-button"\n          type="button"\n          aria-pressed={manualControl}\n          disabled={action.isPending || !runtimeControllable}\n          onClick={() => {\n            if (!manualControl) action.mutate('manual');\n          }}\n        >\n          MANUAL\n        </button>\n      </div>\n    </div>\n  );\n\n  const footer =\n    warningLabel || action.isError ? (\n      <footer className="automation-card__footer">\n        {warningLabel && (\n          <div\n            className={`automation-card__status automation-card__status--${warningClass}`}\n            role="status"\n          >\n            <IconAlertTriangle aria-hidden="true" />\n            <span>{warningLabel}</span>\n          </div>\n        )}\n        {action.isError && (\n          <span className="automation-control-error" role="alert">\n            {t('detail.actionFailed')}\n          </span>\n        )}\n      </footer>\n    ) : undefined;\n\n  return (\n    <PlugDashboardCardShell\n      name={installation.shelly.name}\n      relayState={relayState}\n      busy={action.isPending}\n      telemetry={{\n        powerW: snapshot?.plug?.powerW,\n        voltageV: snapshot?.plug?.voltageV,\n        energyWh: snapshot?.plug?.energyWh,\n        localTime: snapshot?.time.localTime\n      }}\n      body={body}\n      className="automation-card automation-card--climate"\n      detailContext="Wi-Fi"\n      footer={footer}\n      leadingIconFresh={isReadingPulseActive}\n      leadingIconKey={readingPulseSequence}\n      openDetailsOnCardClick={false}\n      relayActionState={controlStatus?.manualRequestOn}\n      relayControlsDisabled={!manualControl}\n      onNameChange={onNameChange}\n      onOpenDetails={() => onOpen(installation.id)}\n      onTurnRelayOn={() => action.mutate('on')}\n      onTurnRelayOff={() => action.mutate('off')}\n    />\n  );\n};\n\nconst AutomationCard'''
s = s[:start] + replacement + s[end + len(end_marker):]
# formatPlugEnergy is now owned by the shared shell.
old = """const formatPlugEnergy = (value: number | null | undefined): string => {\n  if (value == null || !Number.isFinite(value)) return '—';\n  return value >= 1000 ? `${(value / 1000).toFixed(2)} kWh` : `${value.toFixed(0)} Wh`;\n};\n\n"""
assert old in s
s = s.replace(old, '', 1)
screen_path.write_text(s)
