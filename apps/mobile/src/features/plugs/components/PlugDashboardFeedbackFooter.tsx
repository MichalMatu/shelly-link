import { IconAlertTriangle } from '@tabler/icons-react';

type PlugDashboardFeedbackFooterProps = {
  warningLabel?: string | null;
  warningTone?: string;
  actionErrorLabel?: string | null;
  warningRole?: 'status' | 'alert';
};

export const PlugDashboardFeedbackFooter = ({
  warningLabel,
  warningTone = 'attention',
  actionErrorLabel,
  warningRole = 'status'
}: PlugDashboardFeedbackFooterProps) => (
  <footer className="automation-card__footer">
    {warningLabel && (
      <div
        className={`automation-card__status automation-card__status--${warningTone}`}
        role={warningRole}
      >
        <IconAlertTriangle aria-hidden="true" />
        <span>{warningLabel}</span>
      </div>
    )}
    {actionErrorLabel && (
      <span className="automation-control-error" role="alert">
        {actionErrorLabel}
      </span>
    )}
  </footer>
);
