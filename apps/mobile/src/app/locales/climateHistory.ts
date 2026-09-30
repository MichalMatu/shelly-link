import type { Locale } from '../i18n.js';

type ClimateHistoryCopy = {
  title: string;
  loading: string;
  failed: string;
  retry: string;
  empty: string;
  partial: string;
  uptime: string;
  automatic: string;
  manual: string;
  temperature: string;
  humidity: string;
  vpd: string;
  output: string;
  power: string;
  current: string;
};

export const climateHistoryCopy: Record<Locale, ClimateHistoryCopy> = {
  pl: {
    title: 'Historia',
    loading: 'Pobieram historię bezpośrednio z Shelly…',
    failed: 'Nie udało się odczytać historii z Shelly.',
    retry: 'Spróbuj ponownie',
    empty: 'Shelly nie ma jeszcze zapisanych rekordów historii.',
    partial: 'Część zapisanych rekordów jest uszkodzona i została pominięta.',
    uptime: 'Czas pracy',
    automatic: 'AUTO',
    manual: 'RĘCZNY',
    temperature: 'Temperatura',
    humidity: 'Wilgotność',
    vpd: 'VPD',
    output: 'Wyjście',
    power: 'Moc',
    current: 'Prąd'
  },
  en: {
    title: 'History',
    loading: 'Loading history directly from Shelly…',
    failed: 'History could not be read from Shelly.',
    retry: 'Try again',
    empty: 'Shelly has not stored any history records yet.',
    partial: 'Some stored records are damaged and were skipped.',
    uptime: 'Uptime',
    automatic: 'AUTO',
    manual: 'MANUAL',
    temperature: 'Temperature',
    humidity: 'Humidity',
    vpd: 'VPD',
    output: 'Output',
    power: 'Power',
    current: 'Current'
  },
  de: {
    title: 'Verlauf',
    loading: 'Verlauf wird direkt von Shelly geladen…',
    failed: 'Der Verlauf konnte nicht von Shelly gelesen werden.',
    retry: 'Erneut versuchen',
    empty: 'Shelly hat noch keine Verlaufsdaten gespeichert.',
    partial: 'Einige gespeicherte Einträge sind beschädigt und wurden übersprungen.',
    uptime: 'Laufzeit',
    automatic: 'AUTO',
    manual: 'MANUELL',
    temperature: 'Temperatur',
    humidity: 'Luftfeuchte',
    vpd: 'VPD',
    output: 'Ausgang',
    power: 'Leistung',
    current: 'Strom'
  },
  es: {
    title: 'Historial',
    loading: 'Cargando el historial directamente desde Shelly…',
    failed: 'No se pudo leer el historial desde Shelly.',
    retry: 'Intentar de nuevo',
    empty: 'Shelly todavía no ha guardado registros de historial.',
    partial: 'Algunos registros guardados están dañados y se omitieron.',
    uptime: 'Tiempo activo',
    automatic: 'AUTO',
    manual: 'MANUAL',
    temperature: 'Temperatura',
    humidity: 'Humedad',
    vpd: 'VPD',
    output: 'Salida',
    power: 'Potencia',
    current: 'Corriente'
  },
  fr: {
    title: 'Historique',
    loading: 'Chargement de l’historique directement depuis Shelly…',
    failed: 'Impossible de lire l’historique depuis Shelly.',
    retry: 'Réessayer',
    empty: 'Shelly n’a encore enregistré aucun historique.',
    partial: 'Certains enregistrements sont endommagés et ont été ignorés.',
    uptime: 'Durée de fonctionnement',
    automatic: 'AUTO',
    manual: 'MANUEL',
    temperature: 'Température',
    humidity: 'Humidité',
    vpd: 'VPD',
    output: 'Sortie',
    power: 'Puissance',
    current: 'Courant'
  },
  it: {
    title: 'Cronologia',
    loading: 'Caricamento della cronologia direttamente da Shelly…',
    failed: 'Non è stato possibile leggere la cronologia da Shelly.',
    retry: 'Riprova',
    empty: 'Shelly non ha ancora salvato record di cronologia.',
    partial: 'Alcuni record salvati sono danneggiati e sono stati ignorati.',
    uptime: 'Tempo di attività',
    automatic: 'AUTO',
    manual: 'MANUALE',
    temperature: 'Temperatura',
    humidity: 'Umidità',
    vpd: 'VPD',
    output: 'Uscita',
    power: 'Potenza',
    current: 'Corrente'
  },
  'pt-BR': {
    title: 'Histórico',
    loading: 'Carregando o histórico diretamente do Shelly…',
    failed: 'Não foi possível ler o histórico do Shelly.',
    retry: 'Tentar novamente',
    empty: 'O Shelly ainda não armazenou registros de histórico.',
    partial: 'Alguns registros armazenados estão danificados e foram ignorados.',
    uptime: 'Tempo ligado',
    automatic: 'AUTO',
    manual: 'MANUAL',
    temperature: 'Temperatura',
    humidity: 'Umidade',
    vpd: 'VPD',
    output: 'Saída',
    power: 'Potência',
    current: 'Corrente'
  }
};
