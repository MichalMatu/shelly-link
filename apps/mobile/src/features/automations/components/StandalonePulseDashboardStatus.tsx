import { useTranslation } from '../../../app/i18n.js';
import { pulseOperationalStatusCopy } from '../../../app/locales/pulseOperationalStatus.js';
import {
  pulseOperationalRemainingMs,
  type PulseOperationalStatus
} from '../data/pulseOperationalStatus.js';

const relayLabel = (value: boolean | null): string =>
  value === null ? '—' : value ? 'ON' : 'OFF';

const remainingLabel = (status: PulseOperationalStatus): string | null => {
  const remainingMs = pulseOperationalRemainingMs(status);
  if (remainingMs === null) return null;
  const seconds = Math.ceil(remainingMs / 1_000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const reasonLabel = (
  value: string | null,
  reasons: Readonly<Record<string, string>>,
  empty: string
): string => (value ? (reasons[value] ?? value) : empty);

export type StandalonePulseDashboardStatusProps = {
  status: PulseOperationalStatus | null | undefined;
  manual?: boolean;
};

export const StandalonePulseDashboardStatus = ({
  status,
  manual = false
}: StandalonePulseDashboardStatusProps) => {
  const { locale, t } = useTranslation();
  const labels = pulseOperationalStatusCopy[locale];
  const state =
    manual && (!status || status.availability === 'unavailable')
      ? labels.phases.inactive
      : !status || status.availability === 'unavailable'
        ? labels.unavailable
        : status.availability === 'stale'
          ? labels.stale
          : status.phase
            ? labels.phases[status.phase]
            : labels.unavailable;
  const nextChange = status ? remainingLabel(status) : null;
  const outputMismatch =
    status?.requestedOutputOn !== null &&
    status?.requestedOutputOn !== undefined &&
    status?.finalOutputOn !== null &&
    status?.finalOutputOn !== undefined &&
    status.requestedOutputOn !== status.finalOutputOn;
  const needsAttention =
    status !== null &&
    status !== undefined &&
    (status.availability !== 'available' ||
      outputMismatch ||
      Boolean(status.automationFault) ||
      status.hardSafety === true);

  return (
    <dl
      className="automation-summary installation-detail-summary"
      aria-label={labels.status}
    >
      <div>
        <dt>{labels.status}</dt>
        <dd>{state}</dd>
      </div>
      {nextChange !== null && (
        <div>
          <dt>{labels.nextChange}</dt>
          <dd>{nextChange}</dd>
        </div>
      )}
      {status?.availability === 'available' && status.cyclesCompleted !== null && (
        <div>
          <dt>{labels.cycles}</dt>
          <dd>
            {status.cyclesCompleted} {labels.cycleSuffix}
          </dd>
        </div>
      )}
      {needsAttention && (
        <>
          <div>
            <dt>{t('hardware.metrics.relayRule')}</dt>
            <dd>{relayLabel(status.requestedOutputOn)}</dd>
          </div>
          <div>
            <dt>{t('hardware.metrics.shellyRelay')}</dt>
            <dd>{relayLabel(status.finalOutputOn)}</dd>
          </div>
          <div>
            <dt>{t('hardware.metrics.reason')}</dt>
            <dd>{reasonLabel(status.lastReason, labels.reasons, labels.none)}</dd>
          </div>
          <div>
            <dt>{labels.automationFault}</dt>
            <dd>{reasonLabel(status.automationFault, labels.reasons, labels.none)}</dd>
          </div>
          <div>
            <dt>{labels.hardSafety}</dt>
            <dd>
              {status.hardSafety === null
                ? '—'
                : status.hardSafety
                  ? reasonLabel(status.hardSafetyReason, labels.reasons, labels.active)
                  : labels.clear}
            </dd>
          </div>
        </>
      )}
    </dl>
  );
};
