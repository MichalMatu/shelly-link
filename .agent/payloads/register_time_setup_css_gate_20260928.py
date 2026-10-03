from pathlib import Path

p = Path('scripts/quality/ux-gate.mjs')
s = p.read_text()
old = "  'apps/mobile/src/screens/AutomationDashboardScreen.css',\n"
new = old + "  'apps/mobile/src/screens/hardware-setup/pages/TimeScheduleSetupPage.css',\n"
if s.count(old) != 1:
    raise SystemExit(f'expected one CSS registry anchor, got {s.count(old)}')
p.write_text(s.replace(old, new, 1))
print('Time setup CSS registered in UX quality gate')
