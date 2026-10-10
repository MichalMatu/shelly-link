import type { Translate, TranslationKey } from './i18n.js';

// Shelly runtime wire codes are diagnostic data, never user-facing copy.
// Pulse-specific codes take precedence because the two protocols overlap (e.g. "tm").
const climateReasonCodes = new Set([
  'ab', 'abh', 'ar', 'b', 'bf', 'bl', 'blh', 'bm', 'bo', 'boot',
  'bs', 'cf', 'cv', 'db', 'ib', 'mc', 'mn', 'mx', 'ok', 'pt',
  'rl', 'se', 'st', 'sy', 'ta', 'tm', 'tr', 'ts'
]);

export const formatRuntimeReason = (
  code: string | null | undefined,
  t: Translate,
  options: {
    pulseReasons?: Readonly<Record<string, string>>;
    empty?: string;
  } = {}
): string => {
  if (!code) return options.empty ?? t('common.missing');
  const pulseLabel = options.pulseReasons?.[code];
  if (pulseLabel) return pulseLabel;
  if (climateReasonCodes.has(code)) {
    return t(`hardware.diagnosticsReason.${code}` as TranslationKey);
  }
  return t('dashboard.health.unknown');
};
