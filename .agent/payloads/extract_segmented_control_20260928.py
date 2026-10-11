from pathlib import Path

# 1. Add the actual shared React primitive. Keep existing CSS classes/order so visuals stay identical.
segmented_path = Path('packages/ui/src/primitives/SegmentedControl.tsx')
if segmented_path.exists():
    raise SystemExit('SegmentedControl.tsx already exists')
segmented_path.write_text("""import type { ReactNode } from 'react';

export type SegmentedControlOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  title?: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string = string> = {
  value: T;
  options: readonly SegmentedControlOption<T>[];
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  onChange(value: T): void;
};

const withSharedClass = (localClassName: string | undefined, sharedClassName: string) =>
  [localClassName, sharedClassName].filter(Boolean).join(' ');

export const SegmentedControl = <T extends string>({
  value,
  options,
  ariaLabel,
  className,
  itemClassName,
  onChange
}: SegmentedControlProps<T>) => (
  <div
    className={withSharedClass(className, 'lcl-segmented-control')}
    role="tablist"
    aria-label={ariaLabel}
  >
    {options.map((option) => (
      <button
        key={option.value}
        className={withSharedClass(itemClassName, 'lcl-segmented-control__item')}
        type="button"
        role="tab"
        aria-selected={value === option.value}
        disabled={option.disabled}
        title={option.title}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);
""")

# 2. Export primitive from @lcl/ui.
index_path = Path('packages/ui/src/index.ts')
index = index_path.read_text()
anchor = "export * from './primitives/SelectField.js';\n"
if index.count(anchor) != 1:
    raise SystemExit('UI index SelectField export anchor not found exactly once')
index_path.write_text(index.replace(anchor, anchor + "export * from './primitives/SegmentedControl.js';\n", 1))

# 3. Migrate Add Plug exact duplicated tablist.
plug_path = Path('apps/mobile/src/features/plugs/components/PlugAddPage.tsx')
plug = plug_path.read_text()
plug_import_anchor = "import { useId, useState } from 'react';\n"
if plug.count(plug_import_anchor) != 1:
    raise SystemExit('PlugAddPage react import anchor not found exactly once')
plug = plug.replace(plug_import_anchor, "import { SegmentedControl } from '@lcl/ui';\n" + plug_import_anchor, 1)
old_plug_tabs = '''      <div\n        className="shelly-add-tabs lcl-segmented-control"\n        role="tablist"\n        aria-label={t('hardware.shelly.add')}\n      >\n        <button\n          className="shelly-add-tabs__tab lcl-segmented-control__item"\n          type="button"\n          role="tab"\n          aria-selected={activeSection === 'scan'}\n          onClick={() => selectSection('scan')}\n        >\n          {t('hardware.shelly.scanNetwork')}\n        </button>\n        <button\n          className="shelly-add-tabs__tab lcl-segmented-control__item"\n          type="button"\n          role="tab"\n          aria-selected={activeSection === 'manual'}\n          onClick={() => selectSection('manual')}\n        >\n          {t('hardware.shelly.addManual')}\n        </button>\n      </div>\n'''
new_plug_tabs = '''      <SegmentedControl\n        ariaLabel={t('hardware.shelly.add')}\n        className="shelly-add-tabs"\n        itemClassName="shelly-add-tabs__tab"\n        value={activeSection}\n        options={[\n          { value: 'scan', label: t('hardware.shelly.scanNetwork') },\n          { value: 'manual', label: t('hardware.shelly.addManual') }\n        ]}\n        onChange={selectSection}\n      />\n'''
if plug.count(old_plug_tabs) != 1:
    raise SystemExit('PlugAddPage duplicated tabs block not found exactly once')
plug_path.write_text(plug.replace(old_plug_tabs, new_plug_tabs, 1))

# 4. Migrate Add Thermometer exact duplicated tablist.
sensor_path = Path('apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx')
sensor = sensor_path.read_text()
old_sensor_import = "import { Modal } from '@lcl/ui';\n"
if sensor.count(old_sensor_import) != 1:
    raise SystemExit('SensorSetupPage @lcl/ui import anchor not found exactly once')
sensor = sensor.replace(old_sensor_import, "import { Modal, SegmentedControl } from '@lcl/ui';\n", 1)
old_sensor_tabs = '''        <div\n          className="shelly-add-tabs lcl-segmented-control"\n          role="tablist"\n          aria-label={t('hardware.sensor.add')}\n        >\n          <button\n            className="shelly-add-tabs__tab lcl-segmented-control__item"\n            type="button"\n            role="tab"\n            aria-selected={addMode === 'phone-scan'}\n            title={t('hardware.sensor.scanPhoneTitle')}\n            onClick={() => selectAddMode('phone-scan')}\n          >\n            {t('hardware.sensor.scanBle')}\n          </button>\n          <button\n            className="shelly-add-tabs__tab lcl-segmented-control__item"\n            type="button"\n            role="tab"\n            aria-selected={addMode === 'manual'}\n            onClick={() => selectAddMode('manual')}\n          >\n            {t('hardware.shelly.addManual')}\n          </button>\n        </div>\n'''
new_sensor_tabs = '''        <SegmentedControl\n          ariaLabel={t('hardware.sensor.add')}\n          className="shelly-add-tabs"\n          itemClassName="shelly-add-tabs__tab"\n          value={addMode}\n          options={[\n            {\n              value: 'phone-scan',\n              label: t('hardware.sensor.scanBle'),\n              title: t('hardware.sensor.scanPhoneTitle')\n            },\n            { value: 'manual', label: t('hardware.shelly.addManual') }\n          ]}\n          onChange={selectAddMode}\n        />\n'''
if sensor.count(old_sensor_tabs) != 1:
    raise SystemExit('SensorSetupPage duplicated tabs block not found exactly once')
sensor_path.write_text(sensor.replace(old_sensor_tabs, new_sensor_tabs, 1))

# 5. Strengthen UX gate: Add flows must consume the actual component; legacy nav users still share geometry only.
gate_path = Path('scripts/quality/ux-gate.mjs')
gate = gate_path.read_text()
start_marker = 'const checkSegmentedControlContract = async () => {'
start = gate.find(start_marker)
if start == -1:
    raise SystemExit('checkSegmentedControlContract start not found')
end = gate.find('\n};', start)
if end == -1:
    raise SystemExit('checkSegmentedControlContract end not found')
end += len('\n};')
new_gate_fn = '''const checkSegmentedControlContract = async () => {\n  const componentPath = 'packages/ui/src/primitives/SegmentedControl.tsx';\n  const uiIndexPath = 'packages/ui/src/index.ts';\n  const componentUsagePaths = [\n    'apps/mobile/src/features/plugs/components/PlugAddPage.tsx',\n    'apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx'\n  ];\n  const geometryUsageContracts = [\n    [\n      'apps/mobile/src/features/plugs/components/PlugDetailTabs.tsx',\n      'plug-detail-tabs lcl-segmented-control'\n    ],\n    [\n      'apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx',\n      'setup-top-nav lcl-segmented-control'\n    ]\n  ];\n\n  const [componentSource, uiIndexSource] = await Promise.all([\n    readRepoFile(componentPath),\n    readRepoFile(uiIndexPath)\n  ]);\n  if (\n    !componentSource.includes('export const SegmentedControl') ||\n    !componentSource.includes('lcl-segmented-control') ||\n    !componentSource.includes('lcl-segmented-control__item') ||\n    !componentSource.includes('role="tablist"') ||\n    !componentSource.includes('role="tab"')\n  ) {\n    addFailure(\n      componentPath,\n      'shared SegmentedControl must own add-device tablist structure and lcl-segmented-control geometry'\n    );\n  }\n  if (!uiIndexSource.includes("export * from './primitives/SegmentedControl.js';")) {\n    addFailure(uiIndexPath, 'shared SegmentedControl must be exported from @lcl/ui');\n  }\n\n  for (const path of componentUsagePaths) {\n    const source = await readRepoFile(path);\n    if (\n      !source.includes('<SegmentedControl') ||\n      !source.includes('className="shelly-add-tabs"') ||\n      !source.includes('itemClassName="shelly-add-tabs__tab"') ||\n      source.includes('shelly-add-tabs lcl-segmented-control') ||\n      source.includes('shelly-add-tabs__tab lcl-segmented-control__item')\n    ) {\n      addFailure(\n        path,\n        'add-device segmented tabs must reuse @lcl/ui SegmentedControl instead of rebuilding tablist markup'\n      );\n    }\n  }\n\n  for (const [path, rootClass] of geometryUsageContracts) {\n    const source = await readRepoFile(path);\n    if (!source.includes(rootClass) || !source.includes('lcl-segmented-control__item')) {\n      addFailure(\n        path,\n        'migrated segmented navigation must use shared lcl-segmented-control geometry'\n      );\n    }\n  }\n};'''
gate_path.write_text(gate[:start] + new_gate_fn + gate[end:])

# 6. Document the distinction between shared component and geometry-only nav usages.
doc_path = Path('docs/UX_VISUAL_CONTRACT.md')
doc = doc_path.read_text()
old_rule = '2. `@lcl/ui` owns reusable interaction geometry. `lcl-segmented-control` owns add-device tabs, Plug detail tabs, and the hardware setup top navigation.\n'
new_rule = '2. `@lcl/ui` owns reusable interaction geometry. The shared `SegmentedControl` component owns add-device tab structure and `lcl-segmented-control` geometry; Plug detail tabs and hardware setup top navigation reuse that geometry while keeping their distinct navigation semantics.\n'
if doc.count(old_rule) != 1:
    raise SystemExit('UX visual contract segmented-control rule not found exactly once')
doc_path.write_text(doc.replace(old_rule, new_rule, 1))

print('Extracted shared SegmentedControl and migrated Plug/Thermometer add tabs')
