import { normalizeShellyDeviceId } from '@lcl/shelly-client';
import { z } from 'zod';
import type { VerifiedPlugBleCandidate } from './plugBleOnboarding.js';

export const SAVED_PLUG_VERSION = 1 as const;

export const savedPlugSchema = z
  .object({
    physicalId: z.string().min(1),
    name: z.string().min(1),
    bleDeviceId: z.string().min(1).optional(),
    wifiBaseUrl: z.string().url().optional(),
    scriptIdInput: z.string().min(1).default('1'),
    advertisementName: z.string().default(''),
    model: z.string().default(''),
    generation: z.number().int().nonnegative().default(0),
    firmwareId: z.string().nullable().default(null),
    matterEnabled: z.boolean().nullable().default(null)
  })
  .refine((plug) => Boolean(plug.bleDeviceId || plug.wifiBaseUrl), {
    message: 'Saved Plug requires at least one verified transport locator.'
  });

export type SavedPlug = z.infer<typeof savedPlugSchema>;
export type SavedPlugWithBleLocator = SavedPlug & { bleDeviceId: string };
export type SavedPlugWithWifiLocator = SavedPlug & { wifiBaseUrl: string };

export type VerifiedWifiPlug = {
  physicalId: string;
  name: string;
  wifiBaseUrl: string;
  scriptIdInput: string;
  model?: string;
  generation?: number;
};

export type WifiPlugDevice = {
  id: string;
  name: string;
  baseUrl: string;
  scriptIdInput: string;
  model?: string;
  gen?: number;
};

const normalizeWifiBaseUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const defaultSavedPlugName = (candidate: VerifiedPlugBleCandidate): string =>
  candidate.advertisementName.trim() || candidate.model.trim() || candidate.physicalId;

export const hasBleLocator = (plug: SavedPlug): plug is SavedPlugWithBleLocator =>
  typeof plug.bleDeviceId === 'string' && plug.bleDeviceId.trim().length > 0;

export const hasWifiLocator = (plug: SavedPlug): plug is SavedPlugWithWifiLocator =>
  typeof plug.wifiBaseUrl === 'string' && plug.wifiBaseUrl.trim().length > 0;

export const savedPlugFromBleCandidate = (
  candidate: VerifiedPlugBleCandidate,
  existing?: SavedPlug
): SavedPlugWithBleLocator => {
  const physicalId = normalizeShellyDeviceId(candidate.physicalId);
  if (!physicalId) throw new Error('Shelly BLE identity is missing.');

  return savedPlugSchema.parse({
    ...existing,
    physicalId,
    name: existing?.name.trim() || defaultSavedPlugName(candidate),
    bleDeviceId: candidate.bleDeviceId.trim(),
    scriptIdInput: existing?.scriptIdInput ?? '1',
    advertisementName: candidate.advertisementName,
    model: candidate.model,
    generation: candidate.generation,
    firmwareId: candidate.firmwareId,
    matterEnabled: candidate.matterEnabled
  }) as SavedPlugWithBleLocator;
};

export const savedPlugFromWifiDevice = (
  device: VerifiedWifiPlug,
  existing?: SavedPlug
): SavedPlugWithWifiLocator => {
  const physicalId = normalizeShellyDeviceId(device.physicalId);
  if (!physicalId) throw new Error('Shelly Wi-Fi identity is missing.');
  const wifiBaseUrl = normalizeWifiBaseUrl(device.wifiBaseUrl);
  if (!wifiBaseUrl) throw new Error('Shelly Wi-Fi locator is missing.');

  return savedPlugSchema.parse({
    ...existing,
    physicalId,
    name: existing?.name.trim() || device.name.trim() || physicalId,
    wifiBaseUrl,
    scriptIdInput: device.scriptIdInput.trim() || existing?.scriptIdInput || '1',
    model: device.model?.trim() || existing?.model || '',
    generation: device.generation ?? existing?.generation ?? 0
  }) as SavedPlugWithWifiLocator;
};

export const savedPlugToWifiDevice = (plug: SavedPlug): WifiPlugDevice | null => {
  if (!hasWifiLocator(plug)) return null;
  return {
    id: plug.physicalId,
    name: plug.name,
    baseUrl: plug.wifiBaseUrl,
    scriptIdInput: plug.scriptIdInput,
    ...(plug.model ? { model: plug.model } : {}),
    ...(plug.generation > 0 ? { gen: plug.generation } : {})
  };
};
