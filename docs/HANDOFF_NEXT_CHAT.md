# Handoff — paused clean baseline

Status: **2026-09-30 — feature and performance work is paused until the MacBook M1 Pro / 32 GB host is available.** Resume from fresh `main`; do not continue from an old worktree or benchmark branch.

Repository: `MichalMatu/shelly-link`

## Resume contract

1. Fetch fresh `main` and `agent-control`, read the current daemon status/binding, and confirm there is no active task or PR.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Treat current code + canonical docs as source of truth; historical task ids and old local worktrees are not state.
4. Do not start a new feature immediately. Re-establish the host/product baseline first.
5. Run only one heavy benchmark/build/test workload at a time.

## Repository state to preserve

- product model remains `physical Plug -> optional installed automation`;
- phone configures/manages/diagnoses; Shelly executes locally;
- one managed automation owner per Plug relay;
- passive reconciliation must not rewrite a valid remote runtime;
- destructive/runtime mutation verifies physical identity first;
- relay/safety tests finish with an explicitly verified final state;
- generated runtime remains constrained by the 9500 B guard;
- `golden/climate-ui-20260928` is intentionally retained as the accepted Climate visual reference until the UX contract is deliberately changed.

## Reconciliation hash audit resolved

The preserved Android data and installed Shelly expose two intentionally different hash domains:

- saved local `installation.script.hash`: `lcl-af2c3ccf` — FNV hash of the **full generated script source**;
- installed runtime header `// h: lcl-e5ff62f5` — hash of the normalized **runtime configuration**.

The 2026-09-30 live audit read the remote source without mutating it and recomputed its full code hash as exactly `lcl-af2c3ccf`. The runtime/config therefore matched the saved installation; there was no local-vs-remote code divergence. Do not compare the header config hash to `installation.script.hash`, and do not passively rewrite a valid runtime.

## Last real-device safety state

The most recent accepted hardware audit ended with the managed Shelly relay explicitly **OFF**. Future hardware work must re-check identity and current state instead of assuming the old session is still representative.

## Performance handoff

`docs/PERFORMANCE_HANDOFF.md` contains the exact final MacBook Air M1 / 8 GB baseline and the comparison procedure for the M1 Pro / 32 GB machine.

For the cleanest computer comparison, first rerun the old benchmark at exact source `6836cc1c49fcd92bac2f8391e3092ef40a552f61` on the new Mac, then establish a fresh baseline on current `main` before changing concurrency/cache settings.

## First work after the pause

After the new Mac is ready:

1. establish the cross-host performance baseline;
2. establish a fresh current-`main` baseline;
3. inspect the real S22+ UX and the saved-vs-remote runtime mismatch;
4. audit ownership, config/decode/recovery symmetry, error/retry behavior and remaining test gaps;
5. rank findings before implementing anything;
6. make only small cohesive fixes with focused tests;
7. finish with the canonical gate and real-device verification when the change requires it.

No feature, benchmark tuning, runtime rewrite, or branch expansion is intentionally left in progress by this handoff.
