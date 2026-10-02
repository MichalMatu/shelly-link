import type { StandalonePulseAutomationConfig } from '@lcl/automation-core';
import type {
  Result,
  ShellyDeviceInfo,
  ShellyInstallPlan,
  ShellyInstallResult
} from '@lcl/shelly-client';
import { describe, expect, it } from 'vitest';
import { createStandalonePulseInstalledAutomation } from './installedAutomation.js';
import {
  deleteStandalonePulseAutomation,
  installStandalonePulseAutomation,
  pauseStandalonePulseAutomation,
  resumeStandalonePulseAutomation,
  type StandalonePulseAutomationClient
} from './standalonePulseAutomationRuntime.js';

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const failure = (message: string) => ({
  ok: false as const,
  error: {
    kind: 'unknown' as const,
    userMessageKey: 'errors.shellyRpc',
    technicalMessage: message,
    retryable: true
  }
});

const config: StandalonePulseAutomationConfig = {
  relayId: 2,
  pulse: {
    onMs: 1_000,
    offMs: 2_000,
    initialDelayMs: 0,
    startPhase: 'on',
    execution: { mode: 'continuous' }
  }
};

class FakeStandalonePulseClient {
  deviceId = 'shelly-pulse';
  nextScriptId = 7;
  scripts = new Set<number>();
  failInstall = false;
  failStart = false;
  failDelete = false;
  calls: string[] = [];
  installedPlan: ShellyInstallPlan | null = null;

  readonly client: StandalonePulseAutomationClient = {
    getDeviceInfo: async () =>
      ok({ id: this.deviceId, model: 'S3PL-00112EU', gen: 3 } satisfies ShellyDeviceInfo),
    installScript: async (plan) => {
      this.calls.push('script:install');
      this.installedPlan = plan;
      if (this.failInstall) return failure('install failed');
      this.scripts.add(this.nextScriptId);
      return ok({
        scriptId: this.nextScriptId,
        running: true,
        scriptHash: 'standalone-pulse-hash'
      } satisfies ShellyInstallResult);
    },
    startScript: async (scriptId) => {
      this.calls.push(`script:start:${scriptId}`);
      return this.failStart ? failure('start failed') : ok(null);
    },
    stopScript: async (scriptId) => {
      this.calls.push(`script:stop:${scriptId}`);
      return ok(null);
    },
    deleteScript: async (scriptId) => {
      this.calls.push(`script:delete:${scriptId}`);
      if (this.failDelete) return failure('delete failed');
      this.scripts.delete(scriptId);
      return ok(null);
    },
    evaluateScript: async (scriptId, code) => {
      this.calls.push(`script:eval:${scriptId}:${code}`);
      return ok('0');
    },
    setRelayOff: async (options) => {
      this.calls.push(`relay:off:${String(options?.relayId ?? 0)}`);
      return ok(null);
    }
  };
}

const installationFor = (
  installed: Awaited<ReturnType<typeof installStandalonePulseAutomation>>
) =>
  createStandalonePulseInstalledAutomation({
    shelly: { id: 'shelly-pulse', model: 'S3PL-00112EU', gen: 3 },
    shellyName: 'Pump plug',
    baseUrl: 'http://192.168.0.20/',
    scriptId: installed.script.id,
    scriptHash: installed.script.hash,
    config,
    nowMs: 1_000
  });

describe('Standalone Pulse runtime lifecycle', () => {
  it('installs one exclusive run-on-boot script for the configured relay', async () => {
    const fake = new FakeStandalonePulseClient();
    const installed = await installStandalonePulseAutomation({
      client: fake.client,
      config
    });

    expect(installed).toEqual({ script: { id: 7, hash: 'standalone-pulse-hash' } });
    expect(fake.calls[0]).toBe('relay:off:2');
    expect(fake.installedPlan?.runOnBoot).toBe(true);
    expect(fake.installedPlan?.replaceAllScripts).toBe(true);
    expect(fake.installedPlan?.relayId).toBe(2);
    expect(fake.scripts.has(7)).toBe(true);
  });

  it('leaves the relay explicitly OFF when installation fails', async () => {
    const fake = new FakeStandalonePulseClient();
    fake.failInstall = true;

    await expect(
      installStandalonePulseAutomation({ client: fake.client, config })
    ).rejects.toThrow('install failed');

    expect(fake.calls[0]).toBe('relay:off:2');
    expect(fake.calls.at(-1)).toBe('relay:off:2');
  });

  it('pause cancels the cycle, stops the script and finishes OFF', async () => {
    const fake = new FakeStandalonePulseClient();
    const installation = installationFor(
      await installStandalonePulseAutomation({ client: fake.client, config })
    );
    fake.calls = [];

    await pauseStandalonePulseAutomation(installation, fake.client);

    expect(fake.calls[0]).toBe('script:eval:7:rq(false)');
    expect(fake.calls).toContain('script:stop:7');
    expect(fake.calls.at(-1)).toBe('relay:off:2');
  });

  it('resume forces OFF before starting a fresh script cycle', async () => {
    const fake = new FakeStandalonePulseClient();
    const installation = installationFor(
      await installStandalonePulseAutomation({ client: fake.client, config })
    );
    fake.calls = [];

    await resumeStandalonePulseAutomation(installation, fake.client);

    expect(fake.calls).toEqual(['relay:off:2', 'script:start:7']);
  });

  it('resume failure remains explicitly OFF', async () => {
    const fake = new FakeStandalonePulseClient();
    const installation = installationFor(
      await installStandalonePulseAutomation({ client: fake.client, config })
    );
    fake.failStart = true;
    fake.calls = [];

    await expect(
      resumeStandalonePulseAutomation(installation, fake.client)
    ).rejects.toThrow('start failed');

    expect(fake.calls.at(-1)).toBe('relay:off:2');
  });

  it('delete cancels, removes the script and finishes OFF', async () => {
    const fake = new FakeStandalonePulseClient();
    const installation = installationFor(
      await installStandalonePulseAutomation({ client: fake.client, config })
    );
    fake.calls = [];

    await deleteStandalonePulseAutomation(installation, fake.client);

    expect(fake.calls[0]).toBe('script:eval:7:rq(false)');
    expect(fake.calls).toContain('script:delete:7');
    expect(fake.calls.at(-1)).toBe('relay:off:2');
    expect(fake.scripts.has(7)).toBe(false);
  });

  it('delete failure still finishes OFF', async () => {
    const fake = new FakeStandalonePulseClient();
    const installation = installationFor(
      await installStandalonePulseAutomation({ client: fake.client, config })
    );
    fake.failDelete = true;
    fake.calls = [];

    await expect(
      deleteStandalonePulseAutomation(installation, fake.client)
    ).rejects.toThrow('delete failed');

    expect(fake.calls.at(-1)).toBe('relay:off:2');
    expect(fake.scripts.has(7)).toBe(true);
  });

  it('refuses destructive lifecycle work against a different physical Shelly', async () => {
    const fake = new FakeStandalonePulseClient();
    const installation = installationFor(
      await installStandalonePulseAutomation({ client: fake.client, config })
    );
    fake.deviceId = 'another-shelly';
    fake.calls = [];

    await expect(
      deleteStandalonePulseAutomation(installation, fake.client)
    ).rejects.toThrow('identity does not match');

    expect(fake.calls).toEqual([]);
    expect(fake.scripts.has(7)).toBe(true);
  });
});
