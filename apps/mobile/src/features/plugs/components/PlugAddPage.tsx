import { Disclosure } from '@lcl/ui';
import { IonButton, IonInput } from '@ionic/react';
import { useId, useState } from 'react';
import { useTranslation } from '../../../app/i18n.js';
import './PlugAddPage.css';
import { PlugAddModeSegment, type PlugAddMode } from './PlugAddModeSegment.js';

export type PlugScanResultView = {
  baseUrl: string;
  model: string;
  generation: number;
  saved: boolean;
  adding: boolean;
};

type ManualPlugAddProps = {
  name: string;
  url: string;
  valid: boolean;
  nameError: string | undefined;
  urlError: string | undefined;
  pending: boolean;
  disabled: boolean;
  onNameChange(value: string): void;
  onUrlChange(value: string): void;
  onSubmit(onSuccess: () => void): void;
};

type PlugNetworkScanProps = {
  startInput: string;
  endInput: string;
  rangeError: string | null;
  active: boolean;
  success: boolean;
  stopped: boolean;
  results: PlugScanResultView[];
  checkPending: boolean;
  onStartInputChange(value: string): void;
  onEndInputChange(value: string): void;
  onStart(): void;
  onStop(): void;
  onAddResult(baseUrl: string, name: string): void;
};

export type PlugAddPageProps = {
  manual: ManualPlugAddProps;
  scan: PlugNetworkScanProps;
};

const formatScanRangeSummary = (startInput: string, endInput: string): string => {
  const startParts = startInput.split('.');
  const endParts = endInput.split('.');
  if (
    startParts.length === 4 &&
    endParts.length === 4 &&
    startParts.slice(0, 3).join('.') === endParts.slice(0, 3).join('.')
  ) {
    return `${startInput}–${endParts[3]}`;
  }
  return `${startInput}–${endInput}`;
};

export const PlugAddPage = ({ manual, scan }: PlugAddPageProps) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<PlugAddMode>('scan');
  const [didSubmitManual, setDidSubmitManual] = useState(false);
  const [didSubmitScan, setDidSubmitScan] = useState(false);
  const [scanResultNames, setScanResultNames] = useState<Record<string, string>>({});
  const manualNameId = useId();
  const manualNameErrorId = useId();
  const manualUrlId = useId();
  const manualUrlErrorId = useId();
  const scanRangeErrorId = useId();
  const showManualErrors = didSubmitManual && !manual.valid;
  const showScanRangeError = didSubmitScan && scan.rangeError !== null;
  const shouldShowEmptyScanResult =
    scan.success && !scan.stopped && scan.results.length === 0;
  const scanRangeSummary = scan.rangeError
    ? t('hardware.shelly.scanRangeFailed')
    : formatScanRangeSummary(scan.startInput, scan.endInput);

  const selectSection = (section: PlugAddMode) => {
    if (section === activeSection) return;
    if (activeSection === 'scan' && scan.active) scan.onStop();
    setActiveSection(section);
  };

  const submitManual = () => {
    setDidSubmitManual(true);
    if (!manual.valid) return;
    manual.onSubmit(() => setDidSubmitManual(false));
  };

  const startScan = () => {
    setDidSubmitScan(true);
    if (scan.rangeError) return;
    setScanResultNames({});
    scan.onStart();
  };

  const resultName = (result: PlugScanResultView) =>
    scanResultNames[result.baseUrl] ?? result.model;

  return (
    <div className="device-add-page__body">
      <PlugAddModeSegment value={activeSection} onChange={selectSection} />

      {activeSection === 'manual' && (
        <section
          className="shelly-manual-add"
          role="tabpanel"
          aria-label={t('hardware.shelly.addManual')}
        >
          <div className="shelly-manual-add__body">
            <div
              className={
                showManualErrors && manual.nameError ? 'field field--invalid' : 'field'
              }
            >
              <span>{t('hardware.shelly.deviceNameLabel')}</span>
              <IonInput
                id={manualNameId}
                aria-label={t('hardware.shelly.deviceNameLabel')}
                aria-describedby={
                  showManualErrors && manual.nameError ? manualNameErrorId : undefined
                }
                aria-invalid={showManualErrors && manual.nameError ? true : undefined}
                className="plug-add-input"
                fill="outline"
                type="text"
                value={manual.name}
                onIonInput={(event) =>
                  manual.onNameChange(String(event.detail.value ?? ''))
                }
              />
              {showManualErrors && manual.nameError && (
                <span className="field__error" id={manualNameErrorId}>
                  {manual.nameError}
                </span>
              )}
            </div>
            <div
              className={
                showManualErrors && manual.urlError ? 'field field--invalid' : 'field'
              }
            >
              <span>{t('hardware.shelly.addressInputLabel')}</span>
              <IonInput
                id={manualUrlId}
                aria-label={t('hardware.shelly.addressInputLabel')}
                aria-describedby={
                  showManualErrors && manual.urlError ? manualUrlErrorId : undefined
                }
                aria-invalid={showManualErrors && manual.urlError ? true : undefined}
                className="plug-add-input"
                fill="outline"
                type="url"
                inputmode="url"
                placeholder={t('hardware.shelly.addressPlaceholder')}
                value={manual.url}
                onIonInput={(event) =>
                  manual.onUrlChange(String(event.detail.value ?? ''))
                }
              />
              {showManualErrors && manual.urlError && (
                <span className="field__error" id={manualUrlErrorId}>
                  {manual.urlError}
                </span>
              )}
            </div>
            <div className="shelly-manual-add__actions">
              <IonButton
                className="plug-add-primary-action"
                type="button"
                aria-busy={manual.pending || undefined}
                disabled={manual.disabled}
                title={t('hardware.shelly.addCheckedTitle')}
                onClick={submitManual}
              >
                {manual.pending ? t('hardware.shelly.checking') : t('common.add')}
              </IonButton>
            </div>
          </div>
        </section>
      )}

      {activeSection === 'scan' && (
        <section
          className="shelly-network-scan"
          role="tabpanel"
          aria-label={t('hardware.shelly.scanNetwork')}
        >
          <div className="shelly-network-scan__body">
            <Disclosure
              className="shelly-network-scan__range-disclosure"
              summary={t('hardware.shelly.scanRangeLabel')}
              summaryEnd={scanRangeSummary}
            >
              <div className="shelly-network-scan__range">
                <label className={showScanRangeError ? 'field field--invalid' : 'field'}>
                  <span>{t('hardware.shelly.scanRangeStart')}</span>
                  <IonInput
                    aria-label={t('hardware.shelly.scanRangeStart')}
                    aria-describedby={showScanRangeError ? scanRangeErrorId : undefined}
                    aria-invalid={showScanRangeError}
                    className="plug-add-input"
                    fill="outline"
                    type="text"
                    inputmode="numeric"
                    placeholder="192.168.0.1"
                    value={scan.startInput}
                    onIonInput={(event) =>
                      scan.onStartInputChange(String(event.detail.value ?? ''))
                    }
                  />
                </label>
                <label className={showScanRangeError ? 'field field--invalid' : 'field'}>
                  <span>{t('hardware.shelly.scanRangeEnd')}</span>
                  <IonInput
                    aria-label={t('hardware.shelly.scanRangeEnd')}
                    aria-describedby={showScanRangeError ? scanRangeErrorId : undefined}
                    aria-invalid={showScanRangeError}
                    className="plug-add-input"
                    fill="outline"
                    type="text"
                    inputmode="numeric"
                    placeholder="192.168.0.99"
                    value={scan.endInput}
                    onIonInput={(event) =>
                      scan.onEndInputChange(String(event.detail.value ?? ''))
                    }
                  />
                  {showScanRangeError && (
                    <span className="field__error" id={scanRangeErrorId}>
                      {scan.rangeError}
                    </span>
                  )}
                </label>
              </div>
            </Disclosure>

            {shouldShowEmptyScanResult && <p>{t('hardware.shelly.scanResultEmpty')}</p>}
            {scan.results.length > 0 && (
              <div
                className="saved-list"
                aria-label={t('hardware.shelly.foundListLabel')}
              >
                {scan.results.map((result) => {
                  const name = resultName(result);
                  return (
                    <article
                      key={result.baseUrl}
                      className="device-discovery-card shelly-scan-result"
                    >
                      <div className="device-discovery-card__primary">
                        <label className="device-discovery-card__name">
                          <span>{t('hardware.shelly.deviceNameLabel')}</span>
                          <IonInput
                            className="plug-add-input device-discovery-card__name-input shelly-scan-result__name-input"
                            aria-label={`${t('hardware.shelly.deviceNameLabel')}: ${result.baseUrl}`}
                            fill="outline"
                            type="text"
                            value={name}
                            disabled={result.saved}
                            onIonInput={(event) =>
                              setScanResultNames((current) => ({
                                ...current,
                                [result.baseUrl]: String(event.detail.value ?? '')
                              }))
                            }
                          />
                        </label>
                        <IonButton
                          aria-label={
                            result.saved
                              ? `${t('hardware.shelly.alreadyAdded')}: ${result.baseUrl}`
                              : `${t('common.add')}: ${result.baseUrl}`
                          }
                          aria-busy={result.adding || undefined}
                          className="plug-add-primary-action device-discovery-card__action shelly-scan-result__add"
                          type="button"
                          disabled={
                            result.saved || scan.checkPending || name.trim().length === 0
                          }
                          onClick={() => scan.onAddResult(result.baseUrl, name)}
                        >
                          {result.saved
                            ? t('hardware.shelly.alreadyAdded')
                            : result.adding
                              ? t('hardware.shelly.checking')
                              : t('common.add')}
                        </IonButton>
                      </div>
                      <div className="device-discovery-card__meta shelly-scan-result__meta">
                        <strong className="device-discovery-card__identity">
                          {result.baseUrl}
                        </strong>
                        <span>
                          {result.model}, gen {result.generation}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="action-row shelly-network-scan__actions device-add-page__scan-control">
              <IonButton
                className="plug-add-secondary-action device-scan-action"
                fill="outline"
                type="button"
                aria-busy={scan.active || undefined}
                title={
                  scan.active
                    ? t('hardware.shelly.scanStopTitle')
                    : t('hardware.shelly.scanStartTitle')
                }
                onClick={scan.active ? scan.onStop : startScan}
              >
                {scan.active && (
                  <span className="device-scan-action__spinner" aria-hidden="true" />
                )}
                <span>
                  {scan.active
                    ? t('hardware.shelly.scanStop')
                    : t('hardware.shelly.scanStart')}
                </span>
              </IonButton>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
