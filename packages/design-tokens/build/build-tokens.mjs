import { mkdir, readFile, writeFile } from 'node:fs/promises';
import prettier from 'prettier';

const tokensUrl = new URL('../tokens/tokens.json', import.meta.url);
const distUrl = new URL('../dist/', import.meta.url);
const srcUrl = new URL('../src/', import.meta.url);
const tokens = JSON.parse(await readFile(tokensUrl, 'utf8'));
const { theme, ...baseTokens } = tokens;

const kebab = (value) =>
  value
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/^2xl$/, '2xl');

const flatten = (node, path = []) =>
  Object.entries(node).flatMap(([key, value]) => {
    const normalizedKey = kebab(key);
    if (
      path.length === 0 &&
      normalizedKey === 'typography' &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return [
        [['font-family'], String(value.fontFamily)],
        [['font-mono'], String(value.monoFamily)]
      ];
    }

    const nextPath =
      path.length === 0 && normalizedKey === 'status'
        ? ['color', 'status']
        : [...path, normalizedKey];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value, nextPath);
    }

    return [[nextPath.join('-'), String(value)]];
  });

const hexRgbTriplet = (value) => {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) {
    return null;
  }

  const hex = match[1];
  return [0, 2, 4]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
    .join(', ');
};

const cssVariableLines = (tokenGroup) =>
  flatten(tokenGroup).flatMap(([name, value]) => {
    const variableName = String(name);
    const lines = [`  --lcl-${variableName}: ${value};`];
    const rgb = variableName.startsWith('color-') ? hexRgbTriplet(value) : null;
    if (rgb) {
      lines.push(`  --lcl-${variableName}-rgb: ${rgb};`);
    }
    return lines;
  });

const lightVariableLines = cssVariableLines(baseTokens);
const darkVariableLines = cssVariableLines(theme?.dark ?? {});

const cssSource = [
  ':root {',
  '  color-scheme: light;',
  ...lightVariableLines,
  '}',
  '',
  '@media (prefers-color-scheme: dark) {',
  "  :root:not([data-lcl-theme='light']) {",
  '    color-scheme: dark;',
  ...darkVariableLines.map((line) => `  ${line}`),
  '  }',
  '}',
  '',
  ":root[data-lcl-theme='light'] {",
  '  color-scheme: light;',
  '}',
  '',
  ":root[data-lcl-theme='dark'] {",
  '  color-scheme: dark;',
  ...darkVariableLines,
  '}',
  ''
].join('\n');

const tsSource = `export const tokens = ${JSON.stringify(tokens, null, 2)} as const;\n\nexport type DesignTokens = typeof tokens;\n`;
const prettierConfig = (await prettier.resolveConfig(new URL('../src/index.ts', import.meta.url))) ?? {};
const css = await prettier.format(cssSource, { ...prettierConfig, parser: 'css' });
const ts = await prettier.format(tsSource, { ...prettierConfig, parser: 'typescript' });

await mkdir(distUrl, { recursive: true });
await mkdir(srcUrl, { recursive: true });
await writeFile(new URL('styles.css', distUrl), css);
await writeFile(new URL('tokens.json', distUrl), `${JSON.stringify(tokens, null, 2)}\n`);
await writeFile(new URL('styles.css', srcUrl), css);
await writeFile(new URL('index.ts', srcUrl), ts);
