# Physical mains power-cycle recovery acceptance — 2026-10-06

Product baseline: `b7c77e435110e23a1b01a3f017793534b68befc0` (`main`, after PR #91).

## Scope

This is the real-device Stage 9 acceptance for a true physical mains interruption of the configured Shelly Plug S Gen3. It is intentionally distinct from the previously accepted `Shelly.Reboot` software-reboot gate.

No production source, runtime configuration, schedules or automation settings were changed for this test.

Device:

- canonical id: `shellyplugsg3-e4b063d7f530`;
- model: `S3PL-00112EU`;
- generation: 3;
- firmware: `20260311-095902/1.7.5-g9979d16` (`1.7.5`).

## Preflight

Immediately before the physical interruption, read-only evidence established:

- device uptime: `163508 s`;
- exactly one managed script, id `1`, `Shelly Link Thermostat`, enabled and running;
- managed source: `8962 B`;
- managed source SHA-256: `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e`;
- native schedule count: `0`;
- runtime in AUTO;
- no automation fault;
- no hard-safety lockout;
- physical relay OFF at `0.0 W / 0.0 A`.

The operator then physically disconnected the Plug from mains, waited several seconds, reconnected it and confirmed that it returned to Wi-Fi. No `Shelly.Reboot` RPC was used.

## Postflight

Read-only postflight on the recovered device verified:

- canonical identity, model, generation and firmware unchanged;
- uptime reset from `163508 s` to `98 s`, proving a new physical boot;
- script id `1` returned enabled and running;
- managed source remained byte-identical at `8962 B`;
- source SHA-256 remained `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e`;
- native schedules remained empty;
- runtime returned to AUTO;
- no automation fault remained after fresh BLE input;
- no hard-safety lockout was introduced;
- final physical relay state was explicitly verified OFF at `0.0 W / 0.0 A`.

History v2 independently recorded the safe boot boundary at uptime `3 s`:

```text
[null, 3, null, null, null, 0, "b", "st", null, 0, 0]
```

Flags `0` with reason `b` and automation fault `st` prove that requested and final output were OFF at boot. By uptime `11 s`, fresh sensor data had been accepted and the runtime was back in normal AUTO operation without an automation fault.

## Acceptance

Physical mains power-cycle recovery is accepted on the configured Plug S Gen3:

- boot begins safe OFF;
- device uptime resets;
- the same managed source returns enabled/running without replacement;
- native schedules are unchanged;
- AUTO does not inherit an unsafe stale output across the power interruption;
- fresh BLE input restores normal runtime operation;
- no spurious hard-safety lockout is introduced;
- final relay state is explicitly known and OFF.

This closes the physical mains power-cycle Stage 9 gate.

Remaining blockers before V1 freeze are:

1. real Wi-Fi loss/recovery qualification;
2. the materially longer 8-hour soak;
3. final real-hardware matrix;
4. final release qualification.

The Wi-Fi gate and 8-hour soak were explicitly deferred on 2026-10-06 because the required network interruption and endurance window were not available at this checkpoint. Physical RF shielding / sensor disappearance is optional additional evidence, not a separate V1 blocker after PR #89 and PR #91.
