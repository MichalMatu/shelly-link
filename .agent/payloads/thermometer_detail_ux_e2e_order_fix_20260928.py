from pathlib import Path

path = Path('apps/mobile/e2e/responsive.spec.ts')
text = path.read_text()
old = """    const thermometerCard = page
      .getByRole('heading', { name: 'Przedpokój' })
      .locator('xpath=ancestor::article[1]');
    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toHaveCount(0);
    await expect(
      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toHaveCount(0);
    await thermometerCard
      .getByRole('button', { name: 'Ustawienia termometru Przedpokój' })
      .click();
    await expect(page.getByRole('main', { name: 'Ustawienia termometru' })).toBeVisible();
    await expect(page.getByText('A4:C1:38:4F:24:CD')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Termometry', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '22-thermometer-detail');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Termometry' })).toBeVisible();
    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '13-add-thermometer');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await page.getByRole('button', { name: 'Ustawienia', exact: true }).click();
"""
new = """    const thermometerCard = page
      .getByRole('heading', { name: 'Przedpokój' })
      .locator('xpath=ancestor::article[1]');
    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toHaveCount(0);
    await expect(
      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '13-add-thermometer');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Termometry' })).toBeVisible();
    await thermometerCard
      .getByRole('button', { name: 'Ustawienia termometru Przedpokój' })
      .click();
    await expect(page.getByRole('main', { name: 'Ustawienia termometru' })).toBeVisible();
    await expect(page.getByText('A4:C1:38:4F:24:CD')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Termometry', exact: true })
    ).toHaveAttribute('aria-current', 'page');
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '22-thermometer-detail');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await page.getByRole('button', { name: 'Ustawienia', exact: true }).click();
"""
if text.count(old) != 1:
    raise SystemExit(f'expected one Thermometer E2E ordering block, got {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('Kept Add Thermometer snapshot before nested Thermometer detail flow')
