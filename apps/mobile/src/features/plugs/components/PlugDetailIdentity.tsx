import { useTranslation } from '../../../app/i18n.js';

type PlugDetailIdentityProps = {
  name: string;
  transport: 'wifi' | 'bluetooth';
  model?: string;
};

export const PlugDetailIdentity = ({
  name,
  transport,
  model
}: PlugDetailIdentityProps) => {
  const { t } = useTranslation();
  const transportLabel = transport === 'wifi' ? 'Wi-Fi' : t('common.bluetooth');

  return (
    <section className="automation-card installation-detail-identity">
      <h1>{name}</h1>
      <p className="installation-detail-note">
        {transportLabel}
        {model ? ` · ${model}` : ''}
      </p>
    </section>
  );
};
