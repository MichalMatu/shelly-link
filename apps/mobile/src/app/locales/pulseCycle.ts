import type { Locale } from '../i18n.js';

type PulseCycleCopy = {
  title: string;
  description: string;
  outputBehavior: string;
  steady: string;
  pulse: string;
  onSeconds: string;
  offSeconds: string;
  initialDelaySeconds: string;
  startPhase: string;
  startOn: string;
  startOff: string;
  execution: string;
  continuous: string;
  cycles: string;
  duration: string;
  cycleCount: string;
  durationSeconds: string;
  invalidValue: string;
};

const en: PulseCycleCopy = {
  title: 'Pulse',
  description: 'Alternate the relay between ON and OFF using one shared Pulse cycle.',
  outputBehavior: 'Output behavior',
  steady: 'Steady',
  pulse: 'Pulse',
  onSeconds: 'ON time (s)',
  offSeconds: 'OFF time (s)',
  initialDelaySeconds: 'Initial delay (s)',
  startPhase: 'Start phase',
  startOn: 'ON',
  startOff: 'OFF',
  execution: 'Execution',
  continuous: 'Continuous',
  cycles: 'Cycles',
  duration: 'Duration',
  cycleCount: 'Cycle count',
  durationSeconds: 'Total duration (s)',
  invalidValue: 'Check the allowed value range.'
};

export const pulseCycleCopy: Record<Locale, PulseCycleCopy> = {
  pl: {
    title: 'Pulse',
    description: 'Przełączaj przekaźnik ON/OFF jednym wspólnym cyklem Pulse.',
    outputBehavior: 'Zachowanie wyjścia',
    steady: 'Stałe',
    pulse: 'Pulse',
    onSeconds: 'Czas ON (s)',
    offSeconds: 'Czas OFF (s)',
    initialDelaySeconds: 'Opóźnienie startu (s)',
    startPhase: 'Faza startowa',
    startOn: 'ON',
    startOff: 'OFF',
    execution: 'Wykonanie',
    continuous: 'Ciągłe',
    cycles: 'Cykle',
    duration: 'Czas trwania',
    cycleCount: 'Liczba cykli',
    durationSeconds: 'Łączny czas (s)',
    invalidValue: 'Sprawdź dozwolony zakres wartości.'
  },
  en,
  de: {
    ...en,
    description: 'Schaltet das Relais mit einem gemeinsamen Pulse-Zyklus zwischen ON und OFF.',
    outputBehavior: 'Ausgangsverhalten',
    steady: 'Konstant',
    onSeconds: 'ON-Zeit (s)',
    offSeconds: 'OFF-Zeit (s)',
    initialDelaySeconds: 'Startverzögerung (s)',
    startPhase: 'Startphase',
    execution: 'Ausführung',
    continuous: 'Fortlaufend',
    cycles: 'Zyklen',
    duration: 'Dauer',
    cycleCount: 'Zyklusanzahl',
    durationSeconds: 'Gesamtdauer (s)',
    invalidValue: 'Prüfe den zulässigen Wertebereich.'
  },
  es: {
    ...en,
    description: 'Alterna el relé entre ON y OFF con un único ciclo Pulse compartido.',
    outputBehavior: 'Comportamiento de salida',
    steady: 'Continuo',
    onSeconds: 'Tiempo ON (s)',
    offSeconds: 'Tiempo OFF (s)',
    initialDelaySeconds: 'Retardo inicial (s)',
    startPhase: 'Fase inicial',
    execution: 'Ejecución',
    continuous: 'Continua',
    cycles: 'Ciclos',
    duration: 'Duración',
    cycleCount: 'Número de ciclos',
    durationSeconds: 'Duración total (s)',
    invalidValue: 'Comprueba el rango permitido.'
  },
  fr: {
    ...en,
    description: 'Alterne le relais entre ON et OFF avec un seul cycle Pulse partagé.',
    outputBehavior: 'Comportement de sortie',
    steady: 'Continu',
    onSeconds: 'Temps ON (s)',
    offSeconds: 'Temps OFF (s)',
    initialDelaySeconds: 'Délai initial (s)',
    startPhase: 'Phase de départ',
    execution: 'Exécution',
    continuous: 'Continue',
    cycles: 'Cycles',
    duration: 'Durée',
    cycleCount: 'Nombre de cycles',
    durationSeconds: 'Durée totale (s)',
    invalidValue: 'Vérifiez la plage de valeurs autorisée.'
  },
  it: {
    ...en,
    description: 'Alterna il relè tra ON e OFF con un unico ciclo Pulse condiviso.',
    outputBehavior: 'Comportamento uscita',
    steady: 'Continuo',
    onSeconds: 'Tempo ON (s)',
    offSeconds: 'Tempo OFF (s)',
    initialDelaySeconds: 'Ritardo iniziale (s)',
    startPhase: 'Fase iniziale',
    execution: 'Esecuzione',
    continuous: 'Continua',
    cycles: 'Cicli',
    duration: 'Durata',
    cycleCount: 'Numero cicli',
    durationSeconds: 'Durata totale (s)',
    invalidValue: 'Controlla l’intervallo di valori consentito.'
  },
  'pt-BR': {
    ...en,
    description: 'Alterne o relé entre ON e OFF com um único ciclo Pulse compartilhado.',
    outputBehavior: 'Comportamento da saída',
    steady: 'Contínuo',
    onSeconds: 'Tempo ON (s)',
    offSeconds: 'Tempo OFF (s)',
    initialDelaySeconds: 'Atraso inicial (s)',
    startPhase: 'Fase inicial',
    execution: 'Execução',
    continuous: 'Contínua',
    cycles: 'Ciclos',
    duration: 'Duração',
    cycleCount: 'Número de ciclos',
    durationSeconds: 'Duração total (s)',
    invalidValue: 'Verifique o intervalo de valores permitido.'
  }
};
