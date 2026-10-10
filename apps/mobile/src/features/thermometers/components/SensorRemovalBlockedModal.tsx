import { IonButton } from '@ionic/react';
import { Modal } from '@lcl/ui';
import { useTranslation } from '../../../app/i18n.js';

type SensorRemovalUsage = { id: string; name: string };

export type SensorRemovalBlockedModalProps = {
  deviceName: string | null;
  usage: SensorRemovalUsage | null;
  onClose(): void;
  onOpenAutomation?: (installationId: string) => void;
};

export const SensorRemovalBlockedModal = ({
  deviceName,
  usage,
  onClose,
  onOpenAutomation
}: SensorRemovalBlockedModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal
      closeLabel={t('common.close')}
      description={deviceName ?? ''}
      open={deviceName !== null && usage !== null}
      title={t('hardware.sensor.deleteBlockedTitle')}
      actions={
        usage && onOpenAutomation ? (
          <IonButton type="button" onClick={() => onOpenAutomation(usage.id)}>
            {t('common.openAutomation')}
          </IonButton>
        ) : undefined
      }
      onClose={onClose}
    >
      <p>
        {usage
          ? t('hardware.sensor.deleteBlockedDescription', { automation: usage.name })
          : ''}
      </p>
    </Modal>
  );
};

export type SensorRemovalConfirmModalProps = {
  deviceName: string | null;
  onClose(): void;
  onConfirm(): void;
};

export const SensorRemovalConfirmModal = ({
  deviceName,
  onClose,
  onConfirm
}: SensorRemovalConfirmModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal
      closeLabel={t('common.cancel')}
      description={deviceName ?? ''}
      open={deviceName !== null}
      title={t('hardware.sensor.deleteConfirmTitle')}
      actions={
        <button
          className="secondary-action secondary-action--danger"
          type="button"
          title={t('hardware.sensor.deleteTitle')}
          onClick={onConfirm}
        >
          {t('common.delete')}
        </button>
      }
      onClose={onClose}
    >
      <p>{t('hardware.sensor.deleteDescription')}</p>
    </Modal>
  );
};
