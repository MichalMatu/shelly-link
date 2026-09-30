# Handoff — History charts UX refinement

Status: **2026-10-01 — chart-first History v1 is merged and qualified; the next slice is a presentation-only UX refinement driven by real-phone screenshots and the product-owner corrections below.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; never reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. The user will attach screenshots of the current History UI at the start of the next chat. Treat those screenshots as the primary visual evidence and compare them against the implementation before changing code.
6. Start from the qualified chart-first History baseline. Do not reopen storage/runtime/KVS or rewrite History v2 without new evidence of a data-model limitation.

## Accepted baseline

The History/Datalogger foundation is complete:

- History v2 runs inside the single managed Climate runtime;
- records live in the namespaced/versioned `shellylink.history.*` KVS ring;
- History writes are observational and failure-isolated from relay/safety arbitration;
- the mobile side has a typed read path and `HistoryRecord[]` model;
- Climate Detail has a chart-first History surface with loading, retry, empty and partial-corruption handling;
- runtime/KVS ownership, recovery, config/decode symmetry and mutation retry semantics are not part of the next UX slice.

Durable remote branches after closeout should remain only:

- `main` — development source of truth;
- `agent-control` — Local Agent control plane;
- `golden/climate-ui-20260928` — frozen visual recovery/reference branch.

## Current implementation baseline

The merged chart slice uses `@nivo/line` and currently has:

- one large Nivo plot;
- a compact metric grid above the plot;
- one active metric at a time;
- temperature, humidity, VPD, relay output, power and current definitions with stable colors;
- truthful x-axis fallback: complete timestamp -> monotonic uptime -> record sequence;
- tooltip with selected value, AUTO/MANUAL and relay state;
- no raw Shelly transport, BLE, storage or KVS side effects in the presentation components.

The implementation is intentionally local to the automations feature:

- `apps/mobile/src/features/automations/components/ClimateHistoryChart.tsx`
- `apps/mobile/src/features/automations/components/ClimateHistoryChart.css`
- `apps/mobile/src/features/automations/components/ClimateHistorySection.tsx`
- `apps/mobile/src/features/automations/components/ClimateHistorySection.css`
- `apps/mobile/src/features/automations/components/climateHistoryChartAxis.ts`
- focused tests beside those files.

Final handoff audit found no actionable `TODO` / `FIXME` / `HACK`, no explicit `any` escape and no presentation-side fetch/Shelly/KVS/BLE/storage ownership. Focused ESLint, tests and mobile typecheck passed on the merged product baseline.

## Product-owner corrections for the next slice

These are explicit requirements and supersede the current one-metric-at-a-time interaction:

1. **All History metrics belong to one shared plot.** Do not replace the large plot when the user changes a metric.
2. **The legend controls visibility.** Tapping a legend item shows/hides that series. It is not a radio selector. Preserve a stable color identity for every metric.
3. **The plot remains the dominant surface.** No explanatory cards, paragraphs or duplicated summaries around it. Keep the Apple/data-first direction: dense data, quiet chrome, useful interaction only.
4. **Crosshair/tooltip should report all currently visible series at the same x/time**, with their real units and values.
5. **Do not put raw values with incompatible units on one physical y-scale and pretend they are comparable.** Temperature °C, humidity %, VPD kPa, power W and current A need independent visual domains while sharing the same plot/time axis. Absolute values remain visible in legend/tooltip.
6. **Fix exaggerated y movement.** The current automatic `min/max` can make tiny variation fill the full chart height. Introduce explicit per-metric domain policy with padding and a meaningful minimum span so small noise looks small.
7. Suggested minimum-span starting points for screenshot-driven tuning, not immutable constants:
   - temperature: at least about 2 °C visible span;
   - humidity: at least about 10 percentage points;
   - VPD: at least about 0.4–0.5 kPa;
   - power/current: include a meaningful zero/baseline policy and avoid amplifying near-zero noise;
   - output: fixed binary 0/1 semantics.
8. **Fix x-axis visual rhythm.** Data positions must continue to reflect real elapsed time, but tick generation should come from the x-domain/time range rather than record-index sampling when timestamp/uptime mode is available. Irregular event spacing must stay truthful without producing awkward labels.
9. **Relay output should not visually dominate continuous sensor series.** Prefer a subtle step/state track, band or equivalent presentation inside the same chart surface rather than a competing full-strength continuous line.
10. Keep legend interaction compact and touch-friendly. Avoid a tall 3x2 control block if screenshots show that it steals useful plot height; explore a compact inline/wrapping legend without horizontal page overflow.
11. At least one meaningful data layer must remain understandable when several series overlap. Use line style/marker treatment sparingly if color alone is insufficient, but do not turn the plot into a dashboard legend wall.
12. Preserve dark mode, project tokens and the existing no-horizontal-overflow contract.

## Scaling / implementation note

Nivo `ResponsiveLine` natively applies one y-scale to its line layer. Because the product requirement is one shared plot with multiple incompatible units, do not simply feed raw °C/%/kPa/W/A into one `yScale`.

Before implementation, make an explicit visualization gate and choose the cleanest truthful approach. Preferred direction to evaluate first:

- one shared x-domain;
- per-series bounded domains computed from actual visible values plus semantic minimum span/padding;
- map each continuous series into shared plot coordinates for rendering only;
- keep actual values/units in legend and tooltip;
- avoid a misleading single numeric y-axis if it no longer represents one physical unit;
- use a custom state track/band for relay output if needed.

If this becomes an awkward fight against Nivo internals, stop and evaluate whether a different already-approved-quality chart primitive is objectively cleaner before adding any new production dependency. Do not build a large bespoke chart engine merely to keep the Nivo name.

## Visual review requirements for the next chat

The user intends to attach screenshots first. Before coding:

- mark what wastes vertical space;
- check plot-to-screen ratio;
- inspect legend density and tap affordance;
- inspect perceived amplitude of small temperature/humidity/VPD changes;
- inspect x-axis tick spacing/labels against actual event timestamps;
- inspect whether power/current/output flatten or visually swamp climate data;
- decide which series are visible by default;
- decide how hidden-series state is represented without adding text clutter.

Validate at least the canonical mobile viewports `360x800`, `390x844`, `412x915`, plus the real Samsung SM-S906B / S22+ before closeout.

## Accepted evidence from chart v1

Chart v1 canonical `23-climate-history` was refreshed and re-verified 4/4 on macOS. Samsung SM-S906B / Android 16 preserving-data acceptance showed the chart stayed inside the 1080 px viewport and selector taps exercised Temperature, Humidity, Output, Power and Current. VPD was absent from the current stored records and correctly omitted. A clean interaction log had no matched `FATAL EXCEPTION`, `AndroidRuntime`, `Uncaught`, `TypeError`, `ReferenceError` or Capacitor/JavaScript error. No Shelly/runtime/schedule/relay mutation was performed.

That evidence proves the baseline is stable; it does **not** freeze the chart UX. The next task is specifically to improve the chart interaction/scaling based on screenshots.

## Performance rule

The MacBook Air M1 / 8 GB remains the current Local Agent host. `docs/PERFORMANCE_HANDOFF.md` pauses a fresh performance/concurrency/cache campaign until the M1 Pro / 32 GB host is available. Run only one heavy build/test workload at a time.

## Closeout rule for the next slice

Use the normal repository loop: architecture/visualization gate -> smallest cohesive implementation -> focused checks -> canonical/responsive visual review -> real S22+ review -> exactly one final full `pnpm check` on the exact merged `main` -> cleanup temporary branches/artifacts. If real Shelly runtime is touched for any reason, use identity-first access and finish with explicitly verified relay OFF.
