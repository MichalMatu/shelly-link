from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


feature_css = """.automation-card__status-first-body {
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

@media (max-width: 25rem) {
  .automation-card__configuration {
    grid-template-columns: minmax(0, 1fr);
  }
}
"""

feature_css_path = Path(
    "apps/mobile/src/features/automation-dashboard/components/AutomationDashboardBody.css"
)
if feature_css_path.exists():
    raise SystemExit(f"refusing to overwrite existing {feature_css_path}")
feature_css_path.write_text(feature_css)

component = "apps/mobile/src/features/automation-dashboard/components/AutomationDashboardBody.tsx"
replace_once(
    component,
    "import type { ReactNode } from 'react';",
    "import type { ReactNode } from 'react';\nimport './AutomationDashboardBody.css';",
)

screen_css = "apps/mobile/src/screens/AutomationDashboardScreen.css"
block = feature_css.split("\n@media (max-width: 25rem) {")[0].rstrip() + "\n\n"
replace_once(screen_css, block, "")
replace_once(
    screen_css,
    """  .automation-card__mode-control {
    grid-column: 1 / -1;
  }

  .automation-card__configuration {
    grid-template-columns: minmax(0, 1fr);
  }
}""",
    """  .automation-card__mode-control {
    grid-column: 1 / -1;
  }
}""",
)
