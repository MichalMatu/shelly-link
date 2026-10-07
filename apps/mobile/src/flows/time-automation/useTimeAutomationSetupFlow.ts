import { unwrapShellyResult } from '../../platform/shellyResult.js';
import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { useMutation } from '@tanstack/react-query';
import { RpcShellyClient, RpcShellyScheduleClient } from '@lcl/shelly-client';
import { useEffect, useMemo, useState } from 'react';
import { t } from '../../app/i18n.js';
import {
  createTimeInstalledAutomation,
  findInstalledRelayOwner,
  installDailyTimeAutomation,
  Pulse,
  readShellyControlStatus,
  TimeAutomationRuntimeError,
  updateTimeInstalledAutomation,
  useInstalledAutomationStore,
  type TimeInstalledAutomation
} from '../../features/automations/index.js';
import type { ShellyDraftDevice } from '../hardware-setup/setupDraftStore.js';
import { dailyTimeAutomationConfigSchema } from './config.js';

type PulseCycleFormDraft = ReturnType<typeof Pulse.Cycle.fromConfig>;

const localizedRuntimeError = (error: unknown): Error | unknown => {
  if (!(error instanceof TimeAutomationRuntimeError)) {
    return error;
  }

  switch (error.code) {
    case 'clock-unsynced':
      return new Error(t('time.errors.clockUnsynced'));
    case 'schedule-slots':
      return new Error(t('time.errors.scheduleSlots'));
    case 'native-schedule-conflict':
      return new Error(t('time.errors.nativeScheduleConflict'));
    default:
      return error;
  }
};

export const useTimeAutomationSetupFlow = (
  selectedShelly: ShellyDraftDevice | null | undefined,
  editInstallationId?: string
) => {
  const installations = useInstalledAutomationStore((state) => state.installations);
  const editingInstallation = editInstallationId
    ? (installations.find(
        (installation): installation is TimeInstalledAutomation =>
          installation.id === editInstallationId && installation.kind === 'time'
      ) ?? null)
    : null;
  const [onTime, setOnTime] = useState(editingInstallation?.config.onTime ?? '08:00');
  const [offTime, setOffTime] = useState(editingInstallation?.config.offTime ?? '20:00');
  const [pulseCycleDraft, setPulseCycleDraftState] = useState<PulseCycleFormDraft>(() =>
    Pulse.Cycle.fromConfig(editingInstallation?.pulseRuntime?.pulse)
  );
  const upsertInstallation = useInstalledAutomationStore(
    (state) => state.upsertInstallation
  );

  useEffect(() => {
    if (!editingInstallation) return;
    setOnTime(editingInstallation.config.onTime);
    setOffTime(editingInstallation.config.offTime);
    setPulseCycleDraftState(
      Pulse.Cycle.fromConfig(editingInstallation.pulseRuntime?.pulse)
    );
  }, [editingInstallation]);

  const configState = useMemo(() => {
    const parsed = dailyTimeAutomationConfigSchema.safeParse({
      relayId: editingInstallation?.config.relayId ?? 0,
      onTime,
      offTime
    });
    return parsed.success
      ? ({ ok: true, config: parsed.data } as const)
      : ({ ok: false, error: t('time.validation.invalidTimes') } as const);
  }, [editingInstallation?.config.relayId, offTime, onTime]);
  const pulseCycleValidation = useMemo(
    () => Pulse.Cycle.parseForm(pulseCycleDraft),
    [pulseCycleDraft]
  );
  const setPulseCycleDraft = (patch: Partial<PulseCycleFormDraft>) =>
    setPulseCycleDraftState((draft) => ({ ...draft, ...patch }));

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedShelly) {
        throw new Error(t('hardware.flow.noSelectedShelly'));
      }
      if (!configState.ok) {
        throw new Error(configState.error);
      }
      if (!pulseCycleValidation.ok) {
        throw new Error(t('hardware.flow.configInvalid'));
      }

      if (editInstallationId) {
        if (!editingInstallation) {
          throw new Error(t('detail.notFoundTitle'));
        }
        try {
          const preparedInstallation = {
            ...editingInstallation,
            shelly: {
              ...editingInstallation.shelly,
              name: selectedShelly.name,
              baseUrl: selectedShelly.baseUrl
            }
          };
          if (Pulse.Time.isInstalled(preparedInstallation)) {
            if (!pulseCycleValidation.config) {
              throw new Error(t('hardware.flow.configInvalid'));
            }
            return await Pulse.Time.replace({
              installation: preparedInstallation,
              config: {
                schedule: configState.config,
                pulse: pulseCycleValidation.config
              }
            });
          }
          const edited = await updateTimeInstalledAutomation({
            installation: preparedInstallation,
            config: configState.config,
            installations
          });
          return edited.installation;
        } catch (error) {
          throw localizedRuntimeError(error);
        }
      }

      const transport = createShellyTransport(selectedShelly.baseUrl);
      const deviceClient = new RpcShellyClient(transport);
      const scheduleClient = new RpcShellyScheduleClient(transport);
      const deviceInfo = unwrapShellyResult(await deviceClient.getDeviceInfo());
      const deviceId = deviceInfo.id?.trim();
      if (!deviceId) {
        throw new Error(t('hardware.flow.shellyIdentityMissing'));
      }

      const storedOwner = findInstalledRelayOwner({
        installations,
        deviceId,
        relayId: configState.config.relayId
      });
      if (storedOwner) {
        throw new Error(
          storedOwner.kind === 'time'
            ? t('time.errors.alreadyInstalled')
            : t('time.errors.relayOwnedByClimate')
        );
      }

      const controlStatus = await readShellyControlStatus(selectedShelly.baseUrl);
      if (controlStatus.automationScriptId !== null) {
        throw new Error(t('time.errors.climateScriptPresent'));
      }

      try {
        if (pulseCycleValidation.config) {
          const runtime = await Pulse.Time.install({
            clients: { device: deviceClient, schedules: scheduleClient },
            config: {
              schedule: configState.config,
              pulse: pulseCycleValidation.config
            }
          });
          return Pulse.Time.createInstalledAutomation({
            shelly: deviceInfo,
            shellyName: selectedShelly.name,
            baseUrl: selectedShelly.baseUrl,
            onJobId: runtime.schedule.onJobId,
            offJobId: runtime.schedule.offJobId,
            scriptId: runtime.script.id,
            scriptHash: runtime.script.hash,
            config: configState.config,
            pulse: pulseCycleValidation.config
          });
        }

        const schedule = await installDailyTimeAutomation({
          clients: { device: deviceClient, schedules: scheduleClient },
          config: configState.config
        });
        return createTimeInstalledAutomation({
          shelly: deviceInfo,
          shellyName: selectedShelly.name,
          baseUrl: selectedShelly.baseUrl,
          onJobId: schedule.onJobId,
          offJobId: schedule.offJobId,
          config: configState.config
        });
      } catch (error) {
        throw localizedRuntimeError(error);
      }
    },
    onSuccess: (installation) => upsertInstallation(installation)
  });

  return {
    onTime,
    setOnTime,
    offTime,
    setOffTime,
    configState,
    pulseCycleDraft,
    setPulseCycleDraft,
    pulseCycleValidation,
    isEditingTimeAutomation: editInstallationId !== undefined,
    canConfigurePulse:
      editInstallationId === undefined || editingInstallation?.pulseRuntime !== undefined,
    installMutation
  };
};
