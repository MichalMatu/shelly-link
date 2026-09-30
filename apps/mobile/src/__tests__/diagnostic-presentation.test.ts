import { describe, expect, it } from 'vitest';
import type { Translate } from '../app/i18n.js';
import { formatDiagnosticReason } from '../flows/installations/diagnosticPresentation.js';

const reasonCopy: Record<string, string> = {
  ar: 'Sterowanie AUTO wznowione',
  bl: 'Poniżej progu',
  cf: 'Nieprawidłowa zapisana konfiguracja',
  db: 'Stabilizacja przekaźnika',
  mn: 'Sterowanie ręczne',
  sy: 'Stan przekaźnika zsynchronizowany'
};

const t = ((key: string) => {
  if (key === 'dashboard.health.unknown') return 'Stan nieznany';
  const reason = key.replace('hardware.diagnosticsReason.', '');
  return reasonCopy[reason] ?? key;
}) as Translate;

describe('diagnostic presentation', () => {
  it('maps known runtime abbreviations', () =>
    expect(formatDiagnosticReason('bl', t)).toBe('Poniżej progu'));

  it.each(['ar', 'cf', 'db', 'mn', 'sy'] as const)(
    'maps runtime control reason %s instead of showing unknown',
    (reason) => expect(formatDiagnosticReason(reason, t)).toBe(reasonCopy[reason])
  );
  it('does not expose unknown runtime abbreviations', () =>
    expect(formatDiagnosticReason('xyz', t)).toBe('Stan nieznany'));
});
