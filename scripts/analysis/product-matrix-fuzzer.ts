#!/usr/bin/env node

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import {
  PRODUCT_MATRIX_DEFAULT_CASES,
  PRODUCT_MATRIX_DEFAULT_SEED,
  generateProductMatrixCases,
  type ProductMatrixCase,
  type ProductMatrixMode
} from './product-matrix/cases.js';
import {
  assertProductMatrixCoverage,
  buildProductMatrixCoverageReport,
  isProductMatrixCase,
  replayProductMatrixCase
} from './product-matrix/replay.js';

interface CliOptions {
  cases: number;
  seed: number;
  mode: ProductMatrixMode;
  outDir: string;
  replayPersistent?: string;
  replayCorpus?: string;
  selfTest: boolean;
}

const usage = `Shelly Link deterministic product matrix

Usage:
  pnpm test:product-matrix
  pnpm exec tsx scripts/analysis/product-matrix-fuzzer.ts --cases 1000 --seed 1337 --mode mixed
  pnpm exec tsx scripts/analysis/product-matrix-fuzzer.ts --replay-corpus test/fixtures/product-matrix

Options:
  --cases <n>               Generated case count (default ${PRODUCT_MATRIX_DEFAULT_CASES})
  --seed <n>                Deterministic seed (default ${PRODUCT_MATRIX_DEFAULT_SEED})
  --mode <valid|invalid|mixed>
  --out-dir <path>          Generated replayable corpus directory
  --replay-persistent <dir> Replay persistent regression fixtures after generated cases
  --replay-corpus <dir>     Replay an existing corpus without generating new cases
  --self-test               Prove deterministic generation + replay + coverage
  --help                    Show this help
`;

const parseInteger = (value: string | undefined, label: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer.`);
  return parsed;
};

const parseArgs = (argv: readonly string[]): CliOptions => {
  const options: CliOptions = {
    cases: PRODUCT_MATRIX_DEFAULT_CASES,
    seed: PRODUCT_MATRIX_DEFAULT_SEED,
    mode: 'mixed',
    outDir: join(tmpdir(), 'shelly-link-product-matrix'),
    selfTest: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--cases':
        options.cases = parseInteger(argv[++index], '--cases');
        break;
      case '--seed':
        options.seed = parseInteger(argv[++index], '--seed');
        break;
      case '--mode': {
        const mode = argv[++index];
        if (mode !== 'valid' && mode !== 'invalid' && mode !== 'mixed') {
          throw new Error('--mode must be valid, invalid, or mixed.');
        }
        options.mode = mode;
        break;
      }
      case '--out-dir':
        options.outDir = resolve(argv[++index] ?? '');
        break;
      case '--replay-persistent':
        options.replayPersistent = resolve(argv[++index] ?? '');
        break;
      case '--replay-corpus':
        options.replayCorpus = resolve(argv[++index] ?? '');
        break;
      case '--self-test':
        options.selfTest = true;
        break;
      case '--help':
      case '-h':
        console.log(usage);
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${String(argument)}\n\n${usage}`);
    }
  }
  return options;
};

const sanitizeName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const writeCorpus = async (
  outDir: string,
  cases: readonly ProductMatrixCase[],
  report: unknown
): Promise<void> => {
  await rm(outDir, { recursive: true, force: true });
  const casesDir = join(outDir, 'cases');
  await mkdir(casesDir, { recursive: true });
  await Promise.all(
    cases.map((matrixCase) =>
      writeFile(
        join(
          casesDir,
          `${String(matrixCase.caseIndex).padStart(4, '0')}-${sanitizeName(matrixCase.name)}.json`
        ),
        `${JSON.stringify(matrixCase, null, 2)}\n`,
        'utf8'
      )
    )
  );
  await writeFile(join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

const listJsonFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return listJsonFiles(fullPath);
      return entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'report.json'
        ? [fullPath]
        : [];
    })
  );
  return nested.flat().sort();
};

const loadCorpus = async (directory: string): Promise<ProductMatrixCase[]> => {
  const files = await listJsonFiles(directory);
  const cases: ProductMatrixCase[] = [];
  for (const file of files) {
    const parsed = JSON.parse(await readFile(file, 'utf8')) as unknown;
    const values = Array.isArray(parsed) ? parsed : [parsed];
    for (const value of values) {
      if (!isProductMatrixCase(value)) {
        throw new Error(`Invalid product matrix fixture: ${file}.`);
      }
      cases.push(value);
    }
  }
  return cases;
};

const replayCases = (cases: readonly ProductMatrixCase[], source: string): void => {
  for (const matrixCase of cases) {
    try {
      replayProductMatrixCase(matrixCase);
    } catch (error) {
      throw new Error(
        `${source}: ${matrixCase.name} [case=${matrixCase.caseIndex} seed=${matrixCase.seed}] failed: ${String(error)}`
      );
    }
  }
};

const runSelfTest = (): void => {
  const first = generateProductMatrixCases(256, PRODUCT_MATRIX_DEFAULT_SEED, 'mixed');
  const second = generateProductMatrixCases(256, PRODUCT_MATRIX_DEFAULT_SEED, 'mixed');
  const different = generateProductMatrixCases(256, PRODUCT_MATRIX_DEFAULT_SEED + 1, 'mixed');

  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error('Product matrix self-test failed: same seed produced different corpus.');
  }
  if (JSON.stringify(first) === JSON.stringify(different)) {
    throw new Error('Product matrix self-test failed: different seed produced identical corpus.');
  }
  const ids = new Set(first.map((matrixCase) => `${matrixCase.caseIndex}:${matrixCase.seed}`));
  if (ids.size !== first.length) {
    throw new Error('Product matrix self-test failed: duplicate generated case identity.');
  }
  replayCases(first, 'self-test');
  assertProductMatrixCoverage(first, 'mixed');
  console.log(`Product matrix self-test passed (${first.length} deterministic cases).`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  if (options.selfTest) runSelfTest();

  if (options.replayCorpus) {
    const cases = await loadCorpus(options.replayCorpus);
    if (cases.length === 0) throw new Error(`No product matrix cases found in ${options.replayCorpus}.`);
    replayCases(cases, basename(options.replayCorpus));
    console.log(`Product matrix replay passed (${cases.length} persistent cases).`);
    return;
  }

  const cases = generateProductMatrixCases(options.cases, options.seed, options.mode);
  replayCases(cases, 'generated corpus');
  const coverage = assertProductMatrixCoverage(cases, options.mode);

  let persistentCount = 0;
  if (options.replayPersistent) {
    const persistent = await loadCorpus(options.replayPersistent);
    replayCases(persistent, 'persistent corpus');
    persistentCount = persistent.length;
  }

  const report = {
    schema: 'shelly-link-product-matrix-report.v1',
    seed: options.seed,
    mode: options.mode,
    generatedCases: cases.length,
    persistentCases: persistentCount,
    coverage: buildProductMatrixCoverageReport(cases)
  };
  await writeCorpus(options.outDir, cases, report);

  console.log(
    `Product matrix passed: ${coverage.total} generated (${coverage.accepted} accept / ${coverage.rejected} reject)` +
      `${persistentCount > 0 ? ` + ${persistentCount} persistent` : ''}; seed=${options.seed}; corpus=${options.outDir}`
  );
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
