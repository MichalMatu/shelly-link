import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  fireIonChange,
  fireIonInput,
  getIonicInput,
  getIonicSelect,
  ionicValue
} from '../../../test/ionicTestEvents.js';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../app/i18n.js';
import { pulseCycleCopy } from '../../../app/locales/pulseCycle.js';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  parsePulseCycleForm,
  type PulseCycleFormDraft
} from '../data/pulseCycleForm.js';
import { PulseCycleEditor, type PulseCycleEditorContext } from './PulseCycleEditor.js';

const copy = pulseCycleCopy.pl;

const renderEditor = ({
  draft = DEFAULT_PULSE_CYCLE_FORM,
  optional = true,
  context = 'standalone',
  onChange = vi.fn()
}: {
  draft?: PulseCycleFormDraft;
  optional?: boolean;
  context?: PulseCycleEditorContext;
  onChange?: (patch: Partial<PulseCycleFormDraft>) => void;
} = {}) => {
  render(
    <I18nProvider>
      <PulseCycleEditor
        context={context}
        draft={draft}
        optional={optional}
        validation={parsePulseCycleForm(draft)}
        onChange={onChange}
      />
    </I18nProvider>
  );
  return onChange;
};

const selectOption = (label: string, optionLabel: string) => {
  // The frozen Climate composition still uses the shared HTML listbox.
  const legacy = screen.queryByRole('button', { name: label });
  if (legacy) {
    fireEvent.click(legacy);
    const listbox = screen.getByRole('listbox', { name: label });
    fireEvent.click(within(listbox).getByRole('option', { name: optionLabel }));
    return;
  }
  const segment = document.querySelector<HTMLElement>(
    `ion-segment[aria-label="${label}"]`
  );
  if (segment) {
    const target = Array.from(segment.querySelectorAll('ion-segment-button')).find(
      (button) => button.textContent === optionLabel
    );
    if (!target) throw new Error(`Unknown segment option: ${optionLabel}`);
    fireIonChange(segment, target.getAttribute('value'));
    return;
  }
  const select = getIonicSelect(document, label);
  const target = Array.from(select.querySelectorAll('ion-select-option')).find(
    (option) => option.textContent === optionLabel
  );
  if (!target) throw new Error(`Unknown select option: ${optionLabel}`);
  fireIonChange(select, target.getAttribute('value'));
};

describe('PulseCycleEditor', () => {
  it('keeps optional Pulse compact while output behavior is Steady', () => {
    renderEditor();
    expect(ionicValue(document.querySelector('ion-segment')!)).toBe('steady');
    expect(screen.queryByText(copy.onSeconds)).not.toBeInTheDocument();
  });

  it('explains Climate as the parent decision and Pulse as output behavior', () => {
    renderEditor({ context: 'climate' });
    expect(screen.getByLabelText(copy.climateOutputBehavior)).toHaveValue('steady');
    expect(screen.getByText(copy.climateHint)).toBeVisible();
    selectOption(copy.climateOutputBehavior, copy.pulseOnOff);
  });

  it('explains Time as the active window and Pulse as behavior inside it', () => {
    renderEditor({ context: 'time' });
    expect(ionicValue(document.querySelector('ion-segment')!)).toBe('steady');
    expect(screen.getByText(copy.timeHint)).toBeVisible();
    selectOption(copy.timeOutputBehavior, copy.steadyOn);
  });

  it('switches the shared optional editor to Pulse', () => {
    const onChange = renderEditor();
    selectOption(copy.outputBehavior, copy.pulse);
    expect(onChange).toHaveBeenCalledWith({ enabled: true });
  });

  it('shows Pulse parameters and mode-specific cycle count when enabled', () => {
    const draft: PulseCycleFormDraft = {
      ...DEFAULT_PULSE_CYCLE_FORM,
      enabled: true,
      executionMode: 'cycles'
    };
    const onChange = renderEditor({ draft });
    expect(screen.getByText(copy.onSeconds)).toBeInTheDocument();
    expect(screen.getByText(copy.offSeconds)).toBeInTheDocument();
    expect(screen.getByText(copy.cycleCount)).toBeInTheDocument();
    selectOption(copy.startPhase, copy.startOff);
    expect(onChange).toHaveBeenCalledWith({ startPhase: 'off' });
  });

  it('always shows the same parameters for standalone Pulse', () => {
    renderEditor({ optional: false });
    expect(screen.getByText(copy.description)).toBeInTheDocument();
    expect(screen.getByText(copy.onSeconds)).toBeInTheDocument();
  });

  it('keeps Climate control markup unchanged while migrating Time and Pulse', () => {
    renderEditor({ context: 'climate', draft: { ...DEFAULT_PULSE_CYCLE_FORM, enabled: true } });
    expect(document.querySelector('ion-input')).toBeNull();
    expect(document.querySelector('ion-select')).toBeNull();
    expect(document.querySelector('ion-segment')).toBeNull();
    expect(screen.getAllByRole('spinbutton').length).toBeGreaterThan(0);
  });

  it('sends Ionic decimal input as a string without changing form ownership', () => {
    const onChange = renderEditor({
      draft: { ...DEFAULT_PULSE_CYCLE_FORM, enabled: true }
    });
    fireIonInput(getIonicInput(document, copy.onSeconds), '12.5');
    expect(onChange).toHaveBeenCalledWith({ onSecondsInput: '12.5' });
  });

  it('renders validation feedback on the invalid shared field', () => {
    const draft = {
      ...DEFAULT_PULSE_CYCLE_FORM,
      enabled: true,
      onSecondsInput: '0.5'
    };
    renderEditor({ draft });
    const input = getIonicInput(document, copy.onSeconds);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(copy.invalidValue)).toBeInTheDocument();
  });
});
