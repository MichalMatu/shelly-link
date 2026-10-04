# Software reboot recovery acceptance — 2026-10-04

Qualified baseline: `53fbbbe3c8f124c24d3bb7779e5be49315a94cc9` (`main`, PR #85 merge).

## Scope

This Stage 9 slice qualifies **deliberate software reboot recovery** on the real Shelly Plug S Gen3 production runtime. It does not claim a physical mains power-cycle.

The acceptance verifies that a one-shot `Shelly.Reboot` does not require a phone/cloud timing owner, does not replace or rewrite the managed script, preserves canonical device identity and native schedule state, starts from the runtime's safe-OFF boot path, and recovers the existing AUTO automation afterward.

Device under test:

- canonical identity: `shellyplugsg3-e4b063d7f530`;
- model: `S3PL-00112EU`;
- generation: 3;
- firmware: `20260311-095902/1.7.5-g9979d16`;
- managed script id/name: `1` / `Shelly Link Thermostat`;
- production source fingerprint: **8847 B**, SHA-256 `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`.

## Mutation and observation contract

The device identity was verified on the exact HTTP locator before the mutation. The harness sent `Shelly.Reboot` exactly once and never replayed the mutating RPC.

The first post-command identity read returned Shelly's transient shutdown response:

```text
code: -109
message: shutting down in 959 ms
```

That response is an expected reboot transition, not an identity mismatch. The initial observer therefore stopped early before transport-offline/reconnect timing could be recorded. The reboot itself had already been issued.

A separate read-only postflight then inspected the rebooted device without changing runtime configuration or relay state.

## Real-device recovery evidence

The read-only postflight observed:

- device uptime **143 s**, proving a recent reboot;
- the same canonical identity, model, generation and firmware;
- exactly one managed script, still `enable=true` and `running=true`;
- `Script.GetStatus.running=true`;
- the production source still **8847 B** with the exact same SHA-256;
- native schedule count still **0**;
- recovered control mode **AUTO**;
- hard-safety lockout **false**;
- a recent History record with reason `b`, data-state `st` and relay flag OFF, proving the runtime's boot-safe-OFF path executed after the reboot.

At postflight the runtime had subsequently returned the relay request to ON because the recovered automation state was healthy and `automationRequestOn=true`. The observed diagnostic state was:

- final relay: ON;
- runtime relay: ON;
- control mode: AUTO;
- automation request: ON;
- manual request: OFF;
- automation fault: none;
- hard-safety lockout: false;
- reason: `bl`;
- temperature: about 25 °C;
- humidity: about 65%.

This is the expected contract: **boot starts safe OFF; after local runtime state and fresh automation input recover, AUTO may legitimately request ON again.** Final-OFF is therefore not a valid general reboot-recovery requirement.

A later guard-only retry intentionally refused to send another reboot because the recovered automation had already returned the relay to ON. That refusal caused no mutation and is not a product failure; it helped confirm that requiring pre-reboot/final relay OFF would incorrectly reject healthy AUTO behavior.

## Acceptance

The real Plug S Gen3 software-reboot slice is accepted for the current production runtime:

- one deliberate software reboot occurred;
- canonical identity and firmware were preserved;
- script identity, enable/running state and exact source fingerprint were preserved;
- schedule state was preserved;
- boot-safe-OFF was recorded by the runtime history;
- AUTO recovered without an automation fault or hard-safety latch;
- the runtime subsequently resumed its legitimate automation request locally.

No production code changed for this acceptance.

## Remaining Stage 9 work

This document does **not** qualify a physical mains power-cycle. Remaining stabilization still includes:

- deliberate physical power-cycle recovery when controllable hardware evidence is available;
- Wi-Fi loss/recovery;
- BLE sensor loss/recovery;
- the complete AUTO/MANUAL + automation-fault + hard-safety interaction matrix;
- Pulse recovery/cancellation requalification where needed;
- a materially longer soak;
- the final real-hardware matrix and release qualification.
