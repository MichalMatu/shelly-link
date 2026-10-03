export type DoctorFindingStatus = 'pass' | 'warn' | 'fail';

export type ShellyDoctorScriptEvidence = {
  id: number;
  name: string;
  enable: boolean;
  running: boolean;
  hash?: string;
};

export type ShellyDoctorScheduleEvidence = {
  id: number;
  enable: boolean;
  timespec: string;
};

export type ShellyDoctorExpectedAutomation = {
  kind: 'climate' | 'time' | 'pulse';
  scriptId?: number;
  scriptHash?: string;
  shouldRun?: boolean;
  scheduleIds?: readonly number[];
};

export type ShellyDoctorSnapshot = {
  reachable: boolean;
  expectedDeviceId?: string;
  observedDeviceId?: string;
  model?: string;
  gen?: number;
  firmwareId?: string;
  relayOn?: boolean;
  clock?: {
    timeSynced: boolean;
    localTime?: string;
    unixTimeSec?: number;
  };
  bluetooth?: 'enabled' | 'disabled' | 'missing';
  scripts?: readonly ShellyDoctorScriptEvidence[];
  schedules?: readonly ShellyDoctorScheduleEvidence[];
  expectedAutomation?: ShellyDoctorExpectedAutomation;
  readErrors?: readonly string[];
};

export type ShellyDoctorFinding = {
  code: string;
  status: DoctorFindingStatus;
  summary: string;
  detail?: string;
};

export type ShellyDoctorReport = {
  status: DoctorFindingStatus;
  findings: readonly ShellyDoctorFinding[];
  snapshot: ShellyDoctorSnapshot;
};

const normalizeIdentity = (value: string): string => value.trim().toLowerCase();

const aggregateStatus = (
  findings: readonly ShellyDoctorFinding[]
): DoctorFindingStatus =>
  findings.some((finding) => finding.status === 'fail')
    ? 'fail'
    : findings.some((finding) => finding.status === 'warn')
      ? 'warn'
      : 'pass';

const finding = (
  code: string,
  status: DoctorFindingStatus,
  summary: string,
  detail?: string
): ShellyDoctorFinding => ({
  code,
  status,
  summary,
  ...(detail ? { detail } : {})
});

export const evaluateShellyDoctorSnapshot = (
  snapshot: ShellyDoctorSnapshot
): ShellyDoctorReport => {
  const findings: ShellyDoctorFinding[] = [];

  if (!snapshot.reachable) {
    findings.push(finding('device.reachable', 'fail', 'Shelly is not reachable.'));
    return { status: 'fail', findings, snapshot };
  }
  findings.push(finding('device.reachable', 'pass', 'Shelly is reachable.'));

  if (snapshot.expectedDeviceId) {
    if (!snapshot.observedDeviceId) {
      findings.push(
        finding('device.identity', 'fail', 'Shelly did not expose a stable device id.')
      );
    } else if (
      normalizeIdentity(snapshot.expectedDeviceId) !==
      normalizeIdentity(snapshot.observedDeviceId)
    ) {
      findings.push(
        finding(
          'device.identity',
          'fail',
          'Physical Shelly identity does not match the expected device.'
        )
      );
    } else {
      findings.push(
        finding('device.identity', 'pass', 'Physical Shelly identity matches.')
      );
    }
  }

  findings.push(
    snapshot.firmwareId
      ? finding('device.firmware', 'pass', `Firmware: ${snapshot.firmwareId}.`)
      : finding('device.firmware', 'warn', 'Firmware id is unavailable.')
  );

  if (snapshot.clock) {
    const clockStatus =
      snapshot.expectedAutomation?.kind === 'time' && !snapshot.clock.timeSynced
        ? 'fail'
        : snapshot.clock.timeSynced
          ? 'pass'
          : 'warn';
    findings.push(
      finding(
        'device.clock',
        clockStatus,
        snapshot.clock.timeSynced
          ? 'Shelly clock is synchronized.'
          : 'Shelly clock is not synchronized.'
      )
    );
  } else {
    findings.push(finding('device.clock', 'warn', 'Shelly clock status is unavailable.'));
  }

  for (const error of snapshot.readErrors ?? []) {
    findings.push(
      finding('device.read', 'warn', 'A read-only diagnostic request failed.', error)
    );
  }

  const scripts = snapshot.scripts ?? [];
  const enabledScripts = scripts.filter((script) => script.enable);
  if (enabledScripts.length > 1) {
    findings.push(
      finding(
        'scripts.exclusive-owner',
        'fail',
        `More than one enabled script exists (${enabledScripts.length}).`
      )
    );
  } else {
    findings.push(
      finding(
        'scripts.exclusive-owner',
        'pass',
        enabledScripts.length === 1
          ? 'One enabled script owns the runtime.'
          : 'No enabled script owns the runtime.'
      )
    );
  }

  const expected = snapshot.expectedAutomation;
  if (expected?.scriptId !== undefined) {
    const script = scripts.find((candidate) => candidate.id === expected.scriptId);
    if (!script) {
      findings.push(
        finding(
          'script.expected',
          'fail',
          `Expected script ${expected.scriptId} is missing.`
        )
      );
    } else {
      findings.push(
        finding('script.expected', 'pass', `Expected script ${expected.scriptId} exists.`)
      );
      if (expected.scriptHash) {
        findings.push(
          script.hash === expected.scriptHash
            ? finding('script.hash', 'pass', 'Installed script hash matches.')
            : finding(
                'script.hash',
                'fail',
                'Installed script hash does not match expected runtime.'
              )
        );
      }
      if (expected.shouldRun !== undefined) {
        findings.push(
          script.running === expected.shouldRun
            ? finding(
                'script.running',
                'pass',
                `Script running state is ${script.running ? 'ON' : 'OFF'}.`
              )
            : finding(
                'script.running',
                'warn',
                `Script running state is ${script.running ? 'ON' : 'OFF'}, expected ${expected.shouldRun ? 'ON' : 'OFF'}.`
              )
        );
      }
    }
  }

  if (expected?.scheduleIds) {
    const schedules = snapshot.schedules ?? [];
    const scheduleIds = new Set(schedules.map((job) => job.id));
    const missing = expected.scheduleIds.filter((id) => !scheduleIds.has(id));
    findings.push(
      missing.length === 0
        ? finding('schedule.expected', 'pass', 'Expected native schedules exist.')
        : finding(
            'schedule.expected',
            'fail',
            `Expected schedules are missing: ${missing.join(', ')}.`
          )
    );
  }

  if (!expected && snapshot.relayOn) {
    findings.push(
      finding(
        'relay.unowned-on',
        'warn',
        'Relay is ON while no expected automation was supplied.'
      )
    );
  } else if (snapshot.relayOn !== undefined) {
    findings.push(
      finding('relay.state', 'pass', `Relay state is ${snapshot.relayOn ? 'ON' : 'OFF'}.`)
    );
  }

  return { status: aggregateStatus(findings), findings, snapshot };
};

export const formatShellyDoctorReport = (report: ShellyDoctorReport): string => {
  const lines = [`Shelly Link Doctor: ${report.status.toUpperCase()}`];
  for (const item of report.findings) {
    lines.push(`- [${item.status.toUpperCase()}] ${item.code}: ${item.summary}`);
    if (item.detail) lines.push(`  ${item.detail}`);
  }
  return `${lines.join('\n')}\n`;
};
