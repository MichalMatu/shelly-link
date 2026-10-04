# Runtime recovery interaction matrix acceptance — 2026-10-04

Implementation candidate: `2c0454922156d1b2f20797949aab2f48939d68cf` on `feat/stabilization-recovery-matrix-20261004`.

## Scope

This Stage 9 slice qualifies the existing Climate runtime arbitration contract across the independent AUTO/MANUAL, automation-fault, manual-request and hard-safety axes. It does not add a new runtime state, recovery path or relay owner.

The authoritative precedence remains:

1. hard safety lockout -> OFF;
2. MANUAL -> explicit manual request;
3. AUTO + automation fault -> OFF;
4. AUTO -> automation request.

Hard-safety reset is deliberately safe OFF. It clears the manual request and safety latch. MANUAL keeps any independent automation fault visible because that fault does not revoke explicit MANUAL control. AUTO is forced to stale automation fault `st` after safety reset and must receive fresh usable automation input before it may energize again.

## Qualified interaction matrix

| Mode   | Automation fault | Hard safety | Expected relay/control behavior                                                                                    | Evidence                                   |
| ------ | ---------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| AUTO   | no               | no          | automation request owns output                                                                                     | existing generated-runtime control tests   |
| AUTO   | yes              | no          | forced OFF until fresh usable input                                                                                | stale/fault AUTO coverage                  |
| AUTO   | no/yes           | yes         | hard safety wins and forces OFF                                                                                    | hard-safety and native-protection coverage |
| AUTO   | yes              | reset       | remains OFF with `st`; fresh usable input is required before AUTO can energize                                     | new cross-axis recovery test               |
| MANUAL | no               | no          | explicit manual OFF/ON request owns output                                                                         | MANUAL control coverage                    |
| MANUAL | yes              | no          | automation fault remains visible but does not revoke explicit MANUAL control                                       | sensor-fault-in-MANUAL coverage            |
| MANUAL | no/yes           | yes         | hard safety wins, relay OFF, manual ON rejected                                                                    | hard-safety MANUAL coverage                |
| MANUAL | yes              | reset       | reset clears manual request and safety, preserves automation fault, stays OFF; later explicit MANUAL ON is allowed | new cross-axis recovery test               |

The two new tests close the only uncovered intersections found by the Stage 9 audit:

- automation fault + MANUAL + hard safety -> reset safety;
- automation fault + AUTO + hard safety -> reset safety -> fresh input.

They exercise the generated runtime, not a reimplemented model.

## Deterministic verification

The preimplementation audit on fresh `main` `53fbbbe3c8f124c24d3bb7779e5be49315a94cc9` first requalified the existing baseline:

- script-generator recovery/runtime set: **53/53 tests passed** across five files;
- mobile recovery/control set: **44/44 tests passed** across five files.

After adding the two missing cross-axis cases on candidate `2c0454922156d1b2f20797949aab2f48939d68cf`:

- `manual-runtime.test.ts` + `runtime-protocol.test.ts`: **19/19 passed**;
- `runtimeControl.test.ts` + `healthRecovery.test.ts`: **16/16 passed**;
- `pnpm typecheck`: PASS;
- `pnpm quality:repo`: PASS, including all 19 quality-gate self-tests;
- `git diff --check`: PASS.

No production source changed in this slice; the implementation already matched the architecture contract.

## Hardware evidence boundary

No new physical-device mutation was required or claimed for this test-only qualification. Existing dated Plug S Gen3 safety-supervisor evidence already proves physical hard-safety OFF behavior, native protection latching and explicit final OFF. The final Stage 9 hardware matrix remains responsible for device-level recovery requalification.

This slice does not authorize or claim deliberate Shelly reboot/power-cycle or Wi-Fi/BLE disruption testing.

## Acceptance and remaining work

The deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix is qualified. Remaining Stage 9 work is now concentrated on deliberate real-device reboot/power-cycle recovery, Wi-Fi/BLE loss and recovery, a materially longer soak, the final real-hardware matrix and release qualification.
