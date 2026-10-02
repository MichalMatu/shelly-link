import { useTranslation, type Locale } from '../../../app/i18n.js';
import {
  pulseOperationalRemainingMs,
  type PulseOperationalPhase,
  type PulseOperationalStatus
} from '../data/pulseOperationalStatus.js';

type PulseStatusCopy = {
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

const copy: Record<Locale, PulseStatusCopy> = {
  pl: {
    status: 'Stan Pulse', phase: 'Faza Pulse', cycles: 'Postęp', nextChange: 'Następna zmiana',
    automationFault: 'Błąd automatyki', hardSafety: 'Twarde bezpieczeństwo', available: 'Aktualny',
    unavailable: 'Niedostępny', stale: 'Nieaktualny', none: 'Brak', clear: 'OK', active: 'Aktywne',
    cycleSuffix: 'cykli', phases: { inactive: 'Nieaktywny', delay: 'Opóźnienie', on: 'ON', off: 'OFF', completed: 'Zakończony' }
  },
  en: {
    status: 'Pulse status', phase: 'Pulse phase', cycles: 'Progress', nextChange: 'Next change',
    automationFault: 'Automation fault', hardSafety: 'Hard safety', available: 'Current',
    unavailable: 'Unavailable', stale: 'Stale', none: 'None', clear: 'Clear', active: 'Active',
    cycleSuffix: 'cycles', phases: { inactive: 'Inactive', delay: 'Delay', on: 'ON', off: 'OFF', completed: 'Completed' }
  },
  de: {
    status: 'Pulse-Status', phase: 'Pulse-Phase', cycles: 'Fortschritt', nextChange: 'Nächster Wechsel',
    automationFault: 'Automationsfehler', hardSafety: 'Harte Sicherheit', available: 'Aktuell',
    unavailable: 'Nicht verfügbar', stale: 'Veraltet', none: 'Keiner', clear: 'OK', active: 'Aktiv',
    cycleSuffix: 'Zyklen', phases: { inactive: 'Inaktiv', delay: 'Verzögerung', on: 'ON', off: 'OFF', completed: 'Beendet' }
  },
  es: {
    status: 'Estado Pulse', phase: 'Fase Pulse', cycles: 'Progreso', nextChange: 'Próximo cambio',
    automationFault: 'Fallo de automatización', hardSafety: 'Seguridad dura', available: 'Actual',
    unavailable: 'No disponible', stale: 'Desactualizado', none: 'Ninguno', clear: 'OK', active: 'Activa',
    cycleSuffix: 'ciclos', phases: { inactive: 'Inactivo', delay: 'Retardo', on: 'ON', off: 'OFF', completed: 'Completado' }
  },
  fr: {
    status: 'État Pulse', phase: 'Phase Pulse', cycles: 'Progression', nextChange: 'Prochain changement',
    automationFault: 'Défaut d’automatisation', hardSafety: 'Sécurité dure', available: 'Actuel',
    unavailable: 'Indisponible', stale: 'Périmé', none: 'Aucun', clear: 'OK', active: 'Active',
    cycleSuffix: 'cycles', phases: { inactive: 'Inactif', delay: 'Délai', on: 'ON', off: 'OFF', completed: 'Terminé' }
  },
  it: {
    status: 'Stato Pulse', phase: 'Fase Pulse', cycles: 'Avanzamento', nextChange: 'Prossimo cambio',
    automationFault: 'Errore automazione', hardSafety: 'Sicurezza rigida', available: 'Attuale',
    unavailable: 'Non disponibile', stale: 'Obsoleto', none: 'Nessuno', clear: 'OK', active: 'Attiva',
    cycleSuffix: 'cicli', phases: { inactive: 'Inattivo', delay: 'Ritardo', on: 'ON', off: 'OFF', completed: 'Completato' }
  },
  'pt-BR': {
    status: 'Status Pulse', phase: 'Fase Pulse', cycles: 'Progresso', nextChange: 'Próxima mudança',
    automationFault: 'Falha da automação', hardSafety: 'Segurança rígida', available: 'Atual',
    unavailable: 'Indisponível', stale: 'Desatualizado', none: 'Nenhuma', clear: 'OK', active: 'Ativa',
    cycleSuffix: 'ciclos', phases: { inactive: 'Inativo', delay: 'Atraso', on: 'ON', off: 'OFF', completed: 'Concluído' }
  }
};

const relayLabel = (value: boolean | null): string =>
  value === null ? '—' : value ? 'ON' : 'OFF';

const remainingLabel = (status: PulseOperationalStatus): string => {
  const remainingMs = pulseOperationalRemainingMs(status);
  if (remainingMs === null) return '—';
  const seconds = Math.ceil(remainingMs / 1_000);
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

export type PulseOperationalStatusSummaryProps = {
  status: PulseOperationalStatus | null | undefined;
  compact?: boolean;
};

export const PulseOperationalStatusSummary = ({
  status,
  compact = false
}: PulseOperationalStatusSummaryProps) => {
  const { locale, t } = useTranslation();
  const labels = copy[locale];
  const state = status?.availability ?? 'unavailable';
  const available = status?.availability !== 'unavailable';

  return (
    <dl
      className={`automation-summary installation-detail-summary${compact ? ' pulse-operational-summary--compact' : ''}`}
      aria-label={labels.status}
    >
      <div>
        <dt>{labels.status}</dt>
        <dd>{state === 'available' ? labels.available : state === 'stale' ? labels.stale : labels.unavailable}</dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.relayRule')}</dt>
        <dd>{available && status ? relayLabel(status.requestedOutputOn) : '—'}</dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.shellyRelay')}</dt>
        <dd>{available && status ? relayLabel(status.finalOutputOn) : '—'}</dd>
      </div>
      <div>
        <dt>{labels.phase}</dt>
        <dd>{available && status?.phase ? labels.phases[status.phase] : '—'}</dd>
      </div>
      <div>
        <dt>{labels.cycles}</dt>
        <dd>{available && status?.cyclesCompleted !== null && status?.cyclesCompleted !== undefined ? `${status.cyclesCompleted} ${labels.cycleSuffix}` : '—'}</dd>
      </div>
      <div>
        <dt>{labels.nextChange}</dt>
        <dd>{available && status ? remainingLabel(status) : '—'}</dd>
      </div>
      <div>
        <dt>{t('hardware.metrics.reason')}</dt>
        <dd>{available && status ? (status.lastReason ?? labels.none) : '—'}</dd>
      </div>
      {!compact && (
        <>
          <div>
            <dt>{labels.automationFault}</dt>
            <dd>{available && status ? (status.automationFault ?? labels.none) : '—'}</dd>
          </div>
          <div>
            <dt>{labels.hardSafety}</dt>
            <dd>
              {available && status
                ? status.hardSafety === null
                  ? '—'
                  : status.hardSafety
                    ? status.hardSafetyReason ?? labels.active
                    : labels.clear
                : '—'}
            </dd>
          </div>
        </>
      )}
    </dl>
  );
};
