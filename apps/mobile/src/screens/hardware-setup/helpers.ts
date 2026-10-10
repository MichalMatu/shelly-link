import type { HardwareSetupFlow } from '../../flows/hardware-setup/useHardwareSetupFlow.js';
import { t } from '../../app/i18n.js';

// Only approved, translated diagnostic guidance may cross the UI boundary.
// Transport/server messages remain available in diagnostic logs, not in toast copy.
const safeFeedbackKeys = [
  'hardware.shelly.invalidResponse',
  'hardware.shelly.scriptsMissing',
  'hardware.shelly.scriptsDisabled',
  'hardware.shelly.bleMissing',
  'hardware.shelly.bleDisabled',
  'hardware.sensor.phoneBlePermissionDenied',
  'hardware.sensor.phoneBleUnavailableInBrowser',
  'hardware.sensor.phoneBleNoRuntimeAddress',
  'hardware.sensor.phoneBleGenericFailed',
  'hardware.safety.matterBlocked'
] as const;

export const mutationError = (error: unknown): string => {
  const message = error instanceof Error ? error.message.trim() : '';
  for (const key of safeFeedbackKeys) {
    const localized = t(key);
    if (message === localized) return localized;
  }
  return t('common.operationFailed');
};

export const formatDiagnosticNumber = (
  value: number | null | undefined,
  suffix: string,
  fractionDigits = 1
): string =>
  value == null || !Number.isFinite(value)
    ? t('common.missing')
    : `${value.toFixed(fractionDigits)}${suffix}`;

export const canInstallScript = (
  flow: Pick<
    HardwareSetupFlow,
    | 'selectedShelly'
    | 'configState'
    | 'isThresholdValid'
    | 'isAdvancedSettingsValid'
    | 'isVpdAssistValid'
  >
): boolean =>
  flow.selectedShelly !== null &&
  flow.configState.ok &&
  flow.isThresholdValid &&
  flow.isAdvancedSettingsValid &&
  flow.isVpdAssistValid;

export const shellyAddressLabel = (
  flow: Pick<HardwareSetupFlow, 'shellyBaseUrl'>
): string => flow.shellyBaseUrl ?? t('hardware.flow.inputShellyIp');

export const runtimeAddressLabel = (
  flow: Pick<HardwareSetupFlow, 'selectedSensor'>
): string => flow.selectedSensor?.runtimeAddress ?? t('hardware.flow.selectThermometer');

export interface HardwarePageProps<TFlow> {
  flow: TFlow;
}
