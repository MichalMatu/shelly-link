# Performance handoff

Status: 2026-09-30. The first build/test acceleration pass is complete. Start any new performance work from fresh `main` and measure on an otherwise idle host.

## Completed optimization pass

The product/runtime behavior was not changed by this pass.

- PR #39 enabled Gradle build cache and stopped forcing `--no-daemon` in the local Android phone-alpha path.
  - baseline clean Gradle build with `--no-daemon`: ~31.5 s
  - baseline warm no-op with `--no-daemon`: ~11.6 s
  - warm daemon no-op during calibration: ~1.7 s
  - verified branch results: first clean build after daemon stop ~18.6 s, cache-backed clean rebuild ~5.1 s, warm no-op ~1.8 s
- PR #40 removed wall-clock waiting from the BLE polling recovery test while leaving production polling unchanged.
  - focused test: ~9.7 s -> ~1.9 s
  - mobile suite: ~53 s -> ~39-42 s in repeated optimized runs
- PR #41 removed real mutation sleeps from tests that do not validate throttling, while preserving dedicated throttle assertions and production delays.
  - `@lcl/shelly-client`: 8.862 s -> 1.952 s
  - optimized full `pnpm test`: 43.491 s
  - optimized canonical `pnpm check`: 77.983 s
- Removing duplicate plain test passes for the two coverage-core packages was measured and intentionally rejected: the observed saving was only about 1.7 s and did not justify extra gate complexity.

## Host constraint discovered

MacBook Air M1 / 8 GB is memory-constrained during the full repository gate. During the baseline pass the `pnpm check` process tree reached roughly 2.1 GB RSS while the host was already using substantial swap. Do not increase worker counts merely because the CPU has eight cores.

## Next performance phase: CPU first, GPU only when eligible

### Measurement rules

1. Run only one heavy repository workload at a time. Do not benchmark while another compile, test suite, E2E run, package install, ML job, or Local Agent task is consuming the host.
2. Pin the exact repository revision and record whether a run is cold, warm, or incremental.
3. Prefer three comparable runs and report the median; discard a run only when an external disturbance is documented.
4. Record wall time, CPU utilization, peak RSS and swap pressure. On macOS use `/usr/bin/time -lp` where practical.
5. Do not clear global dependency caches during ordinary iteration. Clear only the project output/cache required for an explicitly labelled cold test.
6. Change one variable at a time. Re-run the canonical gate after any configuration change that would be kept.

### CPU track

Profile the actual expensive workflows rather than synthetic loops:

- full `pnpm check` and its heaviest package/test groups;
- Android `assembleDebug` cold/cache-hit/warm paths;
- representative incremental TypeScript/Vite and Android edits.

The goal is to identify CPU saturation versus memory/swap stalls before changing concurrency again.

### GPU track

Do an eligibility audit before benchmarking GPU. TypeScript, ESLint, Gradle/Kotlin compilation, Vite bundling and ordinary Vitest workloads are not expected to benefit from Apple MPS/GPU acceleration. Do not add GPU dependencies or GPU-specific code unless a real compute workload is found that can use it.

For Shelly Link, the default expectation is therefore **CPU/RAM profiling only**. A GPU benchmark is justified only if a future workload introduces substantial image, matrix, ML or similarly parallel compute.

## Deferred build ideas

These are intentionally not active work items:

- further `pnpm check` task-graph restructuring;
- more aggressive Gradle/Vitest worker counts;
- affected-package fast gates.

Re-open them only after new measurements show that the current optimized workflow is again a material development bottleneck.

## New-chat bootstrap

Read, in order:

1. `AGENTS.md`
2. `docs/HANDOFF_NEXT_CHAT.md`
3. this file
4. the fresh Local Agent daemon state from `agent-control`

Then verify the host is idle before taking any performance baseline. Do not reconstruct timings from old branches; the numbers above are historical reference points and fresh measurements must use current `main`.