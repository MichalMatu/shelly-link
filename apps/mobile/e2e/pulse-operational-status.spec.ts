import { expect, test, type Page, type Route } from '@playwright/test';
import { expectVisualScreen } from './visual-contract.js';

const viewports = [
  { name: 'phone-small', width: 360, height: 800 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone-large', width: 412, height: 915 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
] as const;

const seedStandalonePulseInstallation = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'lcl.installedAutomations.v1',
      JSON.stringify({
        version: 1,
        installations: [
          {
            version: 1,
            id: 'pulse:shelly-pulse-e2e:0',
            kind: 'pulse',
            shelly: {
              deviceId: 'shelly-pulse-e2e',
              name: 'Pompa Pulse',
              baseUrl: 'http://192.168.0.30/',
              model: 'S3PL-00112EU',
              gen: 3
            },
            script: { id: 7, hash: 'lcl-0163838b' },
            config: {
              relayId: 0,
              pulse: {
                onMs: 30_000,
                offMs: 60_000,
                initialDelayMs: 0,
                startPhase: 'on',
                execution: { mode: 'continuous' }
              }
            },
            installedAtMs: 1_782_820_000_000,
            updatedAtMs: 1_782_820_000_000
          }
        ]
      })
    );
  });
};

const mockStandalonePulseRpc = async (
  page: Page,
  options: { scriptCode?: string } = {}
) => {
  let scriptPresent = true;
  let scriptRunning = true;
  let relayOn = true;
  const calls: string[] = [];
  const scriptCode = options.scriptCode ?? '// standalone pulse runtime';

  const handleRpc = async (route: Route) => {
    const requestBody = JSON.parse(route.request().postData() ?? '{}') as {
      id?: number | string;
      method?: string;
      params?: { code?: string; on?: boolean };
    };
    calls.push(requestBody.method ?? 'unknown');

    let result: unknown = {};
    switch (requestBody.method) {
      case 'Shelly.GetDeviceInfo':
        result = {
          id: 'shelly-pulse-e2e',
          model: 'S3PL-00112EU',
          gen: 3,
          fw_id: '20260311-095902/1.7.5-g9979d16'
        };
        break;
      case 'Shelly.GetStatus':
        result = {
          ...(scriptPresent ? { 'script:7': { id: 7, running: scriptRunning } } : {}),
          'switch:0': {
            id: 0,
            output: relayOn,
            apower: relayOn ? 18.4 : 0,
            voltage: 230.2,
            current: relayOn ? 0.08 : 0,
            aenergy: { total: 320 }
          },
          sys: {
            time: '14:00',
            unixtime: 1_782_820_000,
            uptime: 3_600,
            last_sync_ts: 1_782_819_900
          }
        };
        break;
      case 'Shelly.ListMethods':
        result = {
          methods: [
            'plugs_ui.GetConfig',
            'plugs_ui.SetConfig',
            'Cloud.GetConfig',
            'Cloud.SetConfig',
            'Cloud.GetStatus'
          ]
        };
        break;
      case 'PLUGS_UI.GetConfig':
        result = {
          leds: {
            mode: 'switch',
            colors: {
              'switch:0': {
                on: { rgb: [0, 100, 0], brightness: 100 },
                off: { rgb: [100, 0, 0], brightness: 75 }
              },
              power: { brightness: 80 }
            },
            night_mode: {
              enable: true,
              brightness: 10,
              active_between: ['22:00', '06:00']
            }
          },
          controls: { 'switch:0': { in_mode: 'momentary' } }
        };
        break;
      case 'Cloud.GetConfig':
        result = { enable: false };
        break;
      case 'Cloud.GetStatus':
        result = { connected: false };
        break;
      case 'Sys.GetStatus':
        result = { ram_free: 140_152, ram_size: 270_676 };
        break;
      case 'Script.GetStatus':
        result = {
          id: 7,
          running: scriptRunning,
          mem_used: 2_100,
          mem_peak: 4_914,
          mem_free: 23_086,
          cpu: 1
        };
        break;
      case 'Script.List':
        result = {
          scripts: scriptPresent
            ? [
                {
                  id: 7,
                  name: 'Shelly Link Pulse',
                  enable: true,
                  running: scriptRunning
                }
              ]
            : []
        };
        break;
      case 'Script.GetCode':
        result = { data: scriptCode, left: 0 };
        break;
      case 'KVS.GetMany':
        result = {
          items: [
            {
              key: 'shellylink.history.00',
              etag: 'h0',
              value: '[2,[[1782820000,3590,null,null,null,0,"pf",null,null,0,0]]]'
            },
            {
              key: 'shellylink.history.01',
              etag: 'h1',
              value: '[2,[[1782820010,3600,null,null,null,3,"po",null,null,184,80]]]'
            },
            {
              key: 'shellylink.history.02',
              etag: 'h2',
              value: '[2,[[1782820020,3610,null,null,null,0,"pf",null,null,0,0]]]'
            },
            { key: 'shellylink.history.meta', etag: 'hm', value: '[2,24,3,3]' }
          ],
          offset: 0,
          total: 4
        };
        break;
      case 'Script.Eval':
        if (requestBody.params?.code?.includes('R.ps,R.pc,R.pn,R.rs')) {
          result = {
            result: JSON.stringify([2, 3, 3_665_000, 'po', 1, null, 3_600_000])
          };
        } else {
          relayOn = false;
          result = { result: '' };
        }
        break;
      case 'Script.Stop':
        scriptRunning = false;
        result = { was_running: true };
        break;
      case 'Script.Start':
        scriptRunning = true;
        relayOn = false;
        result = { was_running: false };
        break;
      case 'Script.Delete':
        scriptPresent = false;
        scriptRunning = false;
        result = {};
        break;
      case 'Switch.Set':
        relayOn = requestBody.params?.on === true;
        result = { was_on: !relayOn };
        break;
      default:
        result = {};
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: requestBody.id ?? 1, result })
    });
  };

  await page.route('**/__lcl_shelly_proxy?**', handleRpc);
  await page.route('http://192.168.0.30/rpc', handleRpc);
  return { calls };
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(overflow.scrollWidth - overflow.viewportWidth).toBeLessThanOrEqual(1);
};

const expectPulseRuntimeControlsAbsent = async (page: Page) => {
  for (const name of ['AUTO', 'MANUAL', 'ON', 'OFF']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
};

for (const viewport of viewports) {
  test(`Pulse operational status stays responsive on ${viewport.name}`, async ({
    page
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedStandalonePulseInstallation(page);
    await mockStandalonePulseRpc(page);
    await page.goto('/');

    const card = page
      .getByText('Pompa Pulse', { exact: true })
      .locator('xpath=ancestor::article[1]');
    const compactStatus = card.getByLabel('Stan Pulse');

    await expect(card).toBeVisible();
    await expect(card.getByRole('button', { name: 'AUTO', exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'MANUAL', exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'ON', exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'OFF', exact: true })).toBeVisible();
    await expect(card).toContainText('ON 30 s / OFF 60 s');
    await expect(card).toContainText('Ciągłe');
    await expect(card).toContainText('18.4 W');
    await expect(card).toContainText('230 V');
    await expect(card).toContainText('320 Wh');
    await expect(card).toContainText('14:00');
    await expect(compactStatus).toBeVisible();
    const pulseLiveStatus = card.locator('.automation-card__live-status');
    await expect
      .poll(() =>
        pulseLiveStatus.evaluate((element) => getComputedStyle(element).borderTopWidth)
      )
      .toBe('0px');
    await expect(compactStatus.getByText('ON', { exact: true })).toBeVisible();
    await expect(compactStatus).toContainText('3 cykli');
    await expect(compactStatus).toContainText('1m 5s');
    await expect(compactStatus).not.toContainText('Aktualny');
    await expect(compactStatus.getByText('Wyjście automatyzacji')).toHaveCount(0);
    await expect(compactStatus.getByText('Stan przekaźnika')).toHaveCount(0);
    await expect(compactStatus.getByText('Powód automatyzacji')).toHaveCount(0);
    await expect(card.getByText('Błąd automatyki')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    const cardBox = await card.boundingBox();
    const compactBox = await compactStatus.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(compactBox).not.toBeNull();
    expect(compactBox!.x).toBeGreaterThanOrEqual(cardBox!.x - 1);
    expect(compactBox!.x + compactBox!.width).toBeLessThanOrEqual(
      cardBox!.x + cardBox!.width + 1
    );
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '27-standalone-pulse-dashboard');
    }

    await page.getByRole('button', { name: 'Szczegóły: Pompa Pulse · Wi-Fi' }).click();

    await expect(
      page.locator('.plug-detail-tabs__item[data-automation-icon="pulse"]')
    ).toBeVisible();
    await expectPulseRuntimeControlsAbsent(page);

    const detailSurface = page.locator('.plug-detail-surface');
    await expect(detailSurface.getByLabel('Stan Pulse')).toHaveCount(0);
    await expect(detailSurface.getByText('Stan bieżący', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Czas ON (s)')).toHaveValue('30');
    await expect(page.getByLabel('Czas OFF (s)')).toHaveValue('60');
    await expect(page.getByRole('button', { name: 'Zapisz zmiany' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zapisz zmiany' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Edytuj cykl' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Usuń automatykę' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Usuń automatykę' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Bluetooth' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skrypt' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const surfaceBox = await detailSurface.boundingBox();
    expect(surfaceBox).not.toBeNull();
    if (viewport.name === 'phone-large') {
      await expectVisualScreen(page, '29-standalone-pulse-detail');
    }

    await page.getByRole('button', { name: 'Historia' }).click();
    const history = page.getByRole('group', { name: 'Historia' });
    await expect(history).toBeVisible();
    await expect(history.locator('.climate-history-chart__panel')).toHaveCount(3);
    await expect(history.locator('[data-metric="output"]')).toBeVisible();
    await expect(history.locator('[data-metric="power"]')).toBeVisible();
    await expect(history.locator('[data-metric="current"]')).toBeVisible();
    await expect(history.locator('[data-metric="temperature"]')).toHaveCount(0);
    await expect(history.locator('[data-metric="humidity"]')).toHaveCount(0);
    await expect(history.locator('[data-metric="vpd"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    if (viewport.name === 'phone-large')
      await expectVisualScreen(page, '31-standalone-pulse-history');

    await page.getByRole('button', { name: 'Bluetooth' }).click();
    await expect(
      page.getByRole('button', { name: 'Skanuj termometry BLE przez to gniazdko' })
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Ustawienia gniazdka' }).click();
    await expect(page.getByRole('heading', { name: 'LED gniazdka' })).toBeVisible();
    await expect(page.locator('ion-select[aria-label="Tryb LED"]')).toHaveAttribute(
      'value',
      'switch'
    );
    await expect(page.getByText(/nie udostępnia ustawień PLUGS_UI/i)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('button', { name: 'Informacje' }).click();
    await expect(page.getByText('RAM Shelly wolny')).toBeVisible();
    await expect(page.getByText('136.9 KiB')).toBeVisible();
    await expect(page.getByText('RAM Shelly razem')).toBeVisible();
    await expect(page.getByText('264.3 KiB')).toBeVisible();
    await expect(page.getByText('CPU skryptu')).toBeVisible();
    await expect(page.getByText('JS użyte teraz')).toBeVisible();
    await expect(page.getByText('JS peak')).toBeVisible();
    await expect(page.getByText('JS wolne')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

test('standalone Pulse supports safe AUTO and MANUAL relay control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedStandalonePulseInstallation(page);
  const rpc = await mockStandalonePulseRpc(page);
  await page.goto('/');

  const card = page
    .getByText('Pompa Pulse', { exact: true })
    .locator('xpath=ancestor::article[1]');
  const auto = card.getByRole('button', { name: 'AUTO' });
  const manual = card.getByRole('button', { name: 'MANUAL' });
  const turnOn = card.getByRole('button', { name: 'ON' });

  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(turnOn).toBeDisabled();

  await manual.click();
  await expect(manual).toHaveAttribute('aria-pressed', 'true');
  await expect(turnOn).toBeEnabled();
  await expect.poll(() => rpc.calls.includes('Script.Stop')).toBe(true);

  await turnOn.click();
  await expect(turnOn).toHaveAttribute('aria-pressed', 'true');

  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(turnOn).toBeDisabled();
  await expect.poll(() => rpc.calls.includes('Script.Start')).toBe(true);
});

test('standalone Pulse refuses AUTO and manual ON when the installed script hash changed', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedStandalonePulseInstallation(page);
  const rpc = await mockStandalonePulseRpc(page, {
    scriptCode: '// tampered standalone pulse runtime'
  });
  await page.goto('/');

  const card = page
    .getByText('Pompa Pulse', { exact: true })
    .locator('xpath=ancestor::article[1]');
  const auto = card.getByRole('button', { name: 'AUTO' });
  const manual = card.getByRole('button', { name: 'MANUAL' });
  const turnOn = card.getByRole('button', { name: 'ON' });

  await manual.click();
  await expect(manual).toHaveAttribute('aria-pressed', 'true');
  await expect(turnOn).toBeEnabled();
  await expect.poll(() => rpc.calls.includes('Script.Stop')).toBe(true);

  const switchSetCountAfterPause = rpc.calls.filter(
    (method) => method === 'Switch.Set'
  ).length;
  await turnOn.click();
  await expect
    .poll(() => rpc.calls.filter((method) => method === 'Switch.Set').length)
    .toBe(switchSetCountAfterPause);
  await expect(turnOn).not.toHaveAttribute('aria-pressed', 'true');

  await auto.click();
  await expect
    .poll(() => rpc.calls.filter((method) => method === 'Script.Start').length)
    .toBe(0);
  await expect(manual).toHaveAttribute('aria-pressed', 'true');
});

test('standalone Pulse can be deleted safely from detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedStandalonePulseInstallation(page);
  const rpc = await mockStandalonePulseRpc(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Szczegóły: Pompa Pulse · Wi-Fi' }).click();
  await page.getByRole('button', { name: 'Usuń automatykę' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Usunąć automatykę Pulse?');
  await dialog.getByRole('button', { name: 'Usuń' }).click();

  await expect(dialog).toBeHidden();
  await expect.poll(() => rpc.calls.includes('Script.Delete')).toBe(true);
  await expect
    .poll(() => rpc.calls.filter((method) => method === 'Switch.Set').length)
    .toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Pompa Pulse', { exact: true })).toHaveCount(0);
  expect(rpc.calls).toContain('Script.Eval');
  expect(rpc.calls).toContain('Script.Stop');
});
