import {
  AutomationDetailHierarchy,
  AutomationDetailSection
} from './components/AutomationDetailLayout.js';
import {
  AutomationScriptDetailSection,
  AutomationScriptDiagnosticsSection
} from './components/AutomationScriptDetailSections.js';
import { AutomationOperationalStatusSummary } from './components/AutomationOperationalStatusSummary.js';
import { TimeOperationalStatusSummary } from './components/TimeOperationalStatusSummary.js';
import { automationDetailCapabilities } from './presentation/automationDetailCapabilities.js';
import { Pulse } from './pulsePublic.js';

export { Pulse };

export const AutomationDetail = {
  capabilities: automationDetailCapabilities,
  Hierarchy: AutomationDetailHierarchy,
  ScriptDiagnostics: AutomationScriptDiagnosticsSection,
  ScriptSource: AutomationScriptDetailSection,
  Section: AutomationDetailSection
} as const;

export const OperationalStatus = {
  Summary: AutomationOperationalStatusSummary,
  TimeSummary: TimeOperationalStatusSummary
} as const;
