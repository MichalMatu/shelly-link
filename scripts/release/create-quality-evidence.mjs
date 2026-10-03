#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

if (process.env.LCL_RELEASE_QUALIFIED !== '1') {
  throw new Error(
    'Quality evidence may only be emitted by release:qualify after all required gates pass.'
  );
}

const root = process.cwd();
const git = (...args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    })
  );
  return nested.flat();
};
const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex');

const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const budgets = JSON.parse(
  await readFile(join(root, 'scripts/quality/performance-budgets.json'), 'utf8')
);
const distRoot = join(root, 'apps/mobile/dist');
const files = await walk(distRoot);
const artifactFiles = files.filter((file) => /\.(?:js|css|html)$/.test(file));
const artifacts = await Promise.all(
  artifactFiles.map(async (file) => ({
    path: relative(root, file),
    bytes: (await stat(file)).size,
    sha256: await sha256(file)
  }))
);
const js = artifacts.filter((item) => item.path.endsWith('.js'));
const css = artifacts.filter((item) => item.path.endsWith('.css'));
const observed = {
  totalJsBytes: js.reduce((sum, item) => sum + item.bytes, 0),
  largestJsBytes: js.reduce((largest, item) => Math.max(largest, item.bytes), 0),
  totalCssBytes: css.reduce((sum, item) => sum + item.bytes, 0),
  jsFileCount: js.length
};
const gitSha = git('rev-parse', 'HEAD');
const shortSha = gitSha.slice(0, 12);
const evidence = {
  schema: 'shelly-link-release-quality-evidence.v1',
  generatedAt: new Date().toISOString(),
  gitSha,
  version: packageJson.version,
  runtime: {
    node: process.version,
    pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim()
  },
  qualification: {
    command:
      process.env.LCL_HARDWARE_QUALIFIED === '1'
        ? 'pnpm release:qualify:hardware'
        : 'pnpm release:qualify',
    canonicalCheck: true,
    responsive: true,
    visualContract: true,
    hardwareMatrix: process.env.LCL_HARDWARE_QUALIFIED === '1'
  },
  productMatrix: {
    seed: 1337,
    generatedCases: 1000,
    persistentCorpus: 'test/fixtures/product-matrix'
  },
  performance: { budgets, observed },
  artifacts
};

const outDir = join(root, 'artifacts/release-evidence');
await mkdir(outDir, { recursive: true });
const jsonPath = join(outDir, `${shortSha}.json`);
const mdPath = join(outDir, `${shortSha}.md`);
await writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
await writeFile(
  mdPath,
  `# Shelly Link release quality evidence\n\n- Version: ${evidence.version}\n- Commit: ${gitSha}\n- Generated: ${evidence.generatedAt}\n- Canonical check: PASS\n- Responsive: PASS\n- Visual contract: PASS\n- Hardware matrix: ${evidence.qualification.hardwareMatrix ? 'PASS' : 'not run'}\n- Product matrix: 1000 generated cases, seed 1337 + persistent corpus\n- Mobile JS: ${observed.totalJsBytes} B total; ${observed.largestJsBytes} B largest chunk\n- Mobile CSS: ${observed.totalCssBytes} B total\n- Hashed build artifacts: ${artifacts.length}\n`,
  'utf8'
);
console.log(
  `Release quality evidence: ${relative(root, jsonPath)} and ${relative(root, mdPath)}`
);
