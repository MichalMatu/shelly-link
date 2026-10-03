from pathlib import Path

component_path = Path('apps/mobile/src/features/plugs/components/PlugButtonModeSettingsCard.tsx')
component = component_path.read_text()
component = component.replace(
    "import { SelectField } from '@lcl/ui';",
    "import { DiagnosticRow, SelectField } from '@lcl/ui';",
    1,
)
anchor = '''  if (!settings?.supported || !draft) {\n    return (\n      <section className="plug-settings-section installation-detail-device-button">\n        <h2>{copy.title}</h2>\n        <p className="plug-settings-feedback">{copy.unsupported}</p>\n      </section>\n    );\n  }\n\n'''
if component.count(anchor) != 1:
    raise SystemExit('unsupported-state anchor not found exactly once')
locked = '''  if (locked) {\n    const modeLabel = draft === 'momentary' ? copy.momentary : copy.detached;\n    return (\n      <section className="plug-settings-section installation-detail-device-button">\n        <div className="plug-settings-section__heading">\n          <h2>{copy.title}</h2>\n          <p>{copy.managedDescription}</p>\n        </div>\n\n        <div className="plug-info-grid">\n          <DiagnosticRow label={copy.currentMode} value={modeLabel} />\n        </div>\n\n        <p className="plug-settings-feedback">{copy.managedHint}</p>\n      </section>\n    );\n  }\n\n'''
component = component.replace(anchor, anchor + locked, 1)
component_path.write_text(component)

copy_path = Path('apps/mobile/src/app/locales/deviceButtonMode.ts')
copy = copy_path.read_text()
copy = copy.replace(
    '  detachedHint: string;\n',
    '  detachedHint: string;\n  managedDescription: string;\n  managedHint: string;\n',
    1,
)
copy = copy.replace(
    "  detachedHint: 'The physical button no longer changes the relay state.',\n",
    "  detachedHint: 'The physical button no longer changes the relay state.',\n  managedDescription: 'Climate automation manages this setting while it owns the relay.',\n  managedHint: 'Remove the Climate automation to change the button mode.',\n",
    1,
)
copy = copy.replace(
    "    detachedHint: 'Fizyczny przycisk nie zmienia stanu przekaźnika.',\n",
    "    detachedHint: 'Fizyczny przycisk nie zmienia stanu przekaźnika.',\n    managedDescription:\n      'Automatyka Climate zarządza tym ustawieniem, dopóki steruje przekaźnikiem.',\n    managedHint: 'Usuń automatykę Climate, aby zmienić tryb przycisku.',\n",
    1,
)
copy_path.write_text(copy)

test_path = Path('apps/mobile/src/features/plugs/components/PlugButtonModeSettingsCard.test.tsx')
test = test_path.read_text()
old = '''    renderCard(true);\n    const modeSelect = await screen.findByRole('button', { name: copy.currentMode });\n    const save = screen.getByRole('button', { name: copy.save });\n    expect(modeSelect).toHaveTextContent(copy.detached);\n    expect(modeSelect).toBeDisabled();\n    expect(save).toBeDisabled();\n'''
new = '''    renderCard(true);\n    expect(await screen.findByText(copy.managedDescription)).toBeVisible();\n    expect(screen.getByText(copy.currentMode)).toBeVisible();\n    expect(screen.getByText(copy.detached)).toBeVisible();\n    expect(screen.getByText(copy.managedHint)).toBeVisible();\n    expect(screen.queryByRole('button', { name: copy.currentMode })).toBeNull();\n    expect(screen.queryByRole('button', { name: copy.save })).toBeNull();\n'''
if test.count(old) != 1:
    raise SystemExit('locked button-mode test block not found exactly once')
test_path.write_text(test.replace(old, new, 1))

print('Refined locked Climate button-mode surface to explicit read-only state')
