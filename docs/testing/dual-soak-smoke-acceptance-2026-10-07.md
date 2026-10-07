# Dual Shelly soak smoke acceptance — 2026-10-07

## Scope

Preflight for the final 8-hour V1 soak using the two real Plug S Gen3 devices and their real connected loads.

- `192.168.0.10` / `shellyplugsg3-e4b063d7f530`: humidifier, existing Climate runtime.
- `192.168.0.17` / `shellyplugsg3-e4b063e3e298`: fan, existing Standalone Pulse runtime.

IP addresses are temporary transport locators; canonical Shelly ids are the identity boundary.

The fan runtime was decoded read-only before the smoke and confirmed as `standalone-pulse-v1`, configured for 60 s ON / 100 s OFF continuous execution. It started the smoke stopped and was returned to stopped state afterward. No script source was replaced.

## Tooling

The soak logger now supports runtimes without an HTTP `/diag` endpoint while preserving the previous default of requiring `/diag` for Climate. Script-stop and final-OFF cleanup are independent of threshold-cycling mode, allowing the same logger to observe Standalone Pulse safely.

`scripts/hardware/shelly-dual-soak.sh` runs the two devices in parallel, verifies canonical identity and expected starting runtime state, records separate JSONL/summary streams, enforces an OFF boundary on both devices, and restores the humidifier runtime to its preflight running state only after that OFF boundary is accepted.

## Five-minute real-load smoke

Exact harness head: `8a230c30c1ed9571f0aeb4c67198cb03b1cf2fc9`.

Duration: 5 minutes. Sampling: 5 seconds.

Humidifier / Climate:

- 52/52 samples OK;
- 0 RPC failures, 0 `/diag` failures, 0 stopped-script samples;
- fresh BLE measurement in every sample;
- 4 threshold-cycle requests, 0 cycle errors;
- 3 real relay state changes;
- load observed up to 12.9 W / 0.084 A;
- Plug temperature 45.0–45.2 C;
- `mem_used` max 6202 B, `mem_peak` max 10710 B, `mem_free` min 18970 B;
- final test boundary: script stopped and relay OFF;
- original Climate runtime then restored to running.

Fan / Standalone Pulse:

- 57/57 samples OK;
- 0 RPC failures and 0 stopped-script samples while under test;
- 3 real relay state changes;
- load observed up to 4.6 W / 0.044 A;
- Plug temperature 42.2–43.2 C;
- `mem_used` max 2100 B, `mem_peak` max 4914 B, `mem_free` min 23086 B;
- final test boundary: script stopped and relay OFF;
- original preflight state preserved: Pulse remains stopped.

Both physical loads were therefore proven present; this was not relay-only simulation.

## Result and 8-hour plan

**PASS.** The dual-device harness is ready for the final 8-hour V1 soak.

The overnight profile keeps 5-second sampling. The humidifier Climate threshold phase changes are reduced to a 10-minute period with an 11-minute test max-ON guard. The fan uses its existing 60 s ON / 100 s OFF Standalone Pulse runtime without source replacement.

The 8-hour run remains the release blocker and is not completed by this smoke.
