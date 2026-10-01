import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../app/i18n.js';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  parsePulseCycleForm,
  type PulseCycleFormDraft
} from '../data/pulseCycleForm.js';
import { PulseCycleEditor } from './PulseCycleEditor.js';

const renderEditor = ({
  draft = DEFAULT_PULSE_CYCLE_FORM,
  optional = true,
  onChange = vi.fn()
}: {
  draft?: PulseCycleFormDraft;
  optional?: boolean;
  onChange?: (patch: Partial<PulseCycleFormDraft>) => void;
} = {}) => {
  render(
    <I18nProvider>
      <PulseCycleEditor
        draft={draft}
        optional={optional}
        validation={parsePulseCycleForm(draft)}
        onChange={onChange}
      />
    </I18nProvider>
  );
  return onChange;
};

describe('PulseCycleEditor', () => {
  it('keeps optional Pulse compact while output behavior is Steady', () => {
    renderEditor();
    expect(screen.getByLabelText('Zachowanie wyjścia')).toHaveValue('steady');
    expect(screen.queryByText('Czas ON (s)')).not.toBeInTheDocument();
  });

  it('switches the shared optional editor to Pulse', () => {
    const onChange = renderEditor();
    fireEvent.change(screen.getByLabelText('Zachowanie wyjścia'), {
      target: { value: 'pulse' }
    });
    expect(onChange).toHaveBeenCalledWith({ enabled: true });
  });

  it('shows Pulse parameters and mode-specific cycle count when enabled', () => {
    const draft: PulseCycleFormDraft = {
      ...DEFAULT_PULSE_CYCLE_FORM,
      enabled: true,
      executionMode: 'cycles'
    };
    const onChange = renderEditor({ draft });
    expect(screen.getByText('Czas ON (s)')).toBeInTheDocument();
    expect(screen.getByText('Czas OFF (s)')).toBeInTheDocument();
    expect(screen.getByText('Liczba cykli')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Faza startowa'), {
      target: { value: 'off' }
    });
    expect(onChange).toHaveBeenCalledWith({ startPhase: 'off' });
  });

  it('always shows the same parameters for standalone Pulse', () => {
    renderEditor({ optional: false });
    expect(
      screen.getByText('Przełączaj przekaźnik ON/OFF jednym wspólnym cyklem Pulse.')
    ).toBeInTheDocument();
    expect(screen.getByText('Czas ON (s)')).toBeInTheDocument();
  });

  it('renders validation feedback on the invalid shared field', () => {
    const draft = {
      ...DEFAULT_PULSE_CYCLE_FORM,
      enabled: true,
      onSecondsInput: '0.5'
    };
    renderEditor({ draft });
    const input = screen.getByLabelText('Czas ON (s)');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Sprawdź dozwolony zakres wartości.')).toBeInTheDocument();
  });
});
