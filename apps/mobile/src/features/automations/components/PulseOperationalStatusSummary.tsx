import { useTranslation } from '../../../app/i18n.js';
import { pulseOperationalStatusCopy } from '../../../app/locales/pulseOperationalStatus.js';
import {
  pulseOperationalRemainingMs,
  type PulseOperationalStatus
} from '../data/pulseOperationalStatus.js';

const relayLabel = (value: boolean | null): string =>
  value === null ? '—' : value ? 'ON' : 'OFF';

const remainingLabel = (status: PulseOperationalStatus): string => {
  const remainingMs = pulseOperationalRemainingMs(status);
  if (remainingMs === null) return '—';
  const seconds = Math.ceil(remainingMs / 1_000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const reasonLabel = (
  value: string | null,
  reasons: Readonly<Record<string, string>>,
  empty: string
): string => (value ? (reasons[value] ?? value) : empty);

export type PulseOperationalStatusSummaryProps = {
  status: PulseOperationalStatus | null | undefined;
  compact?: boolean;
};

export const PulseOperationalStatusSummary = ({
  status,
  compact = false
}: PulseOperationalStatusSummaryProps) => {
  const { locale, t } = useTranslation();
  const labels = pulseOperationalStatusCopy[locale];
  const state = status?.availability ?? 'unavailable';
  const available = status?.availability !== 'unavailable';

  return (
    <dl
      className={`automation-summary installation-detail-summary${compact ? ' pulse-operational-summary--compact' : ''}`}
      aria-label={labels.status}
    >
      <div>
        <dt>{labels.status}</dt>
        <dd>
          {state === 'available'
            ? labels.available
            : state === 'stale'
              ? labels.stale
              : labels.unavailable}
        </dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.relayRule')}</dt>
        <dd>{available && status ? relayLabel(status.requestedOutputOn) : '—'}</dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.shellyRelay')}</dt>
        <dd>{available && status ? relayLabel(status.finalOutputOn) : '—'}</dd>
      </div>
      <div>
        <dt>{labels.phase}</dt>
        <dd>{available && status?.phase ? labels.phases[status.phase] : '—'}</dd>
      </div>
      <div>
        <dt>{labels.cycles}</dt>
        <dd>
          {available &&
          status?.cyclesCompleted !== null &&
          status?.cyclesCompleted !== undefined
            ? `${status.cyclesCompleted} ${labels.cycleSuffix}`
            : '—'}
        </dd>
      </div>
      <div>
        <dt>{labels.nextChange}</dt>
        <dd>{available && status ? remainingLabel(status) : '—'}</dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.reason')}</dt>
        <dd>
          {available && status
            ? reasonLabel(status.lastReason, labels.reasons, labels.none)
            : '—'}
        </dd>
      </div>
      {!compact && (
        <>
          <div>
            <dt>{labels.automationFault}</dt>
            <dd>
              {available && status
                ? reasonLabel(status.automationFault, labels.reasons, labels.none)
                : '—'}
            </dd>
          </div>
          <div>
            <dt>{labels.hardSafety}</dt>
            <dd>
              {available && status
                ? status.hardSafety === null
                  ? '—'
                  : status.hardSafety
                    ? reasonLabel(status.hardSafetyReason, labels.reasons, labels.active)
                    : labels.clear
                : '—'}
            </dd>
          </div>
        </>
      )}
    </dl>
  );
};
