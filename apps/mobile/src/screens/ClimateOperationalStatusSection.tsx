import type { Translate } from '../app/i18n.js';
import {
  ClimateAutomationDetailSection,
  PulseOperationalStatusSummary
} from '../features/automations/index.js';
import {
  formatDiagnosticReason,
  formatRelayState
} from '../flows/installations/diagnosticPresentation.js';
import type { ClimateInstalledAutomation } from '../flows/installations/model.js';
import { climatePulseOperationalStatus } from '../flows/installations/pulseOperationalStatus.js';
import type { InstalledAutomationControlStatus } from '../flows/installations/runtimeStatus.js';
import type { HardwareDiagnosticSnapshot } from '../flows/hardware-setup/schemas.js';

type ClimateOperationalStatusSectionProps = {
  installation: ClimateInstalledAutomation;
  snapshot: HardwareDiagnosticSnapshot | undefined;
  control: InstalledAutomationControlStatus | undefined;
  missing: string;
  t: Translate;
};

export const ClimateOperationalStatusSection = ({
  installation,
  snapshot,
  control,
  missing,
  t
}: ClimateOperationalStatusSectionProps) => {
  const diagnostics = snapshot?.diagnostics;
  const shellyRelayState = snapshot?.plug?.relayState ?? control?.relayOn;
  const pulseStatus = climatePulseOperationalStatus({
    installation,
    snapshot,
    control
  });

  if (pulseStatus) {
    return (
      <section className="installation-automation-live-state">
        <PulseOperationalStatusSummary status={pulseStatus} />
      </section>
    );
  }

  return (
    <ClimateAutomationDetailSection
      reason={diagnostics ? formatDiagnosticReason(diagnostics.lastReason, t) : missing}
      relayRule={formatRelayState(diagnostics?.relayState, missing)}
      shellyRelay={formatRelayState(shellyRelayState, missing)}
    />
  );
};
