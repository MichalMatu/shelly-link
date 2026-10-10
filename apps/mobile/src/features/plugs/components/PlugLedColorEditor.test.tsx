import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlugLedColorEditor } from './PlugLedColorEditor.js';

describe('PlugLedColorEditor Ionic controls', () => {
  it('keeps custom hue, saturation and lightness sliders typed and applies RGB values', () => {
    const onChange = vi.fn();
    render(
      <PlugLedColorEditor
        ariaPrefix="LED"
        colorLabel="Kolor"
        defaultLabel="Domyślny"
        customLabel="Własny"
        customTitle="Własny kolor"
        hueLabel="Odcień"
        saturationLabel="Nasycenie"
        lightnessLabel="Jasność"
        applyLabel="Zastosuj"
        cancelLabel="Anuluj"
        fallbackValue={[0, 100, 0]}
        value={null}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'LED Własny' }));
    const sliders = Array.from(document.querySelectorAll('ion-range'));
    expect(sliders).toHaveLength(3);
    expect(document.querySelector('input[type="range"]')).toBeNull();
    fireEvent(
      sliders[0]!,
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: 180 }
      })
    );
    expect(sliders[0]).toHaveProperty('value', 180);
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj' }));
    expect(onChange).toHaveBeenCalledOnce();
    const result = onChange.mock.calls[0]?.[0] as number[];
    expect(result).toHaveLength(3);
    expect(result.every((channel) => channel >= 0 && channel <= 100)).toBe(true);
  });
});
