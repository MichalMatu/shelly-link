#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.cwd();
const budget = JSON.parse(
  await readFile(join(root, 'scripts/quality/performance-budgets.json'), 'utf8')
);

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

const distRoot = join(root, 'apps/mobile/dist');
let distFiles;
try {
  distFiles = await walk(distRoot);
} catch {
  throw new Error(
    'Mobile dist is missing. Run the mobile build before quality:performance.'
  );
}
const jsFiles = distFiles.filter((file) => file.endsWith('.js'));
const cssFiles = distFiles.filter((file) => file.endsWith('.css'));
const sizes = async (files) =>
  Promise.all(files.map(async (file) => ({ file, bytes: (await stat(file)).size })));
const jsSizes = await sizes(jsFiles);
const cssSizes = await sizes(cssFiles);
const totalJsBytes = jsSizes.reduce((sum, item) => sum + item.bytes, 0);
const largestJs = jsSizes.reduce(
  (largest, item) => (item.bytes > largest.bytes ? item : largest),
  { file: '', bytes: 0 }
);
const totalCssBytes = cssSizes.reduce((sum, item) => sum + item.bytes, 0);

const sourceRoot = join(root, 'apps/mobile/src');
const sourceFiles = (await walk(sourceRoot)).filter(
  (file) =>
    /\.(?:ts|tsx)$/.test(file) &&
    !file.includes('.test.') &&
    !file.includes('/__tests__/') &&
    !file.includes('/e2e/')
);
const minimum = budget.source.minPollingIntervalMs;
const pollingViolations = [];
const numericValue = (literal) => Number(literal.replaceAll('_', ''));
for (const file of sourceFiles) {
  const content = await readFile(file, 'utf8');
  const patterns = [
    {
      name: 'named polling constant',
      regex:
        /\b(?:const|let)\s+([A-Z0-9_]*(?:REFRESH|POLL|INTERVAL)[A-Z0-9_]*)\s*=\s*([0-9][0-9_]*)/g,
      valueIndex: 2
    },
    {
      name: 'literal refetchInterval',
      regex: /\brefetchInterval\s*:\s*([0-9][0-9_]*)/g,
      valueIndex: 1
    },
    {
      name: 'literal setInterval',
      regex: /\bsetInterval\([\s\S]{0,160}?,\s*([0-9][0-9_]*)\s*\)/g,
      valueIndex: 1
    }
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern.regex)) {
      const value = numericValue(match[pattern.valueIndex]);
      if (value < minimum) {
        pollingViolations.push({
          file: relative(root, file),
          kind: pattern.name,
          valueMs: value
        });
      }
    }
  }
}

const failures = [];
if (totalJsBytes > budget.mobileDist.totalJsBytes) {
  failures.push(`total JS ${totalJsBytes} B exceeds ${budget.mobileDist.totalJsBytes} B`);
}
if (largestJs.bytes > budget.mobileDist.largestJsBytes) {
  failures.push(
    `largest JS ${largestJs.bytes} B exceeds ${budget.mobileDist.largestJsBytes} B`
  );
}
if (totalCssBytes > budget.mobileDist.totalCssBytes) {
  failures.push(
    `total CSS ${totalCssBytes} B exceeds ${budget.mobileDist.totalCssBytes} B`
  );
}
if (jsFiles.length > budget.mobileDist.maxJsFiles) {
  failures.push(
    `JS file count ${jsFiles.length} exceeds ${budget.mobileDist.maxJsFiles}`
  );
}
for (const violation of pollingViolations) {
  failures.push(
    `${violation.file}: ${violation.kind} ${violation.valueMs} ms is below ${minimum} ms`
  );
}

console.log(
  `Performance budget: JS=${totalJsBytes} B, largest=${largestJs.bytes} B, CSS=${totalCssBytes} B, chunks=${jsFiles.length}, minPoll=${minimum} ms`
);
if (failures.length > 0) {
  throw new Error(`Performance budget failed:\n- ${failures.join('\n- ')}`);
}
console.log('Performance budget passed.');
