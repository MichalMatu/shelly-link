import {
  InMemoryDiagnosticLogger,
  type DiagnosticEvent,
  type DiagnosticLogger
} from '@lcl/diagnostics';

export const diagnosticJournalChangeEvent = 'lcl:diagnostic-journal-change';
const journal: DiagnosticLogger = new InMemoryDiagnosticLogger(200);

const dispatchChange = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(diagnosticJournalChangeEvent));
  }
};

export const recordDiagnosticEvent = (
  event: Omit<DiagnosticEvent, 'id' | 'atMs'> & { atMs?: number }
): DiagnosticEvent => {
  const next = journal.add(event);
  dispatchChange();
  return next;
};

export const getDiagnosticEvents = (): readonly DiagnosticEvent[] => journal.list();

export const clearDiagnosticEvents = (): void => {
  journal.clear();
  dispatchChange();
};
