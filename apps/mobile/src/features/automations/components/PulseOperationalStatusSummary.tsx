import { useTranslation } from '../../../app/i18n.js';
import { formatRuntimeReason } from '../../../app/runtimeReasonPresentation.js';
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
    <AutomationOperationalStatusSummary
      ariaLabel={labels.status}
      requestedOutput={available && status ? relayLabel(status.requestedOutputOn) : '—'}
      finalOutput={available && status ? relayLabel(status.finalOutputOn) : '—'}
      reason={
        available && status
          ? formatRuntimeReason(status.lastReason, t, {
              pulseReasons: labels.reasons,
              empty: labels.none
            })
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
              ? formatRuntimeReason(status.automationFault, t, {
                  pulseReasons: labels.reasons,
                  empty: labels.none
                })
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
                  ? formatRuntimeReason(status.hardSafetyReason, t, {
                      pulseReasons: labels.reasons,
                      empty: labels.active
                    })
                  : labels.clear
              : '—'
        }
      ]}
      compact={compact}
    />
  );
};
