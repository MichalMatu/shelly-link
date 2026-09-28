import { IconDotsVertical, IconPlug } from '@tabler/icons-react';
import type { Key, ReactNode } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { EditablePlugName } from '../../../components/EditablePlugName.js';
import { PlugRelayControls } from './PlugRelayControls.js';

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
  showTelemetry?: boolean;
  showRelayControls?: boolean;
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
  showTelemetry = true,
  showRelayControls = true,
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

      {showTelemetry && (
        <div
          className="automation-card__plug-runtime"
          aria-label={t('hardware.shelly.statusMetricsLabel')}
        >
          <span>{formatMetric(telemetry.powerW, ' W', 1)}</span>
          <span>{formatMetric(telemetry.voltageV, ' V', 0)}</span>
          <span>{formatEnergy(telemetry.energyWh)}</span>
          <span>{telemetry.localTime ?? '—'}</span>
        </div>
      )}

      {showRelayControls && (
        <PlugRelayControls
          relayState={relayState}
          busy={busy}
          disabled={relayControlsDisabled}
          requestedState={relayActionState}
          onTurnOn={onTurnRelayOn}
          onTurnOff={onTurnRelayOff}
        />
      )}

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
