from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


component_path = Path(
    "apps/mobile/src/features/automation-dashboard/components/AutomationCardFeedbackFooter.tsx"
)
component_path.write_text(
    '''import { IconAlertTriangle } from '@tabler/icons-react';

type AutomationCardFeedbackFooterProps = {
  warningLabel?: string | null;
  warningTone?: string;
  actionErrorLabel?: string | null;
};

export const AutomationCardFeedbackFooter = ({
  warningLabel,
  warningTone = 'attention',
  actionErrorLabel
}: AutomationCardFeedbackFooterProps) => (
  <footer className="automation-card__footer">
    {warningLabel && (
      <div
        className={`automation-card__status automation-card__status--${warningTone}`}
        role="status"
      >
        <IconAlertTriangle aria-hidden="true" />
        <span>{warningLabel}</span>
      </div>
    )}
    {actionErrorLabel && (
      <span className="automation-control-error" role="alert">
        {actionErrorLabel}
      </span>
    )}
  </footer>
);
'''
)

index_path = "apps/mobile/src/features/automation-dashboard/index.ts"
replace_once(
    index_path,
    "export { AutomationDashboardBody } from './components/AutomationDashboardBody.js';\n",
    "export { AutomationCardFeedbackFooter } from './components/AutomationCardFeedbackFooter.js';\nexport { AutomationDashboardBody } from './components/AutomationDashboardBody.js';\n",
)

# Climate dashboard: preserve exact classes/roles while delegating markup.
climate_path = "apps/mobile/src/screens/AutomationDashboardScreen.tsx"
replace_once(
    climate_path,
    "import { IconAlertTriangle, IconPlug } from '@tabler/icons-react';",
    "import { IconPlug } from '@tabler/icons-react';",
)
replace_once(
    climate_path,
    "import type { AppNavigationKind } from '../components/AppBottomNavigation.js';\nimport { Pulse } from '../features/automations/index.js';",
    "import type { AppNavigationKind } from '../components/AppBottomNavigation.js';\nimport { AutomationCardFeedbackFooter } from '../features/automation-dashboard/index.js';\nimport { Pulse } from '../features/automations/index.js';",
)
replace_once(
    climate_path,
    '''  const footer =
    warningLabel || action.isError ? (
      <footer className="automation-card__footer">
        {warningLabel && (
          <div
            className={`automation-card__status automation-card__status--${warningClass}`}
            role="status"
          >
            <IconAlertTriangle aria-hidden="true" />
            <span>{warningLabel}</span>
          </div>
        )}
        {action.isError && (
          <span className="automation-control-error" role="alert">
            {t('detail.actionFailed')}
          </span>
        )}
      </footer>
    ) : undefined;''',
    '''  const footer =
    warningLabel || action.isError ? (
      <AutomationCardFeedbackFooter
        warningLabel={warningLabel}
        warningTone={warningClass}
        actionErrorLabel={action.isError ? t('detail.actionFailed') : null}
      />
    ) : undefined;''',
)

# Time dashboard.
time_path = "apps/mobile/src/screens/TimeAutomationCard.tsx"
replace_once(time_path, "import { IconAlertTriangle } from '@tabler/icons-react';\n", "")
replace_once(
    time_path,
    "import { AutomationDashboardBody } from '../features/automation-dashboard/index.js';",
    "import {\n  AutomationCardFeedbackFooter,\n  AutomationDashboardBody\n} from '../features/automation-dashboard/index.js';",
)
replace_once(
    time_path,
    '''  const footer =
    warningLabel || action.isError ? (
      <footer className="automation-card__footer">
        {warningLabel && (
          <div
            className={`automation-card__status automation-card__status--${
              runtimeState === 'offline' ? 'offline' : 'attention'
            }`}
            role="status"
          >
            <IconAlertTriangle aria-hidden="true" />
            <span>{warningLabel}</span>
          </div>
        )}
        {action.isError && (
          <span className="automation-control-error" role="alert">
            {t('detail.actionFailed')}
          </span>
        )}
      </footer>
    ) : undefined;''',
    '''  const footer =
    warningLabel || action.isError ? (
      <AutomationCardFeedbackFooter
        warningLabel={warningLabel}
        warningTone={runtimeState === 'offline' ? 'offline' : 'attention'}
        actionErrorLabel={action.isError ? t('detail.actionFailed') : null}
      />
    ) : undefined;''',
)

# Standalone Pulse dashboard.
pulse_path = "apps/mobile/src/app/StandalonePulseAutomationCard.tsx"
replace_once(pulse_path, "import { IconAlertTriangle } from '@tabler/icons-react';\n", "")
replace_once(
    pulse_path,
    "import { AutomationDashboardBody } from '../features/automation-dashboard/index.js';",
    "import {\n  AutomationCardFeedbackFooter,\n  AutomationDashboardBody\n} from '../features/automation-dashboard/index.js';",
)
replace_once(
    pulse_path,
    '''  const footer = warning ? (
    <footer className="automation-card__footer">
      <div
        className="automation-card__status automation-card__status--attention"
        role="status"
      >
        <IconAlertTriangle aria-hidden="true" />
        <span>{t('dashboard.health.attention')}</span>
      </div>
      {action.isError && (
        <span className="automation-control-error" role="alert">
          {t('detail.actionFailed')}
        </span>
      )}
    </footer>
  ) : undefined;''',
    '''  const footer = warning ? (
    <AutomationCardFeedbackFooter
      warningLabel={t('dashboard.health.attention')}
      actionErrorLabel={action.isError ? t('detail.actionFailed') : null}
    />
  ) : undefined;''',
)
