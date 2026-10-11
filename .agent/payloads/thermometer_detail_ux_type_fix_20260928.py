from pathlib import Path

# Make the new dashboard callback optional at the composition boundary so existing isolated
# dashboard harnesses do not need unrelated plumbing. Production AppRoutes still supplies it.
path = Path('apps/mobile/src/screens/AutomationDashboardScreen.tsx')
text = path.read_text()
old = "  onOpenThermometerSettings(sensorId: string): void;\n"
new = "  onOpenThermometerSettings?: (sensorId: string) => void;\n"
if text.count(old) != 1:
    raise SystemExit(f'expected one dashboard prop anchor, got {text.count(old)}')
text = text.replace(old, new, 1)
old = "  onAddPlug,\n  onAddThermometer,\n  onOpenThermometerSettings,\n  onAddAutomation,\n"
new = "  onAddPlug,\n  onAddThermometer,\n  onOpenThermometerSettings = () => undefined,\n  onAddAutomation,\n"
if text.count(old) != 1:
    raise SystemExit(f'expected one dashboard destructuring anchor, got {text.count(old)}')
path.write_text(text.replace(old, new, 1))

# Testing Library ByRoleOptions has no `exact`; the newly added route test contributes
# exactly two Termometry role lookups with this option.
path = Path('apps/mobile/src/__tests__/app-routes.test.tsx')
text = path.read_text()
old = "{ name: 'Termometry', exact: true }"
new = "{ name: 'Termometry' }"
if text.count(old) != 2:
    raise SystemExit(f'expected two new Termometry exact selectors, got {text.count(old)}')
path.write_text(text.replace(old, new))

print('Fixed Thermometer detail TypeScript test/API issues')
