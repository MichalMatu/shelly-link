# Dashboard status polish slice 1 acceptance — 2026-10-02

Accepted implementation head: `08a50db96f126e04dd509c246581939aabcde3d6` on `dashboard-status-polish`.

## Scope

This slice broadens the operational-status presentation language after Pulse V1 without changing Shelly execution ownership, RPC transport, polling cadence, persistence, generated scripts or hardware behavior.

- one shared presentation primitive owns the common `requested output -> final relay -> reason` row language used by Pulse and Steady Time;
- Pulse keeps its existing normalized read-only runtime model and adds phase/progress/fault/safety rows around that shared presentation primitive;
- Steady Time derives requested output only while the native schedule is running, using Shelly local time plus the existing `expectedRelayOnForClockTime()` domain helper; MANUAL/paused mode deliberately reports no automation request instead of inventing one;
- Steady Time dashboard/detail show requested output, physical relay and reason through the shared presentation language;
- Climate detail now prefers `automationRequestedRelayState` for the requested-output value, falling back to the previous diagnostic relay state for older snapshots;
- frozen Climate dashboard/detail visual geometry and row order remain unchanged. The accepted Climate golden snapshots were not modified.

## Acceptance evidence

On the accepted implementation line:

- focused shared-status/detail/dashboard tests passed;
- mobile TypeScript check passed;
- UX/repository/feature-boundary/self-test quality gates passed;
- the complete responsive Playwright suite passed **46/46** canonical cases;
- the exact completion code passed full `pnpm check`;
- frozen Climate golden UI remained byte-for-byte protected by the existing UX gate;
- only the intentional Steady Time dashboard/detail Darwin snapshots were refreshed for the new operational-status presentation.

Earlier transient failures were used as contract checks rather than accepted blindly: the first responsive run exposed a lost Climate detail flush border and intended dashboard snapshot deltas; a later UX gate rejected accidental regeneration of the frozen Climate goldens. The final implementation restored the frozen Climate markup/order and refreshed only Time visuals.

## Runtime and hardware impact

None. This is a mobile presentation/read-model slice. No generated Shelly runtime source, relay arbitration, Time schedule ownership, Pulse timing, safety precedence, lifecycle behavior, RPC method, persistence format or device mutation changed. Real-device requalification was therefore not repeated.

## Next slice

Continue Stage 7 by improving fault/safety legibility for the broader product without reopening frozen Climate card geometry casually. Prefer existing warning/footer/detail surfaces and existing authoritative diagnostics before introducing any new state owner or transport path.
