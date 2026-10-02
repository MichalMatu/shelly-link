import { useTranslation } from '../../../app/i18n.js';
import { pulseOperationalStatusCopy } from '../../../app/locales/pulseOperationalStatus.js';
import {
  pulseOperationalRemainingMs,
  type PulseOperationalStatus
} from '../data/pulseOperationalStatus.js';
import { AutomationOperationalStatusSummary } from './AutomationOperationalStatusSummary.js';

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
  const { locale } = useTranslation();
  const labels = pulseOperationalStatusCopy[locale];
  const state = status?.availability ?? 'unavailable';
  const available = status?.availability !== 'unavailable';

  return (
    <AutomationOperationalStatusSummary
      ariaLabel={labels.status}
      requestedOutput={available && status ? relayLabel(status.requestedOutputOn) : '—'}
      finalOutput={available && status ? relayLabel(status.finalOutputOn) : '—'}
      reason={
        available && status
          ? reasonLabel(status.lastReason, labels.reasons, labels.none)
          : '—'
      }
      leadingRows={[
        {
          id: 'status',
          label: labels.status,
          value:
            state === 'available'
              ? labels.available
              : state === 'stale'
                ? labels.stale
                : labels.unavailable
        }
      ]}
      detailRows={[
        {
          id: 'phase',
          label: labels.phase,
          value: available && status?.phase ? labels.phases[status.phase] : '—'
        },
        {
          id: 'cycles',
          label: labels.cycles,
          value:
            available &&
            status?.cyclesCompleted !== null &&
            status?.cyclesCompleted !== undefined
              ? `${status.cyclesCompleted} ${labels.cycleSuffix}`
              : '—'
        },
        {
          id: 'next-change',
          label: labels.nextChange,
          value: available && status ? remainingLabel(status) : '—'
        }
      ]}
      extendedRows={[
        {
          id: 'automation-fault',
          label: labels.automationFault,
          value:
            available && status
              ? reasonLabel(status.automationFault, labels.reasons, labels.none)
              : '—'
        },
        {
          id: 'hard-safety',
          label: labels.hardSafety,
          value:
            available && status
              ? status.hardSafety === null
                ? '—'
                : status.hardSafety
                  ? reasonLabel(status.hardSafetyReason, labels.reasons, labels.active)
                  : labels.clear
              : '—'
        }
      ]}
      compact={compact}
    />
  );
};
