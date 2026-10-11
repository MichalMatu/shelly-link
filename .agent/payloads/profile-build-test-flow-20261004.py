import os
import subprocess
import time


def run(label, command):
    print(f"\n=== {label} ===")
    print(f"$ {command}")
    started = time.perf_counter()
    result = subprocess.run(command, shell=True, text=True)
    elapsed = time.perf_counter() - started
    print(f"RESULT label={label!r} exit={result.returncode} elapsed_s={elapsed:.2f}")
    return result.returncode, elapsed

print("=== HOST ===")
subprocess.run("uname -a", shell=True)
subprocess.run("sysctl -n machdep.cpu.brand_string 2>/dev/null || true", shell=True)
subprocess.run("sysctl -n hw.memsize 2>/dev/null || true", shell=True)
print("=== SOURCE ===")
subprocess.run("git rev-parse HEAD", shell=True)
subprocess.run("git status --short", shell=True)
subprocess.run("node --version && pnpm --version", shell=True)

print("=== MOBILE TEST CLASSIFICATION ===")
subprocess.run("printf 'total test files: '; find apps/mobile/src -type f \\( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' \\) | wc -l", shell=True)
subprocess.run("printf 'testing-library/react imports: '; rg -l '@testing-library/react|react-dom/test-utils' apps/mobile/src -g '*.test.ts' -g '*.test.tsx' -g '*.spec.ts' -g '*.spec.tsx' | wc -l", shell=True)

commands = [
    ("format-check", "pnpm format:check"),
    ("quality-ux", "pnpm quality:ux"),
    ("quality-repo", "pnpm quality:repo"),
    ("lint-all", "pnpm lint"),
    ("typecheck-all", "pnpm typecheck"),
    ("landing-test", "pnpm --filter @lcl/landing test"),
    ("landing-build", "pnpm --filter @lcl/landing build"),
    ("mobile-test", "pnpm --filter @lcl/mobile test"),
    ("core-coverage", "pnpm test:coverage:core"),
    ("product-matrix", "pnpm test:product-matrix"),
    ("mobile-build", "pnpm --filter @lcl/mobile build"),
    ("performance-budget", "pnpm quality:performance"),
]

failures = []
total = 0.0
for label, command in commands:
    code, elapsed = run(label, command)
    total += elapsed
    if code != 0:
        failures.append((label, code))

print(f"\nPROFILE_TOTAL elapsed_s={total:.2f}")
if failures:
    print("PROFILE_FAILURES", failures)
    raise SystemExit(1)
