import { ClimatePulseOperationalStatusSummary } from './components/ClimatePulseOperationalStatusSummary.js';
import { PulseCycleEditor } from './components/PulseCycleEditor.js';
import { PulseOperationalStatusSummary } from './components/PulseOperationalStatusSummary.js';
import { StandalonePulseConfigurationSection } from './components/StandalonePulseConfigurationSection.js';
import { StandalonePulseDashboardStatus } from './components/StandalonePulseDashboardStatus.js';
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
import {
  deleteStandalonePulseAutomation,
  pauseStandalonePulseAutomation,
  replaceStandalonePulseAutomation,
  resumeStandalonePulseAutomation
} from './data/standalonePulseAutomationRuntime.js';
import { replaceTimePulseAutomation } from './data/timePulseAutomationReplacement.js';
import { installTimePulseAutomation } from './data/timePulseAutomationRuntime.js';
import { usePulseOperationalStatus } from './flows/usePulseOperationalStatus.js';
import { useTimePulseScriptSource } from './flows/useTimePulseScriptSource.js';
import {
  useStandalonePulseActions,
  useStandalonePulseRuntime
} from './flows/useStandalonePulseRuntime.js';
import { useStandalonePulseScriptSource } from './flows/useStandalonePulseScriptSource.js';

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
    replace: replaceTimePulseAutomation,
    isInstalled: isTimePulseInstalledAutomation,
    useScriptSource: useTimePulseScriptSource
  },
  Standalone: {
    SetupPage: StandalonePulseSetupPage,
    ConfigurationSection: StandalonePulseConfigurationSection,
    DashboardStatus: StandalonePulseDashboardStatus,
    useRuntime: useStandalonePulseRuntime,
    useActions: useStandalonePulseActions,
    useScriptSource: useStandalonePulseScriptSource,
    pause: pauseStandalonePulseAutomation,
    resume: resumeStandalonePulseAutomation,
    replace: replaceStandalonePulseAutomation,
    delete: deleteStandalonePulseAutomation
  },
  Operational: {
    StatusSummary: PulseOperationalStatusSummary,
    ClimateStatusSummary: ClimatePulseOperationalStatusSummary,
    normalizeStatus: normalizePulseOperationalStatus,
    useStatus: usePulseOperationalStatus
  }
} as const;
