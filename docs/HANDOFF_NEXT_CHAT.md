# Handoff — post-History shared-plot baseline

Status: **2026-10-01 — the screenshot-driven History chart UX refinement is implemented, responsively qualified and accepted on Samsung S22+ / Android 16. The next product slice is Dashboard status polish.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; never reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. Start from the qualified shared-plot History baseline. Do not reopen History runtime/KVS/`HistoryRecord[]` without concrete evidence of a data-model limitation.

Durable remote branches after closeout should remain only:

- `main` — development source of truth;
- `agent-control` — Local Agent control plane;
- `golden/climate-ui-20260928` — frozen visual recovery/reference branch.

## Accepted History baseline

History remains one read-only presentation over the existing Climate History v2 foundation:

- History v2 runs inside the single managed Climate runtime and stores records in the namespaced/versioned `shellylink.history.*` KVS ring;
- the mobile read path and `HistoryRecord[]` contract are unchanged;
- History writes remain observational and failure-isolated from relay/safety arbitration;
- loading, retry, empty and partial-corruption handling remain explicit;
- no History presentation component owns Shelly transport, BLE, KVS or durable storage side effects.

The accepted chart UX now has:

- one shared Nivo time plot with every available series visible by default;
- a compact two-row/wrapping legend that toggles each series independently instead of acting as a radio selector;
- stable series colors for Temperature, Humidity, VPD, Output, Power and Current;
- per-series semantic domains normalized only for plot coordinates, with real values and units preserved in legend/tooltips and no misleading numeric shared Y axis;
- meaningful minimum spans/padding so tiny temperature/RH noise no longer fills the plot; Power and Current use zero-aware baselines;
- Output rendered as a subdued step/state track in the same plot rather than a competing continuous line;
- truthful elapsed-time x positions with timestamp -> monotonic uptime -> record-sequence fallback; timestamp/uptime ticks are generated from the x-domain rather than sampled record indexes;
- a shared crosshair tooltip reporting every currently visible series at the same record/time plus AUTO/MANUAL and relay state;
- dark-mode/design-token styling and no horizontal page overflow.

Implementation remains local to `apps/mobile/src/features/automations/components/`. The chart coordinator was kept below the repository growth gate by separating concrete responsibilities into `ClimateHistoryChartLegend.tsx`, `ClimateHistoryOutputTrack.tsx`, `climateHistoryChartMetrics.ts`, `climateHistoryChartScale.ts` and the existing axis module rather than raising a hotspot budget.

## Qualification evidence

Focused qualification on the final candidate passed:

- focused ESLint;
- focused History Vitest: 3 files / 13 tests;
- mobile typecheck;
- full repository quality gates;
- canonical visual update + re-verification: 4/4;
- responsive History acceptance at `360x800`, `390x844` and `412x915`: 3/3.

Samsung SM-S906B / Android 16 acceptance used exact candidate `5e281c09fc8ee46d8a645aacd30eb5cd5174fd1c`, installed with `adb install -r` while preserving existing app data. The WebView viewport was 411x848 CSS px at DPR 2.625 with `scrollWidth == clientWidth == 411`. The compact legend was 88 px high and the shared plot was about 378.5x543 px. Temperature, Humidity, Output, Power and Current were all visible by default; VPD was absent from the stored records and correctly omitted. Toggling Power hid only Power while Temperature stayed visible, then restored Power. The shared tooltip reported all five visible values for one timestamp, and the Output state track was present. X-axis labels stayed at three or fewer with no overlap. No Shelly runtime, KVS, schedule or relay mutation was performed.

## Next slice — Dashboard status polish

Improve the operational status layer without casually changing the accepted shared card geometry. Requested output, final relay output, reason, automation-fault state and hard-safety state should be understandable at a glance while keeping the product calm and data-first. Technical transport/script/firmware detail stays under Device / Info / Advanced.

Run the normal architecture/UX gate before implementation. Keep runtime behavior unchanged unless the status UI exposes a real missing-data limitation.

## Performance rule

The MacBook Air M1 / 8 GB remains the current Local Agent host. `docs/PERFORMANCE_HANDOFF.md` pauses a fresh performance/concurrency/cache campaign until the M1 Pro / 32 GB host is available. Run only one heavy build/test workload at a time.

## Verification rule

Use the normal repository loop: architecture/UX gate -> smallest cohesive implementation -> focused checks -> responsive/visual evidence when geometry changes -> real-device evidence when relevant -> exactly one final full `pnpm check` on the exact merged `main` -> cleanup temporary branches/artifacts. If real Shelly runtime is touched, use identity-first access and finish with explicitly verified relay OFF.
