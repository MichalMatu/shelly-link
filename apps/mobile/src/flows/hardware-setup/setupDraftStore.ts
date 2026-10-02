import { defaultRuleForPreset, type RulePresetId } from '@lcl/automation-core';
import type { SensorProfileId } from '@lcl/device-profiles';
import { create } from 'zustand';
import {
  createClimateAutomationEditDraftPatch,
  DEFAULT_RULE_ADVANCED_SETTINGS,
  removeSensorSelection,
  selectSensorSelection,
  setAdditionalSensorSelection,
  toggleAdditionalSensorSelection,
  upsertSensorSelection,
  type ClimateInstalledAutomation,
  type SensorDraftActions
} from '../../features/automations/index.js';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  pulseCycleFormFromConfig,
  type PulseCycleFormDraft
} from '../../features/automations/pulseCyclePublic.js';
import {
  clearStoredHardwareSetupDraft,
  mergeRecoveredSensorRegistry,
  persistHardwareSetupDraftPatch,
  readStoredHardwareSetupDraft,
  type HardwareSetupDraft,
  type SensorDraftDevice
} from '../../features/hardware-setup/index.js';
import { useSavedPlugStore } from '../../features/plugs/index.js';

export { HARDWARE_SETUP_DRAFT_STORAGE_KEY } from '../../features/hardware-setup/index.js';
export type {
  HardwareSetupDraft,
  SensorDraftDevice,
  ShellyDraftDevice
} from '../../features/hardware-setup/index.js';

export const DEFAULT_HARDWARE_SETUP_DRAFT: HardwareSetupDraft = {
  shellyNameInput: 'Shelly Plug S Gen3',
  shellyUrlInput: '',
  sensorProfileInput: 'xiaomi_lywsd03mmc_bthome_v2',
  sensorMacInput: '',
  sensorNameInput: '',
  sensorDevices: [],
  selectedShellyId: null,
  selectedSensorId: null,
  additionalSensorIds: [],
  inheritedSensorIds: [],
  inheritedSensorSourceId: null,
  sensorAggregation: 'avg',
  rulePreset: 'heating',
  onThresholdInput: '19',
  offThresholdInput: '20',
  ...DEFAULT_RULE_ADVANCED_SETTINGS
};

const defaultThresholdInputsForPreset = (
  preset: RulePresetId
): { onThresholdInput: string; offThresholdInput: string } => {
  const rule = defaultRuleForPreset(preset);
  return {
    onThresholdInput: String(rule.control.onThreshold),
    offThresholdInput: String(rule.control.offThreshold)
  };
};

type HardwareSetupDraftState = HardwareSetupDraft &
  SensorDraftActions<SensorDraftDevice> & {
    sensorMembershipEditStarted: boolean;
    pulseCycleDraft: PulseCycleFormDraft;
    setShellyNameInput(value: string): void;
    setShellyUrlInput(value: string): void;
    selectShellyDevice(id: string | null): void;
    setSensorProfileInput(value: SensorProfileId): void;
    setSensorMacInput(value: string): void;
    setSensorNameInput(value: string): void;
    mergeRecoveredSensorDevices(devices: readonly SensorDraftDevice[]): void;
    setRulePreset(value: RulePresetId): void;
    setOnThresholdInput(value: string): void;
    setOffThresholdInput(value: string): void;
    setVpdAssistEnabled(value: boolean): void;
    setVpdTargetInput(value: string): void;
    setRssiMinInput(value: string): void;
    setStaleTimeoutMinInput(value: string): void;
    setMinChangeMinInput(value: string): void;
    setMaxOnHoursInput(value: string): void;
    setPulseCycleDraft(patch: Partial<PulseCycleFormDraft>): void;
    loadClimateAutomationDraft(installation: ClimateInstalledAutomation): void;
    commitClimateAutomationDraft(installationId: string): void;
  };

const persistPatch = (
  state: HardwareSetupDraftState,
  patch: Partial<HardwareSetupDraft>
): Partial<HardwareSetupDraftState> =>
  persistHardwareSetupDraftPatch(state, patch, DEFAULT_HARDWARE_SETUP_DRAFT);

const persistExplicitSensorPatch = (
  state: HardwareSetupDraftState,
  patch: Partial<HardwareSetupDraft>
): Partial<HardwareSetupDraftState> => {
  const inheritedSensorIds = new Set(state.inheritedSensorIds);
  const shouldDropInherited = !state.sensorMembershipEditStarted;
  const explicitPatch =
    !shouldDropInherited || patch.additionalSensorIds === undefined
      ? patch
      : {
          ...patch,
          additionalSensorIds: patch.additionalSensorIds.filter(
            (id) => !inheritedSensorIds.has(id)
          )
        };
  return {
    ...persistPatch(state, explicitPatch),
    sensorMembershipEditStarted: true
  };
};

const updateListItem = <TItem extends { id: string }>(
  items: TItem[],
  id: string,
  patch: Partial<TItem>
): TItem[] => items.map((item) => (item.id === id ? { ...item, ...patch } : item));

export const useHardwareSetupDraftStore = create<HardwareSetupDraftState>((set) => {
  const storedDraft = readStoredHardwareSetupDraft(DEFAULT_HARDWARE_SETUP_DRAFT);
  const initialDraft = {
    ...storedDraft,
    shellyNameInput: DEFAULT_HARDWARE_SETUP_DRAFT.shellyNameInput,
    shellyUrlInput: DEFAULT_HARDWARE_SETUP_DRAFT.shellyUrlInput,
    sensorProfileInput: storedDraft.sensorProfileInput,
    sensorMacInput: DEFAULT_HARDWARE_SETUP_DRAFT.sensorMacInput,
    sensorNameInput: DEFAULT_HARDWARE_SETUP_DRAFT.sensorNameInput
  };

  const updateDraft = (patch: Partial<HardwareSetupDraft>) =>
    set((state) => persistPatch(state, patch));

  return {
    ...initialDraft,
    sensorMembershipEditStarted: false,
    pulseCycleDraft: { ...DEFAULT_PULSE_CYCLE_FORM },
    setShellyNameInput: (shellyNameInput) => set({ shellyNameInput }),
    setShellyUrlInput: (shellyUrlInput) => set({ shellyUrlInput }),
    selectShellyDevice: (id) =>
      set((state) => persistPatch(state, { selectedShellyId: id })),
    setSensorProfileInput: (sensorProfileInput) => set({ sensorProfileInput }),
    setSensorMacInput: (sensorMacInput) => set({ sensorMacInput }),
    setSensorNameInput: (sensorNameInput) => set({ sensorNameInput }),
    upsertSensorDevice: (device) =>
      set((state) =>
        persistExplicitSensorPatch(state, {
          sensorMacInput: DEFAULT_HARDWARE_SETUP_DRAFT.sensorMacInput,
          sensorNameInput: DEFAULT_HARDWARE_SETUP_DRAFT.sensorNameInput,
          ...upsertSensorSelection(state, device)
        })
      ),
    mergeRecoveredSensorDevices: (devices) =>
      set((state) => {
        const sensorDevices = mergeRecoveredSensorRegistry(state.sensorDevices, devices);
        return sensorDevices === state.sensorDevices
          ? state
          : persistPatch(state, { sensorDevices });
      }),
    selectSensorDevice: (id) =>
      set((state) => {
        const patch = selectSensorSelection(state, id);
        return patch ? persistExplicitSensorPatch(state, patch) : state;
      }),
    setAdditionalSensorIds: (ids) =>
      set((state) => ({
        ...persistPatch(state, setAdditionalSensorSelection(state, ids)),
        sensorMembershipEditStarted: true
      })),
    toggleAdditionalSensorDevice: (id) =>
      set((state) => {
        const patch = toggleAdditionalSensorSelection(state, id);
        return patch ? persistExplicitSensorPatch(state, patch) : state;
      }),
    setSensorAggregation: (sensorAggregation) => updateDraft({ sensorAggregation }),
    setSensorDeviceName: (id, name) =>
      set((state) => {
        const sensorDevices = updateListItem(state.sensorDevices, id, { name });
        return persistPatch(state, { sensorDevices });
      }),
    removeSensorDevice: (id) =>
      set((state) => {
        const patch = removeSensorSelection(state, id);
        if (!patch) {
          return state;
        }
        const changesSensorMembership =
          state.selectedSensorId === id || state.additionalSensorIds.includes(id);
        return changesSensorMembership
          ? persistExplicitSensorPatch(state, patch)
          : persistPatch(state, {
              ...patch,
              inheritedSensorIds: state.inheritedSensorIds.filter(
                (sensorId) => sensorId !== id
              )
            });
      }),
    setRulePreset: (rulePreset) => {
      const thresholds = defaultThresholdInputsForPreset(rulePreset);
      updateDraft({ rulePreset, ...thresholds });
    },
    setOnThresholdInput: (onThresholdInput) => updateDraft({ onThresholdInput }),
    setOffThresholdInput: (offThresholdInput) => updateDraft({ offThresholdInput }),
    setVpdAssistEnabled: (vpdAssistEnabled) => updateDraft({ vpdAssistEnabled }),
    setVpdTargetInput: (vpdTargetInput) => updateDraft({ vpdTargetInput }),
    setRssiMinInput: (rssiMinInput) => updateDraft({ rssiMinInput }),
    setStaleTimeoutMinInput: (staleTimeoutMinInput) =>
      updateDraft({ staleTimeoutMinInput }),
    setMinChangeMinInput: (minChangeMinInput) => updateDraft({ minChangeMinInput }),
    setMaxOnHoursInput: (maxOnHoursInput) => updateDraft({ maxOnHoursInput }),
    setPulseCycleDraft: (patch) =>
      set((state) => ({ pulseCycleDraft: { ...state.pulseCycleDraft, ...patch } })),
    loadClimateAutomationDraft: (installation) => {
      useSavedPlugStore.getState().saveWifiDevice({
        physicalId: installation.shelly.deviceId,
        name: installation.shelly.name,
        wifiBaseUrl: installation.shelly.baseUrl,
        scriptIdInput: String(installation.script.id),
        model: installation.shelly.model,
        generation: installation.shelly.gen
      });
      set((state) => ({
        ...persistPatch(
          state,
          createClimateAutomationEditDraftPatch(state, installation)
        ),
        sensorMembershipEditStarted: false,
        pulseCycleDraft: pulseCycleFormFromConfig(installation.config.execution?.pulse)
      }));
    },
    commitClimateAutomationDraft: (installationId) =>
      set((state) => ({
        ...(state.inheritedSensorSourceId === installationId
          ? persistPatch(state, {
              inheritedSensorIds: [],
              inheritedSensorSourceId: null
            })
          : {}),
        sensorMembershipEditStarted: false
      }))
  };
});

export const resetHardwareSetupDraftStore = () => {
  clearStoredHardwareSetupDraft();
  useHardwareSetupDraftStore.setState({
    ...DEFAULT_HARDWARE_SETUP_DRAFT,
    sensorMembershipEditStarted: false,
    pulseCycleDraft: { ...DEFAULT_PULSE_CYCLE_FORM }
  });
};
