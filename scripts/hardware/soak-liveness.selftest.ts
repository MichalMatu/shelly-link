import assert from 'node:assert/strict';

import { summarizeSoakJsonl } from './shelly-soak-liveness-report.js';
import {
  createSoakLivenessState,
  createSoakLivenessSummary,
  finalizeSoakLiveness,
  updateSoakLiveness
} from './soak-liveness.js';

const sample = (input: {
  at: string;
  ok: boolean;
  diagOk: boolean;
  running?: boolean | undefined;
  uptime?: number | undefined;
}): string =>
  JSON.stringify({
    type: 'sample',
    schemaVersion: 1,
    sampledAt: input.at,
    ok: input.ok,
    parsed: {
      device: { uptimeSec: input.uptime },
      script: { running: input.running }
    },
    responses: { diag: { ok: input.diagOk } }
  });

{
  const report = summarizeSoakJsonl(
    [
      sample({
        at: '2026-10-04T00:00:01.000Z',
        ok: true,
        diagOk: true,
        running: true,
        uptime: 100
      }),
      sample({
        at: '2026-10-04T00:00:06.000Z',
        ok: true,
        diagOk: true,
        running: true,
        uptime: 105
      }),
      JSON.stringify({
        type: 'summary',
        schemaVersion: 1,
        finishedAt: '2026-10-04T00:00:07.000Z'
      })
    ].join('\n')
  );

  assert.equal(report.samples, 2);
  assert.equal(report.finishedAt, '2026-10-04T00:00:07.000Z');
  assert.deepEqual(report.liveness, {
    scriptNotRunningSamples: 0,
    deviceReboots: 0,
    firstDeviceUptimeSec: 100,
    lastDeviceUptimeSec: 105,
    maxEndpointOutageMs: 0,
    maxDiagOutageMs: 0,
    maxScriptNotRunningMs: 0,
    maxConsecutiveFailedSamples: 0,
    maxConsecutiveScriptNotRunningSamples: 0
  });
}

{
  const report = summarizeSoakJsonl(
    [
      sample({
        at: '2026-10-04T00:00:00.000Z',
        ok: true,
        diagOk: true,
        running: true,
        uptime: 4_000
      }),
      sample({
        at: '2026-10-04T00:00:05.000Z',
        ok: true,
        diagOk: true,
        running: true,
        uptime: 4_005
      }),
      sample({
        at: '2026-10-04T00:00:10.000Z',
        ok: true,
        diagOk: true,
        running: true,
        uptime: 3
      })
    ].join('\n')
  );

  assert.equal(report.liveness.deviceReboots, 1);
  assert.equal(report.liveness.firstDeviceUptimeSec, 4_000);
  assert.equal(report.liveness.lastDeviceUptimeSec, 3);
}

{
  const report = summarizeSoakJsonl(
    [
      sample({
        at: '2026-10-04T00:00:01.000Z',
        ok: false,
        diagOk: false,
        running: false,
        uptime: 10
      }),
      sample({
        at: '2026-10-04T00:00:06.000Z',
        ok: false,
        diagOk: false,
        running: false,
        uptime: 15
      }),
      sample({
        at: '2026-10-04T00:00:11.000Z',
        ok: true,
        diagOk: true,
        running: true,
        uptime: 20
      })
    ].join('\n')
  );

  assert.equal(report.liveness.maxEndpointOutageMs, 10_000);
  assert.equal(report.liveness.maxDiagOutageMs, 10_000);
  assert.equal(report.liveness.maxScriptNotRunningMs, 10_000);
  assert.equal(report.liveness.maxConsecutiveFailedSamples, 2);
  assert.equal(report.liveness.maxConsecutiveScriptNotRunningSamples, 2);
  assert.equal(report.liveness.scriptNotRunningSamples, 2);
}

{
  const summary = createSoakLivenessSummary();
  const state = createSoakLivenessState();

  updateSoakLiveness(summary, state, {
    sampledAtMs: 2_000,
    sampleOk: false,
    diagOk: false,
    scriptRunning: false,
    deviceUptimeSec: 10
  });
  updateSoakLiveness(summary, state, {
    sampledAtMs: 7_000,
    sampleOk: false,
    diagOk: false,
    scriptRunning: undefined,
    deviceUptimeSec: undefined
  });
  finalizeSoakLiveness(summary, state, 12_000);

  assert.equal(summary.scriptNotRunningSamples, 1);
  assert.equal(summary.maxScriptNotRunningMs, 10_000);
  assert.equal(summary.maxConsecutiveScriptNotRunningSamples, 1);
  assert.equal(summary.maxEndpointOutageMs, 10_000);
  assert.equal(summary.maxDiagOutageMs, 10_000);
}

assert.throws(
  () => summarizeSoakJsonl('{not-json}\n'),
  /Invalid soak JSONL at line 1/
);
assert.throws(
  () =>
    summarizeSoakJsonl(
      [
        sample({
          at: '2026-10-04T00:00:10.000Z',
          ok: true,
          diagOk: true,
          running: true,
          uptime: 10
        }),
        sample({
          at: '2026-10-04T00:00:09.000Z',
          ok: true,
          diagOk: true,
          running: true,
          uptime: 11
        })
      ].join('\n')
    ),
  /timestamps regress/
);
assert.throws(() => summarizeSoakJsonl(''), /contains no sample records/);

console.log('soak liveness report selftest: PASS');
