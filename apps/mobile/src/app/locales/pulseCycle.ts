import type { Locale } from '../i18n.js';

type PulseCycleCopy = {
  title: string;
  description: string;
  intentDescription: string;
  device: string;
  noDevice: string;
  install: string;
  installing: string;
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
  description:
    'Pulse runs independently of clock schedules: set ON time, OFF time, and how the cycle ends.',
  intentDescription:
    'Repeat an ON/OFF cycle using the configured times — without a clock schedule or sensor.',
  device: 'Device',
  noDevice: 'Select a Shelly first',
  install: 'Save Pulse to Shelly',
  installing: 'Saving Pulse…',
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
    description:
      'Pulse działa niezależnie od godzin: ustaw czas ON, czas OFF i sposób zakończenia cyklu.',
    intentDescription:
      'Powtarzaj cykl ON/OFF według ustawionych czasów — bez harmonogramu godzinowego i bez czujnika.',
    device: 'Urządzenie',
    noDevice: 'Najpierw wybierz Shelly',
    install: 'Zapisz Pulse w Shelly',
    installing: 'Zapisuję Pulse…',
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
    description:
      'Pulse läuft unabhängig von Uhrzeiten: Stelle ON-Zeit, OFF-Zeit und das Zyklusende ein.',
    intentDescription:
      'Wiederholt einen ON/OFF-Zyklus mit den eingestellten Zeiten – ohne Zeitplan und ohne Sensor.',
    device: 'Gerät',
    noDevice: 'Wähle zuerst ein Shelly',
    install: 'Pulse auf Shelly speichern',
    installing: 'Pulse wird gespeichert…',
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
    description:
      'Pulse funciona sin horarios: configura el tiempo ON, el tiempo OFF y cómo termina el ciclo.',
    intentDescription:
      'Repite un ciclo ON/OFF con los tiempos configurados, sin horario por horas ni sensor.',
    device: 'Dispositivo',
    noDevice: 'Primero selecciona un Shelly',
    install: 'Guardar Pulse en Shelly',
    installing: 'Guardando Pulse…',
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
    description:
      'Pulse fonctionne indépendamment des horaires : réglez le temps ON, le temps OFF et la fin du cycle.',
    intentDescription:
      'Répète un cycle ON/OFF avec les temps configurés, sans horaire quotidien ni capteur.',
    device: 'Appareil',
    noDevice: 'Sélectionnez d’abord un Shelly',
    install: 'Enregistrer Pulse sur Shelly',
    installing: 'Enregistrement de Pulse…',
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
    description:
      'Pulse funziona indipendentemente dagli orari: imposta tempo ON, tempo OFF e fine del ciclo.',
    intentDescription:
      'Ripete un ciclo ON/OFF con i tempi impostati, senza orario giornaliero e senza sensore.',
    device: 'Dispositivo',
    noDevice: 'Seleziona prima uno Shelly',
    install: 'Salva Pulse su Shelly',
    installing: 'Salvataggio Pulse…',
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
    description:
      'Pulse funciona sem depender de horários: defina tempo ON, tempo OFF e como o ciclo termina.',
    intentDescription:
      'Repete um ciclo ON/OFF com os tempos configurados, sem agenda por horário e sem sensor.',
    device: 'Dispositivo',
    noDevice: 'Selecione primeiro um Shelly',
    install: 'Salvar Pulse no Shelly',
    installing: 'Salvando Pulse…',
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
