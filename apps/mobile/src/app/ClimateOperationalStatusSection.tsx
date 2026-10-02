import type { Translate } from './i18n.js';
import { ClimateAutomationDetailSection, Pulse } from '../features/automations/index.js';
import {
  formatDiagnosticReason,
  formatRelayState
} from '../flows/installations/diagnosticPresentation.js';
import type { ClimateInstalledAutomation } from '../flows/installations/model.js';
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
  if (installation.config.execution?.pulse) {
    return (
      <section className="installation-automation-live-state">
        <Pulse.Operational.ClimateStatusSummary snapshot={snapshot} control={control} />
      </section>
    );
  }

  const diagnostics = snapshot?.diagnostics;
  const shellyRelayState = snapshot?.plug?.relayState ?? control?.relayOn;
  return (
    <ClimateAutomationDetailSection
      reason={diagnostics ? formatDiagnosticReason(diagnostics.lastReason, t) : missing}
      relayRule={formatRelayState(diagnostics?.relayState, missing)}
      shellyRelay={formatRelayState(shellyRelayState, missing)}
    />
  );
};
