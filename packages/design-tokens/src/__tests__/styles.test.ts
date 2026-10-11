import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

describe('design-token CSS color companions', () => {
  it('generates RGB triplets for light and dark theme colors', () => {
    expect(styles).toContain('--lcl-color-background-rgb: 245, 245, 247;');
    expect(styles).toContain('--lcl-color-text-rgb: 29, 29, 31;');
    expect(styles).toContain('--lcl-color-accent-rgb: 0, 122, 255;');
    expect(styles).toContain('--lcl-color-background-rgb: 28, 28, 30;');
    expect(styles).toContain('--lcl-color-text-rgb: 245, 245, 247;');
    expect(styles).toContain('--lcl-color-accent-rgb: 10, 132, 255;');
  });
});
