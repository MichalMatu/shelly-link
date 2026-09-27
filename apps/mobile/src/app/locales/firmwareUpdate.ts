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
  reconnecting: string;
  verifying: string;
  complete: string;
  needsWifi: string;
  unsupported: string;
  checkFailed: string;
  updateFailed: string;
};

const en: FirmwareUpdateCopy = {
  title: 'Firmware update',
  description:
    'Check and install the stable Shelly firmware using the Plug’s Wi-Fi connection.',
  current: 'Current firmware',
  checking: 'Checking for updates…',
  upToDate: 'Up to date',
  available: 'Stable update available',
  update: 'Update',
  updating: 'Starting update…',
  reconnecting: 'Updating firmware and waiting for the Plug to restart…',
  verifying: 'Plug reconnected. Verifying firmware and capabilities…',
  complete: 'Firmware update verified.',
  needsWifi: 'Connect this Plug to Wi-Fi first to check for firmware updates.',
  unsupported: 'This Shelly firmware does not expose firmware update checks.',
  checkFailed: 'Could not check for firmware updates.',
  updateFailed: 'Firmware update could not be verified.'
};

export const firmwareUpdateCopy: Record<Locale, FirmwareUpdateCopy> = {
  en,
  pl: {
    ...en,
    title: 'Aktualizacja firmware',
    description:
      'Sprawdź i zainstaluj stabilny firmware Shelly przez połączenie Wi-Fi gniazdka.',
    current: 'Aktualny firmware',
    checking: 'Sprawdzam aktualizacje…',
    upToDate: 'Aktualny',
    available: 'Dostępna stabilna aktualizacja',
    update: 'Aktualizuj',
    updating: 'Uruchamiam aktualizację…',
    reconnecting: 'Aktualizuję firmware i czekam na restart gniazdka…',
    verifying: 'Gniazdko wróciło. Weryfikuję firmware i dostępne funkcje…',
    complete: 'Aktualizacja firmware zweryfikowana.',
    needsWifi:
      'Najpierw połącz to gniazdko z Wi-Fi, aby sprawdzić aktualizacje firmware.',
    unsupported: 'Ten firmware Shelly nie udostępnia sprawdzania aktualizacji.',
    checkFailed: 'Nie udało się sprawdzić aktualizacji firmware.',
    updateFailed: 'Nie udało się zweryfikować aktualizacji firmware.'
  },
  de: { ...en, title: 'Firmware-Update', update: 'Aktualisieren' },
  es: { ...en, title: 'Actualización de firmware', update: 'Actualizar' },
  fr: { ...en, title: 'Mise à jour du firmware', update: 'Mettre à jour' },
  it: { ...en, title: 'Aggiornamento firmware', update: 'Aggiorna' },
  'pt-BR': { ...en, title: 'Atualização de firmware', update: 'Atualizar' }
};
