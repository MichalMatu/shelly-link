# Handoff — History charts

Status: **2026-10-01 — the chart-first History visualization slice is implemented, canonical-visual verified and accepted on Samsung S22+ / Android 16.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; do not reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. Start from the qualified chart-first History baseline; do not reopen storage/runtime or the completed design gate without new evidence.

## Accepted baseline

The existing History/Datalogger foundation is already complete:

- History v2 runs inside the single managed Climate runtime;
- records live in the namespaced/versioned `shellylink.history.*` KVS ring;
- History writes are observational and failure-isolated from relay/safety arbitration;
- the mobile side has a typed read path and `HistoryRecord[]` model;
- Climate Detail now has a chart-first History surface with loading, retry, empty and partial-corruption handling;
- ownership, runtime recovery, config/decode symmetry and mutation retry semantics were re-audited during closeout.

The durable remote branches are intentionally only:

- `main` — development source of truth;
- `agent-control` — Local Agent control plane;
- `golden/climate-ui-20260928` — frozen visual recovery/reference branch.

The closeout session must finish with one green canonical `pnpm check` on the exact merged `main`; that qualification is part of the accepted baseline for the next chat.

## Closeout audit disposition

No blocking production-code cleanup was found.

- UI/screens do not own raw Shelly transport or BLE access; transport stays in platform/data/flow boundaries.
- No actionable `TODO` / `FIXME` / `HACK` markers or explicit `any` escape were found in production TypeScript.
- Mutating flows do not opt into automatic positive retries; ambiguous device mutations are not blindly replayed.
- Persisted runtime-config decoding and malformed-state behavior have focused fail-closed regression coverage.
- Large files found by the audit are primarily E2E, locale/content or established responsibility owners; no broad split/refactor is justified by line count alone.

Two items were deliberately retained/parked rather than changed during cleanup:

1. `generateShellyRuntimeConfigUpdateEval` has no current app call-site, but it is a recently maintained, capability-gated generator contract with focused persistence/debounce tests. It is not proven dead and should not be deleted without an explicit API/runtime-contract decision.
2. Reconciliation returns `changed`, `unavailable` and `conflict` and tests those states, while the current setup call-site consumes recovered sensors rather than surfacing the status itself. Converting those outcomes into setup UX is a product-level behavior decision, not a safe cleanup edit, and is not a blocker for read-only History charts.

## Performance rule

The MacBook Air M1 / 8 GB remains the current Local Agent host. `docs/PERFORMANCE_HANDOFF.md` intentionally pauses a fresh performance/concurrency/cache campaign until the M1 Pro / 32 GB host is available.

Do not tune worker counts/caches or claim a fresh performance baseline from the M1 / 8 GB host. Run only one heavy build/test workload at a time.

## Current slice — History visualization / charts

Accepted implementation contract:

- `@nivo/line` is the approved production dependency;
- the History page is chart-first, with one large plot and a compact metric-selector grid rather than stacked record cards;
- temperature, humidity, VPD, relay output, power and current are selectable first-class series and keep their own units/scales;
- x-axis spacing uses complete Shelly timestamps first, monotonic uptime second and record order only when neither timeline is safe;
- the tooltip carries selected value plus AUTO/MANUAL and relay state; no permanent explanatory copy is added around the chart;
- loading, retry, empty and partial-corruption states remain explicit and compact;
- runtime/KVS ownership and the `HistoryRecord[]` read path are unchanged.

Canonical `23-climate-history` evidence was refreshed and re-verified 4/4 on macOS. Real-device acceptance on Samsung SM-S906B / Android 16 used `adb install -r` with preserved app data: the History chart stayed inside the 1080 px viewport at `[42,549][1039,1845]`, and selector taps exercised Temperature, Humidity, Output, Power and Current. VPD was absent from the current stored records and therefore correctly omitted from the available-series grid; the unused sixth grid cell left the active series unchanged. After a clean `logcat -c`, the interaction smoke produced no matched `FATAL EXCEPTION`, `AndroidRuntime`, `Uncaught`, `TypeError`, `ReferenceError` or Capacitor/JavaScript error. No Shelly/runtime/schedule/relay mutation was performed.

Keep later chart refinements presentation-only unless a concrete data-model limitation is demonstrated. If the real Shelly is touched, use identity-first access and finish with an explicitly verified relay OFF.
