import type { Locale } from '../i18n.js';

type DeviceWifiCopy = {
  title: string;
  description: string;
  scan: string;
  scanning: string;
  network: string;
  selectNetwork: string;
  password: string;
  connect: string;
  connecting: string;
  connected: string;
  noNetworks: string;
  scanFailed: string;
  connectFailed: string;
  unsupported: string;
  open: string;
  secured: string;
};

const en: DeviceWifiCopy = {
  title: 'Wi-Fi provisioning',
  description:
    'Connect this Shelly to Wi-Fi over Bluetooth. Credentials are sent only to the verified Plug.',
  scan: 'Scan networks',
  scanning: 'Scanning…',
  network: 'Network',
  selectNetwork: 'Select a network',
  password: 'Password',
  connect: 'Connect',
  connecting: 'Connecting…',
  connected: 'Connected',
  noNetworks: 'No visible Wi-Fi networks found.',
  scanFailed: 'Could not scan Wi-Fi networks.',
  connectFailed: 'Could not connect the Plug to Wi-Fi.',
  unsupported: 'This Shelly firmware does not expose Wi-Fi provisioning over Bluetooth.',
  open: 'Open',
  secured: 'Secured'
};

export const deviceWifiCopy: Record<Locale, DeviceWifiCopy> = {
  en,
  pl: {
    ...en,
    title: 'Konfiguracja Wi-Fi',
    description:
      'Połącz Shelly z Wi-Fi przez Bluetooth. Dane logowania są wysyłane wyłącznie do zweryfikowanego gniazdka.',
    scan: 'Skanuj sieci',
    scanning: 'Skanuję…',
    network: 'Sieć',
    selectNetwork: 'Wybierz sieć',
    password: 'Hasło',
    connect: 'Połącz',
    connecting: 'Łączę…',
    connected: 'Połączono',
    noNetworks: 'Nie znaleziono widocznych sieci Wi-Fi.',
    scanFailed: 'Nie udało się przeskanować sieci Wi-Fi.',
    connectFailed: 'Nie udało się połączyć gniazdka z Wi-Fi.',
    unsupported: 'Ten firmware Shelly nie udostępnia konfiguracji Wi-Fi przez Bluetooth.',
    open: 'Otwarta',
    secured: 'Zabezpieczona'
  },
  de: {
    ...en,
    title: 'WLAN-Einrichtung',
    scan: 'Netzwerke suchen',
    connect: 'Verbinden'
  },
  es: { ...en, title: 'Configuración Wi-Fi', scan: 'Buscar redes', connect: 'Conectar' },
  fr: {
    ...en,
    title: 'Configuration Wi-Fi',
    scan: 'Rechercher les réseaux',
    connect: 'Connecter'
  },
  it: { ...en, title: 'Configurazione Wi-Fi', scan: 'Cerca reti', connect: 'Connetti' },
  'pt-BR': {
    ...en,
    title: 'Configuração de Wi-Fi',
    scan: 'Buscar redes',
    connect: 'Conectar'
  }
};
