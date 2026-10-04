import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  createSoakLivenessState,
  createSoakLivenessSummary,
  finalizeSoakLiveness,
  updateSoakLiveness,
  type SoakLivenessSummary
} from './soak-liveness.js';

type JsonRecord = Record<string, unknown>;

export type SoakLivenessReport = {
  schemaVersion: 1;
  samples: number;
  firstSampleAt: string;
  lastSampleAt: string;
  finishedAt: string;
  liveness: SoakLivenessSummary;
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const recordField = (value: unknown, key: string): JsonRecord | undefined => {
  if (!isRecord(value)) return undefined;
  const field = value[key];
  return isRecord(field) ? field : undefined;
};

const booleanField = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const numberField = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const parseTimestamp = (value: unknown, label: string): number => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} is not a valid timestamp: ${value}`);
  }
  return parsed;
};

const parseLine = (line: string, lineNumber: number): JsonRecord => {
  try {
    const value: unknown = JSON.parse(line);
    if (!isRecord(value)) {
      throw new Error('record is not an object');
    }
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid soak JSONL at line ${lineNumber}: ${message}`);
  }
};

export const summarizeSoakJsonl = (text: string): SoakLivenessReport => {
  const liveness = createSoakLivenessSummary();
  const state = createSoakLivenessState();
  let samples = 0;
  let firstSampleMs: number | undefined;
  let lastSampleMs: number | undefined;
  let summaryFinishedMs: number | undefined;

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line) continue;

    const record = parseLine(line, index + 1);
    if (record.type === 'sample') {
      const sampledAtMs = parseTimestamp(record.sampledAt, `line ${index + 1} sampledAt`);
      if (lastSampleMs !== undefined && sampledAtMs < lastSampleMs) {
        throw new Error(`Soak sample timestamps regress at line ${index + 1}.`);
      }

      const responses = recordField(record, 'responses');
      const diag = recordField(responses, 'diag');
      const parsed = recordField(record, 'parsed');
      const script = recordField(parsed, 'script');
      const device = recordField(parsed, 'device');

      updateSoakLiveness(liveness, state, {
        sampledAtMs,
        sampleOk: record.ok === true,
        diagOk: diag?.ok === true,
        scriptRunning: booleanField(script?.running),
        deviceUptimeSec: numberField(device?.uptimeSec)
      });

      samples += 1;
      firstSampleMs ??= sampledAtMs;
      lastSampleMs = sampledAtMs;
      continue;
    }

    if (record.type === 'summary' && record.finishedAt !== undefined) {
      summaryFinishedMs = parseTimestamp(
        record.finishedAt,
        `line ${index + 1} finishedAt`
      );
    }
  }

  if (samples === 0 || firstSampleMs === undefined || lastSampleMs === undefined) {
    throw new Error('Soak JSONL contains no sample records.');
  }

  const finishedAtMs = Math.max(lastSampleMs, summaryFinishedMs ?? lastSampleMs);
  finalizeSoakLiveness(liveness, state, finishedAtMs);

  return {
    schemaVersion: 1,
    samples,
    firstSampleAt: new Date(firstSampleMs).toISOString(),
    lastSampleAt: new Date(lastSampleMs).toISOString(),
    finishedAt: new Date(finishedAtMs).toISOString(),
    liveness
  };
};

const main = async (): Promise<void> => {
  const input = process.argv[2]?.trim();
  if (!input) {
    throw new Error(
      'Usage: pnpm exec tsx scripts/hardware/shelly-soak-liveness-report.ts <soak.jsonl>'
    );
  }
  const path = resolve(input);
  const report = summarizeSoakJsonl(await readFile(path, 'utf8'));
  process.stdout.write(`${JSON.stringify({ source: path, ...report }, null, 2)}\n`);
};

const entrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entrypoint === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
