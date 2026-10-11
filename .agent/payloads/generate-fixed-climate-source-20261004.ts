import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  `${process.cwd()}/packages/script-generator/src/index.ts`
).href;
const generator = await import(moduleUrl);
const {
  createDefaultShellyThermostatConfig,
  decodeShellyThermostatScript,
  generateShellyThermostatScript,
  shellyRuntimeConfigMatchesConfig
} = generator;

const source = readFileSync('/tmp/climate-old-source.js', 'utf8');
const persistedRaw = readFileSync('/tmp/climate-persisted-config.txt', 'utf8');
const persisted = persistedRaw.length > 0 ? persistedRaw : null;
const decoded = decodeShellyThermostatScript(source, persisted);
if (!decoded) throw new Error('Current Shelly source is not a decodable Climate runtime.');

const settings = decoded.settings;
const recoveredSensors = settings.sensors.map((sensor: any) => ({
  profileId: sensor.sensorProfileId,
  sensorId: sensor.runtimeAddress,
  runtimeAddress: sensor.runtimeAddress,
  displayName: sensor.sensorDisplayName,
  parserValidated: true
}));
const primarySensor = recoveredSensors[0];
if (!primarySensor) throw new Error('Decoded Climate runtime has no sensor.');
const additionalSensors = recoveredSensors.slice(1);
const defaults = createDefaultShellyThermostatConfig(primarySensor.profileId, settings.mode);
const config = {
  ...defaults,
  sensor: primarySensor,
  ...(additionalSensors.length > 0
    ? { sensorSet: { aggregation: settings.aggregation, additionalSensors } }
    : {}),
  output: { ...defaults.output, relayId: settings.relayId },
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

if (!shellyRuntimeConfigMatchesConfig(decoded.runtimeConfig, config)) {
  throw new Error('Recovered Climate config is not runtime-equivalent to the installed source.');
}
const nextSource = generateShellyThermostatScript(config);
const nextDecoded = decodeShellyThermostatScript(nextSource, persisted);
if (!nextDecoded) throw new Error('Generated fixed Climate source is not decodable.');
if (JSON.stringify(nextDecoded.settings) !== JSON.stringify(decoded.settings)) {
  throw new Error('Generated fixed Climate source changed effective settings.');
}
if (!nextSource.includes('BLE.Scanner.isRunning')) {
  throw new Error('Generated source is missing scanner-liveness watchdog.');
}
if (nextSource.includes('nw()-(R.l||R.sa)>9e4')) {
  throw new Error('Generated source still contains sensor-silence scanner restart logic.');
}
writeFileSync('/tmp/climate-new-source.js', nextSource);
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
console.log(JSON.stringify({
  oldBytes: Buffer.byteLength(source),
  oldSha256: digest(source),
  newBytes: Buffer.byteLength(nextSource),
  newSha256: digest(nextSource),
  oldGeneratorVersion: decoded.generatorVersion,
  newGeneratorVersion: nextDecoded.generatorVersion,
  configHash: decoded.configHash,
  settings: decoded.settings
}, null, 2));
