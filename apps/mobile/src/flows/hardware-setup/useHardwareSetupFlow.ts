import { useMemo } from 'react';
import { useHardwareSetupDraftStore } from './setupDraftStore.js';
import { deriveShellyInputState } from './ruleConfigDerivation.js';
import { useClimateAutomationInstallFlow } from './useClimateAutomationInstallFlow.js';
import {
  ClimateSetup,
  useClimateAutomationScriptLoadDraftFlow,
  useShellyUsage
} from '../../features/automations/index.js';
import {
  savedPlugsToWifiDevices,
  useSavedPlugStore
} from '../../features/plugs/index.js';
import { useSensorSetupFlow } from './usePhoneSensorFlow.js';
import { useShellyBleDiscoveryFlow } from './useShellyBleDiscoveryFlow.js';
import { useShellySetupScanFlow } from './useShellySetupScanFlow.js';
import { useShellyControlFlow } from './useShellyControlFlow.js';
import {
  createDeviceRemovalActions,
  useHardwareSetupSelections,
  verifiedWifiPlugInput
} from '../../features/hardware-setup/index.js';

export const useHardwareSetupFlow = (editInstallationId?: string) => {
  const shellyNameInput = useHardwareSetupDraftStore((state) => state.shellyNameInput);
  const setShellyNameInput = useHardwareSetupDraftStore(
    (state) => state.setShellyNameInput
  );
  const shellyUrlInput = useHardwareSetupDraftStore((state) => state.shellyUrlInput);
  const setShellyUrlInputDraft = useHardwareSetupDraftStore(
    (state) => state.setShellyUrlInput
  );
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const renamePlug = useSavedPlugStore((state) => state.renamePlug);
  const removePlug = useSavedPlugStore((state) => state.removePlug);
  const saveWifiDevice = useSavedPlugStore((state) => state.saveWifiDevice);
  const setScriptId = useSavedPlugStore((state) => state.setScriptId);
  const shellyDevices = useMemo(() => savedPlugsToWifiDevices(savedPlugs), [savedPlugs]);
  const selectedShellyId = useHardwareSetupDraftStore((state) => state.selectedShellyId);
  const selectShellyDeviceDraft = useHardwareSetupDraftStore(
    (state) => state.selectShellyDevice
  );
  const selectedSensorId = useHardwareSetupDraftStore((state) => state.selectedSensorId);
  const selectSensorDeviceDraft = useHardwareSetupDraftStore(
    (state) => state.selectSensorDevice
  );
  const additionalSensorIds = useHardwareSetupDraftStore(
    (state) => state.additionalSensorIds
  );
  const inheritedSensorIds = useHardwareSetupDraftStore(
    (state) => state.inheritedSensorIds
  );
  const inheritedSensorSourceId = useHardwareSetupDraftStore(
    (state) => state.inheritedSensorSourceId
  );
  const toggleAdditionalSensorDeviceDraft = useHardwareSetupDraftStore(
    (state) => state.toggleAdditionalSensorDevice
  );
  const sensorAggregation = useHardwareSetupDraftStore(
    (state) => state.sensorAggregation
  );
  const setSensorAggregationDraft = useHardwareSetupDraftStore(
    (state) => state.setSensorAggregation
  );
  const rulePreset = useHardwareSetupDraftStore((state) => state.rulePreset);
  const setRulePreset = useHardwareSetupDraftStore((state) => state.setRulePreset);
  const onThresholdInput = useHardwareSetupDraftStore((state) => state.onThresholdInput);
  const setOnThresholdInput = useHardwareSetupDraftStore(
    (state) => state.setOnThresholdInput
  );
  const offThresholdInput = useHardwareSetupDraftStore(
    (state) => state.offThresholdInput
  );
  const setOffThresholdInput = useHardwareSetupDraftStore(
    (state) => state.setOffThresholdInput
  );
  const vpdAssistEnabled = useHardwareSetupDraftStore((state) => state.vpdAssistEnabled);
  const setVpdAssistEnabled = useHardwareSetupDraftStore(
    (state) => state.setVpdAssistEnabled
  );
  const vpdTargetInput = useHardwareSetupDraftStore((state) => state.vpdTargetInput);
  const setVpdTargetInput = useHardwareSetupDraftStore(
    (state) => state.setVpdTargetInput
  );
  const rssiMinInput = useHardwareSetupDraftStore((state) => state.rssiMinInput);
  const setRssiMinInput = useHardwareSetupDraftStore((state) => state.setRssiMinInput);
  const staleTimeoutMinInput = useHardwareSetupDraftStore(
    (state) => state.staleTimeoutMinInput
  );
  const setStaleTimeoutMinInput = useHardwareSetupDraftStore(
    (state) => state.setStaleTimeoutMinInput
  );
  const minChangeMinInput = useHardwareSetupDraftStore(
    (state) => state.minChangeMinInput
  );
  const setMinChangeMinInput = useHardwareSetupDraftStore(
    (state) => state.setMinChangeMinInput
  );
  const maxOnHoursInput = useHardwareSetupDraftStore((state) => state.maxOnHoursInput);
  const setMaxOnHoursInput = useHardwareSetupDraftStore(
    (state) => state.setMaxOnHoursInput
  );
  const pulseCycleDraft = useHardwareSetupDraftStore((state) => state.pulseCycleDraft);
  const setPulseCycleDraft = useHardwareSetupDraftStore(
    (state) => state.setPulseCycleDraft
  );
  const { upsertSensorDevice, ...sensorSetupFlow } = useSensorSetupFlow();
  const { sensorDevices } = sensorSetupFlow;

  const {
    setupStatus,
    checkShellyMutation,
    recheckShellyMutation,
    resetShellySetupStatus,
    shellyControlStates,
    refreshShellyControl,
    acknowledgeShellyControlFeedback,
    applyControlStatus,
    applyControlError,
    removeShellyControlState
  } = useShellyControlFlow();
  const {
    bleDiscoverySession,
    bleDiscoverySnapshot,
    startBleDiscoveryMutation,
    refreshBleDiscoveryMutation,
    restartBleDiscoveryMutation,
    stopBleDiscoveryMutation,
    startBleDiscovery,
    refreshBleDiscovery,
    restartBleDiscovery,
    stopBleDiscovery,
    cleanupBleDiscovery,
    resetBleDiscovery
  } = useShellyBleDiscoveryFlow();
  const {
    shellyScanStartInput,
    setShellyScanStartInput,
    shellyScanEndInput,
    setShellyScanEndInput,
    shellyScanStopped,
    shellyScanResults,
    shellyScanMutation,
    startShellyScan,
    stopShellyScan,
    resetShellyScan
  } = useShellySetupScanFlow();

  const updateShellyUrlInput = (value: string) => {
    setShellyUrlInputDraft(value);
    resetShellySetupStatus();
  };

  const { selectedShelly, selectedSensor, additionalSensors, scopedInheritedSensorIds } =
    useHardwareSetupSelections({
      shellyDevices,
      selectedShellyId,
      sensorDevices,
      selectedSensorId,
      additionalSensorIds,
      inheritedSensorIds,
      inheritedSensorSourceId,
      editInstallationId
    });
  const shellyInputState = useMemo(
    () => deriveShellyInputState({ shellyNameInput, shellyUrlInput }),
    [shellyNameInput, shellyUrlInput]
  );

  const {
    advancedSettingsValidation,
    pulseCycleValidation,
    configState,
    isThresholdValid,
    isVpdAssistValid
  } = ClimateSetup.useRuleState({
    selectedSensor,
    additionalSensors,
    sensorAggregation,
    rulePreset,
    onThresholdInput,
    offThresholdInput,
    pulseCycleDraft,
    vpdAssistEnabled,
    vpdTargetInput,
    rssiMinInput,
    staleTimeoutMinInput,
    minChangeMinInput,
    maxOnHoursInput
  });

  const {
    canRunSafeRelayTest,
    isEditingClimateAutomation,
    installMutation,
    safeRelayTestMutation,
    resetInstallState
  } = useClimateAutomationInstallFlow({
    selectedShelly,
    configState,
    isThresholdValid,
    isVpdAssistValid,
    ...(editInstallationId ? { editInstallationId } : {})
  });

  const { loadAutomationScriptMutation, loadAutomationScript } =
    useClimateAutomationScriptLoadDraftFlow({
      getDraftActions: useHardwareSetupDraftStore.getState,
      setShellyScriptId: setScriptId,
      upsertSensorDevice,
      resetInstallState,
      applyControlStatus,
      applyControlError
    });

  const selectShellyDevice = (id: string) => {
    selectShellyDeviceDraft(id);
    resetShellySetupStatus();
    resetInstallState();
  };

  const selectSensorDevice = (id: string) => {
    selectSensorDeviceDraft(id);
    resetInstallState();
  };

  const toggleAdditionalSensorDevice = (id: string) => {
    toggleAdditionalSensorDeviceDraft(id);
    resetInstallState();
  };

  const updateSensorAggregation = (value: typeof sensorAggregation) => {
    setSensorAggregationDraft(value);
    resetInstallState();
  };

  const upsertShellyDevice = (device: (typeof shellyDevices)[number]) => {
    saveWifiDevice(verifiedWifiPlugInput(device));
    selectShellyDeviceDraft(device.id);
  };

  const { plugRemovalUsage, removeShellyDevice, removeSensorDevice } =
    createDeviceRemovalActions({
      plugRemovalUsage: useShellyUsage(),
      removePlug,
      selectedShellyId,
      shellyDevices,
      selectShellyDevice: selectShellyDeviceDraft,
      removeShellyControlState,
      resetShellySetupStatus,
      resetInstallState,
      removeSensorDevice: sensorSetupFlow.removeSensorDevice
    });

  return {
    shellyNameInput,
    setShellyNameInput,
    shellyUrlInput,
    setShellyUrlInput: updateShellyUrlInput,
    shellyInputState,
    shellyDevices,
    selectedShellyId,
    selectedShelly,
    selectShellyDevice,
    setShellyDeviceName: renamePlug,
    upsertShellyDevice,
    plugRemovalUsage,
    removeShellyDevice,
    ...sensorSetupFlow,
    selectedSensorId,
    selectedSensor,
    additionalSensorIds,
    inheritedSensorIds: scopedInheritedSensorIds,
    additionalSensors,
    selectSensorDevice,
    toggleAdditionalSensorDevice,
    sensorAggregation,
    setSensorAggregation: updateSensorAggregation,
    removeSensorDevice,
    rulePreset,
    setRulePreset,
    onThresholdInput,
    setOnThresholdInput,
    offThresholdInput,
    setOffThresholdInput,
    vpdAssistEnabled,
    setVpdAssistEnabled,
    vpdTargetInput,
    setVpdTargetInput,
    rssiMinInput,
    setRssiMinInput,
    staleTimeoutMinInput,
    setStaleTimeoutMinInput,
    minChangeMinInput,
    setMinChangeMinInput,
    maxOnHoursInput,
    setMaxOnHoursInput,
    pulseCycleDraft,
    setPulseCycleDraft,
    pulseCycleValidation,
    isAdvancedSettingsValid: advancedSettingsValidation.isValid,
    shellyBaseUrl: selectedShelly?.baseUrl ?? null,
    configState,
    isThresholdValid,
    isVpdAssistValid,
    canRunSafeRelayTest,
    isEditingClimateAutomation,
    setupStatus,
    checkShellyMutation,
    recheckShellyMutation,
    shellyScanStartInput,
    setShellyScanStartInput,
    shellyScanEndInput,
    setShellyScanEndInput,
    shellyScanStopped,
    shellyScanResults,
    shellyScanMutation,
    startShellyScan,
    stopShellyScan,
    resetShellyScan,
    shellyControlStates,
    loadAutomationScriptMutation,
    refreshShellyControl,
    acknowledgeShellyControlFeedback,
    loadAutomationScript,
    bleDiscoverySession,
    bleDiscoverySnapshot,
    startBleDiscoveryMutation,
    refreshBleDiscoveryMutation,
    restartBleDiscoveryMutation,
    stopBleDiscoveryMutation,
    startBleDiscovery,
    refreshBleDiscovery,
    restartBleDiscovery,
    stopBleDiscovery,
    cleanupBleDiscovery,
    resetBleDiscovery,
    installMutation,
    safeRelayTestMutation
  };
};

export type HardwareSetupFlow = ReturnType<typeof useHardwareSetupFlow>;
