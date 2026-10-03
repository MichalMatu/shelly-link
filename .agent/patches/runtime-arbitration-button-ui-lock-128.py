from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"expected block not found in {path}: {old[:120]!r}")
    p.write_text(s.replace(old, new, 1))


replace_once(
    "apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx",
    """  onOpenBleDiscovery(deviceId: string): void;\n  onRemove(deviceId: string): void;\n};\n""",
    """  onOpenBleDiscovery(deviceId: string): void;\n  onRemove(deviceId: string): void;\n  buttonModeLocked?: boolean;\n};\n""",
)
replace_once(
    "apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx",
    """  onBack,\n  onOpenBleDiscovery,\n  onRemove\n}: WifiPlugDetailScreenProps) => {\n""",
    """  onBack,\n  onOpenBleDiscovery,\n  onRemove,\n  buttonModeLocked = false\n}: WifiPlugDetailScreenProps) => {\n""",
)
replace_once(
    "apps/mobile/src/features/plugs/screens/WifiPlugDetailScreen.tsx",
    "<PlugButtonModeSettingsCard target={target} />",
    "<PlugButtonModeSettingsCard target={target} locked={buttonModeLocked} />",
)

replace_once(
    "apps/mobile/src/screens/InstallationDetailScreen.tsx",
    "<PlugButtonModeSettingsCard target={installation.shelly} />",
    "<PlugButtonModeSettingsCard target={installation.shelly} locked />",
)

replace_once(
    "apps/mobile/src/routes/AppRoutes.tsx",
    """import { AppShell } from '../components/AppShell.js';\nimport type { AppNavigationKind } from '../components/AppBottomNavigation.js';\nimport {\n""",
    """import { AppShell } from '../components/AppShell.js';\nimport type { AppNavigationKind } from '../components/AppBottomNavigation.js';\nimport { useInstalledAutomationStore } from '../features/automations/index.js';\nimport {\n""",
)
replace_once(
    "apps/mobile/src/routes/AppRoutes.tsx",
    """  BlePlugDetailScreen,\n  PlugBluetoothAddPage,\n  savedPlugToWifiDevice,\n""",
    """  BlePlugDetailScreen,\n  PlugBluetoothAddPage,\n  isSameShellyDevice,\n  savedPlugToWifiDevice,\n""",
)
replace_once(
    "apps/mobile/src/routes/AppRoutes.tsx",
    """  const savedPlugs = useSavedPlugStore((state) => state.plugs);\n  const removeShellyDevice = useSavedPlugStore((state) => state.removePlug);\n""",
    """  const savedPlugs = useSavedPlugStore((state) => state.plugs);\n  const installations = useInstalledAutomationStore((state) => state.installations);\n  const removeShellyDevice = useSavedPlugStore((state) => state.removePlug);\n""",
)
replace_once(
    "apps/mobile/src/routes/AppRoutes.tsx",
    """    const wifiDevice = savedPlug ? savedPlugToWifiDevice(savedPlug) : null;\n    content = (\n""",
    """    const wifiDevice = savedPlug ? savedPlugToWifiDevice(savedPlug) : null;\n    const buttonModeLocked = wifiDevice\n      ? installations.some(\n          (installation) =>\n            installation.kind === 'climate' &&\n            isSameShellyDevice(installation.shelly.deviceId, wifiDevice.id)\n        )\n      : false;\n    content = (\n""",
)
replace_once(
    "apps/mobile/src/routes/AppRoutes.tsx",
    """        onBack={() => navigate({ type: 'dashboard', kind: 'climate' })}\n        onOpenBleDiscovery={(deviceId) =>\n""",
    """        buttonModeLocked={buttonModeLocked}\n        onBack={() => navigate({ type: 'dashboard', kind: 'climate' })}\n        onOpenBleDiscovery={(deviceId) =>\n""",
)

p = Path("apps/mobile/src/features/plugs/components/PlugButtonModeSettingsCard.test.tsx")
s = p.read_text()
s = s.replace(
    "const renderCard = () => {",
    "const renderCard = (locked = false) => {",
    1,
)
s = s.replace(
    "<PlugButtonModeSettingsCard target={target} />",
    "<PlugButtonModeSettingsCard target={target} locked={locked} />",
    1,
)
marker = """  it('does not overwrite a dirty button-mode draft when the device query refetches', async () => {\n"""
locked_test = """  it('keeps button mode read-only while a managed climate automation owns the Plug', async () => {\n    vi.stubGlobal(\n      'fetch',\n      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {\n        const body = JSON.parse(String(init?.body ?? '{}')) as {\n          id?: number | string;\n          method?: string;\n        };\n        const result =\n          body.method === 'Shelly.GetDeviceInfo'\n            ? deviceInfo()\n            : body.method === 'Shelly.ListMethods'\n              ? { methods: ['PLUGS_UI.GetConfig', 'PLUGS_UI.SetConfig'] }\n              : body.method === 'PLUGS_UI.GetConfig'\n                ? { leds, controls: { 'switch:0': { in_mode: 'detached' } } }\n                : {};\n        return jsonResponse({ id: body.id ?? 1, result });\n      })\n    );\n\n    renderCard(true);\n    const modeSelect = await screen.findByRole('button', { name: copy.currentMode });\n    const save = screen.getByRole('button', { name: copy.save });\n    expect(modeSelect).toHaveTextContent(copy.detached);\n    expect(modeSelect).toBeDisabled();\n    expect(save).toBeDisabled();\n  });\n\n"""
if marker not in s:
    raise SystemExit("button card test marker missing")
s = s.replace(marker, locked_test + marker, 1)
p.write_text(s)
