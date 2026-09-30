# Handoff — pre-charts closeout

Status: **2026-09-30 — product audit is complete. The next chat must close the repository/documentation/code-quality baseline before starting the real History charts page.**

Repository: `MichalMatu/shelly-link`

## Start here

1. Fetch fresh `main` and `agent-control`.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md` and `docs/UX_VISUAL_CONTRACT.md`.
3. Read fresh `agent-control:.agent/status/daemon.json`; do not reuse an old conversation binding.
4. Confirm there is no active Local Agent task and no open PR before starting work.
5. Do **not** start the chart UI or another Rule/action feature yet.

## Product state already verified

The 2026-09-30 product audit is complete:

- real S22+ UX was inspected against the connected Shelly Plug S Gen3;
- ownership, reconciliation, config/decode/recovery and error/retry paths were audited;
- `lcl-af2c3ccf` vs `lcl-e5ff62f5` was resolved as two different hash domains, not runtime divergence;
- saved `installation.script.hash` is the full generated script-source hash;
- runtime header `// h:` is the normalized runtime-config hash;
- passive reconciliation did not rewrite the valid runtime;
- runtime diagnostic reason drift was fixed and verified on the real S22+ (`mn` now presents as Manual control rather than Unknown);
- the preserving-data Android install kept the stored app state intact;
- the final accepted hardware state was explicitly verified relay **OFF / 0 W**;
- the canonical repository gate and responsive E2E passed for the merged diagnostic fix.

Do not reopen those findings unless fresh evidence contradicts them.

## Closeout goal

Finish with one boring, trustworthy `main` that is the only development source of truth before History visualization work begins.

This closeout is **cleanup and quality work, not a feature slice**.

## Phase 1 — repository and documentation hygiene

Audit the active documentation set against current code and remove stale/superseded statements rather than adding more historical documents.

At minimum check:

- `README.md`;
- `docs/HANDOFF_NEXT_CHAT.md`;
- `docs/ROADMAP.md`;
- `docs/ARCHITECTURE.md`;
- `docs/UX_VISUAL_CONTRACT.md` / `docs/UX_VISUAL_GALLERY.md`;
- `docs/PERFORMANCE_HANDOFF.md`;
- `docs/testing/*`.

Keep the active docs small. Historical plans belong in Git history.

### Branch cleanup state

Remote cleanup after PR #64 is already complete. The expected remote heads are now only:

- `main` — development source of truth;
- `agent-control` — Local Agent control plane, keep;
- `golden/climate-ui-20260928` — intentional frozen visual recovery/reference branch, keep until the visual contract no longer depends on it.

The Local Agent checkout still contains many historical **local-only** branch refs from earlier work. Some are direct ancestors of current `origin/main`; others show as unmerged because prior work was squash/rebased and must not be judged by `git branch --merged` alone.

The next chat should clean those local refs/worktrees deliberately:

1. inventory local branches/worktrees;
2. for each non-current historical branch, compare its tree/content against current `origin/main` or the relevant merged PR/commit;
3. delete it only when its useful content is already on `main` or intentionally obsolete;
4. do not delete `agent-control` or the golden reference;
5. finish with the active Local Agent worktree based on fresh `main`, not an old historical branch.

Do not bulk-delete the local `--no-merged` list without comparison: squash merges make ancestry alone insufficient.

Any retained cleanup change should go through a small PR, be merged to `main`, then its temporary remote branch should be deleted.

## Phase 2 — code-quality closeout

Do a fresh quality audit from current `main` before changing code. Rank findings first; only fix clear, low-risk problems in small cohesive changes.

Explicitly inspect:

- ownership/layering against `AGENTS.md` and nearest directory contracts;
- screens/components for transport, persistence or domain leakage;
- dead/unreferenced production paths and exports, including the currently suspicious `runtimeConfigUpdate` public path with no known production call-site;
- whether reconciliation outcomes such as `changed`, `unavailable` and `conflict` are surfaced/consumed intentionally rather than silently discarded;
- config encode/decode/recovery symmetry and malformed-state behavior;
- retry semantics: do not automatically replay ambiguous mutating operations;
- TODO/FIXME/HACK markers and stale compatibility code;
- large files by responsibility, not line count alone;
- duplicate logic, catch-all helpers and unnecessary abstractions;
- strict typing / `any` escapes / unchecked external data;
- test gaps around meaningful failure states;
- recurring React test warnings/flaky timing if they indicate real test hygiene problems.

Do not turn the closeout into a broad refactor. If a finding is architectural or product-level rather than an obvious cleanup, record it for later instead of expanding scope.

## Performance rule

The MacBook Air M1 / 8 GB remains the current Local Agent host. `docs/PERFORMANCE_HANDOFF.md` intentionally pauses a fresh performance/concurrency/cache campaign until the M1 Pro / 32 GB host is available.

Do not block ordinary quality cleanup on that pause, but do not tune worker counts/caches or claim a fresh performance baseline from the M1 / 8 GB host.

Run only one heavy build/test workload at a time.

## Phase 3 — final qualification

After all retained cleanup fixes are merged:

1. fetch fresh `main` again and confirm the worktree is clean;
2. confirm no open PR remains;
3. confirm no temporary remote or local working branch remains;
4. run exactly one final canonical `pnpm check` for the final source state;
5. use `pnpm check:full` instead if the closeout intentionally changes responsive/visual UI behavior;
6. if native/mobile behavior changed, verify the relevant flow on the connected S22+ without destroying preserved app state;
7. if touching the real Shelly, always identity-first and finish with an explicitly verified relay OFF;
8. update this handoff/roadmap so the next chat no longer contains cleanup work that is already finished.

## Only after closeout — real History charts page

The existing History/Datalogger runtime, KVS format, typed mobile read path and `HistoryRecord[]` model already exist. The current History UI is intentionally simple and list-based.

The next user-facing slice after closeout is a **real History visualization page with charts**, built on the existing history data path first. Do not redesign the Shelly runtime/storage format merely to draw charts unless a concrete data limitation is demonstrated.

Before implementation, do a normal architecture/design gate and decide explicitly:

- which series belong on the first screen (temperature, humidity, VPD, relay state, power/current);
- time axis/range and behavior when Shelly timestamps are unavailable and only uptime exists;
- how AUTO/MANUAL, reason/fault/safety transitions appear without making the graph unreadable;
- whether the existing chronological record list remains below the charts as the detailed/fallback view;
- mobile interaction/accessibility and empty/partial/corrupt-history states;
- whether a chart library is actually needed. A new production dependency requires explicit user approval.

That chart work is a new product/UX slice and must receive its own visual contract update and real-device review. Do not start it as part of repository cleanup.

## Definition of this closeout being done

The pre-charts baseline is closed only when:

- current docs describe current behavior and next work accurately;
- merged/stale local working branches/worktrees are gone;
- remote heads remain only `main`, `agent-control` and the intentional golden branch;
- no open PR remains;
- ranked code-quality findings have either been safely fixed or explicitly parked with rationale;
- one final canonical gate is green;
- hardware/native verification required by the retained changes is complete;
- the next task can begin directly with the History charts architecture/design gate, without another archaeology/cleanup session.
