from pathlib import Path

path = Path('apps/mobile/e2e/led-settings.spec.ts')
text = path.read_text()
old = '''const openDetail = async (page: Page, kind: InstallationKind = 'climate') => {\n  await page.goto('/');\n  const details = page.getByRole('button', { name: 'Szczegóły' });\n  await expect(details).toBeVisible();\n  await details.click();\n  if (kind === 'climate') {\n    await expect(page.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();\n    await page.getByRole('button', { name: 'Ustawienia gniazdka' }).click();\n  }\n  await expect(page.getByRole('heading', { name: 'LED gniazdka' })).toBeVisible();\n};\n'''
new = '''const openDetail = async (page: Page) => {\n  await page.goto('/');\n  const details = page.getByRole('button', { name: 'Szczegóły' });\n  await expect(details).toBeVisible();\n  await details.click();\n  await expect(page.getByRole('navigation', { name: 'Akcje gniazdka' })).toBeVisible();\n  await page.getByRole('button', { name: 'Ustawienia gniazdka' }).click();\n  await expect(page.getByRole('heading', { name: 'LED gniazdka' })).toBeVisible();\n};\n'''
if text.count(old) != 1:
    raise SystemExit(f'expected one legacy openDetail helper, got {text.count(old)}')
text = text.replace(old, new, 1)
old_call = "  await openDetail(page, 'time');\n"
new_call = "  await openDetail(page);\n"
if text.count(old_call) != 1:
    raise SystemExit(f'expected one Time openDetail call, got {text.count(old_call)}')
text = text.replace(old_call, new_call, 1)
old_heading = "  await expect(page.getByRole('heading', { name: 'Lampa' })).toBeVisible();\n"
new_heading = "  await expect(page.getByRole('heading', { name: 'Lampa' })).toHaveCount(0);\n"
if text.count(old_heading) != 1:
    raise SystemExit(f'expected one legacy Time identity heading assertion, got {text.count(old_heading)}')
text = text.replace(old_heading, new_heading, 1)
path.write_text(text)
print('Unified Climate and Time Device E2E navigation and identity contract')
