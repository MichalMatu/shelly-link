# BLE scanner watchdog sensor-silence acceptance — 2026-10-04

Tested product candidate: `d291a42d175972d01836f2fdf0cb9d88e91792c0` on `fix/scanner-watchdog-sensor-loss-20261004` (PR #89).

After the hardware gate, current `main` was merged into the branch as documentation-only commit `9df54eaa28fcfec1921fda2b7eea99fe6e361a07`. The four PR #89 implementation/test files were verified byte-identical to the tested product candidate.

## Scope

PR #89 fixes the Climate runtime BLE scanner watchdog so silence from the configured sensor does not restart a scanner that is still running. Scanner recovery now checks `BLE.Scanner.isRunning()` / `BLE.Scanner.IsRunning()` and calls scanner start only when liveness reports `false`.

The hardware gate targets the regression condition directly: no accepted frames from the configured sensor while the physical BLE scanner remains live. Sensor-frame loss was injected on the real Plug by temporarily replacing the configured target address with an impossible address. This is a real-device no-target-frame test, not a claim that the sensor was physically RF-shielded or powered off.

## Hardware

- controller/output: Shelly Plug S Gen3 `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`;
- firmware: `1.7.5` (`20260311-095902/1.7.5-g9979d16`);
- configured sensor: `F75F8D0F7620` (`GrowBox`);
- host transport: local LAN via `en0`.

Firmware probing on the real Plug confirmed `BLE.Scanner.isRunning()` exists and returned `true` while the scanner was healthy.

## Exact deployed runtime

Known pre-test source:

- bytes: `8847`;
- SHA-256: `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`.

PR #89 candidate source deployed for the gate:

- bytes: `8914`;
- SHA-256: `46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef`;
- delta: `+67 B`;
- one watchdog-block replacement only;
- contains scanner-liveness watchdog;
- does not contain the old `nw()-(R.l||R.sa)>9e4` sensor-silence restart trigger.

The source form matched the alias-minified PR #89 snapshot (`return Q`, `===G`, `===F`) and was written through byte-safe JSON POST RPC with SHA verification before start.

## Acceptance sequence

Baseline on the exact candidate:

- script running with no errors;
- scanner liveness `true`;
- fresh sensor data present;
- AUTO active;
- no automation fault or hard-safety latch;
- scanner start marker `R.sa = 28792297`;
- target-frame marker `R.l = 29059426`.

Sensor-frame silence window:

- target address changed to `000000000000`;
- window duration: **145.0 s**;
- 22 hardware samples;
- maximum observed sample gap: **9.5 s**;
- the legacy 90 s watchdog threshold was crossed;
- `BLE.Scanner.isRunning()` remained `true` throughout;
- `R.sa` stayed exactly `28792297 -> 28792297` (no scanner restart);
- `R.l` stayed exactly `29059426 -> 29059426` (no accepted target frames);
- script stayed running with no reported exception/error;
- device uptime did not regress;
- no hard-safety latch appeared.

Stale/fail-safe behavior:

- configured stale timeout: **120 s**;
- automation fault changed to `st`;
- runtime/final relay state changed to OFF;
- physical `Switch.GetStatus.output` was `false` at 0 W / 0 A;
- scanner remained running and `R.sa` still did not change after stale/OFF.

Recovery:

- original sensor address `F75F8D0F7620` restored;
- scanner remained running without restart;
- a fresh target frame advanced `R.l` from `29059426` to `29218004`;
- sensor age returned below 1 s in the accepted recovery sample;
- automation fault cleared automatically;
- AUTO resumed without manual intervention;
- script remained running with no reported errors;
- final output matched current AUTO arbitration.

## Result

**PASS.** Sensor silence does not restart the healthy BLE scanner, stale data still fails safe OFF, and fresh BLE data restores AUTO automatically when the sensor returns.

The hardware evidence is tied to product candidate `d291a42d175972d01836f2fdf0cb9d88e91792c0` and deployed runtime SHA-256 `46446a0405aa310979fd65d0d4a3fff4479b8efba2b799d8528e264a13ceb0ef`.

## Test-harness transport note

Two earlier preparation attempts exposed a harness-only RPC encoding problem: `Script.PutCode` sent through GET query parameters converted spaces to literal `+`, producing an invalid script. The exact previous runtime was restored byte-for-byte through JSON POST before the accepted gate. A separate transient LAN connection timeout occurred before one retry mutation; readback proved the candidate/runtime state was unchanged. The accepted gate used byte-safe JSON POST for idempotent test mutation and bounded read retries, and completed without scanner/runtime errors.
