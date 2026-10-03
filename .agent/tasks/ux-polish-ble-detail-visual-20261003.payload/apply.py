from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"missing expected text in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


spec = 'apps/mobile/e2e/led-settings.spec.ts'
seed_anchor = '''const seedSavedPlug = async (page: Page) => {
  await page.addInitScript((draft) => {
    window.localStorage.setItem('lcl.hardwareSetupDraft.v9', JSON.stringify(draft));
  }, savedPlugDraft);
};
'''
seed_addition = seed_anchor + '''
const seedBleOnlySavedPlug = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'lcl.savedPlugs.v1',
      JSON.stringify({
        version: 1,
        plugs: [
          {
            physicalId: 'shellyplugsg3-ble-e2e',
            name: 'Magazyn BLE',
            bleDeviceId: '02:00:00:00:00:02',
            advertisementName: 'shellyplugsg3-ble-e2e',
            model: 'S3PL-00112EU',
            generation: 3,
            firmwareId: '20260311-095902/1.7.5-g9979d16',
            matterEnabled: false
          }
        ]
      })
    );
  });
};
'''
replace_once(spec, seed_anchor, seed_addition)

test_anchor = '''test('unsupported PLUGS_UI is a stable non-error device state', async ({ page }) => {'''
new_test = '''test('BLE-only Plug detail exposes only supported capabilities', async ({ page }) => {
  const problems = consoleProblems(page);
  await page.setViewportSize(canonicalVisualViewport);
  await seedBleOnlySavedPlug(page);
  await page.goto('/');

  await page
    .getByRole('button', { name: 'Szczegóły: Magazyn BLE · Bluetooth' })
    .click();

  const tabs = page.getByRole('navigation', { name: 'Akcje gniazdka' });
  await expect(tabs).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ustawienia gniazdka' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Informacje' })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByRole('button', { name: 'Automatyka' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Bluetooth' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skrypt' })).toHaveCount(0);
  await expect(page.getByText('Brak połączenia z Shelly.')).toBeVisible({ timeout: 15_000 });
  await expectNoHorizontalOverflow(page);
  await expectVisualScreen(page, '30-ble-only-plug-detail');
  expect(problems.filter((entry) => !entry.includes('Bluetooth'))).toEqual([]);
});

'''
replace_once(spec, test_anchor, new_test + test_anchor)

visual = 'apps/mobile/e2e/visual-contract.ts'
replace_once(
    visual,
    "  '29-standalone-pulse-detail'\n] as const;",
    "  '29-standalone-pulse-detail',\n  '30-ble-only-plug-detail'\n] as const;"
)

package = Path('package.json')
text = package.read_text()
old = 'plain saved Plug exposes the same LED settings without an installed automation|Pulse operational status stays responsive on phone-large'
new = old + '|BLE-only Plug detail exposes only supported capabilities'
if text.count(old) != 2:
    raise SystemExit(f'expected two visual grep occurrences, found {text.count(old)}')
package.write_text(text.replace(old, new))

contract = 'docs/UX_VISUAL_CONTRACT.md'
replace_once(
    contract,
    '''Managed Climate Button Mode is read-only while Climate owns the relay; do not show a disabled editable form.\n''',
    '''Managed Climate Button Mode is read-only while Climate owns the relay; do not show a disabled editable form.\n\nBLE-only Plug Detail exposes only the Device and Info capabilities; unsupported Automation, BLE and Script tabs stay absent. The canonical browser state is `30-ble-only-plug-detail`.\n'''
)

checkpoint = 'docs/UX_POLISH_CHECKPOINT_20261003.md'
p = Path(checkpoint)
text = p.read_text()
append = '''\n## Post-checkpoint progress\n\n- `9accb1bb818a76b003ef0bd8f3656e124e78df9a` completed the Time / standalone Pulse detail hierarchy. Canonical `11-time-detail` was refreshed and `29-standalone-pulse-detail` was added; canonical visual and `pnpm check:full` passed.\n- Next evidence-only slice adds a canonical BLE-only Plug Detail state; no product runtime or device behavior is changed.\n'''
if '## Post-checkpoint progress' not in text:
    p.write_text(text.rstrip() + '\n' + append)
