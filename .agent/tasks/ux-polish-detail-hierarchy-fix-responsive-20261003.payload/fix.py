from pathlib import Path

path = Path('apps/mobile/e2e/responsive.spec.ts')
text = path.read_text()
old = '''const expectTimeDetailHierarchy = async (page: Page) => {
  const [tabsBox, surfaceBox, liveStateBox] = await Promise.all([
    requiredBox(page.locator('.plug-detail-tabs')),
    requiredBox(page.locator('.plug-detail-surface')),
    requiredBox(page.locator('.installation-automation-live-state'))
  ]);

  expect(Math.abs(tabsBox.x - surfaceBox.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(tabsBox.width - surfaceBox.width)).toBeLessThanOrEqual(2);
  expect(liveStateBox.x).toBeGreaterThanOrEqual(surfaceBox.x - 1);
  expect(liveStateBox.x + liveStateBox.width).toBeLessThanOrEqual(
    surfaceBox.x + surfaceBox.width + 1
  );
  await expect(page.locator('.installation-detail-header')).toHaveCount(0);
  await expect(page.locator('.installation-detail-live')).toHaveCount(0);
  await expect(page.locator('.app-page-back-row')).toHaveCount(0);
};'''
new = '''const expectTimeDetailHierarchy = async (page: Page) => {
  const [tabsBox, surfaceBox, hierarchyBox] = await Promise.all([
    requiredBox(page.locator('.plug-detail-tabs')),
    requiredBox(page.locator('.plug-detail-surface')),
    requiredBox(page.locator('.installation-detail-hierarchy'))
  ]);

  expect(Math.abs(tabsBox.x - surfaceBox.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(tabsBox.width - surfaceBox.width)).toBeLessThanOrEqual(2);
  expect(hierarchyBox.x).toBeGreaterThanOrEqual(surfaceBox.x - 1);
  expect(hierarchyBox.x + hierarchyBox.width).toBeLessThanOrEqual(
    surfaceBox.x + surfaceBox.width + 1
  );
  await expect(page.locator('.installation-detail-hierarchy__section')).toHaveCount(2);
  await expect(page.locator('.installation-detail-danger-zone')).toHaveCount(1);
  await expect(page.locator('.installation-detail-header')).toHaveCount(0);
  await expect(page.locator('.installation-detail-live')).toHaveCount(0);
  await expect(page.locator('.app-page-back-row')).toHaveCount(0);
};'''
if old not in text:
    raise SystemExit('expected Time detail hierarchy helper not found')
path.write_text(text.replace(old, new, 1))
