# Performance handoff

## Current policy

Performance work is secondary to V1 stabilization. The latest orchestration pass already removed duplicated local work without reducing canonical verification scope.

Keep these rules:

- pre-push stays a fast UX/repository policy gate;
- pnpm check remains the canonical static + tests + build gate;
- pnpm check:mobile is the focused mobile/workspace path;
- CI may parallelize independent static/tests/build/responsive jobs;
- do not raise Vitest/Gradle worker counts or change cache policy without a fresh measured baseline;
- optimize duplicated orchestration before adding concurrency;
- run only one heavy local workload at a time on memory-constrained hosts.

## Benchmarking changes

When performance work resumes:

1. start from fresh main;
2. record host/tool versions;
3. separate cold, warm and representative incremental paths;
4. use at least three comparable runs and report medians;
5. record wall time and memory/swap pressure;
6. change one variable at a time;
7. retain only changes that preserve the canonical verification contract.

Historical machine-specific timings and rejected experiments remain available in Git history; they are not an active product contract.

## Scope boundary

TypeScript, Vite, Vitest and Gradle are ordinary CPU/RAM/cache/I/O workloads. Do not introduce GPU-specific tooling unless a future workload actually benefits from it.

Do not spend stabilization time on build tuning unless it is blocking delivery or reproducibility.
