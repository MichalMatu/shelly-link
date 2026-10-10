import { IonInput, IonLabel, IonSegment, IonSegmentButton, IonSelect, IonSelectOption } from '@ionic/react';
import { SelectField } from '@lcl/ui';
import { useId } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { pulseCycleCopy } from '../../../app/locales/pulseCycle.js';
import './PulseCycleEditor.css';
import type {
  PulseCycleFormDraft,
  PulseCycleFormField,
  PulseCycleFormValidation
} from '../data/pulseCycleForm.js';

export type PulseCycleEditorContext = 'climate' | 'time' | 'standalone';

type PulseCycleEditorProps = {
  draft: PulseCycleFormDraft;
  context?: PulseCycleEditorContext;
  validation: PulseCycleFormValidation;
  optional?: boolean;
  onChange(patch: Partial<PulseCycleFormDraft>): void;
};

export const PulseCycleEditor = ({
  draft,
  context = 'standalone',
  validation,
  optional = true,
  onChange
}: PulseCycleEditorProps) => {
  const { locale } = useTranslation();
  const copy = pulseCycleCopy[locale];
  const errorIdPrefix = useId();
  const fieldErrors = validation.ok ? {} : validation.fieldErrors;
  const visible = optional ? draft.enabled : true;
  // Keep the accepted Climate editor geometry while migrating Time and standalone Pulse.
  const useIonicControls = context !== 'climate';
  const behaviorCopy =
    context === 'climate'
      ? {
          label: copy.climateOutputBehavior,
          hint: copy.climateHint,
          steady: copy.steadyOn,
          pulse: copy.pulseOnOff
        }
      : context === 'time'
        ? {
            label: copy.timeOutputBehavior,
            hint: copy.timeHint,
            steady: copy.steadyOn,
            pulse: copy.pulseOnOff
          }
        : {
            label: copy.outputBehavior,
            hint: null,
            steady: copy.steady,
            pulse: copy.pulse
          };

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
        {useIonicControls ? (
          <IonInput
            aria-label={label}
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={String(invalid)}
            className="pulse-cycle-ionic-input"
            fill="outline"
            inputmode="decimal"
            min={minimum}
            step={step}
            type="number"
            value={value}
            onIonInput={(event) => onChange({ [field]: String(event.detail.value ?? '') })}
          />
        ) : (
          <input
            aria-describedby={invalid ? errorId : undefined}
            aria-invalid={invalid}
            min={minimum}
            step={step}
            type="number"
            value={value}
            onChange={(event) => onChange({ [field]: event.currentTarget.value })}
          />
        )}
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
          <span>{behaviorCopy.label}</span>
          {useIonicControls ? (
            <IonSegment
              aria-label={behaviorCopy.label}
              className="pulse-cycle-ionic-segment"
              value={draft.enabled ? 'pulse' : 'steady'}
              onIonChange={(event) => {
                if (event.detail.value === 'steady' || event.detail.value === 'pulse') {
                  onChange({ enabled: event.detail.value === 'pulse' });
                }
              }}
            >
              <IonSegmentButton value="steady">
                <IonLabel>{behaviorCopy.steady}</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="pulse">
                <IonLabel>{behaviorCopy.pulse}</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          ) : (
            <SelectField<'steady' | 'pulse'>
              ariaLabel={behaviorCopy.label}
              value={draft.enabled ? 'pulse' : 'steady'}
              options={[
                { value: 'steady', label: behaviorCopy.steady },
                { value: 'pulse', label: behaviorCopy.pulse }
              ]}
              onChange={(value) => onChange({ enabled: value === 'pulse' })}
            />
          )}
          {behaviorCopy.hint && <span className="field__hint">{behaviorCopy.hint}</span>}
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
            {numberField(
              'onSecondsInput',
              copy.onSeconds,
              draft.onSecondsInput,
              '0.001',
              '1'
            )}
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
              {useIonicControls ? (
                <IonSelect
                  aria-label={copy.startPhase}
                  className="pulse-cycle-ionic-select"
                  fill="outline"
                  interface="alert"
                  value={draft.startPhase}
                  onIonChange={(event) => {
                    if (event.detail.value === 'on' || event.detail.value === 'off') {
                      onChange({ startPhase: event.detail.value });
                    }
                  }}
                >
                  <IonSelectOption value="on">{copy.startOn}</IonSelectOption>
                  <IonSelectOption value="off">{copy.startOff}</IonSelectOption>
                </IonSelect>
              ) : (
                <SelectField<'on' | 'off'>
                  ariaLabel={copy.startPhase}
                  value={draft.startPhase}
                  options={[
                    { value: 'on', label: copy.startOn },
                    { value: 'off', label: copy.startOff }
                  ]}
                  onChange={(startPhase) => onChange({ startPhase })}
                />
              )}
            </div>
            <div className="field">
              <span>{copy.execution}</span>
              {useIonicControls ? (
                <IonSelect
                  aria-label={copy.execution}
                  className="pulse-cycle-ionic-select"
                  fill="outline"
                  interface="alert"
                  value={draft.executionMode}
                  onIonChange={(event) => {
                    const value = event.detail.value;
                    if (value === 'continuous' || value === 'cycles' || value === 'duration') {
                      onChange({ executionMode: value });
                    }
                  }}
                >
                  <IonSelectOption value="continuous">{copy.continuous}</IonSelectOption>
                  <IonSelectOption value="cycles">{copy.cycles}</IonSelectOption>
                  <IonSelectOption value="duration">{copy.duration}</IonSelectOption>
                </IonSelect>
              ) : (
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
              )}
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
