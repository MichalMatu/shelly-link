import type { Result } from '@lcl/shelly-client';
import { describe, expect, it, vi } from 'vitest';
import {
  classifyPlugFirmwareUpdateStart,
  waitForPlugFirmwareUpdate,
  type PlugFirmwareVerificationDependencies
} from './plugFirmwareUpdate.js';

const target = {
  physicalId: 'shellyplugsg3-demo',
  baseUrl: 'http://192.168.0.17'
};

const oldSnapshot = {
  deviceInfo: {
    id: target.physicalId,
    model: 'S3PL-00112EU',
    gen: 3,
    firmwareId: '20240820-134301/1.2.3-plugsg3prod0-gec79607'
  },
  methods: ['Shelly.ListMethods', 'Shelly.Update']
};

const newSnapshot = {
  deviceInfo: {
    id: target.physicalId,
    model: 'S3PL-00112EU',
    gen: 3,
    firmwareId: '20260923-075613/2.0.1-ge1a198b'
  },
  methods: ['Shelly.ListMethods', 'Sys.SetTime']
};

const createDependencies = () => {
  let now = 0;
  const readSnapshot = vi
    .fn<PlugFirmwareVerificationDependencies['readSnapshot']>()
    .mockRejectedValueOnce(new Error('Shelly RPC timed out after 3000 ms.'))
    .mockResolvedValueOnce(oldSnapshot)
    .mockResolvedValueOnce(newSnapshot);
  const sleep = vi.fn(async (ms: number) => {
    now += ms;
  });
  const dependencies: PlugFirmwareVerificationDependencies = {
    readSnapshot,
    sleep,
    nowMs: () => now
  };
  return { dependencies, readSnapshot, sleep };
};

const failed = (
  kind: 'timeout' | 'shelly-offline' | 'validation-failed'
): Result<null> => ({
  ok: false,
  error: {
    kind,
    userMessageKey: 'errors.test',
    technicalMessage: `test ${kind}`,
    retryable: kind !== 'validation-failed'
  }
});

describe('firmware update safety', () => {
  it('treats timeout/offline around Shelly.Update as ambiguous without requesting replay', () => {
    expect(classifyPlugFirmwareUpdateStart(failed('timeout'))).toEqual({
      acknowledged: false
    });
    expect(classifyPlugFirmwareUpdateStart(failed('shelly-offline'))).toEqual({
      acknowledged: false
    });
  });

  it('does not hide a definite non-retryable update failure', () => {
    expect(() => classifyPlugFirmwareUpdateStart(failed('validation-failed'))).toThrow(
      'test validation-failed'
    );
  });

  it('uses read-only polling until the same Plug returns with the expected firmware', async () => {
    const { dependencies, readSnapshot, sleep } = createDependencies();

    await expect(
      waitForPlugFirmwareUpdate(
        target,
        {
          previousFirmware: oldSnapshot.deviceInfo.firmwareId,
          expectedVersion: '2.0.1',
          timeoutMs: 10_000,
          pollIntervalMs: 1_000
        },
        dependencies
      )
    ).resolves.toEqual(newSnapshot);

    expect(readSnapshot).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('stops immediately if the Wi-Fi locator resolves to another physical Plug', async () => {
    const readSnapshot = vi.fn(async () => {
      throw new Error('Shelly identity does not match the saved Plug.');
    });
    const sleep = vi.fn(async () => undefined);
    const dependencies: PlugFirmwareVerificationDependencies = {
      readSnapshot,
      sleep,
      nowMs: () => 0
    };

    await expect(
      waitForPlugFirmwareUpdate(
        target,
        { expectedVersion: '2.0.1', timeoutMs: 10_000, pollIntervalMs: 1_000 },
        dependencies
      )
    ).rejects.toThrow('Shelly identity does not match the saved Plug.');

    expect(readSnapshot).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });
});
