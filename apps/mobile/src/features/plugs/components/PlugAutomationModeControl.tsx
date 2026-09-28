import { useTranslation } from '../../../app/i18n.js';

export type PlugAutomationModeControlProps = {
  autoActive: boolean;
  manualActive: boolean;
  disabled: boolean;
  onAuto(): void;
  onManual(): void;
};

export const PlugAutomationModeControl = ({
  autoActive,
  manualActive,
  disabled,
  onAuto,
  onManual
}: PlugAutomationModeControlProps) => {
  const { t } = useTranslation();

  return (
    <div
      className="automation-control-group automation-card__mode-control"
      role="group"
      aria-label={t('detail.automation')}
    >
      <button
        className="automation-control-button"
        type="button"
        aria-pressed={autoActive}
        disabled={disabled}
        onClick={onAuto}
      >
        AUTO
      </button>
      <button
        className="automation-control-button"
        type="button"
        aria-pressed={manualActive}
        disabled={disabled}
        onClick={onManual}
      >
        MANUAL
      </button>
    </div>
  );
};
