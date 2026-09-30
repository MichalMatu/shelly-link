# Handoff — History charts

Status: **2026-09-30 — the pre-charts source closeout is complete. The next product slice is the History visualization/design gate.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; do not reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. Start with the History charts architecture/design gate; do not reopen pre-charts archaeology without new evidence.

## Accepted baseline

The existing History/Datalogger foundation is already complete:

- History v2 runs inside the single managed Climate runtime;
- records live in the namespaced/versioned `shellylink.history.*` KVS ring;
- History writes are observational and failure-isolated from relay/safety arbitration;
- the mobile side has a typed read path and `HistoryRecord[]` model;
- Climate Detail already has a deliberately simple chronological History list with loading, retry, empty and partial-corruption handling;
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

## Next slice — History visualization / charts

Do a normal architecture/design gate before implementation and decide explicitly:

- which series belong on the first screen: temperature, humidity, VPD, relay state, power/current;
- time axis/range and behavior when Shelly timestamps are unavailable and only uptime exists;
- how AUTO/MANUAL, reason/fault/safety transitions appear without making the graph unreadable;
- whether the existing chronological record list remains below the charts as the detailed/fallback view;
- mobile interaction/accessibility and empty/partial/corrupt-history states;
- whether a chart library is actually needed. A new production dependency requires explicit user approval.

Prefer presentation work first. Do not redesign the Shelly runtime/storage format merely to draw charts unless a concrete limitation in the existing `HistoryRecord[]` path is demonstrated.

The chart work is an intentional visual-contract change and requires reviewed responsive evidence plus real-device review. If native/mobile behavior changes, preserve app state during device verification. If the real Shelly is touched, use identity-first access and finish with an explicitly verified relay OFF.
