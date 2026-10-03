from pathlib import Path
p = Path('apps/mobile/src/screens/AutomationDashboardScreen.tsx')
s = p.read_text()
old = "import { IconAlertTriangle } from '@tabler/icons-react';"
new = "import { IconAlertTriangle, IconPlug } from '@tabler/icons-react';"
assert old in s
p.write_text(s.replace(old, new, 1))
