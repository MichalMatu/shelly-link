import { useTranslation } from '../../../app/i18n.js';

export type PlugRelayControlsProps = {
  relayState: boolean | undefined;
  busy: boolean;
  disabled?: boolean;
  requestedState?: boolean | undefined;
  onTurnOn(): void;
  onTurnOff(): void;
};

export const PlugRelayControls = ({
  relayState,
  busy,
  disabled = false,
  requestedState,
  onTurnOn,
  onTurnOff
}: PlugRelayControlsProps) => {
  const { t } = useTranslation();
  const requestedRelayState = requestedState ?? relayState;

  return (
    <div
      className="automation-relay-actions automation-card__relay-actions"
      role="group"
      aria-label={t('dashboard.output')}
    >
      <button
        className="automation-relay-button"
        type="button"
        aria-pressed={relayState === true}
        disabled={busy || disabled}
        onClick={() => {
          if (requestedRelayState !== true) onTurnOn();
        }}
      >
        ON
      </button>
      <button
        className="automation-relay-button"
        type="button"
        aria-pressed={relayState === false}
        disabled={busy || disabled}
        onClick={() => {
          if (requestedRelayState !== false) onTurnOff();
        }}
      >
        OFF
      </button>
    </div>
  );
};
