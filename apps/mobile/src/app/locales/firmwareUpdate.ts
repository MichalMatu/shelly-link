import type { Locale } from '../i18n.js';

type FirmwareUpdateCopy = {
  title: string;
  description: string;
  current: string;
  checking: string;
  upToDate: string;
  available: string;
  update: string;
  updating: string;
  started: string;
  needsWifi: string;
  unsupported: string;
  checkFailed: string;
  updateFailed: string;
};

const en: FirmwareUpdateCopy = {
  title: 'Firmware update',
  description: 'Check and install the stable Shelly firmware using the Plug’s Wi-Fi connection.',
  current: 'Current firmware',
  checking: 'Checking for updates…',
  upToDate: 'Up to date',
  available: 'Stable update available',
  update: 'Update',
  updating: 'Starting update…',
  started: 'Update started. The Plug will restart; reconnect to verify the new firmware.',
  needsWifi: 'Connect this Plug to Wi-Fi first to check for firmware updates.',
  unsupported: 'This Shelly firmware does not expose firmware update checks.',
  checkFailed: 'Could not check for firmware updates.',
  updateFailed: 'Could not start the firmware update.'
};

export const firmwareUpdateCopy: Record<Locale, FirmwareUpdateCopy> = {
  en,
  pl: {
    ...en,
    title: 'Aktualizacja firmware',
    description: 'Sprawdź i zainstaluj stabilny firmware Shelly przez połączenie Wi-Fi gniazdka.',
    current: 'Aktualny firmware',
    checking: 'Sprawdzam aktualizacje…',
    upToDate: 'Aktualny',
    available: 'Dostępna stabilna aktualizacja',
    update: 'Aktualizuj',
    updating: 'Uruchamiam aktualizację…',
    started: 'Aktualizacja uruchomiona. Gniazdko zrestartuje się; połącz się ponownie, aby zweryfikować nowy firmware.',
    needsWifi: 'Najpierw połącz to gniazdko z Wi-Fi, aby sprawdzić aktualizacje firmware.',
    unsupported: 'Ten firmware Shelly nie udostępnia sprawdzania aktualizacji.',
    checkFailed: 'Nie udało się sprawdzić aktualizacji firmware.',
    updateFailed: 'Nie udało się uruchomić aktualizacji firmware.'
  },
  de: { ...en, title: 'Firmware-Update', update: 'Aktualisieren' },
  es: { ...en, title: 'Actualización de firmware', update: 'Actualizar' },
  fr: { ...en, title: 'Mise à jour du firmware', update: 'Mettre à jour' },
  it: { ...en, title: 'Aggiornamento firmware', update: 'Aggiorna' },
  'pt-BR': { ...en, title: 'Atualização de firmware', update: 'Atualizar' }
};
