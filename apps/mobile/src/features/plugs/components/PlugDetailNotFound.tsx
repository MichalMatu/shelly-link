import { useTranslation } from '../../../app/i18n.js';
import { AppPageBack } from '../../../components/AppPageBack.js';

type PlugDetailNotFoundProps = {
  onBack(): void;
};

export const PlugDetailNotFound = ({ onBack }: PlugDetailNotFoundProps) => {
  const { t } = useTranslation();

  return (
    <main className="demo-shell installation-detail-shell">
      <AppPageBack label={t('dashboard.climateTab')} onBack={onBack} />
      <section className="automation-card installation-detail-identity">
        <h1>{t('detail.notFoundTitle')}</h1>
        <p className="installation-detail-note">{t('detail.notFoundDescription')}</p>
      </section>
    </main>
  );
};
