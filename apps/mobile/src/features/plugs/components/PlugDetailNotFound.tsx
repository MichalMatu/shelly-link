import { useTranslation } from '../../../app/i18n.js';

export const PlugDetailNotFound = () => {
  const { t } = useTranslation();

  return (
    <main className="demo-shell installation-detail-shell">
      <section className="automation-card installation-detail-identity">
        <h1>{t('detail.notFoundTitle')}</h1>
        <p className="installation-detail-note">{t('detail.notFoundDescription')}</p>
      </section>
    </main>
  );
};
