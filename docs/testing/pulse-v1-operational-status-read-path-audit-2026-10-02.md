# Pulse V1 operational status read-path audit — 2026-10-02

Status: **pre-implementation audit complete; no runtime behavior changed.**

Repository: `MichalMatu/shelly-link`

Audited baseline: `pulse-v1-shared-ui` at `cd0a335e65ff1c0f0a58340704e7192bdee458c6`.

## Purpose

Define the smallest safe data path for the final Pulse V1 dashboard/detail phase/progress/status slice without moving timer ownership into React and without reopening already-qualified runtime behavior.

## Findings

### Climate + Pulse

The qualified Climate runtime already exposes the operational Pulse state required by the UI through the existing diagnostic read path. The useful fields are:

- `phase`;
- `cyclesCompleted`;
- `nextTransitionUptimeMs`;
- `lastReason`.

The remaining UI work should consume and normalize those existing diagnostic values. No additional Climate timer, persisted phase state, or generated-script behavior is required for status presentation.

### Time + Pulse

The qualified Time + Pulse runtime already keeps the equivalent transient state inside the generated runtime:

- `R.ps` — current Pulse phase/state;
- `R.pc` — completed-cycle count;
- `R.pn` — next transition deadline in uptime milliseconds;
- `R.rs` — latest Pulse reason/state reason.

The app can read those values through the existing `Script.Eval` transport pattern. A read-only status adapter/protocol is sufficient; the generated Time + Pulse script does not need to change merely to expose dashboard/detail status.

### Standalone Pulse

Standalone Pulse embeds the same shared Pulse-cycle engine and retains the same transient runtime state (`R.ps`, `R.pc`, `R.pn`, `R.rs`). The app can use the same read-only `Script.Eval` status protocol/normalization as Time + Pulse.

No new persisted in-flight timer state is required. Restart semantics remain the already-qualified safe-OFF + fresh-cycle behavior.

## Durable implementation constraint

The operational-status slice is presentation/read-path work unless a concrete failing test proves otherwise.

Do **not** modify generated Pulse scripts, timing ownership, install/lifecycle behavior, safety precedence, restart semantics, or persistence merely to expose phase/progress/status. React may derive display values such as remaining time from device-reported uptime/deadline data, but React must never become the timer owner.

Any later runtime change requires an explicit reason and requalification proportional to the behavior changed.

## Recommended implementation order

1. Define one normalized read-only Pulse operational-status model for Climate, Time and standalone Pulse.
2. Reuse the Climate diagnostic data path for Climate + Pulse.
3. Add the smallest typed `Script.Eval` read adapter for Time + Pulse and standalone Pulse using the existing transient runtime fields.
4. Integrate Pulse phase/progress/reason into the existing dashboard/detail requested-output, final-output, automation-fault and hard-safety language rather than creating a separate diagnostics island.
5. Cover normalization, unavailable/stale/read-failure behavior and cross-mode UI presentation with focused tests.
6. Run responsive/visual acceptance for the resulting status presentation.
7. Repeat generated-size or real-device runtime qualification only if implementation actually changes generated runtime or hardware behavior.

## Non-goals

This audit does not qualify a status UI implementation. It does not change runtime scripts, relay behavior, schedules, timers, persistence, safety, lifecycle or hardware state. Pulse V1 remains incomplete until the operational dashboard/detail status slice and its acceptance are finished.
