import type { SensorSetupFlow } from '../pageContracts.js';
import { IonButton, IonInput } from '@ionic/react';
import { AppToastViewport, useToastQueue } from '../../../components/AppToastViewport.js';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import type { BleDiscoveryCandidate } from '../../../flows/hardware-setup/schemas.js';
import type { HardwarePageProps } from '../helpers.js';
import { useSensorSetupFeedback } from './useSensorSetupFeedback.js';
import {
  formatSensorMetric,
  SavedSensorList,
  SensorRemovalBlockedModal,
  SensorRemovalConfirmModal,
  sensorProfileDisplayLabels
} from '../../../features/thermometers/index.js';
import { SensorAddForm } from './SensorSetupPresentation.js';
import './SensorSetupPage.css';
import { SensorAddModeSegment, type SensorAddMode } from '../../../features/thermometers/components/SensorAddModeSegment.js';

type SensorDraftDevice = SensorSetupFlow['sensorDevices'][number];
type SensorRemovalUsage = ReturnType<SensorSetupFlow['sensorRemovalUsage']>[number];
type SensorDialogState =
  | { kind: 'none' }
  | { kind: 'remove'; device: SensorDraftDevice }
  | { kind: 'blocked'; device: SensorDraftDevice; usage: SensorRemovalUsage };

type SensorSetupPageProps = HardwarePageProps<SensorSetupFlow> & {
  primaryAddAction?: SensorAddMode;
  embedded?: boolean;
  addOnly?: boolean;
  onAddRequest?: (mode: SensorAddMode) => void;
  onOpenSensorSettings?: (sensorId: string) => void;
  onOpenInstallation?: (installationId: string) => void;
  hideAddAction?: boolean;
  onSensorRemoved?: () => void;
};

export const SensorSetupPage = ({
  flow,
  primaryAddAction = 'manual',
  embedded = false,
  addOnly = false,
  onAddRequest,
  onOpenSensorSettings,
  onOpenInstallation,
  hideAddAction = false,
  onSensorRemoved
}: SensorSetupPageProps) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<SensorDialogState>({ kind: 'none' });
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const [didSubmitSensorAdd, setDidSubmitSensorAdd] = useState(false);
  const [addMode, setAddMode] = useState<SensorAddMode>(primaryAddAction);
  const [scanCandidateNames, setScanCandidateNames] = useState<Record<string, string>>(
    {}
  );
  const autoScanStartedRef = useRef(false);
  const startPhoneBleScanRef = useRef<() => void>(() => undefined);
  const stopPhoneBleScanRef = useRef<() => void>(() => undefined);
  const { dismissToast, pushToast, toasts } = useToastQueue('sensor-toast');
  const sensorPendingRemoval = dialog.kind === 'remove' ? dialog.device : null;
  const blockedSensorRemoval = dialog.kind === 'blocked' ? dialog : null;
  const isPhoneBleScanPending = flow.phoneBleScanMutation.isPending;
  const isSensorGattPending = flow.setPvvxTimeMutation.isPending;
  const shouldShowPhoneBleEmpty =
    flow.phoneBleScanMutation.isSuccess && flow.phoneBleScanCandidates.length === 0;
  const sensorDeviceCount = flow.sensorDevices.length;
  const shouldRunSavedSensorLiveScan =
    sensorDeviceCount > 0 && !addOnly && !isSensorGattPending;

  const { resetPhoneBleError } = useSensorSetupFeedback({
    flow,
    shouldRunSavedSensorLiveScan,
    pushToast,
    t
  });

  const startPhoneBleScan = () => {
    resetPhoneBleError();
    flow.startPhoneBleScan();
  };
  startPhoneBleScanRef.current = startPhoneBleScan;
  stopPhoneBleScanRef.current = flow.stopPhoneBleScan;

  useEffect(() => {
    if (!addOnly || primaryAddAction !== 'phone-scan' || autoScanStartedRef.current)
      return;
    autoScanStartedRef.current = true;
    startPhoneBleScanRef.current();
  }, [addOnly, primaryAddAction]);

  useEffect(
    () => () => {
      if (addOnly) stopPhoneBleScanRef.current();
    },
    [addOnly]
  );

  const selectAddMode = (mode: SensorAddMode) => {
    if (mode === addMode) return;
    if (addMode === 'phone-scan') {
      flow.stopPhoneBleScan();
      flow.resetPhoneBleScan();
    }
    setDidSubmitSensorAdd(false);
    setAddMode(mode);
    if (mode === 'phone-scan') startPhoneBleScan();
  };

  const addSensor = () => {
    setDidSubmitSensorAdd(true);
    if (!flow.sensorInputState.ok) return;
    flow.addSensorDraft();
    setDidSubmitSensorAdd(false);
    flow.setSensorNameInput('');
    flow.setSensorMacInput('');
    pushToast('ok', t('hardware.shelly.thermometerSaved'));
  };

  const defaultScannedSensorName = (candidate: BleDiscoveryCandidate) =>
    t('hardware.flow.sensorDefaultName', {
      suffix: candidate.runtimeAddress.split(':').slice(-2).join(':')
    });

  const scannedSensorName = (candidate: BleDiscoveryCandidate) =>
    scanCandidateNames[candidate.runtimeAddress] ?? defaultScannedSensorName(candidate);

  const setScannedSensorName = (candidate: BleDiscoveryCandidate, value: string) => {
    setScanCandidateNames((current) => ({
      ...current,
      [candidate.runtimeAddress]: value
    }));
  };

  const saveScannedSensor = (candidate: BleDiscoveryCandidate) => {
    const name = scannedSensorName(candidate).trim();
    if (!name) return;
    flow.addDiscoveredSensor(candidate, 'phone-scan', name);
    pushToast('ok', t('hardware.shelly.thermometerSaved'));
  };

  const requestRemoveSensor = (device: SensorDraftDevice) => {
    const usage = flow.sensorRemovalUsage(device.id)[0];
    setDialog(usage ? { kind: 'blocked', device, usage } : { kind: 'remove', device });
  };

  const confirmRemoveSensor = () => {
    if (!sensorPendingRemoval) return;
    if (!flow.removeSensorDevice(sensorPendingRemoval.id)) {
      const usage = flow.sensorRemovalUsage(sensorPendingRemoval.id)[0];
      if (usage) setDialog({ kind: 'blocked', device: sensorPendingRemoval, usage });
      return;
    }
    setDialog({ kind: 'none' });
    pushToast('ok', t('hardware.sensor.removed'));
    onSensorRemoved?.();
  };

  const scanContent = (
    <section
      className="sensor-add-scan"
      role="tabpanel"
      aria-label={t('hardware.sensor.scanBle')}
    >
      {shouldShowPhoneBleEmpty && <p>{t('hardware.sensor.noBleFound')}</p>}
      {flow.phoneBleScanCandidates.length > 0 && (
        <div
          className="ble-candidate-list"
          aria-label={t('hardware.sensor.blePhoneFoundLabel')}
        >
          {flow.phoneBleScanCandidates.map((candidate) => {
            const hasTemperature = typeof candidate.temperatureC === 'number';
            const hasHumidity = typeof candidate.humidityPct === 'number';
            const savedSensor = flow.sensorDevices.find(
              (device) =>
                device.runtimeAddress.toUpperCase() ===
                candidate.runtimeAddress.toUpperCase()
            );
            const isSavedSensor = savedSensor !== undefined;
            const displayName = savedSensor?.name ?? scannedSensorName(candidate);

            return (
              <article
                key={candidate.runtimeAddress}
                className="device-discovery-card ble-candidate-item"
              >
                <div className="device-discovery-card__primary">
                  <label className="device-discovery-card__name ble-candidate-name">
                    <span>{t('hardware.sensor.nameLabel')}</span>
                    <IonInput
                      className="sensor-add-input device-discovery-card__name-input"
                      aria-label={`${t('hardware.sensor.nameLabel')}: ${candidate.runtimeAddress}`}
                      fill="outline"
                      type="text"
                      value={displayName}
                      disabled={isSavedSensor}
                      onIonInput={(event) =>
                        setScannedSensorName(
                          candidate,
                          String(event.detail.value ?? '')
                        )
                      }
                    />
                  </label>
                  <IonButton
                    className="sensor-add-primary-action device-discovery-card__action ble-candidate-action"
                    type="button"
                    disabled={isSavedSensor || displayName.trim().length === 0}
                    title={
                      isSavedSensor
                        ? t('hardware.sensor.saveThermometerSavedTitle')
                        : t('hardware.sensor.saveThermometerTitle')
                    }
                    onClick={() => saveScannedSensor(candidate)}
                  >
                    {isSavedSensor ? t('hardware.sensor.saved') : t('common.add')}
                  </IonButton>
                </div>
                <div className="device-discovery-card__meta ble-candidate-main">
                  <strong className="device-discovery-card__identity">
                    {candidate.runtimeAddress}
                  </strong>
                  <span>{sensorProfileDisplayLabels[candidate.profileId]}</span>
                </div>
                <dl className="device-discovery-card__metrics ble-candidate-metrics">
                  <div>
                    <dt>RSSI</dt>
                    <dd>
                      {formatSensorMetric(candidate.rssi, ' dBm', 0, t('common.missing'))}
                    </dd>
                  </div>
                  {hasTemperature && (
                    <div>
                      <dt>{t('hardware.metrics.temperatureShort')}</dt>
                      <dd>
                        {formatSensorMetric(
                          candidate.temperatureC,
                          '°C',
                          1,
                          t('common.missing')
                        )}
                      </dd>
                    </div>
                  )}
                  {hasHumidity && (
                    <div>
                      <dt>{t('hardware.metrics.humidityShort')}</dt>
                      <dd>
                        {formatSensorMetric(
                          candidate.humidityPct,
                          '%',
                          1,
                          t('common.missing')
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            );
          })}
        </div>
      )}
      <div className="action-row device-add-page__actions device-add-page__scan-control">
        <IonButton
          className="sensor-add-secondary-action device-scan-action"
          fill="outline"
          type="button"
          aria-busy={isPhoneBleScanPending || undefined}
          title={
            isPhoneBleScanPending
              ? t('hardware.sensor.scanStopTitle')
              : t('hardware.sensor.scanAgainTitle')
          }
          onClick={isPhoneBleScanPending ? flow.stopPhoneBleScan : startPhoneBleScan}
        >
          {isPhoneBleScanPending && (
            <span className="device-scan-action__spinner" aria-hidden="true" />
          )}
          <span>
            {isPhoneBleScanPending
              ? t('hardware.shelly.scanStop')
              : t('hardware.shelly.scanBleAgain')}
          </span>
        </IonButton>
      </div>
    </section>
  );

  if (addOnly) {
    return (
      <section
        className="device-add-page sensor-add-page"
        aria-label={t('hardware.sensor.add')}
      >
        <SensorAddModeSegment value={addMode} onChange={selectAddMode} />
        {addMode === 'phone-scan' ? (
          scanContent
        ) : (
          <section
            className="sensor-manual-add"
            role="tabpanel"
            aria-label={t('hardware.shelly.addManual')}
          >
            <SensorAddForm flow={flow} showValidationErrors={didSubmitSensorAdd} />
            <div className="action-row device-add-page__actions">
              <IonButton
                className="sensor-add-primary-action"
                type="button"
                onClick={addSensor}
              >
                {t('common.add')}
              </IonButton>
            </div>
          </section>
        )}
        <AppToastViewport
          dismissLabel={t('toast.dismiss')}
          label={t('toast.regionLabel')}
          toasts={toasts}
          onDismiss={dismissToast}
        />
      </section>
    );
  }

  return (
    <section
      className={
        embedded
          ? 'sensor-setup-panel sensor-setup-panel--embedded'
          : 'demo-panel sensor-setup-panel'
      }
      aria-label={t('hardware.nav.sensorTitle')}
    >
      {!hideAddAction && (
        <button
          className={
            primaryAddAction === 'phone-scan'
              ? 'primary-action dashboard-fab'
              : 'primary-action setup-add-fab'
          }
          type="button"
          aria-label={
            primaryAddAction === 'phone-scan'
              ? t('hardware.sensor.scanPhoneTitle')
              : t('hardware.sensor.add')
          }
          title={
            primaryAddAction === 'phone-scan'
              ? t('hardware.sensor.scanPhoneTitle')
              : t('hardware.sensor.addTitle')
          }
          onClick={() => onAddRequest?.(primaryAddAction)}
        >
          <IconPlus
            className={
              primaryAddAction === 'phone-scan'
                ? 'dashboard-fab__icon'
                : 'setup-add-fab__icon'
            }
            aria-hidden="true"
          />
        </button>
      )}

      <SensorRemovalBlockedModal
        deviceName={blockedSensorRemoval?.device.name ?? null}
        usage={blockedSensorRemoval?.usage ?? null}
        onClose={() => setDialog({ kind: 'none' })}
        {...(onOpenInstallation
          ? {
              onOpenAutomation: (installationId: string) => {
                setDialog({ kind: 'none' });
                onOpenInstallation(installationId);
              }
            }
          : {})}
      />

      <SensorRemovalConfirmModal
        deviceName={sensorPendingRemoval?.name ?? null}
        onClose={() => setDialog({ kind: 'none' })}
        onConfirm={confirmRemoveSensor}
      />
      <AppToastViewport
        dismissLabel={t('toast.dismiss')}
        label={t('toast.regionLabel')}
        toasts={toasts}
        onDismiss={dismissToast}
      />

      <SavedSensorList
        devices={flow.sensorDevices}
        samplesById={flow.sensorSamplesById}
        editingSensorId={editingSensorId}
        pvvxTimePending={flow.setPvvxTimeMutation.isPending}
        embedded={embedded}
        onEditStart={setEditingSensorId}
        onEditEnd={() => setEditingSensorId(null)}
        onNameChange={flow.setSensorDeviceName}
        onPvvxSetTime={(device) => flow.setPvvxTimeMutation.mutate(device)}
        onRemove={requestRemoveSensor}
        {...(onOpenSensorSettings ? { onOpenDetails: onOpenSensorSettings } : {})}
      />
    </section>
  );
};
