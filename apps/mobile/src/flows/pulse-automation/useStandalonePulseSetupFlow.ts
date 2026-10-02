import { useMutation } from '@tanstack/react-query';
import {
  normalizeShellyDeviceId,
  RpcShellyClient,
  RpcShellyScheduleClient
} from '@lcl/shelly-client';
import { useMemo, useState } from 'react';
import { createShellyTransport } from '../../platform/shellyHttpTransport.js';
import { unwrapShellyResult } from '../../platform/shellyResult.js';
import {
  findInstalledRelayOwner,
  findScheduleRelayConflict,
  Pulse,
  readShellyControlStatus,
  useInstalledAutomationStore
} from '../../features/automations/index.js';
import type { ShellyDraftDevice } from '../hardware-setup/setupDraftStore.js';

type PulseCycleFormDraft = ReturnType<typeof Pulse.Cycle.fromConfig>;

const initialStandalonePulseDraft = (): PulseCycleFormDraft => ({
  ...Pulse.Cycle.defaultForm,
  enabled: true
});

export const useStandalonePulseSetupFlow = (
  selectedShelly: ShellyDraftDevice | null | undefined
) => {
  const installations = useInstalledAutomationStore((state) => state.installations);
  const upsertInstallation = useInstalledAutomationStore(
    (state) => state.upsertInstallation
  );
  const [pulseCycleDraft, setPulseCycleDraftState] = useState<PulseCycleFormDraft>(
    initialStandalonePulseDraft
  );
  const pulseCycleValidation = useMemo(
    () => Pulse.Cycle.parseForm({ ...pulseCycleDraft, enabled: true }),
    [pulseCycleDraft]
  );
  const setPulseCycleDraft = (patch: Partial<PulseCycleFormDraft>) =>
    setPulseCycleDraftState((draft) => ({ ...draft, ...patch, enabled: true }));

  const installMutation = useMutation({
    mutationFn: async () => {
      if (!selectedShelly) {
        throw new Error('Select a Shelly Plug before installing Pulse.');
      }
      if (!pulseCycleValidation.ok || !pulseCycleValidation.config) {
        throw new Error('Pulse configuration is invalid.');
      }

      const transport = createShellyTransport(selectedShelly.baseUrl);
      const client = new RpcShellyClient(transport);
      const scheduleClient = new RpcShellyScheduleClient(transport);
      const deviceInfo = unwrapShellyResult(await client.getDeviceInfo());
      const deviceId = deviceInfo.id?.trim();
      if (!deviceId) {
        throw new Error('Shelly did not expose a stable device id.');
      }
      if (
        normalizeShellyDeviceId(deviceId) !== normalizeShellyDeviceId(selectedShelly.id)
      ) {
        throw new Error('Shelly identity changed before Pulse installation.');
      }

      const relayId = 0;
      const owner = findInstalledRelayOwner({ installations, deviceId, relayId });
      if (owner) {
        throw new Error('Another managed automation already owns this relay.');
      }

      const schedules = unwrapShellyResult(await scheduleClient.list());
      if (findScheduleRelayConflict(schedules.jobs, relayId)) {
        throw new Error('A native Shelly schedule already controls this relay.');
      }

      const controlStatus = await readShellyControlStatus(selectedShelly.baseUrl);
      if (controlStatus.automationScriptId !== null) {
        throw new Error('An active Shelly automation script already controls this Plug.');
      }

      const config = { relayId, pulse: pulseCycleValidation.config };
      const runtime = await Pulse.Standalone.install({ client, config });
      return Pulse.Standalone.createInstalledAutomation({
        shelly: deviceInfo,
        shellyName: selectedShelly.name,
        baseUrl: selectedShelly.baseUrl,
        scriptId: runtime.script.id,
        scriptHash: runtime.script.hash,
        config
      });
    },
    onSuccess: (installation) => upsertInstallation(installation)
  });

  return {
    pulseCycleDraft,
    setPulseCycleDraft,
    pulseCycleValidation,
    installMutation
  };
};
