import type { Locale } from '../i18n.js';

type PulseOperationalPhase = 'inactive' | 'delay' | 'on' | 'off' | 'completed';

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
  reasons: Readonly<Record<string, string>>;
};

export const pulseOperationalStatusCopy: Record<Locale, PulseOperationalStatusCopy> = {
  pl: {
    status: 'Stan Pulse', phase: 'Faza Pulse', cycles: 'Postęp', nextChange: 'Następna zmiana',
    automationFault: 'Błąd automatyki', hardSafety: 'Twarde bezpieczeństwo', available: 'Aktualny',
    unavailable: 'Niedostępny', stale: 'Nieaktualny', none: 'Brak', clear: 'OK', active: 'Aktywne',
    cycleSuffix: 'cykli',
    phases: { inactive: 'Nieaktywny', delay: 'Opóźnienie', on: 'ON', off: 'OFF', completed: 'Zakończony' },
    reasons: {
      bt: 'Start', pd: 'Opóźnienie Pulse', po: 'Faza ON', pf: 'Faza OFF', pc: 'Cykl zakończony',
      pp: 'Parent nieaktywny', pw: 'Okno nieaktywne', mn: 'Tryb ręczny', ar: 'Powrót AUTO',
      rc: 'Błąd sterowania przekaźnikiem', sf: 'Błąd bezpieczeństwa', tm: 'Czas niedostępny'
    }
  },
  en: {
    status: 'Pulse status', phase: 'Pulse phase', cycles: 'Progress', nextChange: 'Next change',
    automationFault: 'Automation fault', hardSafety: 'Hard safety', available: 'Current',
    unavailable: 'Unavailable', stale: 'Stale', none: 'None', clear: 'Clear', active: 'Active',
    cycleSuffix: 'cycles',
    phases: { inactive: 'Inactive', delay: 'Delay', on: 'ON', off: 'OFF', completed: 'Completed' },
    reasons: {
      bt: 'Starting', pd: 'Pulse delay', po: 'ON phase', pf: 'OFF phase', pc: 'Cycle complete',
      pp: 'Parent inactive', pw: 'Window inactive', mn: 'Manual mode', ar: 'AUTO resumed',
      rc: 'Relay control fault', sf: 'Safety fault', tm: 'Time unavailable'
    }
  },
  de: {
    status: 'Pulse-Status', phase: 'Pulse-Phase', cycles: 'Fortschritt', nextChange: 'Nächster Wechsel',
    automationFault: 'Automationsfehler', hardSafety: 'Harte Sicherheit', available: 'Aktuell',
    unavailable: 'Nicht verfügbar', stale: 'Veraltet', none: 'Keiner', clear: 'OK', active: 'Aktiv',
    cycleSuffix: 'Zyklen',
    phases: { inactive: 'Inaktiv', delay: 'Verzögerung', on: 'ON', off: 'OFF', completed: 'Beendet' },
    reasons: {
      bt: 'Start', pd: 'Pulse-Verzögerung', po: 'ON-Phase', pf: 'OFF-Phase', pc: 'Zyklus beendet',
      pp: 'Parent inaktiv', pw: 'Zeitfenster inaktiv', mn: 'Manueller Modus', ar: 'AUTO fortgesetzt',
      rc: 'Relais-Steuerungsfehler', sf: 'Sicherheitsfehler', tm: 'Zeit nicht verfügbar'
    }
  },
  es: {
    status: 'Estado Pulse', phase: 'Fase Pulse', cycles: 'Progreso', nextChange: 'Próximo cambio',
    automationFault: 'Fallo de automatización', hardSafety: 'Seguridad dura', available: 'Actual',
    unavailable: 'No disponible', stale: 'Desactualizado', none: 'Ninguno', clear: 'OK', active: 'Activa',
    cycleSuffix: 'ciclos',
    phases: { inactive: 'Inactivo', delay: 'Retardo', on: 'ON', off: 'OFF', completed: 'Completado' },
    reasons: {
      bt: 'Inicio', pd: 'Retardo Pulse', po: 'Fase ON', pf: 'Fase OFF', pc: 'Ciclo completado',
      pp: 'Parent inactivo', pw: 'Ventana inactiva', mn: 'Modo manual', ar: 'AUTO reanudado',
      rc: 'Fallo de control del relé', sf: 'Fallo de seguridad', tm: 'Hora no disponible'
    }
  },
  fr: {
    status: 'État Pulse', phase: 'Phase Pulse', cycles: 'Progression', nextChange: 'Prochain changement',
    automationFault: 'Défaut d’automatisation', hardSafety: 'Sécurité dure', available: 'Actuel',
    unavailable: 'Indisponible', stale: 'Périmé', none: 'Aucun', clear: 'OK', active: 'Active',
    cycleSuffix: 'cycles',
    phases: { inactive: 'Inactif', delay: 'Délai', on: 'ON', off: 'OFF', completed: 'Terminé' },
    reasons: {
      bt: 'Démarrage', pd: 'Délai Pulse', po: 'Phase ON', pf: 'Phase OFF', pc: 'Cycle terminé',
      pp: 'Parent inactif', pw: 'Fenêtre inactive', mn: 'Mode manuel', ar: 'AUTO repris',
      rc: 'Défaut de commande du relais', sf: 'Défaut de sécurité', tm: 'Heure indisponible'
    }
  },
  it: {
    status: 'Stato Pulse', phase: 'Fase Pulse', cycles: 'Avanzamento', nextChange: 'Prossimo cambio',
    automationFault: 'Errore automazione', hardSafety: 'Sicurezza rigida', available: 'Attuale',
    unavailable: 'Non disponibile', stale: 'Obsoleto', none: 'Nessuno', clear: 'OK', active: 'Attiva',
    cycleSuffix: 'cicli',
    phases: { inactive: 'Inattivo', delay: 'Ritardo', on: 'ON', off: 'OFF', completed: 'Completato' },
    reasons: {
      bt: 'Avvio', pd: 'Ritardo Pulse', po: 'Fase ON', pf: 'Fase OFF', pc: 'Ciclo completato',
      pp: 'Parent inattivo', pw: 'Finestra inattiva', mn: 'Modalità manuale', ar: 'AUTO ripreso',
      rc: 'Errore controllo relè', sf: 'Errore sicurezza', tm: 'Ora non disponibile'
    }
  },
  'pt-BR': {
    status: 'Status Pulse', phase: 'Fase Pulse', cycles: 'Progresso', nextChange: 'Próxima mudança',
    automationFault: 'Falha da automação', hardSafety: 'Segurança rígida', available: 'Atual',
    unavailable: 'Indisponível', stale: 'Desatualizado', none: 'Nenhuma', clear: 'OK', active: 'Ativa',
    cycleSuffix: 'ciclos',
    phases: { inactive: 'Inativo', delay: 'Atraso', on: 'ON', off: 'OFF', completed: 'Concluído' },
    reasons: {
      bt: 'Início', pd: 'Atraso Pulse', po: 'Fase ON', pf: 'Fase OFF', pc: 'Ciclo concluído',
      pp: 'Parent inativo', pw: 'Janela inativa', mn: 'Modo manual', ar: 'AUTO retomado',
      rc: 'Falha no controle do relé', sf: 'Falha de segurança', tm: 'Hora indisponível'
    }
  }
};
