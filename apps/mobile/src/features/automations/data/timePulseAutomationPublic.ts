import { isTimePulseInstalledAutomation } from './installedAutomation.js';
import {
  deleteTimePulseAutomation,
  pauseTimePulseAutomation,
  resumeTimePulseAutomation
} from './timePulseAutomationRuntime.js';

export const timePulseAutomationRuntime = {
  isInstalled: isTimePulseInstalledAutomation,
  delete: deleteTimePulseAutomation,
  pause: pauseTimePulseAutomation,
  resume: resumeTimePulseAutomation
};
