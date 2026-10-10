import { describe, expect, it } from 'vitest';
import { supportedLocales, translate } from './i18n.js';
import { pulseOperationalStatusCopy } from './locales/pulseOperationalStatus.js';
import { formatRuntimeReason } from './runtimeReasonPresentation.js';

describe('formatRuntimeReason', () => {
  it.each(supportedLocales)(
    'translates Climate codes in %s including Pulse fallback',
    (locale) => {
      const t = (key: Parameters<Parameters<typeof formatRuntimeReason>[1]>[0]) =>
        translate(locale, key);
      expect(formatRuntimeReason('ab', t)).toBe(
        translate(locale, 'hardware.diagnosticsReason.ab')
      );
      expect(
        formatRuntimeReason('ab', t, {
          pulseReasons: pulseOperationalStatusCopy[locale].reasons
        })
      ).toBe(translate(locale, 'hardware.diagnosticsReason.ab'));
      expect(formatRuntimeReason('st', t)).toBe(
        translate(locale, 'hardware.diagnosticsReason.st')
      );
      expect(formatRuntimeReason('unrecognized-device-code', t)).toBe(
        translate(locale, 'dashboard.health.unknown')
      );
      expect(formatRuntimeReason('unrecognized-device-code', t)).not.toContain(
        'unrecognized-device-code'
      );
    }
  );

  it('prioritizes Pulse meanings for overlapping wire codes', () => {
    const t = (key: Parameters<Parameters<typeof formatRuntimeReason>[1]>[0]) =>
      translate('pl', key);
    expect(
      formatRuntimeReason('tm', t, {
        pulseReasons: pulseOperationalStatusCopy.pl.reasons
      })
    ).toBe(pulseOperationalStatusCopy.pl.reasons.tm);
    expect(formatRuntimeReason(null, t, { empty: 'Brak' })).toBe('Brak');
  });
});
