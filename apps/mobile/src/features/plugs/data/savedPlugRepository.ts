import { normalizeShellyDeviceId } from '@lcl/shelly-client';
import { z } from 'zod';
import type { VerifiedPlugBleCandidate } from './plugBleOnboarding.js';
import {
  SAVED_PLUG_VERSION,
  savedPlugFromBleCandidate,
  savedPlugFromWifiDevice,
  savedPlugSchema,
  type SavedPlug
} from './savedPlug.js';

export const SAVED_PLUGS_STORAGE_KEY = 'lcl.savedPlugs.v1';
const LEGACY_BLE_PLUGS_STORAGE_KEY = 'lcl.savedBlePlugs.v1';
const LEGACY_HARDWARE_DRAFT_STORAGE_KEY = 'lcl.hardwareSetupDraft.v9';
const CURRENT_HARDWARE_DRAFT_STORAGE_KEY = 'lcl.hardwareSetupDraft.v10';

const persistedSavedPlugsSchema = z.object({
  version: z.literal(SAVED_PLUG_VERSION),
  plugs: z.array(savedPlugSchema)
});

const legacyBlePlugSchema = z.object({
  physicalId: z.string(),
  name: z.string(),
  bleDeviceId: z.string(),
  wifiBaseUrl: z.string().url().optional(),
  advertisementName: z.string(),
  model: z.string(),
  generation: z.number().int().nonnegative(),
  firmwareId: z.string().nullable(),
  matterEnabled: z.boolean().nullable()
});

const legacyBlePayloadSchema = z.object({
  version: z.literal(1),
  plugs: z.array(legacyBlePlugSchema)
});

const legacyWifiPlugSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string(),
  scriptIdInput: z.string(),
  model: z.string().optional(),
  gen: z.number().int().nonnegative().optional()
});

const legacyHardwareDraftSchema = z
  .object({ shellyDevices: z.array(legacyWifiPlugSchema) })
  .passthrough();

export type SavedPlugStorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface SavedPlugRepository {
  load(): SavedPlug[];
  save(plugs: SavedPlug[]): void;
  clear(): void;
}

const resolveBrowserStorage = (): SavedPlugStorageAdapter | null =>
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

const warnStorageFailure = (operation: string, error: unknown): void => {
  if (typeof console !== 'undefined')
    console.warn(`Saved plugs storage ${operation} failed.`, error);
};

const normalizedId = (value: string): string => normalizeShellyDeviceId(value);
const looksLikeLocator = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const existingFor = (
  plugs: readonly SavedPlug[],
  physicalId: string
): SavedPlug | undefined => {
  const key = normalizedId(physicalId);
  return plugs.find((plug) => normalizedId(plug.physicalId) === key);
};

const replaceByIdentity = (plugs: SavedPlug[], next: SavedPlug): SavedPlug[] => [
  next,
  ...plugs.filter(
    (plug) => normalizedId(plug.physicalId) !== normalizedId(next.physicalId)
  )
];

const migrateLegacy = (storage: SavedPlugStorageAdapter): SavedPlug[] => {
  let plugs: SavedPlug[] = [];

  const legacyHardwareRaw = storage.getItem(LEGACY_HARDWARE_DRAFT_STORAGE_KEY);
  if (legacyHardwareRaw) {
    const parsed = legacyHardwareDraftSchema.safeParse(JSON.parse(legacyHardwareRaw));
    if (parsed.success) {
      for (const device of parsed.data.shellyDevices) {
        const physicalId = normalizedId(device.id);
        if (!physicalId || looksLikeLocator(device.id)) continue;
        const next = savedPlugFromWifiDevice(
          {
            physicalId,
            name: device.name,
            wifiBaseUrl: device.baseUrl,
            scriptIdInput: device.scriptIdInput,
            ...(device.model ? { model: device.model } : {}),
            ...(device.gen !== undefined ? { generation: device.gen } : {})
          },
          existingFor(plugs, physicalId)
        );
        plugs = replaceByIdentity(plugs, next);
      }
    }
  }

  const legacyBleRaw = storage.getItem(LEGACY_BLE_PLUGS_STORAGE_KEY);
  if (legacyBleRaw) {
    const parsed = legacyBlePayloadSchema.safeParse(JSON.parse(legacyBleRaw));
    if (parsed.success) {
      for (const legacy of parsed.data.plugs) {
        const candidate: VerifiedPlugBleCandidate = {
          bleDeviceId: legacy.bleDeviceId,
          advertisementName: legacy.advertisementName,
          rssi: 0,
          physicalId: legacy.physicalId,
          model: legacy.model,
          generation: legacy.generation,
          firmwareId: legacy.firmwareId,
          matterEnabled: legacy.matterEnabled
        };
        let next = savedPlugFromBleCandidate(
          candidate,
          existingFor(plugs, legacy.physicalId)
        );
        if (legacy.wifiBaseUrl && !next.wifiBaseUrl) {
          next = savedPlugSchema.parse({
            ...next,
            wifiBaseUrl: legacy.wifiBaseUrl
          }) as typeof next;
        }
        plugs = replaceByIdentity(plugs, next);
      }
    }
  }

  storage.setItem(
    SAVED_PLUGS_STORAGE_KEY,
    JSON.stringify(
      persistedSavedPlugsSchema.parse({ version: SAVED_PLUG_VERSION, plugs })
    )
  );
  storage.removeItem(LEGACY_BLE_PLUGS_STORAGE_KEY);
  if (storage.getItem(CURRENT_HARDWARE_DRAFT_STORAGE_KEY) !== null) {
    storage.removeItem(LEGACY_HARDWARE_DRAFT_STORAGE_KEY);
  }
  return plugs;
};

export const createSavedPlugRepository = (
  storage: SavedPlugStorageAdapter | null = resolveBrowserStorage()
): SavedPlugRepository => ({
  load: () => {
    if (!storage) return [];
    try {
      const stored = storage.getItem(SAVED_PLUGS_STORAGE_KEY);
      if (stored) {
        const parsed = persistedSavedPlugsSchema.safeParse(JSON.parse(stored));
        if (parsed.success) return parsed.data.plugs;
      }
      return migrateLegacy(storage);
    } catch (error) {
      warnStorageFailure('read', error);
      return [];
    }
  },
  save: (plugs) => {
    if (!storage) return;
    try {
      const payload = persistedSavedPlugsSchema.parse({
        version: SAVED_PLUG_VERSION,
        plugs
      });
      storage.setItem(SAVED_PLUGS_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      warnStorageFailure('write', error);
    }
  },
  clear: () => {
    if (!storage) return;
    try {
      storage.removeItem(SAVED_PLUGS_STORAGE_KEY);
      storage.removeItem(LEGACY_BLE_PLUGS_STORAGE_KEY);
    } catch (error) {
      warnStorageFailure('clear', error);
    }
  }
});
