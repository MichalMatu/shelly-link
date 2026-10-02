import type { DailyTimeAutomationConfig } from '@lcl/automation-core';
import { useTranslation } from '../../../app/i18n.js';
import { expectedRelayOnForClockTime } from '../data/timeAutomationConfig.js';
import { AutomationOperationalStatusSummary } from './AutomationOperationalStatusSummary.js';

export type TimeOperationalStatusState =
  'loading' | 'offline' | 'attention' | 'running' | 'paused';

export type TimeOperationalStatusSummaryProps = {
  config: DailyTimeAutomationConfig;
  localTime: string | null | undefined;
  relayOn: boolean | null | undefined;
  state: TimeOperationalStatusState;
  compact?: boolean;
};

const relayLabel = (value: boolean | null): string =>
  value === null ? '—' : value ? 'ON' : 'OFF';

const expectedScheduledOutput = (
  config: DailyTimeAutomationConfig,
  localTime: string | null | undefined,
  state: TimeOperationalStatusState
): boolean | null => {
  if (state !== 'running' || !localTime) return null;
  try {
    return expectedRelayOnForClockTime(config, localTime);
  } catch {
    return null;
  }
};

export const TimeOperationalStatusSummary = ({
  config,
  localTime,
  relayOn,
  state,
  compact = false
}: TimeOperationalStatusSummaryProps) => {
  const { t } = useTranslation();
  const reason =
    state === 'running'
      ? t('time.scheduleSummary')
      : state === 'paused'
        ? t('hardware.diagnosticsReason.mn')
        : state === 'offline'
          ? t('dashboard.health.offline')
          : state === 'attention'
            ? t('dashboard.health.attention')
            : '—';

  return (
    <AutomationOperationalStatusSummary
      ariaLabel={t('detail.currentState')}
      requestedOutput={relayLabel(expectedScheduledOutput(config, localTime, state))}
      finalOutput={relayLabel(relayOn ?? null)}
      reason={reason}
      compact={compact}
    />
  );
};
