from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


hardware = "apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx"
replace_once(
    hardware,
    "import { useEffect, useMemo, useRef, useState } from 'react';",
    "import { SegmentedControl } from '@lcl/ui';\nimport { useEffect, useMemo, useRef, useState } from 'react';",
)
replace_once(
    hardware,
    "  const { locale, t } = useTranslation();\n  const flow = useHardwareSetupFlow();",
    "  const { locale, t } = useTranslation();\n  const pulseLabels = pulseCycleCopy[locale];\n  const flow = useHardwareSetupFlow();",
)
replace_once(
    hardware,
    "    setupIntent === 'pulse'\n      ? pulseCycleCopy[locale].description",
    "    setupIntent === 'pulse'\n      ? pulseLabels.description",
)
old_nav = """      {!plugAddOnly && !sensorAddOnly && availableTabs.length > 1 && (
        <nav
          className="setup-top-nav lcl-segmented-control"
          aria-label={t('hardware.nav.label')}
        >
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              className={
                activeTab === tab.id
                  ? 'setup-top-nav__item lcl-segmented-control__item setup-top-nav__item--active'
                  : 'setup-top-nav__item lcl-segmented-control__item'
              }
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              title={tab.id === 'pulse' ? 'Pulse' : t(tab.titleKey)}
              onClick={() => selectTab(tab.id)}
            >
              {tab.id === 'pulse' ? 'Pulse' : t(tab.labelKey)}
            </button>
          ))}
        </nav>
      )}"""
new_nav = """      {!plugAddOnly && !sensorAddOnly && availableTabs.length > 1 && (
        <SegmentedControl
          ariaLabel={t('hardware.nav.label')}
          className="setup-top-nav"
          itemClassName="setup-top-nav__item"
          value={activeTab}
          options={availableTabs.map((tab) => ({
            value: tab.id,
            label: tab.id === 'pulse' ? pulseLabels.title : t(tab.labelKey),
            title: tab.id === 'pulse' ? pulseLabels.title : t(tab.titleKey)
          }))}
          onChange={selectTab}
        />
      )}"""
replace_once(hardware, old_nav, new_nav)

replace_once(
    "apps/mobile/src/theme/theme.css",
    ".setup-top-nav__item--active {",
    ".setup-top-nav__item[aria-selected='true'] {",
)

gate = "scripts/quality/ux-gate.mjs"
old_contracts = """  const geometryUsageContracts = [
    [
      'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
      'plug-detail-tabs lcl-segmented-control'
    ],
    [
      'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',
      'setup-top-nav lcl-segmented-control'
    ]
  ];"""
new_contracts = """  const setupNavigationPath =
    'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx';
  const geometryUsageContracts = [
    [
      'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',
      'plug-detail-tabs lcl-segmented-control'
    ]
  ];"""
replace_once(gate, old_contracts, new_contracts)
needle = """  for (const [path, rootClass] of geometryUsageContracts) {
    const source = await readRepoFile(path);"""
replacement = """  const setupNavigationSource = await readRepoFile(setupNavigationPath);
  if (
    !setupNavigationSource.includes('<SegmentedControl') ||
    !setupNavigationSource.includes('className="setup-top-nav"') ||
    !setupNavigationSource.includes('itemClassName="setup-top-nav__item"') ||
    setupNavigationSource.includes('setup-top-nav lcl-segmented-control') ||
    setupNavigationSource.includes('setup-top-nav__item lcl-segmented-control__item')
  ) {
    addFailure(
      setupNavigationPath,
      'setup segmented navigation must reuse @lcl/ui SegmentedControl instead of rebuilding tablist markup'
    );
  }

  for (const [path, rootClass] of geometryUsageContracts) {
    const source = await readRepoFile(path);"""
replace_once(gate, needle, replacement)

replace_once(
    "docs/UX_VISUAL_CONTRACT.md",
    "- `SegmentedControl` for add-device segmented navigation;",
    "- `SegmentedControl` for setup and add-device segmented navigation;",
)

test_path = Path("apps/mobile/src/__tests__/hardware-setup.test.tsx")
text = test_path.read_text()
labels = "Shelly|Termometry|Reguła"
pattern = re.compile(r"(getByRole|queryByRole|findByRole)\('button', \{ name: '(" + labels + r")' \}\)")
text, count = pattern.subn(r"\1('tab', { name: '\2' })", text)
if count == 0:
    raise SystemExit("no setup navigation role assertions replaced")
current = """'aria-current',
      'page'"""
selected = """'aria-selected',
      'true'"""
if text.count(current) != 3:
    raise SystemExit(f"expected 3 setup aria-current assertions, found {text.count(current)}")
text = text.replace(current, selected)
test_path.write_text(text)
print(f"updated {count} setup navigation role queries")
