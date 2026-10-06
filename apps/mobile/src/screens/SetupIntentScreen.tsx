import { IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from '../app/i18n.js';
import { pulseCycleCopy } from '../app/locales/pulseCycle.js';
import type { SetupIntent } from '../flows/setup-intent.js';

type SetupIntentScreenProps = {
  onSelect(intent: SetupIntent): void;
};

const INTENT_CHOICES = [
  {
    id: 'temperature',
    titleKey: 'intent.temperature.title',
    descriptionKey: 'intent.temperature.description'
  },
  {
    id: 'humidity',
    titleKey: 'intent.humidity.title',
    descriptionKey: 'intent.humidity.description'
  },
  {
    id: 'time',
    titleKey: 'intent.time.title',
    descriptionKey: 'intent.time.description'
  }
] as const;

export const SetupIntentScreen = ({ onSelect }: SetupIntentScreenProps) => {
  const { locale, t } = useTranslation();
  const pulseCopy = pulseCycleCopy[locale];

  return (
    <main className="demo-shell intent-shell">
      <header className="demo-header intent-header app-page-header">
        <div>
          <h1>{t('intent.title')}</h1>
        </div>
      </header>

      <section className="intent-choice-grid" aria-label={t('intent.choiceLabel')}>
        {INTENT_CHOICES.map((choice) => (
          <button
            key={choice.id}
            className="intent-choice"
            type="button"
            onClick={() => onSelect(choice.id)}
          >
            <span className="intent-choice__copy">
              <strong>{t(choice.titleKey)}</strong>
              <span>{t(choice.descriptionKey)}</span>
            </span>
            <IconChevronRight className="intent-choice__action" aria-hidden="true" />
          </button>
        ))}
        <button className="intent-choice" type="button" onClick={() => onSelect('pulse')}>
          <span className="intent-choice__copy">
            <strong>{pulseCopy.title}</strong>
            <span>{pulseCopy.intentDescription}</span>
          </span>
          <IconChevronRight className="intent-choice__action" aria-hidden="true" />
        </button>
      </section>
    </main>
  );
};
