# Soak liveness stabilization acceptance — 2026-10-04

Implementation candidate: `ef2fc6303dc8cde981fe4191b782c307edad18e9` on `feat/stabilization-soak-report-20261004`.

## Scope

This slice improves stabilization observability without adding a heartbeat, timer or state owner to the Shelly production runtime. It adds a post-processor for the existing soak JSONL stream and a small pure liveness accumulator.

The report derives:

- device reboot count from meaningful uptime regression;
- longest all-endpoint outage window;
- longest `/diag` outage window;
- stopped-script sample count, longest confirmed stopped window and maximum consecutive stopped samples;
- maximum consecutive failed samples;
- first and last observed device uptime.

An unavailable `Script.GetStatus` sample is treated as unknown and does not falsely close a previously confirmed stopped-script window.

## Deterministic verification

The self-test covers healthy sampling, uptime-regression reboot detection, endpoint/diagnostic outage windows, stopped-script streaks, an outage still open at report finalization, unknown script state during an outage, malformed JSONL, regressing timestamps and empty input.

On the exact implementation candidate:

- `pnpm exec prettier --check` for the three tooling files passed;
- `pnpm exec tsx scripts/hardware/soak-liveness.selftest.ts` passed;
- `pnpm typecheck` passed;
- `pnpm quality:repo` passed, including 19 quality-gate self-tests;
- `git diff --check` passed and the worktree was clean.

The previously existing canonical visual failure for `04-plug-ble-discovery` was reproduced unchanged on clean `main` with exactly 5036 differing pixels. This tooling-only slice does not modify UI and does not refresh that snapshot.

## Real-device short liveness smoke

Device: configured Shelly Plug S Gen3 `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`, firmware `20260311-095902/1.7.5-g9979d16`.

The first Node/undici attempts never reached the device because the Mac host intermittently timed out opening TCP/80 while mDNS still resolved the Plug. Read-only `curl` identity checks then confirmed the same canonical Shelly identity, so the acceptance was repeated with a curl-based sampler that produced the same JSONL fields consumed by the new reporter. No mutating RPC was used.

Preflight required the production script to be running and the physical relay to be OFF. Twelve samples were then collected at approximately 5 s intervals over about 55 s. Every sample successfully read device status, script status, switch status and `/diag`.

Observed evidence:

- samples: **12/12 OK**;
- device uptime: **204425 s -> 204496 s**;
- detected reboots: **0**;
- maximum endpoint outage: **0 ms**;
- maximum `/diag` outage: **0 ms**;
- stopped-script samples: **0**;
- maximum confirmed stopped-script window: **0 ms**;
- maximum consecutive failed samples: **0**;
- maximum consecutive stopped-script samples: **0**;
- maximum `mem_used`: **5782 B**;
- maximum `mem_peak`: **10066 B**;
- minimum `mem_free`: **19334 B**.

Postflight re-verified the same canonical device identity, production script still running and physical relay still OFF. The smoke was read-only: no `Script.Eval`, `Script.Stop`, `Script.Start`, `Switch.Set`, schedule mutation, runtime replacement or configuration mutation was performed.

## Acceptance and remaining work

The short soak/liveness-observability slice is accepted. It provides repeatable evidence for reboot/liveness/outage detection and script-memory headroom without changing automation semantics or runtime size.

This does **not** complete Stage 9. Remaining stabilization still includes deliberate reboot/power-cycle recovery, Wi-Fi/BLE loss and recovery, the full AUTO/MANUAL + automation-fault + hard-safety interaction matrix, Pulse recovery/cancellation requalification where needed, a materially longer soak, the final real-hardware matrix and final release qualification.
