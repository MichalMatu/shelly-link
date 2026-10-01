import type {
  Result,
  ShellyDeviceInfo,
  ShellyInstallPlan,
  ShellyInstallResult,
  ShellyScheduleCreateResult,
  ShellyScheduleJob,
  ShellyScheduleJobConfig,
  ShellyScheduleMutationResult,
  ShellyStatus
} from '@lcl/shelly-client';
import { describe, expect, it } from 'vitest';
import {
  createTimePulseScheduleJob,
  timePulseSchedulePairState
} from './timeAutomationSchedule.js';
import {
  deleteTimePulseAutomation,
  installTimePulseAutomation,
  pauseTimePulseAutomation,
  resumeTimePulseAutomation,
  type OwnedTimePulseRuntimeInstallation,
  type TimePulseAutomationClients
} from './timePulseAutomationRuntime.js';

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

const config = {
  schedule: { relayId: 0, onTime: '22:00', offTime: '06:00' },
  pulse: {
    onMs: 1_000,
    offMs: 2_000,
    initialDelayMs: 0,
    startPhase: 'on' as const,
    execution: { mode: 'continuous' as const }
  }
};

const normalizeJob = (job: ShellyScheduleJobConfig): Omit<ShellyScheduleJob, 'id'> => ({
  enable: job.enable ?? true,
  timespec: job.timespec,
  calls: job.calls
});

class FakeTimePulseClients {
  deviceId = 'shelly-time-pulse';
  relayOn = false;
  timeSynced = true;
  localTime = '23:30';
  jobs: ShellyScheduleJob[] = [];
  nextJobId = 1;
  nextScriptId = 7;
  scripts = new Set<number>();
  createCount = 0;
  failCreateAt: number | null = null;
  calls: string[] = [];
  installedPlan: ShellyInstallPlan | null = null;

  readonly device: TimePulseAutomationClients['device'] = {
    getDeviceInfo: async () =>
      ok({ id: this.deviceId, model: 'S3PL-00112EU', gen: 3 } satisfies ShellyDeviceInfo),
    getStatus: async () => ok(this.status()),
    installScript: async (plan) => {
      this.calls.push('script:install');
      this.installedPlan = plan;
      const scriptId = this.nextScriptId;
      this.scripts.add(scriptId);
      return ok({
        scriptId,
        running: true,
        scriptHash: 'time-pulse-hash'
      } satisfies ShellyInstallResult);
    },
    stopScript: async (scriptId) => {
      this.calls.push(`script:stop:${scriptId}`);
      return ok(null);
    },
    startScript: async (scriptId) => {
      this.calls.push(`script:start:${scriptId}`);
      return ok(null);
    },
    deleteScript: async (scriptId) => {
      this.calls.push(`script:delete:${scriptId}`);
      this.scripts.delete(scriptId);
      return ok(null);
    },
    evaluateScript: async (scriptId, code) => {
      this.calls.push(`script:eval:${scriptId}:${code}`);
      return ok('0');
    },
    setRelayOff: async () => {
      this.calls.push('relay:off');
      this.relayOn = false;
      return ok(null);
    }
  };

  readonly schedules: TimePulseAutomationClients['schedules'] = {
    list: async () => ok({ jobs: structuredClone(this.jobs), rev: 1 }),
    create: async (job) => {
      this.createCount += 1;
      if (this.failCreateAt === this.createCount) return failure('create failed');
      const id = this.nextJobId++;
      this.jobs.push({ id, ...normalizeJob(job) });
      return ok({ id, rev: 1 } satisfies ShellyScheduleCreateResult);
    },
    update: async (id, patch) => {
      const index = this.jobs.findIndex((job) => job.id === id);
      if (index < 0) return failure('missing job');
      this.jobs[index] = { ...this.jobs[index], ...patch } as ShellyScheduleJob;
      this.calls.push(`schedule:update:${id}:${String(patch.enable)}`);
      return ok({ rev: 2 } satisfies ShellyScheduleMutationResult);
    },
    delete: async (id) => {
      this.calls.push(`schedule:delete:${id}`);
      this.jobs = this.jobs.filter((job) => job.id !== id);
      return ok({ rev: 2 } satisfies ShellyScheduleMutationResult);
    }
  };

  bundle(): TimePulseAutomationClients {
    return { device: this.device, schedules: this.schedules };
  }

  private status(): ShellyStatus {
    return {
      matterEnabled: false,
      bluetooth: 'enabled',
      relayOn: this.relayOn,
      telemetry: {},
      clock: {
        localTime: this.localTime,
        unixTimeSec: this.timeSynced ? 1_800_000_000 : 0,
        timeSynced: this.timeSynced
      }
    };
  }
}

const installationFor = (
  installed: Awaited<ReturnType<typeof installTimePulseAutomation>>
): OwnedTimePulseRuntimeInstallation => ({
  ...installed,
  shelly: { baseUrl: 'http://192.168.0.20/', deviceId: 'shelly-time-pulse' },
  config
});

describe('Time + Pulse runtime lifecycle', () => {
  it('keeps Steady schedule calls unchanged and uses Script.Eval only for Pulse jobs', () => {
    expect(createTimePulseScheduleJob(config.schedule, 7, true)).toEqual({
      enable: true,
      timespec: '0 0 22 * * SUN,MON,TUE,WED,THU,FRI,SAT',
      calls: [{ method: 'Script.Eval', params: { id: 7, code: 'rq(true)' } }]
    });
    expect(createTimePulseScheduleJob(config.schedule, 7, false)).toEqual({
      enable: true,
      timespec: '0 0 6 * * SUN,MON,TUE,WED,THU,FRI,SAT',
      calls: [{ method: 'Script.Eval', params: { id: 7, code: 'rq(false)' } }]
    });
  });

  it('installs one run-on-boot script and two native boundary schedules', async () => {
    const fake = new FakeTimePulseClients();
    const installed = await installTimePulseAutomation({ clients: fake.bundle(), config });

    expect(installed).toEqual({
      script: { id: 7, hash: 'time-pulse-hash' },
      schedule: { onJobId: 1, offJobId: 2 }
    });
    expect(fake.installedPlan?.runOnBoot).toBe(true);
    expect(fake.installedPlan?.replaceAllScripts).toBe(true);
    expect(fake.installedPlan?.relayId).toBe(0);
    expect(fake.jobs).toHaveLength(2);
    expect(
      timePulseSchedulePairState(
        { schedule: installed.schedule, config: config.schedule, scriptId: installed.script.id },
        fake.jobs
      ).scheduleState
    ).toBe('running');
  });

  it('rolls back the first job, script and relay when the second schedule create fails', async () => {
    const fake = new FakeTimePulseClients();
    fake.failCreateAt = 2;

    await expect(
      installTimePulseAutomation({ clients: fake.bundle(), config })
    ).rejects.toThrow('create failed');

    expect(fake.jobs).toEqual([]);
    expect(fake.scripts.size).toBe(0);
    expect(fake.calls).toContain('script:eval:7:rq(false)');
    expect(fake.calls).toContain('script:delete:7');
    expect(fake.calls.at(-1)).toBe('relay:off');
  });

  it('rejects installation while the Shelly clock is unsynchronized', async () => {
    const fake = new FakeTimePulseClients();
    fake.timeSynced = false;

    await expect(
      installTimePulseAutomation({ clients: fake.bundle(), config })
    ).rejects.toThrow('not synchronized');
    expect(fake.installedPlan).toBeNull();
  });

  it('pause cancels Pulse, disables both schedules, stops the script and leaves OFF', async () => {
    const fake = new FakeTimePulseClients();
    const installation = installationFor(
      await installTimePulseAutomation({ clients: fake.bundle(), config })
    );

    await pauseTimePulseAutomation(installation, fake.bundle());

    expect(fake.jobs.every((job) => !job.enable)).toBe(true);
    expect(fake.calls).toContain('script:eval:7:rq(false)');
    expect(fake.calls).toContain('script:stop:7');
    expect(fake.calls.at(-1)).toBe('relay:off');
  });

  it('resume enables native schedules and restarts the script from safe OFF', async () => {
    const fake = new FakeTimePulseClients();
    const installation = installationFor(
      await installTimePulseAutomation({ clients: fake.bundle(), config })
    );
    await pauseTimePulseAutomation(installation, fake.bundle());
    fake.calls = [];

    await resumeTimePulseAutomation(installation, fake.bundle());

    expect(fake.calls[0]).toBe('relay:off');
    expect(fake.jobs.every((job) => job.enable)).toBe(true);
    expect(fake.calls.at(-1)).toBe('script:start:7');
  });

  it('delete cancels, removes schedules and script, and finishes with relay OFF', async () => {
    const fake = new FakeTimePulseClients();
    const installation = installationFor(
      await installTimePulseAutomation({ clients: fake.bundle(), config })
    );
    fake.calls = [];

    await deleteTimePulseAutomation(installation, fake.bundle());

    expect(fake.jobs).toEqual([]);
    expect(fake.scripts.size).toBe(0);
    expect(fake.calls[0]).toBe('script:eval:7:rq(false)');
    expect(fake.calls).toContain('script:delete:7');
    expect(fake.calls.at(-1)).toBe('relay:off');
  });

  it('refuses destructive lifecycle work against a different physical Shelly', async () => {
    const fake = new FakeTimePulseClients();
    const installation = installationFor(
      await installTimePulseAutomation({ clients: fake.bundle(), config })
    );
    fake.deviceId = 'another-shelly';
    fake.calls = [];

    await expect(deleteTimePulseAutomation(installation, fake.bundle())).rejects.toThrow(
      'identity does not match'
    );
    expect(fake.calls).toEqual([]);
    expect(fake.jobs).toHaveLength(2);
    expect(fake.scripts.has(7)).toBe(true);
  });
});
