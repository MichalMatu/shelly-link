from pathlib import Path

visual_path = Path('apps/mobile/e2e/visual-contract.ts')
visual = visual_path.read_text()
old_visual = "  '18-settings-diagnostics-open',\n  '19-climate-advanced-open'\n] as const;\n"
new_visual = "  '18-settings-diagnostics-open',\n  '19-climate-advanced-open',\n  '20-climate-button-mode-managed'\n] as const;\n"
if visual.count(old_visual) != 1:
    raise SystemExit('visual screen list anchor not found exactly once')
visual_path.write_text(visual.replace(old_visual, new_visual, 1))

spec_path = Path('apps/mobile/e2e/responsive.spec.ts')
spec = spec_path.read_text()
old_spec = """    await expect(\n      page.getByRole('button', { name: 'Zapisz ustawienia LED' })\n    ).toBeVisible();\n    await expectNoHorizontalOverflow(page);\n\n    if (viewport.name === 'phone-large') {\n      await page.locator('.plug-detail-tabs__item').nth(3).click();\n"""
new_spec = """    await expect(\n      page.getByRole('button', { name: 'Zapisz ustawienia LED' })\n    ).toBeVisible();\n    await expectNoHorizontalOverflow(page);\n\n    if (viewport.name === 'phone-large') {\n      const managedButtonMode = page.locator('.installation-detail-device-button');\n      await managedButtonMode.scrollIntoViewIfNeeded();\n      await expect(managedButtonMode).toBeInViewport();\n      await expectVisualScreen(page, '20-climate-button-mode-managed');\n    }\n\n    if (viewport.name === 'phone-large') {\n      await page.locator('.plug-detail-tabs__item').nth(3).click();\n"""
if spec.count(old_spec) != 1:
    raise SystemExit('Climate Device visual insertion anchor not found exactly once')
spec_path.write_text(spec.replace(old_spec, new_spec, 1))

gallery_path = Path('docs/UX_VISUAL_GALLERY.md')
gallery = gallery_path.read_text()
old_gallery = """## 19-climate-advanced-open\n\n![19-climate-advanced-open](../apps/mobile/e2e/responsive.spec.ts-snapshots/19-climate-advanced-open-darwin.png)"""
new_gallery = old_gallery + """\n\n## 20-climate-button-mode-managed\n\n![20-climate-button-mode-managed](../apps/mobile/e2e/responsive.spec.ts-snapshots/20-climate-button-mode-managed-darwin.png)"""
if gallery.count(old_gallery) != 1:
    raise SystemExit('visual gallery tail not found exactly once')
gallery_path.write_text(gallery.replace(old_gallery, new_gallery, 1))

print('Added dedicated managed Button Mode canonical visual contract')
