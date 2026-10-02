import { expect, test, type Page, type Route } from '@playwright/test';

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
            script: { id: 7, hash: 'standalone-pulse-e2e' },
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

const mockStandalonePulseRpc = async (page: Page) => {
  const handleRpc = async (route: Route) => {
    const requestBody = JSON.parse(route.request().postData() ?? '{}') as {
      id?: number | string;
      method?: string;
      params?: { code?: string };
    };

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
          'script:7': { id: 7, running: true },
          'switch:0': {
            id: 0,
            output: true,
            apower: 18.4,
            voltage: 230.2,
            current: 0.08,
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
      case 'Script.Eval':
        if (requestBody.params?.code?.includes('R.ps,R.pc,R.pn,R.rs')) {
          result = {
            result: JSON.stringify([2, 3, 3_665_000, 'po', 1, null, 3_600_000])
          };
        } else {
          result = { result: '' };
        }
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
};

const expectNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(overflow.scrollWidth - overflow.viewportWidth).toBeLessThanOrEqual(1);
};

for (const viewport of viewports) {
  test(`Pulse operational status stays responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedStandalonePulseInstallation(page);
    await mockStandalonePulseRpc(page);
    await page.goto('/');

    const card = page
      .getByText('Pompa Pulse', { exact: true })
      .locator('xpath=ancestor::article[1]');
    const compactStatus = card.getByLabel('Stan Pulse');

    await expect(card).toBeVisible();
    await expect(compactStatus).toBeVisible();
    await expect(compactStatus).toContainText('Aktualny');
    await expect(compactStatus).toContainText('ON');
    await expect(compactStatus).toContainText('3 cykli');
    await expect(compactStatus).toContainText('1m 5s');
    await expect(compactStatus).toContainText('Faza ON');
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

    await page.getByRole('button', { name: 'Szczegóły: Pompa Pulse · Wi-Fi' }).click();

    const detailSurface = page.locator('.plug-detail-surface');
    const fullStatus = detailSurface.getByLabel('Stan Pulse');
    await expect(fullStatus).toBeVisible();
    await expect(fullStatus).toContainText('Aktualny');
    await expect(fullStatus).toContainText('3 cykli');
    await expect(fullStatus).toContainText('1m 5s');
    await expect(fullStatus).toContainText('Faza ON');
    await expect(fullStatus).toContainText('Błąd automatyki');
    await expect(fullStatus).toContainText('Brak');
    await expect(fullStatus).toContainText('Twarde bezpieczeństwo');
    await expectNoHorizontalOverflow(page);

    const surfaceBox = await detailSurface.boundingBox();
    const fullBox = await fullStatus.boundingBox();
    expect(surfaceBox).not.toBeNull();
    expect(fullBox).not.toBeNull();
    expect(fullBox!.x).toBeGreaterThanOrEqual(surfaceBox!.x - 1);
    expect(fullBox!.x + fullBox!.width).toBeLessThanOrEqual(
      surfaceBox!.x + surfaceBox!.width + 1
    );
  });
}
