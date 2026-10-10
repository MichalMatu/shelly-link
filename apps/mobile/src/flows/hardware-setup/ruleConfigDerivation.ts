import { t } from '../../app/i18n.js';
import type { SensorDraftDevice } from './setupDraftStore.js';
import { normalizeRuntimeAddress, normalizeShellyUrl } from './validation.js';

export type ShellyInputState =
  | { ok: true; baseUrl: string; name: string }
  | { ok: false; fieldErrors: { name?: string; url?: string } };

export type SensorInputState =
  | { ok: true; device: SensorDraftDevice }
  | { ok: false; fieldErrors: { name?: string; mac?: string } };

export const deriveShellyInputState = ({
  shellyNameInput,
  shellyUrlInput
}: {
  shellyNameInput: string;
  shellyUrlInput: string;
}): ShellyInputState => {
  const fieldErrors: { name?: string; url?: string } = {};
  const name = shellyNameInput.trim();
  if (name.length === 0) {
    fieldErrors.name = t('hardware.validation.shellyNameRequired');
  }

  let baseUrl = '';
  try {
    baseUrl = normalizeShellyUrl(shellyUrlInput);
  } catch {
    fieldErrors.url =
      shellyUrlInput.trim().length === 0
        ? t('hardware.validation.shellyIpRequired')
        : t('hardware.validation.shellyIpInvalid');
  }

  return fieldErrors.name || fieldErrors.url
    ? { ok: false, fieldErrors }
    : { ok: true, baseUrl, name };
};

export const deriveSensorInputState = ({
  sensorMacInput,
  sensorNameInput,
  sensorProfileInput
}: {
  sensorMacInput: string;
  sensorNameInput: string;
  sensorProfileInput: SensorDraftDevice['profileId'];
}): SensorInputState => {
  const fieldErrors: { name?: string; mac?: string } = {};
  const name = sensorNameInput.trim();
  if (name.length === 0) {
    fieldErrors.name = t('hardware.validation.sensorNameRequired');
  }

  let runtimeAddress = '';
  if (sensorMacInput.trim().length === 0) {
    fieldErrors.mac = t('hardware.validation.sensorMacRequired');
  } else {
    try {
      runtimeAddress = normalizeRuntimeAddress(sensorMacInput);
    } catch {
      fieldErrors.mac = t('hardware.validation.sensorMacFormat');
    }
  }

  if (fieldErrors.name || fieldErrors.mac) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    device: {
      id: runtimeAddress,
      name,
      runtimeAddress,
      profileId: sensorProfileInput
    }
  };
};
