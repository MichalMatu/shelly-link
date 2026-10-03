from pathlib import Path

repo = Path('.')


def replace_once(path: str, old: str, new: str) -> None:
    target = repo / path
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

# Time detail no longer exposes a nested Edit route.
replace_once(
    'apps/mobile/src/screens/TimeInstallationDetail.tsx',
    "  onBack(): void;\n  onEdit?: () => void;\n  onOpenBleDiscovery?: (deviceId: string) => void;\n",
    "  onBack(): void;\n  onOpenBleDiscovery?: (deviceId: string) => void;\n",
)

replace_once(
    'apps/mobile/src/screens/InstallationDetailScreen.tsx',
    "  onBack(): void;\n  onOpenBleDiscovery?: (deviceId: string) => void;\n  onEdit?: () => void;\n};\n",
    "  onBack(): void;\n  onOpenBleDiscovery?: (deviceId: string) => void;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/InstallationDetailScreen.tsx',
    "  installationId,\n  onBack,\n  onOpenBleDiscovery,\n  onEdit\n}: InstallationDetailScreenProps) => {\n",
    "  installationId,\n  onBack,\n  onOpenBleDiscovery\n}: InstallationDetailScreenProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/InstallationDetailScreen.tsx',
    "        installation={installation}\n        onBack={onBack}\n        {...(onEdit ? { onEdit } : {})}\n        {...(onOpenBleDiscovery ? { onOpenBleDiscovery } : {})}\n",
    "        installation={installation}\n        onBack={onBack}\n        {...(onOpenBleDiscovery ? { onOpenBleDiscovery } : {})}\n",
)

# Retire the route-level automation editor. Climate and Time both edit inline in Detail now.
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "import { useHardwareSetupDraftStore } from '../flows/hardware-setup/setupDraftStore.js';\nimport {\n  automationDetailRoute,\n  prepareAutomationEditRoute\n} from './automationEditNavigation.js';\n",
    "import { useHardwareSetupDraftStore } from '../flows/hardware-setup/setupDraftStore.js';\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "  if (route.type === 'setup') {\n    if (route.editInstallationId) {\n      return automationDetailRoute(route.editInstallationId);\n    }\n    return {\n",
    "  if (route.type === 'setup') {\n    return {\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "  const loadClimateAutomationDraft = useHardwareSetupDraftStore(\n    (state) => state.loadClimateAutomationDraft\n  );\n",
    "",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "\n  const openAutomationEdit = (installationId: string) => {\n    const editRoute = prepareAutomationEditRoute(\n      installationId,\n      loadClimateAutomationDraft\n    );\n    if (editRoute) navigate(editRoute);\n  };\n",
    "",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "        }\n        onEdit={() => openAutomationEdit(route.installationId)}\n      />\n",
    "        }\n      />\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "          setupIntent={route.intent}\n          {...(route.shellyId ? { fixedShellyId: route.shellyId } : {})}\n          {...(route.editInstallationId\n            ? { editInstallationId: route.editInstallationId }\n            : {})}\n          onBackToIntent={() =>\n            route.editInstallationId\n              ? navigate(automationDetailRoute(route.editInstallationId))\n              : navigate({\n                  type: 'intent',\n                  sourceKind: route.sourceKind,\n                  ...(route.shellyId ? { shellyId: route.shellyId } : {})\n                })\n          }\n",
    "          setupIntent={route.intent}\n          {...(route.shellyId ? { fixedShellyId: route.shellyId } : {})}\n          onBackToIntent={() =>\n            navigate({\n              type: 'intent',\n              sourceKind: route.sourceKind,\n              ...(route.shellyId ? { shellyId: route.shellyId } : {})\n            })\n          }\n",
)
replace_once(
    'apps/mobile/src/routes/AppRoutes.tsx',
    "          onSetupComplete={() =>\n            route.editInstallationId\n              ? navigate(automationDetailRoute(route.editInstallationId))\n              : navigate({ type: 'dashboard', kind: route.sourceKind })\n          }\n",
    "          onSetupComplete={() =>\n            navigate({ type: 'dashboard', kind: route.sourceKind })\n          }\n",
)
replace_once(
    'apps/mobile/src/routes/appRouteModel.ts',
    "  shellyId?: string;\n  editInstallationId?: string;\n};\n",
    "  shellyId?: string;\n};\n",
)

nav = repo / 'apps/mobile/src/routes/automationEditNavigation.ts'
if not nav.exists():
    raise SystemExit('automationEditNavigation.ts missing')
nav.unlink()

# HardwareSetupScreen now owns creation/add flows only; installed automation editing is inline Detail UI.
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  fixedShellyId?: string;\n  editInstallationId?: string;\n  plugAddOnly?: boolean;\n",
    "  fixedShellyId?: string;\n  plugAddOnly?: boolean;\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  onOpenSensorAdd,\n  fixedShellyId,\n  editInstallationId,\n  plugAddOnly = false,\n",
    "  onOpenSensorAdd,\n  fixedShellyId,\n  plugAddOnly = false,\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "  const flow = useHardwareSetupFlow(\n    setupIntent === 'time' ? undefined : editInstallationId\n  );\n",
    "  const flow = useHardwareSetupFlow();\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "          context={t(`intent.${setupIntent}.context`)}\n          label={editInstallationId ? t('detail.automation') : t('intent.back')}\n          onBack={onBackToIntent}\n",
    "          context={t(`intent.${setupIntent}.context`)}\n          label={t('intent.back')}\n          onBack={onBackToIntent}\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "          selectablePresets={selectableRulePresets}\n          showShellySelector={!fixedShellyId}\n          {...(editInstallationId && onSetupComplete\n            ? { onEditSaved: onSetupComplete }\n            : {})}\n",
    "          selectablePresets={selectableRulePresets}\n          showShellySelector={!fixedShellyId}\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
    "        <TimeScheduleSetupPage\n          flow={flow}\n          {...(editInstallationId ? { editInstallationId } : {})}\n          {...(onSetupComplete ? { onInstalled: onSetupComplete } : {})}\n        />\n",
    "        <TimeScheduleSetupPage\n          flow={flow}\n          {...(onSetupComplete ? { onInstalled: onSetupComplete } : {})}\n        />\n",
)

replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/RuleSetupPage.tsx',
    "  inline?: boolean;\n  canSubmit?: boolean;\n  onEditSaved?: () => void;\n};\n",
    "  inline?: boolean;\n  canSubmit?: boolean;\n};\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/RuleSetupPage.tsx',
    "  showShellySelector = true,\n  inline = false,\n  canSubmit,\n  onEditSaved\n}: RuleSetupPageProps) => {\n",
    "  showShellySelector = true,\n  inline = false,\n  canSubmit\n}: RuleSetupPageProps) => {\n",
)
replace_once(
    'apps/mobile/src/screens/hardware-setup/pages/RuleSetupPage.tsx',
    "    pushToast('ok', t('hardware.rule.editSaved'));\n    flow.installMutation.reset();\n    onEditSaved?.();\n  }, [flow.installMutation, flow.isEditingClimateAutomation, onEditSaved, pushToast, t]);\n",
    "    pushToast('ok', t('hardware.rule.editSaved'));\n    flow.installMutation.reset();\n  }, [flow.installMutation, flow.isEditingClimateAutomation, pushToast, t]);\n",
)

# Route tests no longer model the retired nested edit flow.
replace_once(
    'apps/mobile/src/__tests__/app-routes.test.tsx',
    "import {\n  createInstalledAutomation,\n  createTimeInstalledAutomation\n} from '../flows/installations/model.js';\n",
    "import { createInstalledAutomation } from '../flows/installations/model.js';\n",
)
replace_once(
    'apps/mobile/src/__tests__/app-routes.test.tsx',
    "  InstallationDetailScreen: ({\n    installationId,\n    onBack,\n    onNavigateDashboard,\n    onEdit\n  }: {\n    installationId: string;\n    onBack: () => void;\n    onNavigateDashboard?: (kind: 'climate' | 'time') => void;\n    onEdit?: () => void;\n  }) => (\n    <section>\n      <p>{`mock-installation-${installationId}`}</p>\n      <button type=\"button\" onClick={onBack}>\n        mock-dashboard-back\n      </button>\n      <button type=\"button\" onClick={() => onNavigateDashboard?.('time')}>\n        mock-dashboard-time\n      </button>\n      <button type=\"button\" onClick={onEdit}>\n        mock-edit\n      </button>\n    </section>\n  )\n",
    "  InstallationDetailScreen: ({\n    installationId,\n    onBack\n  }: {\n    installationId: string;\n    onBack: () => void;\n  }) => (\n    <section>\n      <p>{`mock-installation-${installationId}`}</p>\n      <button type=\"button\" onClick={onBack}>\n        mock-dashboard-back\n      </button>\n    </section>\n  )\n",
)
replace_once(
    'apps/mobile/src/__tests__/app-routes.test.tsx',
    "    setupIntent,\n    fixedShellyId,\n    editInstallationId,\n    onBackToIntent,\n",
    "    setupIntent,\n    fixedShellyId,\n    onBackToIntent,\n",
)
replace_once(
    'apps/mobile/src/__tests__/app-routes.test.tsx',
    "    setupIntent?: SetupIntent;\n    fixedShellyId?: string;\n    editInstallationId?: string;\n    onBackToIntent?: () => void;\n",
    "    setupIntent?: SetupIntent;\n    fixedShellyId?: string;\n    onBackToIntent?: () => void;\n",
)
replace_once(
    'apps/mobile/src/__tests__/app-routes.test.tsx',
    "      <p>{`mock-setup-${setupIntent ?? 'none'}`}</p>\n      <p>{`mock-fixed-shelly-${fixedShellyId ?? 'none'}`}</p>\n      <p>{`mock-edit-installation-${editInstallationId ?? 'none'}`}</p>\n",
    "      <p>{`mock-setup-${setupIntent ?? 'none'}`}</p>\n      <p>{`mock-fixed-shelly-${fixedShellyId ?? 'none'}`}</p>\n",
)

text = (repo / 'apps/mobile/src/__tests__/app-routes.test.tsx').read_text()
start = text.index("  it('opens climate edit from detail")
end = text.index("  it('completes per-plug Time setup", start)
text = text[:start] + text[end:]
(repo / 'apps/mobile/src/__tests__/app-routes.test.tsx').write_text(text)

# Detail test helper no longer injects a dead onEdit callback.
replace_once(
    'apps/mobile/src/__tests__/automation-detail.test.tsx',
    "const renderDetail = (\n  installationId: string,\n  onBack = vi.fn(),\n  onOpenBleDiscovery = vi.fn(),\n  onEdit = vi.fn()\n) => {\n",
    "const renderDetail = (\n  installationId: string,\n  onBack = vi.fn(),\n  onOpenBleDiscovery = vi.fn()\n) => {\n",
)
replace_once(
    'apps/mobile/src/__tests__/automation-detail.test.tsx',
    "    onBack,\n    onOpenBleDiscovery,\n    onEdit,\n    ...renderWithAppToastHost(\n",
    "    onBack,\n    onOpenBleDiscovery,\n    ...renderWithAppToastHost(\n",
)
replace_once(
    'apps/mobile/src/__tests__/automation-detail.test.tsx',
    "            installationId={installationId}\n            onBack={onBack}\n            onOpenBleDiscovery={onOpenBleDiscovery}\n            onEdit={onEdit}\n",
    "            installationId={installationId}\n            onBack={onBack}\n            onOpenBleDiscovery={onOpenBleDiscovery}\n",
)
