import type { Locale } from '../i18n.js';

type DeviceTimeCopy = {
  title: string;
  description: string;
  currentTime: string;
  sync: string;
  syncing: string;
  synced: string;
  unavailable: string;
  actionFailed: string;
};

const en: DeviceTimeCopy = {
  title: 'Device time',
  description:
    'Set the Shelly system clock to the current time from this phone over Bluetooth.',
  currentTime: 'Current device time',
  sync: 'Sync with phone',
  syncing: 'Syncing…',
  synced: 'Device time synchronized with this phone.',
  unavailable: 'Device time is not available yet.',
  actionFailed: 'Could not synchronize device time.'
};

export const deviceTimeCopy: Record<Locale, DeviceTimeCopy> = {
  en,
  pl: {
    ...en,
    title: 'Czas urządzenia',
    description:
      'Ustaw zegar systemowy Shelly na aktualny czas tego telefonu przez Bluetooth.',
    currentTime: 'Aktualny czas urządzenia',
    sync: 'Synchronizuj z telefonem',
    syncing: 'Synchronizuję…',
    synced: 'Czas urządzenia zsynchronizowany z tym telefonem.',
    unavailable: 'Czas urządzenia nie jest jeszcze dostępny.',
    actionFailed: 'Nie udało się zsynchronizować czasu urządzenia.'
  },
  de: { ...en, title: 'Gerätezeit', sync: 'Mit Telefon synchronisieren' },
  es: { ...en, title: 'Hora del dispositivo', sync: 'Sincronizar con el teléfono' },
  fr: { ...en, title: 'Heure de l’appareil', sync: 'Synchroniser avec le téléphone' },
  it: { ...en, title: 'Ora del dispositivo', sync: 'Sincronizza con il telefono' },
  'pt-BR': { ...en, title: 'Hora do dispositivo', sync: 'Sincronizar com o telefone' }
};
