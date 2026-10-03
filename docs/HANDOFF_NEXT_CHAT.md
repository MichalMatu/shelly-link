# Handoff — Pulse management, product matrix and diagnostic hardening merged

Status: **2026-10-03 — PRs #77, #78 and #79 are merged to `main`. Standalone Pulse management UX is closed, deterministic Product Matrix hardening is part of the canonical gate, and the seven-item diagnostic/release-quality tooling slice is closed.**

Repository: `MichalMatu/shelly-link`

## Source of truth

Do not reconstruct state from an old chat. Start from the repository and fresh Local Agent state.

Read in this order:

1. `AGENTS.md`;
2. this file;
3. `docs/ARCHITECTURE.md`;
4. `docs/ROADMAP.md`;
5. `docs/UX_VISUAL_CONTRACT.md`;
6. `docs/testing/hardware-matrix.md`;
7. the dated Pulse acceptance records when changing qualified runtime behavior.

Then fetch fresh `main` and `agent-control:.agent/status/daemon.json`. Verify there is no active/duplicate Local Agent task before changing anything. Never persist or copy a Local Agent binding from a prior conversation.

## Merge closeout

The completed stack was merged in order:

- PR #77 `Close standalone Pulse management UX gaps`
  - qualified head: `6681944af5ef1dc222a51219c6a72ca2fd022b41`;
  - merge commit: `6745b537fc1e22b638c0b9d6e52270b029d56544`.
- PR #78 `Add deterministic product matrix hardening`
  - qualified head: `a7505a9d99b221c8a1485278c1c15027bc79f6bc`;
  - merge commit: `2399b53d38e1ef27c67307742e5111b790ea7d63`.
- PR #79 `Add diagnostic and release-quality hardening`
  - qualified head: `dbae3bf51b0f258e5c597eaeec3ec5f28a43f195`;
  - merge commit: `3d1be85b2fa8c6e7c4d0c372499b653300c9bc3f`.

All three exact PR heads had successful GitHub CI before merge. PR #79 also passed the full local `pnpm release:qualify` on its exact final head.

## Current product state

Pulse V1 remains closed and uses one shared Pulse-cycle engine. Do not create separate temperature/humidity/time/standalone Pulse engines.

Standalone Pulse management UX is now explicit:

- AUTO/MANUAL and MANUAL relay ON/OFF exist only on the main standalone Pulse dashboard card;
- standalone Pulse Plug Detail is read-only for runtime control and owns status/configuration plus safe uninstall;
- its Automation tab uses the clock icon;
- a source-level `quality:ux` rule prevents `Pulse.Standalone.useActions()` from moving outside `StandalonePulseAutomationCard.tsx`;
- Playwright verifies dashboard-only controls and their absence in detail across the canonical viewports;
- return to AUTO and manual relay mutation remain physical-ID + managed-script-ID/hash gated;
- MANUAL/pause remains fail-safe OFF even when the installed script hash changed;
- generated standalone Pulse runtime semantics were not changed by this UX closeout.

The standalone Pulse Bluetooth detail remains intentionally read-only. The existing temporary BLE discovery lifecycle is Climate-specific and must be generalized before standalone Pulse may perform active scan/restore safely.

Safe inline editing/replacement of an already-installed standalone Pulse cycle remains deliberately deferred. The current generic install path is destructive; editing requires an explicit backup/replacement/rollback lifecycle and real-device requalification rather than a UI-only reinstall shortcut.

## Product Matrix

`pnpm check` now includes deterministic seeded product hardening:

- self-test: 256 deterministic cases;
- default generated run: 1000 mixed cases, seed `1337`;
- accepted baseline on the final hardening line: 417 valid / 583 expected-reject;
- persistent regression corpus: `test/fixtures/product-matrix/` with six initial pinned cases;
- structural coverage is enforced so the generator cannot silently miss a supported axis;
- replay uses existing `automation-core` and `script-generator` APIs rather than a second runtime implementation.

The matrix covers Climate modes, 1–4 sensors, Xiaomi/TP357/mixed sets, aggregation, VPD, active windows, Climate Pulse, Time/Time+Pulse, standalone Pulse, Continuous/Cycles/Duration, start phase, delay/boundary values and representative invalid configurations.

A future generated case that exposes a real bug or valuable boundary should be promoted into the persistent JSON corpus so it replays independently of later generator changes.

## Diagnostic and release-quality tooling

The seven-item hardening slice is now part of the repository:

1. **Shelly Doctor** — read-only shared doctor model plus `pnpm doctor:shelly -- --base-url <url>` for identity/status/script/schedule/clock evidence.
2. **Support evidence** — build SHA, persistence context, saved Plug/automation summaries, runtime issues and recent diagnostic events with secret/IP/MAC redaction.
3. **Fault injection** — explicit mutation-failure tests proving no automatic mutation retry, identity gating, safe-OFF failure handling and read-back verification.
4. **Persistence/reconciliation fuzzing** — deterministic malformed durable-state coverage, duplicate ownership rejection, changed/unavailable/conflict states and protection from foreign-runtime adoption.
5. **Performance budgets** — production mobile total/largest JS, CSS, chunk count and a 1000 ms floor for literal production polling intervals are enforced after build in `pnpm check`.
6. **Release qualifier** — `pnpm release:qualify` runs canonical check + full responsive Playwright + canonical visual contract and emits exact-SHA JSON/Markdown evidence with SHA-256 build-artifact hashes. `pnpm release:qualify:hardware` is the explicit real-device extension.
7. **Diagnostic event journal** — a bounded 200-event in-memory ring for RPC method/result/latency metadata, runtime errors and reconciliation results. RPC parameters, URLs and payload bodies are not journaled; the journal is exported through Support Report and is not another product-state owner.

The release E2E runner allocates a free loopback port for every responsive/visual invocation. Do not return `check:full` or `release:qualify` to a fixed Playwright port.

## What the new tests found

The hardening work did **not** expose a new product-runtime or relay-safety defect.

It did expose and close two tooling defects while being built:

- the first Product Matrix index mapping could structurally miss the Climate `cooling` axis despite generating many cases; structural coverage now forces every required axis and fails closed if one disappears;
- the first `release:qualify` path bypassed the shared isolated E2E runner and used fixed port `5173`, which caused a webServer startup timeout under load; responsive and visual qualification now share the ephemeral-port runner without weakening test expectations or timeouts.

Fault-injection and persistence/reconciliation fuzzing passed their intended invariants and did not reveal another production-code bug in this slice.

## Final software qualification before merge

Exact PR #79 head `dbae3bf51b0f258e5c597eaeec3ec5f28a43f195` passed:

- mobile: 109 test files / 498 tests;
- Product Matrix self-test: 256 cases;
- Product Matrix: 1000 generated + 6 persistent cases;
- automation-core: 157/157;
- script-generator: 231/231;
- responsive Playwright: 49/49;
- canonical visual contract: 5/5;
- performance budget: JS 1,248,116 B total, 538,803 B largest chunk, CSS 134,254 B, 11 JS chunks, minimum literal polling budget 1000 ms;
- GitHub Actions CI run `37091978140`: canonical repository gate, Chromium install, responsive smoke and visual-audit upload all PASS.

Software release evidence was generated for that exact head with `hardwareMatrix=false`. This was intentional because #78/#79 do not change device-side runtime behavior.

## Hardware and phone state

Existing dated real-Shelly Pulse runtime qualification remains authoritative. PRs #77–#79 did not modify generated Climate/Time/Pulse runtime semantics, so no new runtime hardware claim is added by this closeout.

The last Android preserve-data acceptance for the standalone Pulse management UI used Samsung SM-S906B on exact head `6681944af5ef1dc222a51219c6a72ca2fd022b41`; build, `adb install -r`, cold start and process-alive checks passed. Do not claim the phone is already running the later Product Matrix/diagnostic-tooling heads unless it is explicitly rebuilt and installed again.

## Next work

The application is near feature-complete. Default priority is now stabilization and UX rather than adding unrelated product capability:

1. remaining UX polish using the existing visual contracts and responsive gates;
2. safe standalone Pulse inline edit/replacement lifecycle only as a separate explicitly qualified slice;
3. generalize temporary BLE discovery restoration before enabling active standalone Pulse BLE scan;
4. watchdog/recovery/soak stabilization and final real-hardware matrix;
5. V1 feature freeze/release qualification.

Do not reopen qualified Pulse runtime behavior without a concrete failing test, hardware issue or accepted product change.

## Safety / verification reminders

- one managed automation owner per Plug relay;
- boot/stale-sensor/hard-safety forced-OFF behavior stays authoritative;
- destructive/runtime mutations require physical-device identity verification;
- mutating RPCs are not automatically retried;
- React displays runtime state but never owns device automation timing;
- use focused checks while iterating and one final `pnpm check` on the exact completion head;
- use `pnpm check:full` when responsive acceptance is part of the slice;
- use `pnpm release:qualify` for software release evidence and `pnpm release:qualify:hardware` only when real hardware acceptance is required.
