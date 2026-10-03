#!/bin/sh
set -eu

test "$(git rev-parse HEAD)" = "3c34fe331cef46fdbcbcac70bc534184402fa748"

cat > /tmp/minimum-on-preflight.ts <<'TS'
import { createHash } from 'node:crypto';
import {
  FetchShellyRpcTransport,
  RPC_METHODS,
  RpcShellyClient,
  climateRuntimeControlStateEvalCode
} from '@lcl/shelly-client';

const baseUrl = 'http://192.168.0.10';
const expectedId = 'shellyplugsg3-e4b063d7f530';
const transport = new FetchShellyRpcTransport(baseUrl);
const client = new RpcShellyClient(transport, { mutationDelayMs: 0 });

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const info = unwrap(await client.getDeviceInfo());
if ((info.id ?? '').toLowerCase() !== expectedId) {
  throw new Error(`Identity mismatch: ${info.id ?? '<missing>'}`);
}

const list = unwrap(
  await transport.call<Array<{ id: number; name: string; enable: boolean; running: boolean }>>({
    method: RPC_METHODS.ScriptList
  })
);
if (list.length !== 1) throw new Error(`Expected exactly one production script, found ${list.length}.`);
const production = list[0]!;
if (!production.running) throw new Error('Production script is not running.');

const codeResponse = unwrap(
  await transport.call<{ data?: string; left?: number }>({
    method: RPC_METHODS.ScriptGetCode,
    params: { id: production.id }
  })
);
let code = codeResponse.data ?? '';
let left = codeResponse.left ?? 0;
let offset = Buffer.byteLength(code, 'utf8');
while (left > 0) {
  const next = unwrap(
    await transport.call<{ data?: string; left?: number }>({
      method: RPC_METHODS.ScriptGetCode,
      params: { id: production.id, offset }
    })
  );
  const chunk = next.data ?? '';
  code += chunk;
  offset += Buffer.byteLength(chunk, 'utf8');
  left = next.left ?? 0;
}
if (!code.includes('// m: climate-engine-v1')) throw new Error('Production script is not Climate runtime.');

const controlRaw = unwrap(await client.evaluateScript(production.id, climateRuntimeControlStateEvalCode));
if (!controlRaw) throw new Error('Production runtime did not expose control state.');
const control = JSON.parse(controlRaw) as unknown;
if (!Array.isArray(control) || control.length !== 5) throw new Error('Unexpected control-state shape.');
if (control[3] === 1) throw new Error(`Production runtime is safety-locked: ${JSON.stringify(control)}`);

const switchStatus = unwrap(
  await transport.call<Record<string, unknown>>({
    method: RPC_METHODS.SwitchGetStatus,
    params: { id: 0 }
  })
);

const scriptStatus = unwrap(
  await transport.call<Record<string, unknown>>({
    method: RPC_METHODS.ScriptGetStatus,
    params: { id: production.id }
  })
);

console.log(
  JSON.stringify(
    {
      device: { id: info.id, model: info.model, gen: info.gen },
      production: {
        id: production.id,
        name: production.name,
        enabled: production.enable,
        running: production.running,
        bytes: Buffer.byteLength(code, 'utf8'),
        sha256: createHash('sha256').update(code).digest('hex'),
        status: scriptStatus
      },
      control,
      switch: switchStatus
    },
    null,
    2
  )
);
TS

pnpm exec tsx /tmp/minimum-on-preflight.ts
rm -f /tmp/minimum-on-preflight.ts
