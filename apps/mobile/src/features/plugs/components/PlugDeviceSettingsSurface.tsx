import type { PlugLedSettingsTarget } from '../data/plugLedSettings.js';
import { PlugButtonModeSettingsCard } from './PlugButtonModeSettingsCard.js';
import { PlugCloudSettingsCard } from './PlugCloudSettingsCard.js';
import { PlugLedSettingsCard } from './PlugLedSettingsCard.js';

export type PlugDeviceSettingsSurfaceProps = {
  target: PlugLedSettingsTarget;
  buttonModeLocked?: boolean;
};

export const PlugDeviceSettingsSurface = ({
  target,
  buttonModeLocked = false
}: PlugDeviceSettingsSurfaceProps) => (
  <div className="plug-settings-surface">
    <PlugLedSettingsCard target={target} />
    <PlugButtonModeSettingsCard target={target} locked={buttonModeLocked} />
    <PlugCloudSettingsCard target={target} />
  </div>
);
