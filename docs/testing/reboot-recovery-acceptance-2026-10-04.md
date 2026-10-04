# Controlled reboot recovery acceptance — 2026-10-04

Product baseline: `53fbbbe3c8f124c24d3bb7779e5be49315a94cc9` (`main`, after PR #85).

## Scope

This is a real-device Stage 9 stabilization check for a deliberate software reboot of the configured Shelly Plug S Gen3. It does not change application/runtime source and it is not claimed as a physical mains power-cycle test.

Device:

- canonical id: `shellyplugsg3-e4b063d7f530`;
- model: `S3PL-00112EU`;
- generation: 3;
- firmware: `20260311-095902/1.7.5-g9979d16` (`1.7.5`).

`Shelly.ListMethods` advertised `Shelly.Reboot`, so the test used the device-supported reboot RPC rather than assuming capability from model/firmware strings.

## Expected runtime contract

The generated Climate runtime initializes AUTO with no manual request, automation fault `st` and requested/final output OFF. On startup it calls `Switch.Set(false)` before starting the BLE scanner; the scanner begins after a one-second timer. Fresh usable BLE data may then clear `st` and allow the normal rule/arbitration pipeline to energize the relay.

History v2 independently records the boot decision. A boot record with flags `0`, reason `b` and automation fault `st` means requested OFF, final OFF, AUTO, no manual request and no safety lockout.

## Preflight

A read-only identity/capability/runtime preflight verified:

- exactly one managed script, id `1`, `Shelly Link Thermostat`, enabled and running;
- native schedule count `0`;
- runtime mode AUTO;
- no automation fault and no hard-safety lockout;
- humidity `69%` with the active humidifying thresholds `ON 70% / OFF 71%`;
- automation request ON and physical relay ON at about `16.4 W / 0.11 A`;
- device uptime about `208053 s`;
- script memory about `mem_used=5782 B`, `mem_free=19334 B`.

The first attempt to prepare the reboot test stopped before any mutation because one read-only `Script.GetCode` chunk timed out through the host VPN route. The test transport was then pinned to the local `en0` LAN interface; read-only operations may retry, but the reboot mutation is explicitly single-shot.

## Reboot execution

After canonical identity verification on the exact LAN locator, one and only one JSON-RPC request was sent:

```text
Shelly.Reboot
```

The reboot was never replayed. During the shutdown grace period the first read-only identity probe returned Shelly error `-109` with `shutting down in 959 ms`, which is direct evidence that the reboot request was accepted and the device had entered shutdown.

That observation exposed an over-strict test-harness condition (the shutdown response was initially treated as an identity mismatch), so all subsequent evidence was collected read-only without issuing another reboot.

## Read-only postflight

After the device returned, postflight verified:

- canonical id/model/generation/firmware unchanged;
- device uptime reset to `143 s`, proving a new boot relative to the `~208053 s` preflight;
- script id `1` still enabled and running;
- managed source still exactly `8847 B` with SHA-256 `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`;
- native schedules still empty;
- no hard-safety lockout;
- runtime returned to AUTO with no automation fault.

History v2 contained the expected boot-safe record at uptime `4 s`:

```text
[null, 4, null, null, null, 0, "b", "st", null, 0, 0]
```

The zero flags prove both requested and final relay output were OFF at the boot boundary; telemetry was `0 W / 0 A`.

Recovery then proceeded through fresh sensor input:

- uptime `10 s`: Temperature `24.9°C`, Humidity `65%`, final OFF, no automation fault;
- uptime `120 s`: flags `3` (`requested ON + final ON`), reason `bl`, no automation fault;
- uptime `143 s`: AUTO, Humidity `65%`, automation request ON, final relay ON, no safety lockout.

The final physical switch state was explicitly known: relay output ON, while instantaneous measured load was `0.0 W / 0.0 A`. This preserves the preflight AUTO ownership semantics rather than leaving the automation artificially paused after the test.

## Acceptance

Controlled `Shelly.Reboot` recovery on the configured Plug S Gen3 is accepted:

- boot boundary is independently recorded as safe OFF;
- uptime resets;
- canonical identity and firmware remain unchanged;
- the same managed script returns enabled/running without source replacement;
- schedules are unchanged;
- AUTO starts behind `st` and recovers only after fresh BLE input;
- normal rule output resumes after recovery;
- no hard-safety state is spuriously introduced.

This closes the deliberate **software reboot** item only. A true mains power-cycle remains separate evidence, as do Wi-Fi loss/recovery, BLE sensor-loss recovery, the wider AUTO/MANUAL + automation-fault + hard-safety matrix, materially longer soak and the final real-hardware matrix.
