import { IconAlertTriangle } from '@tabler/icons-react';

type AutomationCardFeedbackFooterProps = {
  warningLabel?: string | null;
  warningTone?: string;
  actionErrorLabel?: string | null;
};

export const AutomationCardFeedbackFooter = ({
  warningLabel,
  warningTone = 'attention',
  actionErrorLabel
}: AutomationCardFeedbackFooterProps) => (
  <footer className="automation-card__footer">
    {warningLabel && (
      <div
        className={`automation-card__status automation-card__status--${warningTone}`}
        role="status"
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
