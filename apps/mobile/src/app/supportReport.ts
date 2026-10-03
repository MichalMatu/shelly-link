import { redactString, type DiagnosticEvent } from '@lcl/diagnostics';
import mobilePackage from '../../package.json';
import type { RuntimeIssue } from './runtimeDiagnostics.js';

export type SupportReportDevice = {
  name: string;
  detail: string;
};

export type SupportReportInput = {
  platform: string;
  activeLocale: string;
  localePreference: string;
  themeMode: string;
  buildSha: string;
  installedAutomationSchemaVersion: number;
  savedPlugSchemaVersion: number;
  shellyDevices: readonly SupportReportDevice[];
  sensorDevices: readonly SupportReportDevice[];
  installedAutomations: readonly SupportReportDevice[];
  selectedShelly: string;
  selectedSensor: string;
  lastDiagnostics: readonly SupportReportDevice[];
  runtimeIssues: readonly RuntimeIssue[];
  diagnosticEvents: readonly DiagnosticEvent[];
};

const formatDeviceList = (
  title: string,
  devices: readonly SupportReportDevice[]
): string[] => [
  title,
  ...(devices.length > 0
    ? devices.map((device) => `- ${device.name}: ${device.detail}`)
    : ['- none'])
];

const formatRuntimeIssues = (issues: readonly RuntimeIssue[]): string[] => [
  'Runtime issues',
  ...(issues.length > 0
    ? issues.slice(-10).map((issue) => `- ${issue.atIso} ${issue.kind}: ${issue.message}`)
    : ['- none'])
];

const formatDiagnosticEvents = (events: readonly DiagnosticEvent[]): string[] => [
  'Diagnostic journal',
  ...(events.length > 0
    ? events
        .slice(-50)
        .map(
          (event) =>
            `- ${new Date(event.atMs).toISOString()} [${event.severity}] ${event.kind}: ${event.message}`
        )
    : ['- none'])
];

export const createSupportReport = (input: SupportReportInput): string => {
  const report = [
    `Shelly Link ${mobilePackage.version}`,
    `Build SHA: ${input.buildSha}`,
    `Platform: ${input.platform}`,
    `Locale: ${input.activeLocale}`,
    `Locale preference: ${input.localePreference}`,
    `Theme: ${input.themeMode}`,
    `InstalledAutomation schema: v${input.installedAutomationSchemaVersion}`,
    `SavedPlug schema: v${input.savedPlugSchemaVersion}`,
    `Selected Shelly: ${input.selectedShelly}`,
    `Selected thermometer: ${input.selectedSensor}`,
    '',
    ...formatDeviceList('Shelly plugs', input.shellyDevices),
    '',
    ...formatDeviceList('Thermometers', input.sensorDevices),
    '',
    ...formatDeviceList('Installed automations', input.installedAutomations),
    '',
    ...formatDeviceList('Last diagnostics', input.lastDiagnostics),
    '',
    ...formatRuntimeIssues(input.runtimeIssues),
    '',
    ...formatDiagnosticEvents(input.diagnosticEvents)
  ].join('\n');
  return redactString(report, { redactIp: true, redactMac: true });
};
