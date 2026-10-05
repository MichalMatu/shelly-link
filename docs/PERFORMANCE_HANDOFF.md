# Performance handoff

Status: **2026-10-04 — performance work resumed by explicit user request for build/test orchestration.** On the current M1 / 8 GB host, do not raise worker concurrency or change cache policy without a fresh measured baseline; remove duplicated work and reduce CI wall time first.

## Stable optimizations already merged

The completed tooling pass did not change product/runtime behavior:

- Gradle build cache is enabled and local Android builds no longer force `--no-daemon`;
- BLE polling tests no longer wait on wall-clock recovery where timing is not under test;
- non-throttling Shelly-client tests no longer contain unnecessary real sleeps;
- a proposed duplicate-test gate reduction was measured and rejected because the saving was too small.
- the 2026-10-04 orchestration pass keeps canonical `pnpm check` coverage unchanged, replaces the duplicate full pre-push run with fast UX/repository policy gates, adds `pnpm check:mobile` for landing-free focused iteration, and splits CI static/tests/build/responsive work into parallel jobs behind one aggregate `checks` result.
- a two-worker mobile Vitest experiment was rejected: it reduced process pressure but took about 441 s and still had 7 failing tests, so worker concurrency remains unchanged.

Keep worker-count and cache configuration unchanged until new measurements justify a change. Orchestration and path selection may be optimized separately when they preserve the canonical gates.

## Last MacBook Air M1 / 8 GB baseline

The final baseline before the pause used source `6836cc1c49fcd92bac2f8391e3092ef40a552f61`. `main` advanced afterwards, so these figures are a machine/reference baseline, not a current-main qualification.

### Repository gate

Three comparable runs gave:

- `pnpm check` project-cold median: **81.34 s**;
- `pnpm check` warm median: **83.76 s**;
- representative mobile incremental build median: **6.92 s**.

The warm full gate was not faster than the cold-labelled runs, which indicates that this gate is dominated by more than a single reusable build cache. Do not infer cache policy from that observation alone.

### Android

- clean `assembleDebug --no-build-cache` median after the first startup outlier: **8.29 s**;
- first startup/toolchain run: **27.17 s**;
- clean cache-hit median: **2.16 s**;
- warm no-op median: **0.91 s**.

### Memory pressure

The M1 / 8 GB host was already under substantial swap pressure:

- full-task peak RSS reached about **2.64 GB**;
- swap was roughly **3.9–4.45 GB** during the campaign.

The per-command `/usr/bin/time` RSS values are wrapper/process measurements; Local Agent task-tree telemetry is the more useful whole-workload memory signal.

This machine should therefore be treated as a memory-constrained reference host. Do not raise worker counts based on CPU core count alone.

## Resume on the M1 Pro / 32 GB host

For a fair computer-to-computer comparison, first rerun the same benchmark commands at exact source `6836cc1c49fcd92bac2f8391e3092ef40a552f61` on the new Mac. Then benchmark fresh `main` as the new development baseline.

For each baseline:

1. run only one heavy workload at a time and confirm the host is idle;
2. separate cold, warm and representative incremental paths;
3. use at least three comparable runs and report medians;
4. record wall time, CPU, process-tree peak RSS and swap/memory pressure;
5. keep versions and commands identical for the cross-host comparison;
6. only after the fixed baseline test any higher Gradle/Vitest/build concurrency, one variable at a time;
7. run the canonical gate before merging a retained configuration change.

TypeScript, Vite, Vitest, Gradle/Kotlin and ordinary Android build work are CPU/RAM/cache/I/O workloads. Do not add GPU-specific tooling unless a future workload is actually GPU-eligible.

## Bootstrap after the pause

Read `AGENTS.md`, `docs/HANDOFF_NEXT_CHAT.md`, this file, then fetch fresh `main` and the Local Agent daemon state. Historical timings are reference values only; future product work starts from fresh `main`.
