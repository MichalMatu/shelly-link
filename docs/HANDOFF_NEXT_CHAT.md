# Handoff — clean baseline for UX, logic and optimization audit

Status: **2026-09-30 — feature work is paused. Start the next chat from fresh `main` with a new cross-cutting audit before changing behavior.**

Repository: `MichalMatu/shelly-link`

## Bootstrap

1. Fetch fresh `main` and `agent-control`, read the current Local Agent binding/status, and verify that no task or PR is already active.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PERFORMANCE_HANDOFF.md`, `docs/UX_VISUAL_CONTRACT.md` and the relevant hardware evidence before changing code.
3. Inspect the real remote branch list. `golden/climate-ui-20260928` is an intentional frozen UX reference, not a work branch.
4. Do not start the next Rule/action primitive automatically. First inspect the current app and runtime as a product: UX, state/logic, ownership, errors, recovery and performance.
5. Create a work branch only after the audit identifies a concrete fix.

Current code + canonical docs are the source of truth. Session-specific Local Agent ids do not belong in repository documentation.

## Audited code baseline

The product tree audited here is PR #61, `Stabilize climate runtime byte budget`, commit `aff0bc3c1e9506b9e563d8baec679e6c41923d7f`. This final handoff cleanup is documentation-only and will advance `main`; always verify fresh `main` in the next chat.

Fresh 2026-09-30 re-audit results on that tree:

- `@lcl/script-generator`: **17/17 files, 172/172 tests PASS**;
- script-generator TypeScript check PASS;
- repository branding, script-lifecycle, repository-boundary, feature-boundary and gate-selftest checks PASS;
- the same product tree already passed the full canonical `pnpm check` with 100% core coverage during PR #61 stabilization;
- no `TODO` / `FIXME` / `HACK` / `XXX` markers were found under active app/package/docs/scripts paths;
- screens/components do not own Shelly RPC/BLE transport clients; current repo/feature gates still enforce the intended dependency direction;
- largest production screens are currently `AutomationDashboardScreen.tsx` (~483 lines) and `InstallationDetailScreen.tsx` (~453 lines). Treat them as ownership/UX audit targets, not automatic file-splitting targets.

### Known audit targets — intentionally not changed in this cleanup

1. `generateShellyRuntimeConfigUpdateEval` / `runtimeConfigUpdate.ts` is still exported publicly from `@lcl/script-generator`, but the fresh reference audit found **no production call-site**; only tests exercise it. Decide whether it is a deliberately retained capability or dead development-era API before keeping/removing it.
2. Config/decode/recovery responsibilities are spread across `reconcileInstalledAutomation`, `updateClimateInstalledAutomation`, `runtimeControl`, `runtimeStatus` and `runtimeUpgrade`. They currently pass tests, but the next audit should check for duplicated matching/decode/recovery decisions and make ownership explicit before extending them.
3. The saved Android installation and the real Shelly currently provide an excellent reconciliation test case: local storage records Climate script hash `lcl-af2c3ccf`, while the installed runtime source header reports `lcl-e5ff62f5`. The live runtime config/diagnostics still correspond to the saved `GrowBox` TP357 automation and 65/66% thresholds. Determine whether this hash divergence is expected stale metadata, a recovery-state presentation issue or a real logic defect. **Do not use passive inspection as a reason to rewrite the valid remote runtime.**
4. The next UX pass should inspect the real rendered flows, not infer quality from unit tests: Plugs, Thermometers, Settings, plain Plug Detail, Climate Detail tabs, History empty/error states, runtime mismatch/recovery presentation, button/action affordances and navigation/back behavior.
5. Error/retry behavior needs a fresh product-level pass: LAN/BLE unreachable states, stale locators, diagnostics/history failure, recovery prompts, background refresh, logcat noise and user-facing copy.

## Generated-runtime byte constraint

The current canonical four-sensor runtime with minimum ON + debounce is **9431 B / 9500 B**, leaving 69 B with its normal fixture names.

Sensor display names are capped at **26 escaped UTF-8 JSON-content bytes**. Across both sensor profiles, all four rule modes, VPD on/off, four sensors, minimum ON and debounce, the worst accepted case is **9496 B / 9500 B** — only **4 B headroom**. Four 27-byte names can produce 9501 B and must remain rejected.

Before adding generated-runtime behavior, re-measure the complete matrix and prefer reuse/config/data or deliberate compaction. Never raise the 9500 B guard as a shortcut. Existing `minChangeMs` remains the minimum-OFF/cooldown owner.

## Current real-device baseline

Configured controller: Shelly Plug S Gen3 `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`, firmware 1.7.5.

Latest identity-first inspection confirmed:

- exactly one `Shelly Link Thermostat` script, id 1, enabled and running;
- installed production source: **7788 B**, generator header `0.6.0`, SHA-256 `37ce58a4c759499d712922e2051cc7167b8fb31a0b2171bcdd6193df5d20889e`;
- the source was not rewritten during this final audit;
- live diagnostics identified TP357 `F7:5F:8D:0F:76:20` / `GrowBox`; latest observed sample was 26.3 °C, 60% RH;
- configured rule remained humidifying ON 65% / OFF 66%;
- `Schedule.List` was empty;
- latest History read returned an empty valid store;
- final control state was deliberately set to **MANUAL + request OFF** and re-verified after 15 s;
- final physical relay was **OFF, 0 W / 0 A**.

The installed runtime is older than the current generator. Explicit Save/Edit/Recover may be an upgrade boundary, but passive reconciliation must not silently rewrite a valid runtime.

## Android baseline

Physical target: Samsung SM-S906B / S22+, Android 16, package `app.shellylink.mobile`.

Exact product `main` `aff0bc3c1e9506b9e563d8baec679e6c41923d7f` was rebuilt and installed with `adb install -r` after the phone was unlocked:

- install succeeded;
- `firstInstallTime` remained `2026-09-28 04:57:23`, confirming app data was preserved;
- cold start succeeded (`LaunchState: COLD`, about 798 ms in the latest run);
- `MainActivity` became the resumed activity;
- targeted logcat inspection found no FATAL/AndroidRuntime/Capacitor crash signature.

Current preserved app data includes one saved Plug named `Humidifer` at the configured controller identity and a Climate automation using TP357 `GrowBox`, humidifying 65/66%.

For preserving-data debug installs use:

```bash
pnpm --filter @lcl/mobile build
pnpm --filter @lcl/mobile exec cap sync android
printf 'sdk.dir=%s\n' "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}" > apps/mobile/android/local.properties
(cd apps/mobile/android && ./gradlew assembleDebug)
"${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}/platform-tools/adb" install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Do not use `pnpm android:phone-alpha` unless a deliberate clean-install/recovery test is required; that path uninstalls first.

## Performance baseline / rules

`docs/PERFORMANCE_HANDOFF.md` contains the previous build/test optimization pass. Do not treat its timings as a current benchmark.

For the next optimization audit:

- confirm the MacBook M1 / 8 GB host is idle before every measurement;
- run only one heavy build/test/benchmark at a time;
- measure cold, warm and incremental separately;
- prefer at least three comparable runs and median;
- record wall time, CPU, peak RSS and swap pressure;
- focus on CPU/RAM/cache/I/O; do not pursue GPU acceleration without a demonstrated GPU-eligible workload.

## Frozen product/safety contracts

- product model remains `physical Plug -> optional installed automation`;
- phone configures/manages/diagnoses; Shelly executes installed automation locally;
- one managed automation owner per Plug relay;
- Climate user modes remain AUTO/MANUAL;
- MANUAL entry is safe OFF; AUTO entry is safe OFF and waits for fresh usable data;
- automation faults and hard-safety lockout remain separate axes;
- hard safety always overrides normal action/timing behavior;
- normal relay actions pass through the single final relay arbiter;
- destructive/runtime mutation verifies physical identity first;
- passive reconciliation does not rewrite valid runtime;
- hardware tests that mutate a relay finish with an explicitly verified final state;
- `golden/climate-ui-20260928` remains the frozen accepted Climate visual reference until the UX contract deliberately changes.

## First pass in the next chat

Perform one evidence-driven cross-cutting audit before feature work:

1. sync fresh `main`, inspect branches/PRs/daemon and confirm a clean tree;
2. review the app on the real S22+ screen: navigation, Plugs, Thermometers, Settings, Climate Detail, History and mismatch/recovery states;
3. audit UX consistency against `docs/UX_VISUAL_CONTRACT.md` without assuming the frozen design is automatically optimal — identify deliberate changes before modifying the golden contract;
4. audit logic/state ownership, especially saved-vs-remote runtime reconciliation, config/decode/recovery symmetry and dead/duplicate paths;
5. audit errors/retries and inspect logcat during real navigation/network operations;
6. take fresh CPU/RAM/cache/I/O baselines from current `main` according to `docs/PERFORMANCE_HANDOFF.md`;
7. rank findings by severity/value and implement only small, cohesive fixes with clear owners and focused tests;
8. run one final full `pnpm check` (`pnpm check:full` when responsive visual/E2E acceptance changes);
9. install the resulting APK with `adb install -r`, visually verify the changed flows, and if Shelly is mutated verify identity first and finish relay OFF;
10. only after this baseline is clean decide whether Rule/action expansion, dashboard polish or another optimization is the next product slice.

## Continuation prompt

> `https://github.com/MichalMatu/shelly-link` — zacznij od świeżego `main` w trybie local-agent i przeczytaj `AGENTS.md` oraz `docs/HANDOFF_NEXT_CHAT.md`. Nie implementuj od razu nowej funkcji. Zrób od zera pełny audit aktualnego produktu: realny UX na podłączonym S22+, logika i ownership, local-vs-remote runtime reconciliation, config/decode/recovery, błędy i retry, test gaps oraz świeży performance baseline CPU/RAM/cache/I/O zgodnie z `docs/PERFORMANCE_HANDOFF.md`. Traktuj zapisany hash `lcl-af2c3ccf` vs remote header `lcl-e5ff62f5` jako konkretny przypadek do zbadania, ale nie przepisuj poprawnego runtime pasywnie. Następnie uszereguj problemy, wprowadzaj małe bezpieczne poprawki, sprawdzaj je na telefonie i testami, a na końcu uruchom canonical gate. Nie uruchamiaj dwóch ciężkich workloadów równolegle. Jeżeli dotykasz realnego Shelly, zawsze identity-first i kończ ze zweryfikowanym relay OFF.
