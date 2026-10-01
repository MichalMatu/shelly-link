# Handoff — post-History stacked-panel baseline

Status: **2026-10-01 — the screenshot-driven History redesign is implemented, accepted on Samsung S22+ / Android 16 and merged to `main`. The next product slice is Dashboard status polish.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; never reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. Start from the accepted stacked-panel History baseline. Do not reopen History runtime/KVS/`HistoryRecord[]` without concrete evidence of a data-model limitation.

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

- five compact vertical panels in this order: Temperature, Humidity, Output, Power, Current;
- one independent Y scale per continuous metric rather than one shared normalized plot;
- deliberately calm minimum spans: Temperature 4 °C, Humidity 20 percentage points, Power 50 W from zero, Current 0.6 A from zero; domains expand when data requires it;
- continuous lines rendered with `monotoneX` smoothing, restrained area tint, subtle glow and latest-value marker;
- Output rendered as a strict square digital step track with horizontal/vertical SVG segments only and `fill: none`;
- one shared truthful time domain with a compact time row below the stack, using timestamp -> monotonic uptime -> record-sequence fallback;
- current reading and observed range visible directly in each panel;
- no interactive legend, tooltip or crosshair in the accepted design;
- VPD retained in the typed History/scaling layer but intentionally omitted from the accepted five-panel phone stack;
- design-token styling, rounded cards, shadows and no horizontal page overflow.

Implementation remains local to `apps/mobile/src/features/automations/components/`. The chart coordinator uses `ClimateHistoryMetricPanel.tsx`, `ClimateHistoryOutputTrack.tsx`, `climateHistoryChartMetrics.ts`, `climateHistoryChartScale.ts` and the existing axis module. Obsolete shared-plot legend/selection interaction is no longer part of the accepted History UI.

## Qualification evidence

Focused qualification passed on the accepted candidate:

- Prettier/format checks for changed History files;
- mobile typecheck;
- focused History Vitest: 3 files / 9 tests;
- UX quality gate;
- final full repository `pnpm check`.

Tooling note: canonical Darwin History snapshot regeneration was retried during closeout but the Playwright process stalled before producing test output. This is tracked as test-harness debt, not product evidence; do not overwrite the snapshot merely to make a later run green. Use the accepted S22+ evidence above until the harness path is healthy, then refresh and review the `23-climate-history` baseline deliberately.

Samsung SM-S906B / Android 16 acceptance used the exact product candidate `a60bfa41388fe3825af20ed2803992756f0e6997`, built and installed with `adb install -r`. The WebView rendered at 411 CSS px wide with `scrollWidth == clientWidth`; the five-panel stack measured about 746 CSS px total, continuous cards about 138 px high and Output about 130 px high. Output remained a square step path with `fill: none`, `butt` caps and `miter` joins. No Shelly runtime, KVS, schedule or relay mutation was performed.

The responsive test assertions were updated on `4161224d21c84fbd156e04701f61e1857d123fa7` to reflect the permanent five-panel/no-tooltip contract.

## Next slice — Dashboard status polish

Improve the operational status layer without casually changing the accepted shared card geometry. Requested output, final relay output, reason, automation-fault state and hard-safety state should be understandable at a glance while keeping the product calm and data-first. Technical transport/script/firmware detail stays under Device / Info / Advanced.

Run the normal architecture/UX gate before implementation. Keep runtime behavior unchanged unless the status UI exposes a real missing-data limitation.

## Performance rule

`docs/PERFORMANCE_HANDOFF.md` is the source of truth for Local Agent performance work. Do not infer a host migration from personal hardware ownership; verify the active host before resuming any performance/concurrency/cache campaign. Run only one heavy build/test workload at a time.

## Verification rule

Use the normal repository loop: architecture/UX gate -> smallest cohesive implementation -> focused checks -> responsive/visual evidence when geometry changes -> real-device evidence when relevant -> exactly one final full `pnpm check` on the exact merged `main` -> cleanup temporary branches/artifacts. If real Shelly runtime is touched, use identity-first access and finish with explicitly verified relay OFF.
