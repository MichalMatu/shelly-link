import { describe, expect, it } from 'vitest';
import { t } from '../../app/i18n.js';
import { mutationError } from './helpers.js';

describe('mutationError presentation boundary', () => {
  it('preserves recognized translated troubleshooting guidance', () => {
    const actionable = t('hardware.sensor.phoneBlePermissionDenied');
    expect(mutationError(new Error(actionable))).toBe(actionable);
    const shellyError = t('hardware.shelly.scriptsMissing');
    expect(mutationError(new Error(shellyError))).toBe(shellyError);
  });

  it('never exposes unrecognized transport or runtime details', () => {
    const technical = 'RPC 500 /Script.List: reason ab';
    expect(mutationError(new Error(technical))).toBe(t('common.operationFailed'));
    expect(mutationError(new Error(technical))).not.toContain('Script.List');
    expect(mutationError({ code: 'internal', details: 'raw' })).toBe(
      t('common.operationFailed')
    );
  });
});
