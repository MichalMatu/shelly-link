import type { Locale } from '../i18n.js';

type PulseManagementCopy = {
  deleteAction: string;
  deleteBusy: string;
  deleteTitle: string;
  deleteDetail: string;
  deleteFailed: string;
  runtimeAttention: string;
};

const en: PulseManagementCopy = {
  deleteAction: 'Delete automation',
  deleteBusy: 'Deleting automation…',
  deleteTitle: 'Delete Pulse automation?',
  deleteDetail:
    'Shelly Link will stop Pulse, force the relay OFF, verify the Plug identity and remove the managed Pulse script. The automation stays in the app if safe deletion fails.',
  deleteFailed: 'The Pulse automation could not be deleted safely.',
  runtimeAttention: 'The managed Pulse runtime needs attention.'
};

export const pulseManagementCopy: Record<Locale, PulseManagementCopy> = {
  pl: {
    deleteAction: 'Usuń automatykę',
    deleteBusy: 'Usuwam automatykę…',
    deleteTitle: 'Usunąć automatykę Pulse?',
    deleteDetail:
      'Shelly Link zatrzyma Pulse, wymusi OFF, sprawdzi tożsamość gniazdka i usunie zarządzany skrypt Pulse. Jeśli bezpieczne usunięcie się nie powiedzie, wpis automatyki pozostanie w aplikacji.',
    deleteFailed: 'Nie udało się bezpiecznie usunąć automatyki Pulse.',
    runtimeAttention: 'Zarządzany runtime Pulse wymaga uwagi.'
  },
  en,
  de: en,
  es: en,
  fr: en,
  it: en,
  'pt-BR': en
};
