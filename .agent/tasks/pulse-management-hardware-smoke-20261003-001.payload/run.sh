#!/usr/bin/env bash
set -euo pipefail

EXPECTED_HEAD="c314193b86da667273ccaeb1891cff9b3d15c251"
EXPECTED_DEVICE_ID="shellyplugsg3-e4b063d7f530"
SPEC="apps/mobile/e2e/pulse-hardware-smoke.local.spec.ts"

cleanup_spec() {
  rm -f "$SPEC"
}
trap cleanup_spec EXIT

test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
test -z "$(git status --porcelain)"

pnpm install --frozen-lockfile --prefer-offline
pnpm exec playwright install chromium

cat > "$SPEC" <<'TS'
import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import {
  FetchShellyRpcTransport,
  RPC_METHODS,
  RpcShellyClient,
  hashScriptCode,
  readShellyScriptCode,
  readShellyScriptList
} from '@lcl/shelly-client';
import { generateShellyStandalonePulseScript } from '@lcl/script-generator';

const expectedDeviceId = 'shellyplugsg3-e4b063d7f530';
const temporaryScriptName = 'LCL Pulse UX Smoke';

const normalizeDeviceId = (value: string): string => value.trim().toLowerCase();

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) {
    throw new Error(`Shelly RPC failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
};

const normalizeBaseUrl = (value: string): string => {
  const url = new URL(value);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
};

const probe = async (candidate: string): Promise<string | null> => {
  try {
    const baseUrl = normalizeBaseUrl(candidate);
    const transport = new FetchShellyRpcTransport({
      baseUrl,
      defaultTimeoutMs: 900
    });
    const client = new RpcShellyClient(transport, { mutationDelayMs: 0 });
    const info = await client.getDeviceInfo();
    if (
      info.ok &&
      info.value.id &&
      normalizeDeviceId(info.value.id) === normalizeDeviceId(expectedDeviceId)
    ) {
      return baseUrl;
    }
  } catch {
    // Discovery is read-only and intentionally best-effort.
  }
  return null;
};

const arpCandidates = (): string[] => {
  try {
    const output = execFileSync('arp', ['-a'], { encoding: 'utf8' });
    return [...output.matchAll(/\((\d+\.\d+\.\d+\.\d+)\)/g)].map(
      (match) => `http://${match[1]}/`
    );
  } catch {
    return [];
  }
};

const localSubnets = (): string[] => {
  const subnets = new Set<string>();
  for (const iface of ['en0', 'en1']) {
    try {
      const ip = execFileSync('ipconfig', ['getifaddr', iface], {
        encoding: 'utf8'
      }).trim();
      const match = /^(\d+)\.(\d+)\.(\d+)\.\d+$/.exec(ip);
      if (match) subnets.add(`${match[1]}.${match[2]}.${match[3]}`);
    } catch {
      // Interface may not be active.
    }
  }
  return [...subnets];
};

const discoverShelly = async (): Promise<string> => {
  const direct = [
    process.env.SHELLY_URL,
    `http://${expectedDeviceId}.local/`,
    ...arpCandidates()
  ].filter((value): value is string => Boolean(value));

  for (const candidate of [...new Set(direct)]) {
    const matched = await probe(candidate);
    if (matched) return matched;
  }

  for (const subnet of localSubnets()) {
    const hosts = Array.from({ length: 254 }, (_, index) => index + 1);
    for (let offset = 0; offset < hosts.length; offset += 24) {
      const batch = hosts.slice(offset, offset + 24);
      const matches = await Promise.all(
        batch.map((host) => probe(`http://${subnet}.${host}/`))
      );
      const matched = matches.find((value): value is string => value !== null);
      if (matched) return matched;
    }
  }

  throw new Error(`Configured Shelly ${expectedDeviceId} was not found on the local network.`);
};

test('real standalone Pulse management UI is safe and complete', async ({ page }) => {
  test.setTimeout(120_000);

  const baseUrl = await discoverShelly();
  const transport = new FetchShellyRpcTransport({ baseUrl, defaultTimeoutMs: 8_000 });
  const client = new RpcShellyClient(transport);
  const info = unwrap(await client.getDeviceInfo());
  expect(normalizeDeviceId(info.id ?? '')).toBe(normalizeDeviceId(expectedDeviceId));

  const initialScripts = unwrap(await readShellyScriptList(transport));
  expect(initialScripts).toHaveLength(1);
  const production = initialScripts[0]!;
  expect(production.name).not.toBe(temporaryScriptName);
  const productionCode = unwrap(await readShellyScriptCode(transport, production.id));
  const productionHash = hashScriptCode(productionCode);
  const productionEnable = production.enable;
  const productionRunning = production.running;

  let temporaryScriptId: number | null = null;
  let temporaryDeletedByUi = false;

  const forceRelayOff = async () => {
    unwrap(await client.setRelayOff({ relayId: 0 }));
    const status = unwrap(await client.getStatus());
    expect(status.relayOn).toBe(false);
  };

  const setScriptEnabled = async (scriptId: number, enable: boolean) => {
    unwrap(
      await transport.call({
        method: RPC_METHODS.ScriptSetConfig,
        params: { id: scriptId, config: { enable } }
      })
    );
  };

  try {
    await forceRelayOff();
    if (production.running) unwrap(await client.stopScript(production.id));
    await setScriptEnabled(production.id, false);
    await forceRelayOff();

    const pulseConfig = {
      relayId: 0,
      pulse: {
        onMs: 1_000,
        offMs: 1_000,
        initialDelayMs: 5_000,
        startPhase: 'on' as const,
        execution: { mode: 'continuous' as const }
      }
    };
    const code = generateShellyStandalonePulseScript(pulseConfig);
    const installed = unwrap(
      await client.installScript({
        scriptName: temporaryScriptName,
        code,
        runOnBoot: true,
        backupExisting: false,
        replaceAllScripts: false,
        relayId: 0,
        chunkSizeBytes: 1_024
      })
    );
    temporaryScriptId = installed.scriptId;
    await forceRelayOff();

    const now = Date.now();
    const installation = {
      version: 1,
      id: `pulse:${expectedDeviceId}:0`,
      kind: 'pulse',
      shelly: {
        deviceId: expectedDeviceId,
        name: 'Pulse hardware smoke',
        baseUrl,
        model: info.model ?? 'S3PL-00112EU',
        gen: info.gen ?? 3
      },
      script: { id: installed.scriptId, hash: installed.scriptHash },
      config: pulseConfig,
      installedAtMs: now,
      updatedAtMs: now
    };

    await page.addInitScript((value) => {
      window.localStorage.setItem(
        'lcl.installedAutomations.v1',
        JSON.stringify({ version: 1, installations: [value] })
      );
    }, installation);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const card = page
      .getByText('Pulse hardware smoke', { exact: true })
      .locator('xpath=ancestor::article[1]');
    const auto = card.getByRole('button', { name: 'AUTO' });
    const manual = card.getByRole('button', { name: 'MANUAL' });
    const turnOn = card.getByRole('button', { name: 'ON' });
    const turnOff = card.getByRole('button', { name: 'OFF' });

    await expect(card).toBeVisible();
    await expect(card).toContainText('1 s');
    await expect(card).toContainText('Ciągłe');
    await expect(auto).toHaveAttribute('aria-pressed', 'true');

    await manual.click();
    await expect(manual).toHaveAttribute('aria-pressed', 'true');
    await expect(turnOn).toBeEnabled();
    expect(unwrap(await client.getStatus()).relayOn).toBe(false);

    await turnOn.click();
    await expect(turnOn).toHaveAttribute('aria-pressed', 'true');
    expect(unwrap(await client.getStatus()).relayOn).toBe(true);

    await turnOff.click();
    await expect(turnOff).toHaveAttribute('aria-pressed', 'true');
    expect(unwrap(await client.getStatus()).relayOn).toBe(false);

    await auto.click();
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
    const afterAutoScripts = unwrap(await readShellyScriptList(transport));
    expect(afterAutoScripts.find((script) => script.id === installed.scriptId)?.running).toBe(
      true
    );
    expect(unwrap(await client.getStatus()).relayOn).toBe(false);

    await page
      .getByRole('button', { name: 'Szczegóły: Pulse hardware smoke · Wi-Fi' })
      .click();
    await expect(page.getByRole('button', { name: 'Skrypt' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Usuń automatykę' })).toBeVisible();

    await page.getByRole('button', { name: 'Usuń automatykę' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Usunąć automatykę Pulse?');
    await dialog.getByRole('button', { name: 'Usuń' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Pulse hardware smoke', { exact: true })).toHaveCount(0);

    const afterDelete = unwrap(await readShellyScriptList(transport));
    expect(afterDelete.some((script) => script.id === installed.scriptId)).toBe(false);
    expect(unwrap(await client.getStatus()).relayOn).toBe(false);
    temporaryDeletedByUi = true;

    console.log(
      JSON.stringify({
        result: 'PULSE_MANAGEMENT_HARDWARE_SMOKE_OK',
        baseUrl,
        deviceId: info.id,
        firmwareId: info.firmwareId,
        productionScriptId: production.id,
        productionHash,
        temporaryScriptId: installed.scriptId
      })
    );
  } finally {
    try {
      await forceRelayOff();
    } catch {
      // Continue cleanup even if one OFF verification failed.
    }

    const scripts = unwrap(await readShellyScriptList(transport));
    const staleTemporary = scripts.find(
      (script) =>
        script.name === temporaryScriptName ||
        (temporaryScriptId !== null && script.id === temporaryScriptId)
    );
    if (staleTemporary && !temporaryDeletedByUi) {
      if (staleTemporary.running) {
        await client.stopScript(staleTemporary.id).catch(() => undefined);
      }
      await client.deleteScript(staleTemporary.id).catch(() => undefined);
    }

    await setScriptEnabled(production.id, productionEnable);
    if (productionRunning) {
      unwrap(await client.startScript(production.id));
    } else {
      await client.stopScript(production.id).catch(() => undefined);
    }

    const restoredCode = unwrap(await readShellyScriptCode(transport, production.id));
    expect(hashScriptCode(restoredCode)).toBe(productionHash);
    await forceRelayOff();
  }
});
TS

CI=1 LCL_E2E_PORT=5187 pnpm exec playwright test \
  -c apps/mobile/playwright.config.ts \
  "$SPEC" \
  --workers=1 \
  --reporter=line

cleanup_spec
trap - EXIT
test -z "$(git status --porcelain)"
