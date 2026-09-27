import { normalizeShellyDeviceId } from '@lcl/shelly-client';
import { create } from 'zustand';
import type { VerifiedPlugBleCandidate } from '../data/plugBleOnboarding.js';
import {
  createSavedPlugRepository,
  type SavedPlugRepository
} from '../data/savedPlugRepository.js';
import {
  savedPlugFromBleCandidate,
  savedPlugFromWifiDevice,
  savedPlugSchema,
  type SavedPlug,
  type VerifiedWifiPlug
} from '../data/savedPlug.js';

export type SavedPlugState = {
  plugs: SavedPlug[];
  saveBleCandidate(candidate: VerifiedPlugBleCandidate): void;
  saveWifiDevice(device: VerifiedWifiPlug): void;
  replaceBleLocator(physicalId: string, bleDeviceId: string): void;
  setWifiLocator(physicalId: string, wifiBaseUrl: string): void;
  setDeviceMetadata(
    physicalId: string,
    metadata: { model: string; generation: number }
  ): void;
  setScriptId(physicalId: string, scriptIdInput: string): void;
  updateFirmware(physicalId: string, firmwareId: string): void;
  renamePlug(physicalId: string, name: string): void;
  removePlug(physicalId: string): void;
};

const repository: SavedPlugRepository = createSavedPlugRepository();
const normalizeId = (value: string): string => normalizeShellyDeviceId(value);

const replace = (plugs: readonly SavedPlug[], next: SavedPlug): SavedPlug[] => [
  next,
  ...plugs.filter((plug) => normalizeId(plug.physicalId) !== normalizeId(next.physicalId))
];

const updatePlug = (
  state: SavedPlugState,
  physicalId: string,
  update: (plug: SavedPlug) => SavedPlug
): SavedPlugState => {
  const normalizedId = normalizeId(physicalId);
  const existing = state.plugs.find(
    (plug) => normalizeId(plug.physicalId) === normalizedId
  );
  if (!existing) return state;
  const next = update(existing);
  if (next === existing) return state;
  const plugs = replace(state.plugs, next);
  repository.save(plugs);
  return { ...state, plugs };
};

export const useSavedPlugStore = create<SavedPlugState>((set) => ({
  plugs: repository.load(),
  saveBleCandidate: (candidate) =>
    set((state) => {
      const existing = state.plugs.find(
        (plug) => normalizeId(plug.physicalId) === normalizeId(candidate.physicalId)
      );
      const plugs = replace(state.plugs, savedPlugFromBleCandidate(candidate, existing));
      repository.save(plugs);
      return { plugs };
    }),
  saveWifiDevice: (device) =>
    set((state) => {
      const existing = state.plugs.find(
        (plug) => normalizeId(plug.physicalId) === normalizeId(device.physicalId)
      );
      const plugs = replace(state.plugs, savedPlugFromWifiDevice(device, existing));
      repository.save(plugs);
      return { plugs };
    }),
  replaceBleLocator: (physicalId, bleDeviceId) =>
    set((state) =>
      updatePlug(state, physicalId, (plug) => {
        const locator = bleDeviceId.trim();
        if (!locator || plug.bleDeviceId === locator) return plug;
        return savedPlugSchema.parse({ ...plug, bleDeviceId: locator });
      })
    ),
  setWifiLocator: (physicalId, wifiBaseUrl) =>
    set((state) =>
      updatePlug(state, physicalId, (plug) => {
        const locator = wifiBaseUrl.trim().replace(/\/+$/, '');
        if (!locator || plug.wifiBaseUrl === locator) return plug;
        return savedPlugSchema.parse({ ...plug, wifiBaseUrl: locator });
      })
    ),
  setDeviceMetadata: (physicalId, metadata) =>
    set((state) =>
      updatePlug(state, physicalId, (plug) => {
        if (plug.model === metadata.model && plug.generation === metadata.generation)
          return plug;
        return savedPlugSchema.parse({
          ...plug,
          model: metadata.model,
          generation: metadata.generation
        });
      })
    ),
  setScriptId: (physicalId, scriptIdInput) =>
    set((state) =>
      updatePlug(state, physicalId, (plug) => {
        const value = scriptIdInput.trim();
        if (!value || plug.scriptIdInput === value) return plug;
        return savedPlugSchema.parse({ ...plug, scriptIdInput: value });
      })
    ),
  updateFirmware: (physicalId, firmwareId) =>
    set((state) =>
      updatePlug(state, physicalId, (plug) => {
        const value = firmwareId.trim();
        if (!value || plug.firmwareId === value) return plug;
        return savedPlugSchema.parse({ ...plug, firmwareId: value });
      })
    ),
  renamePlug: (physicalId, name) =>
    set((state) =>
      updatePlug(state, physicalId, (plug) => {
        const value = name.trim();
        if (!value || plug.name === value) return plug;
        return savedPlugSchema.parse({ ...plug, name: value });
      })
    ),
  removePlug: (physicalId) =>
    set((state) => {
      const id = normalizeId(physicalId);
      const plugs = state.plugs.filter((plug) => normalizeId(plug.physicalId) !== id);
      if (plugs.length === state.plugs.length) return state;
      repository.save(plugs);
      return { plugs };
    })
}));

export const resetSavedPlugStore = (): void => {
  repository.clear();
  useSavedPlugStore.setState({ plugs: [] });
};
