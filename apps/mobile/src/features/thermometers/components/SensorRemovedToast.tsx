import { AppToastViewport } from '../../../components/AppToastViewport.js';
import { useTranslation } from '../../../app/i18n.js';

type SensorRemovedToastProps = {
  open: boolean;
  onClose(): void;
};

export const SensorRemovedToast = ({ open, onClose }: SensorRemovedToastProps) => {
  const { t } = useTranslation();
  return (
    <AppToastViewport
      dismissLabel={t('toast.dismiss')}
      label={t('toast.regionLabel')}
      toasts={
        open
          ? [{ id: 'sensor-removed', tone: 'ok', title: t('hardware.sensor.removed') }]
          : []
      }
      onDismiss={onClose}
    />
  );
};
