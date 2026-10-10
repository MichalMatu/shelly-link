import { IonicActionButton } from '../../../components/IonicActionButton.js';
import { Modal } from '@lcl/ui';
import { useTranslation } from '../../../app/i18n.js';

export type PlugRemovalBlockedModalProps = {
  deviceName: string | null;
  automationName: string | null;
  onClose(): void;
  onOpenAutomation?: () => void;
};

export const PlugRemovalBlockedModal = ({
  deviceName,
  automationName,
  onClose,
  onOpenAutomation
}: PlugRemovalBlockedModalProps) => {
  const { t } = useTranslation();
  const open = deviceName !== null && automationName !== null;

  return (
    <Modal
      closeLabel={t('common.close')}
      description={deviceName ?? ''}
      open={open}
      title={t('hardware.shelly.deleteBlockedTitle')}
      actions={
        onOpenAutomation ? (
          <IonicActionButton className="primary-action" type="button" onClick={onOpenAutomation}>
            {t('common.openAutomation')}
          </IonicActionButton>
        ) : undefined
      }
      onClose={onClose}
    >
      <p>
        {automationName
          ? t('hardware.shelly.deleteBlockedDescription', { automation: automationName })
          : ''}
      </p>
    </Modal>
  );
};
