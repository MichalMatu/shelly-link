from pathlib import Path

path = Path('apps/mobile/e2e/responsive.spec.ts')
text = path.read_text()

old_signature = "const mockShellyRpc = async (page: Page) => {\n"
new_signature = """const mockShellyRpc = async (\n  page: Page,\n  options: { buttonMode?: 'momentary' | 'detached' } = {}\n) => {\n"""
if text.count(old_signature) != 1:
    raise SystemExit(f'expected one mockShellyRpc signature, got {text.count(old_signature)}')
text = text.replace(old_signature, new_signature, 1)

old_initial = "  let buttonMode: 'momentary' | 'detached' = 'momentary';\n"
new_initial = "  let buttonMode: 'momentary' | 'detached' = options.buttonMode ?? 'momentary';\n"
if text.count(old_initial) != 1:
    raise SystemExit(f'expected one buttonMode initializer, got {text.count(old_initial)}')
text = text.replace(old_initial, new_initial, 1)

old_setup = """    await seedInstalledAutomation(page);\n    await mockShellyRpc(page);\n    await page.goto('/');\n"""
new_setup = """    await seedInstalledAutomation(page);\n    await mockShellyRpc(page, { buttonMode: 'detached' });\n    await page.goto('/');\n"""
if text.count(old_setup) != 1:
    raise SystemExit(f'expected one installed Climate mock setup, got {text.count(old_setup)}')
text = text.replace(old_setup, new_setup, 1)

old_device = """    await page.getByRole('button', { name: 'Ustawienia gniazdka' }).click();\n    await expect(page.getByRole('heading', { name: 'LED gniazdka' })).toBeVisible();\n    if (viewport.name === 'phone-large') {\n      await expectVisualScreen(page, '05-climate-device');\n    }\n"""
new_device = """    await page.getByRole('button', { name: 'Ustawienia gniazdka' }).click();\n    await expect(page.getByRole('heading', { name: 'LED gniazdka' })).toBeVisible();\n    await expect(\n      page.getByText('Automatyka Climate zarządza tym ustawieniem, dopóki steruje przekaźnikiem.')\n    ).toBeVisible();\n    await expect(page.getByText('Odłączony od przekaźnika', { exact: true })).toBeVisible();\n    await expect(page.getByRole('button', { name: 'Tryb przycisku' })).toHaveCount(0);\n    await expect(page.getByRole('button', { name: 'Zapisz tryb przycisku' })).toHaveCount(0);\n    if (viewport.name === 'phone-large') {\n      await expectVisualScreen(page, '05-climate-device');\n    }\n"""
if text.count(old_device) != 1:
    raise SystemExit(f'expected one Climate device visual block, got {text.count(old_device)}')
text = text.replace(old_device, new_device, 1)

path.write_text(text)
print('Made managed Climate button-mode visual contract wait for final detached read-only state')
