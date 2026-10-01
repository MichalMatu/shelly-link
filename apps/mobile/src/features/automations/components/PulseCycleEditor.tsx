import { SelectField } from '@lcl/ui';
import { useId } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { pulseCycleCopy } from '../../../app/locales/pulseCycle.js';
import type {
  PulseCycleFormDraft,
  PulseCycleFormField,
  PulseCycleFormValidation
} from '../data/pulseCycleForm.js';

type PulseCycleEditorProps = {
  draft: PulseCycleFormDraft;
  validation: PulseCycleFormValidation;
  optional?: boolean;
  onChange(patch: Partial<PulseCycleFormDraft>): void;
};

export const PulseCycleEditor = ({
  draft,
  validation,
  optional = true,
  onChange
}: PulseCycleEditorProps) => {
  const { locale } = useTranslation();
  const copy = pulseCycleCopy[locale];
  const errorIdPrefix = useId();
  const fieldErrors = validation.ok ? {} : validation.fieldErrors;
  const visible = optional ? draft.enabled : true;

  const numberField = (
    field: PulseCycleFormField,
    label: string,
    value: string,
    step: string,
    minimum = '0'
  ) => {
    const invalid = fieldErrors[field] !== undefined;
    const errorId = `${errorIdPrefix}-${field}`;
    return (
      <label className={invalid ? 'field field--invalid' : 'field'}>
        <span>{label}</span>
        <input
          aria-describedby={invalid ? errorId : undefined}
          aria-invalid={invalid}
          min={minimum}
          step={step}
          type="number"
          value={value}
          onChange={(event) => onChange({ [field]: event.currentTarget.value })}
        />
        {invalid && (
          <span className="field__error" id={errorId}>
            {copy.invalidValue}
          </span>
        )}
      </label>
    );
  };

  return (
    <section aria-label={copy.title}>
      {optional ? (
        <div className="field">
          <span>{copy.outputBehavior}</span>
          <SelectField<'steady' | 'pulse'>
            ariaLabel={copy.outputBehavior}
            value={draft.enabled ? 'pulse' : 'steady'}
            options={[
              { value: 'steady', label: copy.steady },
              { value: 'pulse', label: copy.pulse }
            ]}
            onChange={(value) => onChange({ enabled: value === 'pulse' })}
          />
        </div>
      ) : (
        <div className="field">
          <strong>{copy.title}</strong>
          <span>{copy.description}</span>
        </div>
      )}

      {visible && (
        <>
          <div className="field-row">
            {numberField('onSecondsInput', copy.onSeconds, draft.onSecondsInput, '0.001', '1')}
            {numberField(
              'offSecondsInput',
              copy.offSeconds,
              draft.offSecondsInput,
              '0.001',
              '1'
            )}
          </div>
          {numberField(
            'initialDelaySecondsInput',
            copy.initialDelaySeconds,
            draft.initialDelaySecondsInput,
            '0.001'
          )}

          <div className="field-row">
            <div className="field">
              <span>{copy.startPhase}</span>
              <SelectField<'on' | 'off'>
                ariaLabel={copy.startPhase}
                value={draft.startPhase}
                options={[
                  { value: 'on', label: copy.startOn },
                  { value: 'off', label: copy.startOff }
                ]}
                onChange={(startPhase) => onChange({ startPhase })}
              />
            </div>
            <div className="field">
              <span>{copy.execution}</span>
              <SelectField<'continuous' | 'cycles' | 'duration'>
                ariaLabel={copy.execution}
                value={draft.executionMode}
                options={[
                  { value: 'continuous', label: copy.continuous },
                  { value: 'cycles', label: copy.cycles },
                  { value: 'duration', label: copy.duration }
                ]}
                onChange={(executionMode) => onChange({ executionMode })}
              />
            </div>
          </div>

          {draft.executionMode === 'cycles' &&
            numberField('cyclesInput', copy.cycleCount, draft.cyclesInput, '1', '1')}
          {draft.executionMode === 'duration' &&
            numberField(
              'durationSecondsInput',
              copy.durationSeconds,
              draft.durationSecondsInput,
              '0.001',
              '1'
            )}
        </>
      )}
    </section>
  );
};
