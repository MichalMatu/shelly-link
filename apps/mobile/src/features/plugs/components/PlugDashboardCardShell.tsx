import { IconDotsVertical, IconPlug } from '@tabler/icons-react';
import type { ReactNode } from 'react';
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
  automationAction: PlugDashboardAutomationAction;
  detailContext?: string;
  footer?: ReactNode;
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

export const PlugDashboardCardShell = ({
  name,
  relayState,
  busy,
  telemetry,
  automationAction,
  detailContext,
  footer,
  onNameChange,
  onOpenDetails,
  onTurnRelayOn,
  onTurnRelayOff
}: PlugDashboardCardShellProps) => {
  const { t } = useTranslation();
  const detailLabel = `${t('dashboard.openSystem')}: ${name}${
    detailContext ? ` · ${detailContext}` : ''
  }`;

  return (
    <article
      className="automation-card plug-card plug-card--unconfigured"
      aria-busy={busy}
    >
      <header className="automation-card__header">
        <span
          className={`automation-card__leading-icon${
            relayState === true ? ' automation-card__leading-icon--active' : ''
          }`}
          aria-hidden="true"
        >
          <IconPlug className="automation-card__icon" />
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
          disabled={busy}
          onClick={() => {
            if (relayState !== true) onTurnRelayOn();
          }}
        >
          ON
        </button>
        <button
          className="automation-relay-button"
          type="button"
          aria-pressed={relayState === false}
          disabled={busy}
          onClick={() => {
            if (relayState !== false) onTurnRelayOff();
          }}
        >
          OFF
        </button>
      </div>

      <button
        className="primary-action plug-card__automation-action"
        type="button"
        disabled={automationAction.disabled}
        onClick={automationAction.onClick}
      >
        {t('dashboard.addAutomation')}
      </button>

      {footer}
    </article>
  );
};
