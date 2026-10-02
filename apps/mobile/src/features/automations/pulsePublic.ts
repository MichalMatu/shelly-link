import { PulseCycleEditor } from './components/PulseCycleEditor.js';
import {
  DEFAULT_PULSE_CYCLE_FORM,
  parsePulseCycleForm,
  pulseCycleFormFromConfig
} from './data/pulseCycleForm.js';
import {
  createStandalonePulseInstalledAutomation,
  createTimePulseInstalledAutomation,
  isStandalonePulseInstalledAutomation,
  isTimePulseInstalledAutomation
} from './data/installedAutomation.js';
import { installStandalonePulseAutomation } from './data/standalonePulseAutomationRuntime.js';
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
    createInstalledAutomation: createStandalonePulseInstalledAutomation,
    install: installStandalonePulseAutomation,
    isInstalled: isStandalonePulseInstalledAutomation
  }
} as const;
