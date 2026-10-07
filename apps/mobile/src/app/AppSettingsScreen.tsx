import { Capacitor } from '@capacitor/core';
import {
  INSTALLED_AUTOMATION_VERSION,
  useInstalledAutomationStore
} from '../features/automations/index.js';
import { SAVED_PLUG_VERSION, useSavedPlugStore } from '../features/plugs/index.js';
import {
  clearDiagnosticEvents,
  diagnosticJournalChangeEvent,
  getDiagnosticEvents
} from '../platform/diagnosticJournal.js';
import { Disclosure, DiagnosticRow, type DiagnosticRowProps } from '@lcl/ui';
import { Suspense, lazy, useEffect, useState } from 'react';
import {
  getLocalePreference,
  localePreferenceChangeEvent,
  setLocalePreference,
  useTranslation,
  type LocalePreference
} from './i18n.js';
import {
  clearRuntimeIssues,
  getRuntimeIssues,
  runtimeIssuesChangeEvent
} from './runtimeDiagnostics.js';
import { createSupportReport } from './supportReport.js';
import {
  getThemeMode,
  setThemeMode,
  themeModeChangeEvent,
  type ThemeMode
} from './themeMode.js';

export type SupportDiagnosticRow = {
  label: string;
  value: string;
  tone?: DiagnosticRowProps['tone'];
};

const IonicSettingsControl = lazy(async () => {
  const module = await import('./IonicSettingsControl.js');
  return { default: module.IonicSettingsControl };
});

const SettingsControlFallback = () => (
  <div className="app-settings__control-loading" aria-hidden="true" />
);

const formatIssue = (kind: string, message: string): string => `${kind}: ${message}`;

const copyToClipboard = async (value: string): Promise<void> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('Clipboard API unavailable.');
  }

  await navigator.clipboard.writeText(value);
};

export const AppSettingsScreen = () => {
  const { locale, t } = useTranslation();
  const platform = Capacitor.getPlatform();
  const [localePreference, setLocalePreferenceState] = useState<LocalePreference>(() =>
    getLocalePreference()
  );
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getThemeMode());
  const [runtimeIssues, setRuntimeIssues] = useState(() => getRuntimeIssues());
  const [diagnosticEvents, setDiagnosticEvents] = useState(() => getDiagnosticEvents());
  const savedPlugs = useSavedPlugStore((state) => state.plugs);
  const installedAutomations = useInstalledAutomationStore(
    (state) => state.installations
  );
  const [copyState, setCopyState] = useState<'idle' | 'done' | 'failed'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refresh = () => {
      setLocalePreferenceState(getLocalePreference());
      setThemeModeState(getThemeMode());
      setRuntimeIssues(getRuntimeIssues());
      setDiagnosticEvents(getDiagnosticEvents());
    };

    window.addEventListener(localePreferenceChangeEvent, refresh);
    window.addEventListener(runtimeIssuesChangeEvent, refresh);
    window.addEventListener(diagnosticJournalChangeEvent, refresh);
    window.addEventListener(themeModeChangeEvent, refresh);
    return () => {
      window.removeEventListener(localePreferenceChangeEvent, refresh);
      window.removeEventListener(runtimeIssuesChangeEvent, refresh);
      window.removeEventListener(diagnosticJournalChangeEvent, refresh);
      window.removeEventListener(themeModeChangeEvent, refresh);
    };
  }, []);

  const chooseLocale = (preference: LocalePreference) => {
    setLocalePreference(preference);
    setLocalePreferenceState(preference);
  };

  const chooseTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeModeState(mode);
  };

  const clearDiagnostics = () => {
    clearRuntimeIssues();
    clearDiagnosticEvents();
    setRuntimeIssues([]);
    setDiagnosticEvents([]);
    setCopyState('idle');
  };

  const latestIssues = [...runtimeIssues].slice(-4).reverse();
  const supportRows: readonly SupportDiagnosticRow[] = [
    { label: t('settings.support.platform'), value: platform }
  ];
  const supportReport = createSupportReport({
    platform,
    buildSha: import.meta.env.VITE_GIT_SHA ?? 'development',
    installedAutomationSchemaVersion: INSTALLED_AUTOMATION_VERSION,
    savedPlugSchemaVersion: SAVED_PLUG_VERSION,
    shellyDevices: savedPlugs.map((plug) => ({
      name: plug.name,
      detail: `${plug.model} gen${plug.generation}; firmware=${plug.firmwareId ?? 'unknown'}; wifi=${plug.wifiBaseUrl ? 'yes' : 'no'}; ble=${plug.bleDeviceId ? 'yes' : 'no'}`
    })),
    sensorDevices: [],
    installedAutomations: installedAutomations.map((installation) => ({
      name: installation.id,
      detail: `${installation.kind}; device=${installation.shelly.deviceId}; updated=${installation.updatedAtMs}`
    })),
    selectedShelly: t('common.missing'),
    selectedSensor: t('common.missing'),
    lastDiagnostics: [],
    activeLocale: locale,
    localePreference,
    themeMode,
    runtimeIssues,
    diagnosticEvents
  });

  const copyReport = () => {
    void copyToClipboard(supportReport)
      .then(() => setCopyState('done'))
      .catch(() => setCopyState('failed'));
  };

  return (
    <main className="demo-shell app-settings-screen">
      <header className="demo-header app-settings-screen__header app-page-header">
        <h1>{t('dashboard.settingsTab')}</h1>
      </header>

      <div className="app-settings">
        <section className="app-settings__section">
          <div className="app-settings__section-header">
            <h2>{t('settings.language.title')}</h2>
          </div>
          <Suspense fallback={<SettingsControlFallback />}>
            <IonicSettingsControl
              kind="language"
              value={localePreference}
              onChange={chooseLocale}
            />
          </Suspense>
        </section>

        <section className="app-settings__section">
          <div className="app-settings__section-header">
            <h2>{t('settings.appearance.title')}</h2>
          </div>
          <Suspense fallback={<SettingsControlFallback />}>
            <IonicSettingsControl
              kind="appearance"
              value={themeMode}
              onChange={chooseTheme}
            />
          </Suspense>
        </section>

        <Disclosure
          className="app-settings__diagnostics"
          summary={t('common.diagnostics')}
          summaryEnd={
            <span className="app-settings__diagnostics-status">
              {t('settings.support.runtimeErrors', { count: runtimeIssues.length })}
            </span>
          }
        >
          <div className="app-settings__diagnostics-body">
            <div className="status-stack">
              {supportRows.map((row) => (
                <DiagnosticRow
                  key={row.label}
                  label={row.label}
                  value={row.value}
                  {...(row.tone ? { tone: row.tone } : {})}
                />
              ))}
            </div>

            {latestIssues.length > 0 && (
              <ol className="app-settings__issues">
                {latestIssues.map((issue) => (
                  <li key={issue.id}>{formatIssue(issue.kind, issue.message)}</li>
                ))}
              </ol>
            )}

            <div className="settings-action-stack">
              <button className="secondary-action" type="button" onClick={copyReport}>
                {t('settings.support.copyReport')}
              </button>
              {runtimeIssues.length > 0 && (
                <button
                  className="secondary-action"
                  type="button"
                  onClick={clearDiagnostics}
                >
                  {t('settings.support.clearDiagnostics')}
                </button>
              )}
            </div>
            {copyState === 'done' && (
              <p className="app-settings__feedback">{t('settings.support.copyDone')}</p>
            )}
            {copyState === 'failed' && (
              <p className="app-settings__feedback app-settings__feedback--warning">
                {t('settings.support.copyFailed')}
              </p>
            )}
          </div>
        </Disclosure>
      </div>
    </main>
  );
};
