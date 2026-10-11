from pathlib import Path

path = Path("scripts/quality/ux-gate.mjs")
text = path.read_text()
old = "  'apps/mobile/src/screens/AutomationDashboardScreen.css',\n"
new = (
    "  'apps/mobile/src/screens/AutomationDashboardScreen.css',\n"
    "  'apps/mobile/src/features/automation-dashboard/components/AutomationDashboardBody.css',\n"
)
if old not in text:
    raise SystemExit("missing dashboard CSS quality-gate entry")
if "AutomationDashboardBody.css" in text:
    raise SystemExit("automation dashboard CSS already registered")
path.write_text(text.replace(old, new, 1))
