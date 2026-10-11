from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


component_path = Path(
    "apps/mobile/src/features/automations/components/AutomationDashboardBody.tsx"
)
if component_path.exists():
    raise SystemExit(f"refusing to overwrite existing {component_path}")
component_path.write_text(
    """import type { ReactNode } from 'react';

export type AutomationDashboardConfigurationItem = {
  id: string;
  label: string;
  value: string;
};

type AutomationDashboardBodyProps = {
  ariaLabel: string;
  status: ReactNode;
  configuration: readonly AutomationDashboardConfigurationItem[];
  controls: ReactNode;
};

export const AutomationDashboardBody = ({
  ariaLabel,
  status,
  configuration,
  controls
}: AutomationDashboardBodyProps) => (
  <section className="automation-card__status-first-body" aria-label={ariaLabel}>
    <div className="automation-card__live-status">{status}</div>
    <div className="automation-card__configuration">
      <dl className="automation-card__configuration-values">
        {configuration.map((item) => (
          <div key={item.id}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="automation-card__configuration-control">{controls}</div>
    </div>
  </section>
);
"""
)

index = "apps/mobile/src/features/automations/index.ts"
replace_once(
    index,
    "export { ClimateHistorySection } from './components/ClimateHistorySection.js';",
    "export { ClimateHistorySection } from './components/ClimateHistorySection.js';\nexport { AutomationDashboardBody } from './components/AutomationDashboardBody.js';",
)

time = "apps/mobile/src/screens/TimeAutomationCard.tsx"
replace_once(
    time,
    "import { OperationalStatus, Pulse } from '../features/automations/index.js';",
    "import {\n  AutomationDashboardBody,\n  OperationalStatus,\n  Pulse\n} from '../features/automations/index.js';",
)
old_time_body = """  const body = (
    <>
      <div className="automation-card__main" aria-label={t('time.scheduleSummary')}>
        <div className="automation-card__primary-metric">
          <strong aria-label={`${t('time.onTime')}: ${installation.config.onTime}`}>
            {installation.config.onTime}
          </strong>
          <small>
            <span>{t('time.onTime')}</span>
          </small>
        </div>

        <div className="automation-card__secondary-metrics">
          <div>
            <span>{t('time.offTime')}</span>
            <strong>{installation.config.offTime}</strong>
          </div>
        </div>

        <PlugAutomationModeControl
          autoActive={automationRunning}
          manualActive={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onAuto={() => {
            if (!automationRunning) action.mutate('auto');
          }}
          onManual={() => {
            if (!manualControl) action.mutate('manual');
          }}
        />
      </div>
      {pulseInstallation ? (
        <Pulse.Operational.StatusSummary status={pulseQuery.data} compact />
      ) : (
        <OperationalStatus.TimeSummary
          config={installation.config}
          localTime={query.data?.clock.localTime}
          relayOn={query.data?.relayOn}
          state={runtimeState}
          compact
        />
      )}
    </>
  );"""
new_time_body = """  const body = (
    <AutomationDashboardBody
      ariaLabel={t('time.scheduleSummary')}
      status={
        pulseInstallation ? (
          <Pulse.Operational.StatusSummary status={pulseQuery.data} compact />
        ) : (
          <OperationalStatus.TimeSummary
            config={installation.config}
            localTime={query.data?.clock.localTime}
            relayOn={query.data?.relayOn}
            state={runtimeState}
            compact
          />
        )
      }
      configuration={[
        { id: 'on', label: t('time.onTime'), value: installation.config.onTime },
        { id: 'off', label: t('time.offTime'), value: installation.config.offTime }
      ]}
      controls={
        <PlugAutomationModeControl
          autoActive={automationRunning}
          manualActive={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onAuto={() => {
            if (!automationRunning) action.mutate('auto');
          }}
          onManual={() => {
            if (!manualControl) action.mutate('manual');
          }}
        />
      }
    />
  );"""
replace_once(time, old_time_body, new_time_body)

pulse = "apps/mobile/src/app/StandalonePulseAutomationCard.tsx"
replace_once(
    pulse,
    "import { Pulse, type InstalledAutomation } from '../features/automations/index.js';",
    "import {\n  AutomationDashboardBody,\n  Pulse,\n  type InstalledAutomation\n} from '../features/automations/index.js';",
)
old_pulse_body = """  const body = (
    <>
      <div className="automation-card__main" aria-label={labels.title}>
        <div className="automation-card__primary-metric">
          <strong>{secondsLabel(installation.config.pulse.onMs)}</strong>
          <small>
            <span>{labels.onSeconds}</span>
          </small>
        </div>
        <div className="automation-card__secondary-metrics">
          <div>
            <span>{labels.offSeconds}</span>
            <strong>{secondsLabel(installation.config.pulse.offMs)}</strong>
          </div>
          <div>
            <span>{labels.execution}</span>
            <strong>{executionLabel}</strong>
          </div>
        </div>
        <PlugAutomationModeControl
          autoActive={automationRunning}
          manualActive={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onAuto={() => {
            if (!automationRunning) action.mutate('auto');
          }}
          onManual={() => {
            if (!manualControl) action.mutate('manual');
          }}
        />
      </div>
      <Pulse.Operational.StatusSummary status={pulseQuery.data} compact />
    </>
  );"""
new_pulse_body = """  const body = (
    <AutomationDashboardBody
      ariaLabel={labels.title}
      status={<Pulse.Operational.StatusSummary status={pulseQuery.data} compact />}
      configuration={[
        {
          id: 'on',
          label: labels.onSeconds,
          value: secondsLabel(installation.config.pulse.onMs)
        },
        {
          id: 'off',
          label: labels.offSeconds,
          value: secondsLabel(installation.config.pulse.offMs)
        },
        { id: 'execution', label: labels.execution, value: executionLabel }
      ]}
      controls={
        <PlugAutomationModeControl
          autoActive={automationRunning}
          manualActive={manualControl}
          disabled={action.isPending || !runtimeControllable}
          onAuto={() => {
            if (!automationRunning) action.mutate('auto');
          }}
          onManual={() => {
            if (!manualControl) action.mutate('manual');
          }}
        />
      }
    />
  );"""
replace_once(pulse, old_pulse_body, new_pulse_body)

css = "apps/mobile/src/screens/AutomationDashboardScreen.css"
insert_after = """.automation-card__secondary-metrics strong {
  font-size: var(--lcl-font-size-sm);
  line-height: var(--lcl-line-height-tight);
  white-space: nowrap;
}
"""
new_css = insert_after + """
.automation-card__status-first-body {
  display: grid;
  gap: var(--lcl-spacing-sm);
  min-width: 0;
}

.automation-card__live-status {
  border-top: var(--lcl-border-width-sm) solid var(--lcl-color-border);
  min-width: 0;
  padding-top: var(--lcl-spacing-sm);
}

.dashboard-shell .automation-card__live-status .automation-summary {
  gap: var(--lcl-spacing-xs) var(--lcl-spacing-md);
  grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
}

.dashboard-shell .automation-card__live-status .automation-summary dd {
  font-size: var(--lcl-font-size-sm);
  font-weight: var(--lcl-font-weight-bold);
  line-height: var(--lcl-line-height-tight);
}

.automation-card__configuration {
  align-items: end;
  border-top: var(--lcl-border-width-sm) solid var(--lcl-color-border);
  display: grid;
  gap: var(--lcl-spacing-sm);
  grid-template-columns: minmax(0, 1fr) var(--lcl-size-action-min-width);
  min-width: 0;
  padding-top: var(--lcl-spacing-sm);
}

.automation-card__configuration-values {
  display: grid;
  gap: var(--lcl-spacing-xs) var(--lcl-spacing-md);
  grid-template-columns: repeat(auto-fit, minmax(4.5rem, 1fr));
  margin: 0;
  min-width: 0;
}

.automation-card__configuration-values > div {
  display: grid;
  gap: var(--lcl-spacing-xs);
  min-width: 0;
}

.automation-card__configuration-values dt,
.automation-card__configuration-values dd {
  margin: 0;
}

.automation-card__configuration-values dt {
  color: var(--lcl-color-text-muted);
  font-size: var(--lcl-font-size-xs);
  line-height: var(--lcl-line-height-compact);
}

.automation-card__configuration-values dd {
  font-size: var(--lcl-font-size-sm);
  font-weight: var(--lcl-font-weight-bold);
  line-height: var(--lcl-line-height-tight);
  overflow-wrap: anywhere;
}

.automation-card__configuration-control {
  min-width: 0;
}

.automation-card__configuration-control .automation-control-group {
  width: 100%;
}
"""
replace_once(css, insert_after, new_css)
replace_once(
    css,
    """@media (max-width: 25rem) {
  .automation-card__main {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .automation-card__mode-control {
    grid-column: 1 / -1;
  }
}""",
    """@media (max-width: 25rem) {
  .automation-card__main {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .automation-card__mode-control {
    grid-column: 1 / -1;
  }

  .automation-card__configuration {
    grid-template-columns: minmax(0, 1fr);
  }
}""",
)

visual_contract = "apps/mobile/e2e/visual-contract.ts"
replace_once(
    visual_contract,
    "  '26-standalone-pulse-setup'\n] as const;",
    "  '26-standalone-pulse-setup',\n  '27-standalone-pulse-dashboard'\n] as const;",
)

pulse_spec = "apps/mobile/e2e/pulse-operational-status.spec.ts"
replace_once(
    pulse_spec,
    "import { expect, test, type Page, type Route } from '@playwright/test';",
    "import { expect, test, type Page, type Route } from '@playwright/test';\nimport { expectVisualScreen } from './visual-contract.js';",
)
replace_once(
    pulse_spec,
    """    expect(compactBox!.x + compactBox!.width).toBeLessThanOrEqual(
      cardBox!.x + cardBox!.width + 1
    );

    await page.getByRole('button', { name: 'Szczegóły: Pompa Pulse · Wi-Fi' }).click();""",
    """    expect(compactBox!.x + compactBox!.width).toBeLessThanOrEqual(
      cardBox!.x + cardBox!.width + 1
    );
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '27-standalone-pulse-dashboard');
    }

    await page.getByRole('button', { name: 'Szczegóły: Pompa Pulse · Wi-Fi' }).click();""",
)

package = Path("package.json")
text = package.read_text()
old_specs = "apps/mobile/e2e/responsive.spec.ts apps/mobile/e2e/led-settings.spec.ts"
new_specs = (
    "apps/mobile/e2e/responsive.spec.ts apps/mobile/e2e/led-settings.spec.ts "
    "apps/mobile/e2e/pulse-operational-status.spec.ts"
)
if text.count(old_specs) != 2:
    raise SystemExit(f"expected 2 canonical visual spec lists, found {text.count(old_specs)}")
text = text.replace(old_specs, new_specs)
old_grep = "plain saved Plug exposes the same LED settings without an installed automation"
new_grep = (
    "plain saved Plug exposes the same LED settings without an installed automation|"
    "Pulse operational status stays responsive on phone-large"
)
if text.count(old_grep) != 2:
    raise SystemExit(f"expected 2 canonical visual grep tails, found {text.count(old_grep)}")
text = text.replace(old_grep, new_grep)
package.write_text(text)

docs = "docs/UX_VISUAL_CONTRACT.md"
replace_once(
    docs,
    """Time must not reintroduce legacy `Working`, `Daily schedule` badges, a separate `Details` footer or a parallel card layout. AUTO/MANUAL, ON/OFF, telemetry and the detail affordance follow the shared Plug pattern.""",
    """Time must not reintroduce legacy `Working`, `Daily schedule` badges, a separate `Details` footer or a parallel card layout. AUTO/MANUAL, ON/OFF, telemetry and the detail affordance follow the shared Plug pattern.

Time and standalone Pulse dashboard cards are status-first: current operational status appears before a compact schedule/cycle configuration summary. Configuration remains visible but secondary. Climate keeps its frozen live-metric composition. Canonical dashboard states are `10-time-dashboard` and `27-standalone-pulse-dashboard`.""",
)
