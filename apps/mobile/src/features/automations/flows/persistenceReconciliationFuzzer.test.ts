import { createDefaultShellyThermostatConfig } from '@lcl/script-generator';
import { hashScriptCode } from '@lcl/shelly-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createInstalledAutomation,
  createTimeInstalledAutomation,
  type InstalledAutomation
} from '../data/installedAutomation.js';
import {
  createInstalledAutomationRepository,
  INSTALLED_AUTOMATIONS_STORAGE_KEY
} from '../data/installedAutomationRepository.js';
import {
  reconcileInstalledAutomationsForShelly,
  type InstalledAutomationReconciliationServices
} from './reconcileInstalledAutomation.js';
import {
  resetInstalledAutomationStore,
  useInstalledAutomationStore
} from '../state/installedAutomationStore.js';

type MemoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & {
  raw(key: string): string | null;
};

const memoryStorage = (): MemoryStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    raw: (key) => values.get(key) ?? null
  };
};

const config = createDefaultShellyThermostatConfig();
const ownedCode = 'console.log("owned-runtime");';
const climate = createInstalledAutomation({
  shelly: { id: 'shelly-fuzz', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Fuzz plug',
  baseUrl: 'http://192.168.60.20/',
  scriptId: 7,
  scriptHash: hashScriptCode(ownedCode),
  config,
  nowMs: 1000
});
const time = createTimeInstalledAutomation({
  shelly: { id: 'shelly-fuzz', model: 'S3PL-00112EU', gen: 3 },
  shellyName: 'Fuzz plug',
  baseUrl: 'http://192.168.60.20/',
  onJobId: 31,
  offJobId: 32,
  config: { relayId: 0, onTime: '08:00', offTime: '09:00' },
  nowMs: 1000
});
const target = {
  deviceId: 'SHELLY-FUZZ',
  name: 'Fuzz plug live',
  baseUrl: 'http://192.168.60.21/',
  model: 'S3PL-00112EU',
  gen: 3
};

const services = (
  overrides: Partial<InstalledAutomationReconciliationServices> = {}
): InstalledAutomationReconciliationServices => ({
  readClimateRuntime: vi.fn(async () => ({
    scriptId: climate.script.id,
    running: true,
    code: ownedCode,
    persistedRuntimeConfigJson: null
  })),
  readTimeScheduleState: vi.fn(async () => 'running' as const),
  ...overrides
});

const setInstallations = (installations: readonly InstalledAutomation[]): void => {
  useInstalledAutomationStore.setState({ installations: [...installations] });
};

const lcg = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('persistence and reconciliation deterministic fuzzer', () => {
  beforeEach(() => {
    resetInstalledAutomationStore();
  });

  it('rejects 500 deterministic malformed persisted ownership variants', () => {
    const storage = memoryStorage();
    const repository = createInstalledAutomationRepository(storage);
    const next = lcg(0x7331);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      for (let index = 0; index < 500; index += 1) {
        const installation = clone(climate) as unknown as Record<string, unknown>;
        const variant = next() % 8;
        if (variant === 0) installation.version = 99;
        if (variant === 1) installation.id = '';
        if (variant === 2) (installation.script as Record<string, unknown>).id = -1;
        if (variant === 3) (installation.shelly as Record<string, unknown>).deviceId = '';
        if (variant === 4)
          (installation.shelly as Record<string, unknown>).baseUrl = 'not-a-url';
        if (variant === 5) installation.updatedAtMs = -1;
        if (variant === 6) installation.kind = 'foreign';
        if (variant === 7) {
          const rule = (installation.config as Record<string, unknown>).rule as Record<
            string,
            unknown
          >;
          const control = rule.control as Record<string, unknown>;
          control.onThreshold = control.offThreshold;
        }
        storage.setItem(
          INSTALLED_AUTOMATIONS_STORAGE_KEY,
          JSON.stringify({ version: 1, installations: [installation] })
        );
        expect(repository.load(), `case ${index} variant ${variant}`).toEqual([]);
      }
    } finally {
      warn.mockRestore();
    }
  });

  it('round-trips valid ownership and never overwrites it after an invalid save attempt', () => {
    const storage = memoryStorage();
    const repository = createInstalledAutomationRepository(storage);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    repository.save([climate]);
    const before = storage.raw(INSTALLED_AUTOMATIONS_STORAGE_KEY);
    expect(repository.load()).toEqual([climate]);

    try {
      repository.save([
        { ...climate, script: { id: -1, hash: climate.script.hash } }
      ] as never);
      expect(storage.raw(INSTALLED_AUTOMATIONS_STORAGE_KEY)).toBe(before);
      expect(repository.load()).toEqual([climate]);
    } finally {
      warn.mockRestore();
    }
  });

  it('verifies matching ownership and reports hash/running drift as changed', async () => {
    setInstallations([climate]);
    await expect(
      reconcileInstalledAutomationsForShelly(target, services())
    ).resolves.toMatchObject({
      status: 'verified',
      installationIds: [climate.id]
    });

    setInstallations([climate]);
    await expect(
      reconcileInstalledAutomationsForShelly(
        target,
        services({
          readClimateRuntime: vi.fn(async () => ({
            scriptId: climate.script.id,
            running: false,
            code: 'console.log("tampered");',
            persistedRuntimeConfigJson: null
          }))
        })
      )
    ).resolves.toMatchObject({ status: 'changed' });
  });

  it('reports unavailable reads without silently changing ownership', async () => {
    setInstallations([climate]);
    const before = useInstalledAutomationStore
      .getState()
      .installations.map((item) => item.id);
    const result = await reconcileInstalledAutomationsForShelly(
      target,
      services({
        readClimateRuntime: vi.fn(async () => {
          throw new Error('offline');
        })
      })
    );
    expect(result.status).toBe('unavailable');
    expect(
      useInstalledAutomationStore.getState().installations.map((item) => item.id)
    ).toEqual(before);
  });

  it('detects duplicate relay ownership before accepting any runtime evidence', async () => {
    setInstallations([climate, time]);
    const mocked = services();
    const result = await reconcileInstalledAutomationsForShelly(target, mocked);
    expect(result.status).toBe('conflict');
    expect(mocked.readClimateRuntime).not.toHaveBeenCalled();
    expect(mocked.readTimeScheduleState).not.toHaveBeenCalled();
  });

  it('never adopts a foreign non-LCL runtime when local ownership is absent', async () => {
    setInstallations([]);
    const result = await reconcileInstalledAutomationsForShelly(
      target,
      services({
        readClimateRuntime: vi.fn(async () => ({
          scriptId: 99,
          running: true,
          code: 'console.log("foreign-user-script");',
          persistedRuntimeConfigJson: null
        }))
      })
    );
    expect(result).toMatchObject({ status: 'none', installationIds: [] });
    expect(useInstalledAutomationStore.getState().installations).toEqual([]);
  });

  it('verifies a steady Time schedule and marks attention state as changed', async () => {
    setInstallations([time]);
    await expect(
      reconcileInstalledAutomationsForShelly(target, services())
    ).resolves.toMatchObject({
      status: 'verified'
    });
    setInstallations([time]);
    await expect(
      reconcileInstalledAutomationsForShelly(
        target,
        services({ readTimeScheduleState: vi.fn(async () => 'attention' as const) })
      )
    ).resolves.toMatchObject({ status: 'changed' });
  });
});
