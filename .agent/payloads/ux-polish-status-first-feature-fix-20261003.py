from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


source = Path("apps/mobile/src/features/automations/components/AutomationDashboardBody.tsx")
feature_root = Path("apps/mobile/src/features/automation-dashboard")
target = feature_root / "components/AutomationDashboardBody.tsx"
index = feature_root / "index.ts"
if not source.exists():
    raise SystemExit(f"missing generated source {source}")
if target.exists() or index.exists():
    raise SystemExit("refusing to overwrite automation-dashboard feature")
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(source.read_text())
source.unlink()
index.write_text(
    "export { AutomationDashboardBody } from './components/AutomationDashboardBody.js';\n"
)

replace_once(
    "apps/mobile/src/features/automations/index.ts",
    "export { AutomationDashboardBody } from './components/AutomationDashboardBody.js';\n",
    "",
)

replace_once(
    "apps/mobile/src/screens/TimeAutomationCard.tsx",
    "import {\n  AutomationDashboardBody,\n  OperationalStatus,\n  Pulse\n} from '../features/automations/index.js';",
    "import { AutomationDashboardBody } from '../features/automation-dashboard/index.js';\nimport { OperationalStatus, Pulse } from '../features/automations/index.js';",
)

replace_once(
    "apps/mobile/src/app/StandalonePulseAutomationCard.tsx",
    "import {\n  AutomationDashboardBody,\n  Pulse,\n  type InstalledAutomation\n} from '../features/automations/index.js';",
    "import { AutomationDashboardBody } from '../features/automation-dashboard/index.js';\nimport { Pulse, type InstalledAutomation } from '../features/automations/index.js';",
)
