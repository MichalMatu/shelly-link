import {
  IonButton,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import {
  localePreferences,
  useTranslation,
  type Locale,
  type LocalePreference,
  type TranslationKey
} from './i18n.js';
import { themeModes, type ThemeMode } from './themeMode.js';

const localeLabelKeys: Record<Locale, TranslationKey> = {
  pl: 'settings.language.pl',
  en: 'settings.language.en',
  de: 'settings.language.de',
  es: 'settings.language.es',
  fr: 'settings.language.fr',
  it: 'settings.language.it',
  'pt-BR': 'settings.language.ptBr'
};

const themeModeLabelKeys: Record<ThemeMode, TranslationKey> = {
  system: 'settings.appearance.system',
  light: 'settings.appearance.light',
  dark: 'settings.appearance.dark'
};

export type IonicSettingsControlProps =
  | {
      kind: 'language';
      value: LocalePreference;
      onChange(value: LocalePreference): void;
    }
  | {
      kind: 'appearance';
      value: ThemeMode;
      onChange(value: ThemeMode): void;
    };

export const IonicSettingsControl = (props: IonicSettingsControlProps) => {
  const { t } = useTranslation();

  if (props.kind === 'language') {
    return (
      <IonSelect
        aria-label={t('settings.language.title')}
        className="app-settings__language-select"
        fill="outline"
        interface="alert"
        interfaceOptions={{ cssClass: 'app-settings__language-alert' }}
        cancelText={t('common.cancel')}
        okText={t('common.select')}
        value={props.value}
        onIonChange={(event) => {
          const value = event.detail.value;
          if (
            typeof value === 'string' &&
            localePreferences.some((preference) => preference === value)
          ) {
            props.onChange(value as LocalePreference);
          }
        }}
      >
        {localePreferences.map((preference) => (
          <IonSelectOption key={preference} value={preference}>
            {preference === 'system'
              ? t('settings.system')
              : t(localeLabelKeys[preference])}
          </IonSelectOption>
        ))}
      </IonSelect>
    );
  }

  return (
    <IonSegment
      aria-label={t('settings.appearance.title')}
      className="app-settings__appearance-segment"
      value={props.value}
      onIonChange={(event) => {
        const value = event.detail.value;
        if (typeof value === 'string' && themeModes.some((mode) => mode === value)) {
          props.onChange(value as ThemeMode);
        }
      }}
    >
      {themeModes.map((mode) => (
        <IonSegmentButton key={mode} value={mode}>
          <IonLabel>{t(themeModeLabelKeys[mode])}</IonLabel>
        </IonSegmentButton>
      ))}
    </IonSegment>
  );
};

export type IonicSettingsActionProps = {
  label: string;
  onClick(): void;
};

export const IonicSettingsAction = ({
  label,
  onClick
}: IonicSettingsActionProps) => (
  <IonButton
    className="app-settings__secondary-action"
    expand="block"
    fill="outline"
    type="button"
    onClick={onClick}
  >
    {label}
  </IonButton>
);
