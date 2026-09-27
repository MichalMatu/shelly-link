import { useId, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import { deviceWifiCopy } from '../../../app/locales/deviceWifi.js';
import {
  BlePlugWifiProvisioningUnsupportedError,
  type BlePlugWifiNetwork
} from '../data/blePlugWifiProvisioning.js';
import type { SavedBlePlug } from '../data/savedBlePlug.js';
import { useBlePlugWifiProvisioningFlow } from '../flows/useBlePlugWifiProvisioningFlow.js';
import './PlugSettingsSurface.css';

export type BlePlugWifiProvisioningCardProps = {
  plug: SavedBlePlug;
};

const errorMessage = (
  error: unknown,
  fallback: string,
  unsupported: string
): string => {
  if (error instanceof BlePlugWifiProvisioningUnsupportedError) return unsupported;
  const detail = error instanceof Error ? error.message.trim() : '';
  return detail ? `${fallback} ${detail}` : fallback;
};

export const BlePlugWifiProvisioningCard = ({ plug }: BlePlugWifiProvisioningCardProps) => {
  const { locale } = useTranslation();
  const copy = deviceWifiCopy[locale];
  const { scanMutation, connectMutation } = useBlePlugWifiProvisioningFlow(plug);
  const [networks, setNetworks] = useState<BlePlugWifiNetwork[]>([]);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const networkId = useId();
  const passwordId = useId();

  const selected = networks.find((network) => network.ssid === selectedSsid);
  const secured = selected ? selected.auth !== 0 : false;
  const busy = scanMutation.isPending || connectMutation.isPending;

  const scan = () => {
    setFeedback(null);
    scanMutation.mutate(undefined, {
      onSuccess: (result) => {
        setNetworks(result);
        setSelectedSsid((current) =>
          result.some((network) => network.ssid === current) ? current : (result[0]?.ssid ?? '')
        );
        if (result.length === 0) setFeedback(copy.noNetworks);
      },
      onError: (error) => setFeedback(errorMessage(error, copy.scanFailed, copy.unsupported))
    });
  };

  const connect = () => {
    if (!selected) return;
    setFeedback(null);
    connectMutation.mutate(
      { ssid: selected.ssid, password: secured ? password : '' },
      {
        onSuccess: ({ status }) => {
          setFeedback(
            `${copy.connected}: ${status.ssid ?? selected.ssid}${status.sta_ip ? ` · ${status.sta_ip}` : ''}`
          );
        },
        onError: (error) =>
          setFeedback(errorMessage(error, copy.connectFailed, copy.unsupported))
      }
    );
  };

  return (
    <section className="plug-settings-section installation-detail-device-wifi">
      <div className="plug-settings-section__heading">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>

      <div className="plug-settings-actions">
        <button
          className="secondary-action"
          type="button"
          disabled={busy}
          aria-busy={scanMutation.isPending || undefined}
          onClick={scan}
        >
          {scanMutation.isPending ? copy.scanning : copy.scan}
        </button>
      </div>

      {networks.length > 0 && (
        <div className="plug-settings-fields">
          <label className="field" htmlFor={networkId}>
            {copy.network}
            <select
              id={networkId}
              value={selectedSsid}
              disabled={busy}
              onChange={(event) => {
                setSelectedSsid(event.currentTarget.value);
                setPassword('');
                setFeedback(null);
              }}
            >
              <option value="" disabled>
                {copy.selectNetwork}
              </option>
              {networks.map((network) => (
                <option key={network.ssid} value={network.ssid}>
                  {network.ssid}
                  {network.rssi === undefined ? '' : ` · ${network.rssi} dBm`}
                  {` · ${network.auth === 0 ? copy.open : copy.secured}`}
                </option>
              ))}
            </select>
          </label>

          {selected && secured && (
            <label className="field" htmlFor={passwordId}>
              {copy.password}
              <input
                id={passwordId}
                type="password"
                autoComplete="off"
                value={password}
                disabled={busy}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
            </label>
          )}

          <div className="plug-settings-actions">
            <button
              className="primary-action"
              type="button"
              disabled={!selected || (secured && password.length === 0) || busy}
              aria-busy={connectMutation.isPending || undefined}
              onClick={connect}
            >
              {connectMutation.isPending ? copy.connecting : copy.connect}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={`plug-settings-feedback${
            scanMutation.isError || connectMutation.isError
              ? ' plug-settings-feedback--warning'
              : ''
          }`}
        >
          {feedback}
        </p>
      )}
    </section>
  );
};
