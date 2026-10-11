from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"expected text not found in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one match in {path}, found {text.count(old)}")
    file.write_text(text.replace(old, new, 1))

replace_once(
    "package.json",
    '    "prepush": "pnpm check && node scripts/quality/run-prepush-e2e.mjs",',
    '    "prepush": "pnpm check:static",',
)

replace_once(
    "package.json",
    '    "check": "pnpm format:check && pnpm lint && pnpm quality:ux && pnpm quality:repo && pnpm typecheck && pnpm test && pnpm test:product-matrix && pnpm test:coverage:core && pnpm build && pnpm quality:performance",',
    '    "check:static": "pnpm format:check && pnpm lint && pnpm quality:ux && pnpm quality:repo && pnpm typecheck",\n'
    '    "check:tests": "pnpm test && pnpm test:product-matrix && pnpm test:coverage:core",\n'
    '    "check:build": "pnpm build && pnpm quality:performance",\n'
    '    "check:mobile": "pnpm --filter @lcl/mobile... -r lint && pnpm --filter @lcl/mobile... -r typecheck && pnpm --filter @lcl/mobile... -r test && pnpm --filter @lcl/mobile... -r build",\n'
    '    "check": "pnpm check:static && pnpm check:tests && pnpm check:build",',
)

replace_once(
    "scripts/quality/ux-gate.mjs",
    "    packageJson.scripts?.prepush !==\n    'pnpm check && node scripts/quality/run-prepush-e2e.mjs'\n  ) {\n    addFailure(packagePath, 'prepush must use the platform-aware E2E runner');",
    "    packageJson.scripts?.prepush !== 'pnpm check:static'\n  ) {\n    addFailure(packagePath, 'prepush must use the fast static gate; full E2E belongs to check:full and CI');",
)

replace_once(
    "AGENTS.md",
    "pnpm test\npnpm check\npnpm check:full",
    "pnpm test\npnpm check:static\npnpm check:mobile\npnpm check\npnpm check:full",
)

replace_once(
    "AGENTS.md",
    "Run the narrowest useful checks while iterating. Before declaring a coding task complete,\nrun one full `pnpm check`. Use `pnpm check:full` when responsive E2E is part of the\nacceptance surface.",
    "Run the narrowest useful checks while iterating. `pnpm check:mobile` covers the mobile app\nand its workspace dependencies without pulling `apps/landing` into the focused loop. Before\ndeclaring a coding task complete, run one full `pnpm check`. The pre-push hook intentionally\nruns only `pnpm check:static`, so that final full gate is not executed a second time during\npush. Use `pnpm check:full` when responsive E2E is part of the acceptance surface; CI keeps\nthe exhaustive repository/build/test/responsive gates authoritative.",
)

replace_once(
    "docs/PERFORMANCE_HANDOFF.md",
    "Status: **2026-09-30 — performance work is paused until the MacBook M1 Pro / 32 GB host is available.** Do not change concurrency or cache configuration before a fresh cross-host baseline.",
    "Status: **2026-10-04 — performance work resumed by explicit user request for build/test orchestration.** On the current M1 / 8 GB host, do not raise worker concurrency or change cache policy without a fresh measured baseline; remove duplicated work and reduce CI wall time first.",
)

replace_once(
    "docs/PERFORMANCE_HANDOFF.md",
    "Keep the current configuration until new measurements justify a change.",
    "Keep worker-count and cache configuration unchanged until new measurements justify a change. Orchestration and path selection may be optimized separately when they preserve the canonical gates.",
)

replace_once(
    "docs/PERFORMANCE_HANDOFF.md",
    "- a proposed duplicate-test gate reduction was measured and rejected because the saving was too small.\n",
    "- a proposed duplicate-test gate reduction was measured and rejected because the saving was too small.\n- the 2026-10-04 orchestration pass keeps the canonical `pnpm check` coverage unchanged, makes pre-push a static-only guard so the final full gate is not repeated, adds `pnpm check:mobile` for landing-free focused iteration, and splits CI static/tests/build/responsive work into parallel jobs behind one aggregate `checks` result.\n",
)

Path(".github/workflows/ci.yml").write_text("""name: CI

on:
  pull_request:
  push:
    branches:
      - main
      # `work` is a legacy integration branch. CI is kept temporarily for transition.

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  static:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup pnpm
        uses: pnpm/action-setup@v6
        with:
          version: 10.12.4

      - name: Setup Node
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Static repository gate
        run: pnpm check:static

  tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup pnpm
        uses: pnpm/action-setup@v6
        with:
          version: 10.12.4

      - name: Setup Node
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Test gate
        run: pnpm check:tests

  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup pnpm
        uses: pnpm/action-setup@v6
        with:
          version: 10.12.4

      - name: Setup Node
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Build and performance gate
        run: pnpm check:build

  responsive:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Setup pnpm
        uses: pnpm/action-setup@v6
        with:
          version: 10.12.4

      - name: Setup Node
        uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Install Playwright Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Responsive smoke
        run: pnpm e2e:responsive

      - name: Upload responsive visual audit
        if: always()
        uses: actions/upload-artifact@v6
        with:
          name: responsive-visual-audit
          path: test-results/visual-audit
          if-no-files-found: ignore

  checks:
    if: always()
    needs:
      - static
      - tests
      - build
      - responsive
    runs-on: ubuntu-latest

    steps:
      - name: Verify all CI gates passed
        run: |
          test "${{ needs.static.result }}" = "success"
          test "${{ needs.tests.result }}" = "success"
          test "${{ needs.build.result }}" = "success"
          test "${{ needs.responsive.result }}" = "success"
""")

print("Applied build/test orchestration optimization patches.")
