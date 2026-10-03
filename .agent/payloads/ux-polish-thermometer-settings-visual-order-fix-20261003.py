from pathlib import Path

path = Path('apps/mobile/e2e/responsive.spec.ts')
source = path.read_text()
old = """    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toHaveCount(0);
    await expect(
      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toHaveCount(0);
    const thermometerSettings = thermometerCard.getByRole('button', {
      name: 'Ustawienia termometru Przedpokój'
    });
    await expect(thermometerSettings).toBeVisible();
    await thermometerSettings.click();
    await expect(
      page.getByRole('heading', { name: 'Ustawienia termometru' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tożsamość' })).toBeVisible();
    await expect(page.getByLabel('Nazwa termometru')).toHaveValue('Przedpokój');
    await expect(page.getByText('A4:C1:38:4F:24:CD')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Odczyty na żywo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Akcje urządzenia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ustaw czas' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '28-thermometer-settings');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '13-add-thermometer');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Termometry' })).toBeVisible();
"""
new = """    await expect(thermometerCard.getByText('A4:C1:38:4F:24:CD')).toHaveCount(0);
    await expect(
      thermometerCard.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toHaveCount(0);
    await expect(
      thermometerCard.getByRole('button', { name: 'Ustawienia termometru Przedpokój' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Skanuj termometry BLE telefonem' }).click();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '13-add-thermometer');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Termometry' })).toBeVisible();

    const settingsCard = page
      .getByRole('heading', { name: 'Przedpokój' })
      .locator('xpath=ancestor::article[1]');
    await settingsCard
      .getByRole('button', { name: 'Ustawienia termometru Przedpokój' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Ustawienia termometru' })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tożsamość' })).toBeVisible();
    await expect(page.getByLabel('Nazwa termometru')).toHaveValue('Przedpokój');
    await expect(page.getByText('A4:C1:38:4F:24:CD')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Odczyty na żywo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Akcje urządzenia' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ustaw czas' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Usuń termometr tylko z aplikacji' })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '28-thermometer-settings');
    }
    await page.getByRole('button', { name: 'Termometry', exact: true }).click();
    await expect(page.getByRole('main', { name: 'Termometry' })).toBeVisible();
"""
count = source.count(old)
if count != 1:
    raise SystemExit(f'expected one responsive thermometer flow block, got {count}')
path.write_text(source.replace(old, new, 1))
