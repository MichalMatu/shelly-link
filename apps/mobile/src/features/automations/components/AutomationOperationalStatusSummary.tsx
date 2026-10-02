import { useTranslation } from '../../../app/i18n.js';

export type AutomationOperationalStatusRow = {
  id: string;
  label: string;
  value: string;
};

export type AutomationOperationalStatusSummaryProps = {
  requestedOutput: string;
  finalOutput: string;
  reason: string;
  ariaLabel?: string;
  leadingRows?: readonly AutomationOperationalStatusRow[];
  detailRows?: readonly AutomationOperationalStatusRow[];
  extendedRows?: readonly AutomationOperationalStatusRow[];
  compact?: boolean;
};

const StatusRows = ({ rows }: { rows: readonly AutomationOperationalStatusRow[] }) => (
  <>
    {rows.map((row) => (
      <div key={row.id}>
        <dt>{row.label}</dt>
        <dd>{row.value}</dd>
      </div>
    ))}
  </>
);

export const AutomationOperationalStatusSummary = ({
  requestedOutput,
  finalOutput,
  reason,
  ariaLabel,
  leadingRows = [],
  detailRows = [],
  extendedRows = [],
  compact = false
}: AutomationOperationalStatusSummaryProps) => {
  const { t } = useTranslation();

  return (
    <dl
      className="automation-summary installation-detail-summary"
      {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
    >
      <StatusRows rows={leadingRows} />
      <div>
        <dt>{t('hardware.metrics.relayRule')}</dt>
        <dd>{requestedOutput}</dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.shellyRelay')}</dt>
        <dd>{finalOutput}</dd>
      </div>
      <StatusRows rows={detailRows} />
      <div>
        <dt>{t('hardware.metrics.reason')}</dt>
        <dd>{reason}</dd>
      </div>
      {!compact && <StatusRows rows={extendedRows} />}
    </dl>
  );
};
