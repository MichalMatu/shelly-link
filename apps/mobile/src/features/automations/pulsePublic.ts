import { PulseCycleEditor } from './components/PulseCycleEditor.js';
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
import { installTimePulseAutomation } from './data/timePulseAutomationRuntime.js';

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
  }
} as const;
