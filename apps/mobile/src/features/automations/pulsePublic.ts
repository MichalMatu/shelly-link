import { ClimatePulseOperationalStatusSummary } from './components/ClimatePulseOperationalStatusSummary.js';
import { PulseCycleEditor } from './components/PulseCycleEditor.js';
import { PulseOperationalStatusSummary } from './components/PulseOperationalStatusSummary.js';
import { StandalonePulseSetupPage } from './components/StandalonePulseSetupPage.js';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  parsePulseCycleForm,
  pulseCycleFormFromConfig
} from './data/pulseCycleForm.js';
import {
  createTimePulseInstalledAutomation,
  isTimePulseInstalledAutomation
} from './data/installedAutomation.js';
import { normalizePulseOperationalStatus } from './data/pulseOperationalStatus.js';
import { installTimePulseAutomation } from './data/timePulseAutomationRuntime.js';
import { usePulseOperationalStatus } from './flows/usePulseOperationalStatus.js';

export const Pulse = {
  Cycle: {
    Editor: PulseCycleEditor,
    defaultForm: DEFAULT_PULSE_CYCLE_FORM,
    parseForm: parsePulseCycleForm,
    fromConfig: pulseCycleFormFromConfig
  },
  Time: {
    createInstalledAutomation: createTimePulseInstalledAutomation,
    install: installTimePulseAutomation,
    isInstalled: isTimePulseInstalledAutomation
  },
  Standalone: {
    SetupPage: StandalonePulseSetupPage
  },
  Operational: {
    StatusSummary: PulseOperationalStatusSummary,
    ClimateStatusSummary: ClimatePulseOperationalStatusSummary,
    normalizeStatus: normalizePulseOperationalStatus,
    useStatus: usePulseOperationalStatus
  }
} as const;
