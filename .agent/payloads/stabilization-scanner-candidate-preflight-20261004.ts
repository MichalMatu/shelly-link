import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createDefaultShellyThermostatConfig,
  decodeShellyThermostatScript,
  generateShellyThermostatScript
} from './packages/script-generator/src/index.ts';

const BASE = 'http://192.168.0.10';
const INTERFACE = 'en0';
const EXPECTED_ID = 'shellyplugsg3-e4b063d7f530';
const SCRIPT_ID = 1;

const curlJson = (url: string, params: Record<string, string | number> = {}) => {
  const args = [
    '-sS',
    '--interface',
    INTERFACE,
    '--connect-timeout',
    '2',
    '--max-time',
    '8',
    '-G',
    url
  ];
  for (const [key, value] of Object.entries(params)) {
    args.push('--data-urlencode', `${key}=${String(value)}`);
  }
  const raw = execFileSync('curl', args, { encoding: 'utf8' }).trim();
  if (!raw) throw new Error(`Empty response from ${url}`);
  const value = JSON.parse(raw) as unknown;
  if (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as { code?: unknown }).code === 'number' &&
    ((value as { code: number }).code < 0)
  ) {
    throw new Error(`${url} returned Shelly error: ${raw}`);
  }
  return value as Record<string, any>;
};

const readSource = () => {
  let source = '';
  let offset = 0;
  for (let part = 0; part < 64; part += 1) {
    const response = curlJson(`${BASE}/rpc/Script.GetCode`, {
      id: SCRIPT_ID,
      offset,
      len: 1024
    });
    if (typeof response.data !== 'string' || typeof response.left !== 'number') {
      throw new Error(`Invalid Script.GetCode response: ${JSON.stringify(response)}`);
    }
    source += response.data;
    offset += Buffer.byteLength(response.data, 'utf8');
    if (response.left <= 0) return source;
    if (response.data.length === 0) throw new Error('Script.GetCode made no progress');
  }
  throw new Error('Script.GetCode exceeded chunk limit');
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const recoveredConfig = (decoded: NonNullable<ReturnType<typeof decodeShellyThermostatScript>>) => {
  const settings = decoded.settings;
  const recoveredSensors = settings.sensors.map((sensor) => ({
    profileId: sensor.sensorProfileId,
    sensorId: sensor.runtimeAddress,
    runtimeAddress: sensor.runtimeAddress,
    displayName: sensor.sensorDisplayName,
    parserValidated: true
  }));
  const primarySensor = recoveredSensors[0];
  if (!primarySensor) throw new Error('Decoded runtime has no sensor');
  const additionalSensors = recoveredSensors.slice(1);
  const defaults = createDefaultShellyThermostatConfig(primarySensor.profileId, settings.mode);

  return {
    ...defaults,
    sensor: primarySensor,
    ...(additionalSensors.length > 0
      ? {
          sensorSet: {
            aggregation: settings.aggregation,
            additionalSensors
          }
        }
      : {}),
    output: {
      ...defaults.output,
      relayId: settings.relayId
    },
    rule: {
      ...defaults.rule,
      mode: settings.mode,
      control: { ...settings.control },
      vpdAssist: {
        enabled: settings.vpdAssist.enabled,
        targetKpa: settings.vpdAssist.targetKpa ?? defaults.rule.vpdAssist.targetKpa
      },
      staleTimeoutSec: settings.staleTimeoutSec,
      minChangeMs: settings.minChangeMs,
      minimumOnMs: settings.minimumOnMs,
      ...(settings.relayDebounce ? { relayDebounce: { ...settings.relayDebounce } } : {}),
      maxOnMs: settings.maxOnMs,
      rssiMin: settings.rssiMin,
      consecutiveHits: settings.consecutiveHits,
      failSafe: settings.failSafe,
      bootState: settings.bootState
    },
    ...(settings.execution ? { execution: settings.execution } : {})
  };
};

const info = curlJson(`${BASE}/rpc/Shelly.GetDeviceInfo`);
if (info.id !== EXPECTED_ID) throw new Error(`Identity mismatch: ${JSON.stringify(info)}`);
const scripts = curlJson(`${BASE}/rpc/Script.List`);
const entries = scripts.scripts;
if (
  !Array.isArray(entries) ||
  entries.length !== 1 ||
  entries[0]?.id !== SCRIPT_ID ||
  entries[0]?.enable !== true ||
  entries[0]?.running !== true
) {
  throw new Error(`Managed script is not healthy: ${JSON.stringify(entries)}`);
}
const status = curlJson(`${BASE}/rpc/Script.GetStatus`, { id: SCRIPT_ID });
const schedules = curlJson(`${BASE}/rpc/Schedule.List`);
const relay = curlJson(`${BASE}/rpc/Switch.GetStatus`, { id: 0 });
const diag = curlJson(`${BASE}/script/${SCRIPT_ID}/diag`);
const currentSource = readSource();
const currentDecoded = decodeShellyThermostatScript(currentSource);
if (!currentDecoded) throw new Error('Current source is not a decodable Shelly Link climate runtime');
const config = recoveredConfig(currentDecoded);
const candidateSource = generateShellyThermostatScript(config);
const candidateDecoded = decodeShellyThermostatScript(candidateSource);
if (!candidateDecoded) throw new Error('Generated candidate cannot be decoded');

const settingsMatch = JSON.stringify(candidateDecoded.settings) === JSON.stringify(currentDecoded.settings);
if (!settingsMatch) {
  throw new Error(
    `Candidate settings drifted: current=${JSON.stringify(currentDecoded.settings)} candidate=${JSON.stringify(candidateDecoded.settings)}`
  );
}
if (candidateDecoded.configHash !== currentDecoded.configHash) {
  throw new Error(
    `Candidate config hash drifted: ${currentDecoded.configHash} -> ${candidateDecoded.configHash}`
  );
}
if (!currentSource.includes('function bs(){if(bt)bt.call(BLE.Scanner);R.sa=nw();')) {
  throw new Error('Current runtime no longer has the expected immediate scanner restart lifecycle');
}
if (
  !candidateSource.includes('function bs(){if(bt)bt.call(BLE.Scanner);Timer.set(1500,false,br)}') ||
  !candidateSource.includes('Timer.set(1000,false,br)')
) {
  throw new Error('Candidate does not contain the qualified delayed scanner restart lifecycle');
}

const q = Array.isArray(diag.q) ? diag.q : null;
if (!q || q.length < 6) throw new Error(`Invalid diag.q: ${JSON.stringify(diag.q)}`);
const activeContract = {
  onThreshold: q[2],
  offThreshold: q[3],
  staleTimeoutSec: q[4],
  rssiMin: q[5]
};
const sourceContract = {
  onThreshold: currentDecoded.settings.control.onThreshold,
  offThreshold: currentDecoded.settings.control.offThreshold,
  staleTimeoutSec: currentDecoded.settings.staleTimeoutSec,
  rssiMin: currentDecoded.settings.rssiMin
};
if (JSON.stringify(activeContract) !== JSON.stringify(sourceContract)) {
  throw new Error(
    `Active runtime config differs from embedded source; refusing candidate replacement: active=${JSON.stringify(activeContract)} source=${JSON.stringify(sourceContract)}`
  );
}

console.log(
  JSON.stringify(
    {
      identity: {
        id: info.id,
        model: info.model,
        gen: info.gen,
        fw_id: info.fw_id,
        ver: info.ver
      },
      script: entries[0],
      scriptStatus: status,
      scheduleCount: Array.isArray(schedules.jobs) ? schedules.jobs.length : null,
      relay: {
        output: relay.output,
        apower: relay.apower,
        current: relay.current,
        voltage: relay.voltage
      },
      activeContract,
      current: {
        bytes: Buffer.byteLength(currentSource, 'utf8'),
        sha256: sha256(currentSource),
        generatorVersion: currentDecoded.generatorVersion,
        configHash: currentDecoded.configHash
      },
      candidate: {
        bytes: Buffer.byteLength(candidateSource, 'utf8'),
        sha256: sha256(candidateSource),
        generatorVersion: candidateDecoded.generatorVersion,
        configHash: candidateDecoded.configHash
      },
      settingsMatch,
      candidateHasDelayedRestart: true
    },
    null,
    2
  )
);
