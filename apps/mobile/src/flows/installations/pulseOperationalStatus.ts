import {
  normalizePulseOperationalStatus,
  type PulseOperationalStatus
} from '../../features/automations/index.js';
import type { HardwareDiagnosticSnapshot } from '../hardware-setup/schemas.js';
import type { ClimateInstalledAutomation } from './model.js';
import type { InstalledAutomationControlStatus } from './runtimeStatus.js';

type ClimatePulseOperationalStatusSource = {
  installation: ClimateInstalledAutomation;
  snapshot: HardwareDiagnosticSnapshot | undefined;
  control: InstalledAutomationControlStatus | undefined;
};

export const climatePulseOperationalStatus = ({
  installation,
  snapshot,
  control
}: ClimatePulseOperationalStatusSource): PulseOperationalStatus | null => {
  if (!installation.config.execution?.pulse) return null;

  const pulse = snapshot?.execution?.pulse;
  if (!pulse) return normalizePulseOperationalStatus(null);

  return normalizePulseOperationalStatus({
    phase: pulse.phase,
    cyclesCompleted: pulse.cyclesCompleted,
    nextTransitionUptimeMs: pulse.nextTransitionUptimeMs,
    lastReason: pulse.lastReason ?? snapshot.diagnostics.lastReason ?? null,
    requestedOutputOn: snapshot.diagnostics.automationRequestedRelayState ?? null,
    finalOutputOn:
      snapshot.plug?.relayState ?? control?.relayOn ?? snapshot.diagnostics.relayState ?? null,
    automationFault: control?.automationFault ?? snapshot.diagnostics.automationFault ?? null,
    hardSafety: control?.safetyLockout ?? snapshot.diagnostics.safetyLockout ?? null,
    hardSafetyReason: control?.safetyReason ?? snapshot.diagnostics.safetyReason ?? null,
    deviceUptimeMs:
      snapshot.time.uptimeSec != null && Number.isFinite(snapshot.time.uptimeSec)
        ? snapshot.time.uptimeSec * 1000
        : null
  });
};
