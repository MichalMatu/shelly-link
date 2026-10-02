import type { Locale } from '../i18n.js';
import type { PulseOperationalPhase } from '../../features/automations/data/pulseOperationalStatus.js';

export type PulseOperationalStatusCopy = {
  status: string;
  phase: string;
  cycles: string;
  nextChange: string;
  automationFault: string;
  hardSafety: string;
  available: string;
  unavailable: string;
  stale: string;
  none: string;
  clear: string;
  active: string;
  cycleSuffix: string;
  phases: Record<PulseOperationalPhase, string>;
};

export const pulseOperationalStatusCopy: Record<Locale, PulseOperationalStatusCopy> = {
  pl: {
    status: 'Stan Pulse',
    phase: 'Faza Pulse',
    cycles: 'Postęp',
    nextChange: 'Następna zmiana',
    automationFault: 'Błąd automatyki',
    hardSafety: 'Twarde bezpieczeństwo',
    available: 'Aktualny',
    unavailable: 'Niedostępny',
    stale: 'Nieaktualny',
    none: 'Brak',
    clear: 'OK',
    active: 'Aktywne',
    cycleSuffix: 'cykli',
    phases: {
      inactive: 'Nieaktywny',
      delay: 'Opóźnienie',
      on: 'ON',
      off: 'OFF',
      completed: 'Zakończony'
    }
  },
  en: {
    status: 'Pulse status',
    phase: 'Pulse phase',
    cycles: 'Progress',
    nextChange: 'Next change',
    automationFault: 'Automation fault',
    hardSafety: 'Hard safety',
    available: 'Current',
    unavailable: 'Unavailable',
    stale: 'Stale',
    none: 'None',
    clear: 'Clear',
    active: 'Active',
    cycleSuffix: 'cycles',
    phases: { inactive: 'Inactive', delay: 'Delay', on: 'ON', off: 'OFF', completed: 'Completed' }
  },
  de: {
    status: 'Pulse-Status',
    phase: 'Pulse-Phase',
    cycles: 'Fortschritt',
    nextChange: 'Nächster Wechsel',
    automationFault: 'Automationsfehler',
    hardSafety: 'Harte Sicherheit',
    available: 'Aktuell',
    unavailable: 'Nicht verfügbar',
    stale: 'Veraltet',
    none: 'Keiner',
    clear: 'OK',
    active: 'Aktiv',
    cycleSuffix: 'Zyklen',
    phases: { inactive: 'Inaktiv', delay: 'Verzögerung', on: 'ON', off: 'OFF', completed: 'Beendet' }
  },
  es: {
    status: 'Estado Pulse',
    phase: 'Fase Pulse',
    cycles: 'Progreso',
    nextChange: 'Próximo cambio',
    automationFault: 'Fallo de automatización',
    hardSafety: 'Seguridad dura',
    available: 'Actual',
    unavailable: 'No disponible',
    stale: 'Desactualizado',
    none: 'Ninguno',
    clear: 'OK',
    active: 'Activa',
    cycleSuffix: 'ciclos',
    phases: { inactive: 'Inactivo', delay: 'Retardo', on: 'ON', off: 'OFF', completed: 'Completado' }
  },
  fr: {
    status: 'État Pulse',
    phase: 'Phase Pulse',
    cycles: 'Progression',
    nextChange: 'Prochain changement',
    automationFault: 'Défaut d’automatisation',
    hardSafety: 'Sécurité dure',
    available: 'Actuel',
    unavailable: 'Indisponible',
    stale: 'Périmé',
    none: 'Aucun',
    clear: 'OK',
    active: 'Active',
    cycleSuffix: 'cycles',
    phases: { inactive: 'Inactif', delay: 'Délai', on: 'ON', off: 'OFF', completed: 'Terminé' }
  },
  it: {
    status: 'Stato Pulse',
    phase: 'Fase Pulse',
    cycles: 'Avanzamento',
    nextChange: 'Prossimo cambio',
    automationFault: 'Errore automazione',
    hardSafety: 'Sicurezza rigida',
    available: 'Attuale',
    unavailable: 'Non disponibile',
    stale: 'Obsoleto',
    none: 'Nessuno',
    clear: 'OK',
    active: 'Attiva',
    cycleSuffix: 'cicli',
    phases: { inactive: 'Inattivo', delay: 'Ritardo', on: 'ON', off: 'OFF', completed: 'Completato' }
  },
  'pt-BR': {
    status: 'Status Pulse',
    phase: 'Fase Pulse',
    cycles: 'Progresso',
    nextChange: 'Próxima mudança',
    automationFault: 'Falha da automação',
    hardSafety: 'Segurança rígida',
    available: 'Atual',
    unavailable: 'Indisponível',
    stale: 'Desatualizado',
    none: 'Nenhuma',
    clear: 'OK',
    active: 'Ativa',
    cycleSuffix: 'ciclos',
    phases: { inactive: 'Inativo', delay: 'Atraso', on: 'ON', off: 'OFF', completed: 'Concluído' }
  }
};
