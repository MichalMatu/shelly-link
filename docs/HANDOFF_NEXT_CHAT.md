# Handoff — clean main after History + Runtime Safety

Status: **2026-09-30 — History/Datalogger and Runtime Safety Supervisor are implemented, merged and hardware-accepted. Start new product work from fresh `main`.**

Repository: `MichalMatu/shelly-link`

## Bootstrap

1. Verify remote `main`, the Local Agent daemon and conversation binding.
2. Verify there is no duplicate active task for this repository.
3. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.
4. Create a fresh work branch from current `main`; do not reuse completed feature branches.

Current code and canonical docs are the source of truth. Local Agent bindings are conversation-scoped runtime state and must never be copied into repository documentation.

## Current product baseline

- History/Datalogger landed through PR #47.
- Runtime Safety foundation landed through PR #48.
- Native Shelly protection latching landed through PR #49; product merge commit is `f891404907f4a7b967b8816c8a5c206e8960a3bf`.
- Later docs-only commits may move `main`; always verify refs before work.
- Frozen Climate UI/UX contracts remain unchanged by the runtime work.

History is a compact Plug-owned KVS ring inside the Climate runtime. Reads are typed and on-demand; history failure does not affect relay arbitration.

Runtime safety is a separate hard-safety axis above AUTO/MANUAL. Maximum continuous ON and relay-control failures latch OFF. Native Shelly switch protection errors are latched immediately, with boot/periodic polling fallback and first-fault-wins semantics. Deliberate reset remains safe OFF. Plug S Gen3 electrical/thermal ceilings stay firmware-owned; do not add guessed duplicate power/current/temperature thresholds.

## Real-device safety acceptance

On Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5:

- native config reports 2500 W power limit, 12 A current limit and 280 V voltage limit;
- temporary current runtime physically exercised relay ON -> max-ON lockout -> OFF;
- the native status-handler path and first-fault-wins behavior were exercised without inducing a real hardware fault;
- the original installed 0.6.0 runtime was restored byte-identical;
- final relay state was explicitly verified OFF.

See `docs/testing/hardware-matrix.md` for durable evidence.

## Frozen runtime contracts

- phone configures/manages/diagnoses; Shelly executes locally;
- one managed automation owner per Plug relay;
- Climate user modes are only AUTO/MANUAL;
- MANUAL entry is safe OFF; relay ON/OFF is explicit and manual-only;
- AUTO entry is safe OFF and requires fresh usable data;
- stale/unusable sensor data fails OFF in AUTO;
- hard safety overrides AUTO and MANUAL;
- hard safety is latched and requires deliberate recovery;
- managed Climate state changes through the runtime owner, not presentation-layer raw relay RPC;
- destructive/runtime mutation verifies physical identity first;
- hardware tests that mutate relay state finish with an explicit known final state.

## Next slice

The next roadmap slice is **Rule/action expansion**.

Start with a preimplementation audit from fresh `main`, with no behavior change. Define ownership and the smallest reusable action/timing model for Set ON/OFF, Pulse, minimum ON/OFF, cooldown, debounce, time windows, scheduled conditions and small explicit AND/OR composition. Every requested action must still pass through the existing final relay arbiter and hard-safety supervisor.

Do not redesign dashboard status or UX in this slice; those remain later roadmap stages.

## Working rule

Use small cohesive slices, focused regressions during iteration and exactly one final full repository gate before merge. Use real-device evidence for hardware-facing behavior and always leave relay state explicit and known after mutating hardware tests.
