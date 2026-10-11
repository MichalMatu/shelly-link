import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const baseUrl = 'http://shellyplugsg3-e4b063d7f530.local/';
const expectedDeviceId = 'shellyplugsg3-e4b063d7f530';
const scriptId = 1;
const outFile = 'artifacts/hardware/stabilization-soak-smoke-20261004.jsonl';
const summaryFile = 'artifacts/hardware/stabilization-soak-smoke-20261004.summary.md';

const rpc = async (method, params = undefined) => {
  const url = new URL(`/rpc/${method}`, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${method}: ${response.status} ${response.statusText}`);
  return response.json();
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(command, args, {
      ...options,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
    });
    if (options.capture) {
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
    }
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code=${code} signal=${signal}\n${stderr}`));
    });
  });

const infoBefore = await rpc('Shelly.GetDeviceInfo');
assert(infoBefore.id?.trim().toLowerCase() === expectedDeviceId, 'Unexpected Shelly identity.');
const relayBefore = await rpc('Switch.GetStatus', { id: 0 });
assert(relayBefore.output === false, 'Read-only soak requires relay OFF before start.');
const scriptBefore = await rpc('Script.GetStatus', { id: scriptId });
assert(scriptBefore.running === true, 'Production script must be running before soak.');

await run('pnpm', ['hardware:shelly:soak'], {
  env: {
    ...process.env,
    SHELLY_URL: baseUrl,
    SCRIPT_ID: String(scriptId),
    SOAK_DURATION_MS: '60000',
    SOAK_INTERVAL_MS: '5000',
    SOAK_RPC_TIMEOUT_MS: '4000',
    SOAK_OUT_FILE: outFile,
    SOAK_SUMMARY_FILE: summaryFile,
    SOAK_CYCLE_RELAY: '0'
  }
});

const lines = (await readFile(outFile, 'utf8')).trim().split('\n');
const finalRecord = JSON.parse(lines.at(-1));
assert(finalRecord.type === 'summary', 'Soak JSONL did not finish with a summary record.');
const rawSummary = finalRecord.summary;

const reportRun = await run(
  'pnpm',
  ['exec', 'tsx', 'scripts/hardware/shelly-soak-liveness-report.ts', outFile],
  { capture: true }
);
const report = JSON.parse(reportRun.stdout);
const liveness = report.liveness;

assert(liveness.deviceReboots === 0, `Unexpected device reboot count: ${liveness.deviceReboots}`);
assert(rawSummary.failedSamples === 0, `Unexpected failed samples: ${rawSummary.failedSamples}`);
assert(rawSummary.diagFailures === 0, `Unexpected /diag failures: ${rawSummary.diagFailures}`);
assert(rawSummary.rpcFailures === 0, `Unexpected RPC failures: ${rawSummary.rpcFailures}`);
assert(liveness.scriptNotRunningSamples === 0, `Script stopped samples: ${liveness.scriptNotRunningSamples}`);
assert(liveness.maxConsecutiveFailedSamples === 0, 'Observed consecutive failed samples.');
assert(liveness.maxConsecutiveScriptNotRunningSamples === 0, 'Observed stopped-script streak.');
assert(liveness.maxEndpointOutageMs === 0, `Endpoint outage: ${liveness.maxEndpointOutageMs} ms`);
assert(liveness.maxDiagOutageMs === 0, `/diag outage: ${liveness.maxDiagOutageMs} ms`);
assert(liveness.maxScriptNotRunningMs === 0, `Stopped-script window: ${liveness.maxScriptNotRunningMs} ms`);
assert(typeof rawSummary.memFreeMin === 'number' && rawSummary.memFreeMin > 0, 'Missing positive mem_free floor.');

const infoAfter = await rpc('Shelly.GetDeviceInfo');
assert(infoAfter.id?.trim().toLowerCase() === expectedDeviceId, 'Shelly identity changed after soak.');
const relayAfter = await rpc('Switch.GetStatus', { id: 0 });
assert(relayAfter.output === false, 'Relay is not OFF after read-only soak.');
const scriptAfter = await rpc('Script.GetStatus', { id: scriptId });
assert(scriptAfter.running === true, 'Production script is not running after soak.');

console.log(
  JSON.stringify(
    {
      deviceId: infoAfter.id,
      firmwareId: infoAfter.fw_id ?? infoAfter.ver,
      samples: rawSummary.samples,
      deviceReboots: liveness.deviceReboots,
      failedSamples: rawSummary.failedSamples,
      diagFailures: rawSummary.diagFailures,
      rpcFailures: rawSummary.rpcFailures,
      scriptNotRunningSamples: liveness.scriptNotRunningSamples,
      maxEndpointOutageMs: liveness.maxEndpointOutageMs,
      maxDiagOutageMs: liveness.maxDiagOutageMs,
      maxScriptNotRunningMs: liveness.maxScriptNotRunningMs,
      memUsedMax: rawSummary.memUsedMax,
      memPeakMax: rawSummary.memPeakMax,
      memFreeMin: rawSummary.memFreeMin,
      finalRelayOn: relayAfter.output
    },
    null,
    2
  )
);
