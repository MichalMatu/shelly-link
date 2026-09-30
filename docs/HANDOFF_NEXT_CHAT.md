# Handoff — context reset after Rule/action runtime work

Status: **2026-09-30 — stop feature work here and start the next chat with a fresh audit/stabilization pass from `main`.**

Repository: `MichalMatu/shelly-link`

## Bootstrap

1. Verify remote `main`, Local Agent binding/status and that there is no active task or open PR.
2. Read `AGENTS.md`, this file, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` and the relevant testing docs before changing behavior.
3. Inspect the real current branch list; do not recreate or reuse completed feature branches.
4. Create a fresh work branch only after the audit identifies a concrete change.

Current code and canonical docs are the source of truth. Session-specific Local Agent ids/state do not belong in product documentation.

## Current baseline

The last product merge before this handoff is PR #59, `Integrate relay debounce into Climate runtime`, at `75f83b7e8c8ff44f9c603943db6e802333c73aff`. Verify `main` because the handoff/docs cleanup merge will move it again.

Completed v1 foundations:

- History/Datalogger: compact namespaced KVS ring in the existing Climate runtime, typed read path and Climate History UI;
- Runtime Safety Supervisor: max-ON, relay-control failure, native Shelly protection errors, first-fault-wins and deliberate safe-OFF reset;
- Rule/action domain: Set, timing/minimum OFF, Pulse semantics, debounce, daily time windows and flat AND/OR condition composition;
- Rule/action runtime: explicit minimum ON and relay debounce are integrated into Climate runtime;
- runtime source was compacted without raising the 9500 B generator guard.

Still **not** integrated into the Shelly Climate runtime:

- Pulse timers/state;
- time-window/scheduled-condition execution;
- AND/OR condition execution;
- any editor/UI for those unfinished primitives.

Do not begin those items automatically. The next chat must first re-audit and stabilize the current tree.

## Critical runtime constraint

The accepted maximum four-sensor runtime with minimum ON + debounce is **9413 B / 9500 B**, leaving only **87 B** source headroom. Treat this as a hard architectural constraint.

Before adding more generated-runtime code, re-measure current byte budgets and decide whether the next behavior can be represented by config/data, reuse existing code, or needs another deliberate compaction/refactor. Do not simply raise the limit.

The existing `minChangeMs`/minimum-OFF behavior already covers the classic cooldown concept. Do not introduce a duplicate cooldown owner.

One discarded work branch explored another relevant budget guard: limiting the **escaped** Climate sensor display name to 32 runtime bytes. That branch is intentionally removed during this cleanup rather than carried forward. Re-audit the issue from current `main`: `climateSensorSchema.displayName` is currently only `.min(1)`, so determine whether an explicit runtime-byte/name bound is still needed and, if so, implement it cleanly with current generator/config constraints.

## Real-device baseline

Configured controller: Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5.

The Rule/action hardware acceptance restored the original production script after each temporary candidate. After PR #59 acceptance/postflight:

- exactly one production `Shelly Link Thermostat` script remained running;
- its source was restored byte-identically (SHA-256 `37ce58a4c759499d712922e2051cc7167b8fb31a0b2171bcdd6193df5d20889e`);
- production control state was MANUAL with request OFF and no safety lockout;
- schedules were empty;
- pre-existing History KVS entries were restored;
- final physical relay was explicitly verified OFF at 0 W / 0 A.

The installed production script on the Plug may therefore be older than the generator in current `main`. Treat explicit Save/Edit/Recover as a possible runtime-upgrade boundary; passive inspection/recovery must not rewrite a valid runtime.

## Android baseline and install workflow

Current physical Android acceptance target is Samsung SM-S906B / S22+ on Android 16. Package id: `app.shellylink.mobile`.

For debugging/presentation while **preserving existing app data**, do not use `pnpm android:phone-alpha`, because that script intentionally performs a clean uninstall first.

Preferred preserving-data path:

```bash
pnpm --filter @lcl/mobile build
pnpm --filter @lcl/mobile exec cap sync android
printf 'sdk.dir=%s\n' "${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}" > apps/mobile/android/local.properties
(cd apps/mobile/android && ./gradlew assembleDebug)
"${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}/platform-tools/adb" devices -l
"${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}/platform-tools/adb" install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Then cold-start and inspect warnings/errors with ADB/logcat. Use `pnpm android:phone-alpha` only when a clean-install/recovery test is explicitly intended.

## Required first pass in the next chat

Before continuing the roadmap, perform a **behavior-preserving re-audit**:

1. sync to fresh `main` and inspect repo/branch/task cleanliness;
2. audit architecture boundaries, generated runtime size, config/decode/recovery symmetry and rule/action ownership;
3. inspect recent Rule/action code for duplication, dead paths, naming/API rough edges, test blind spots and docs drift;
4. re-evaluate the sensor display-name/runtime-byte budget alongside the overall 9500 B constraint;
5. run focused tests and the canonical full gate; fix real defects and low-risk code-quality issues in small commits;
6. debug the mobile app locally and on the physical Android phone, preserving user data unless a clean-install test is deliberately selected;
7. verify navigation, Climate/History state, runtime diagnostics and logcat on-device;
8. if Shelly is mutated, identity-check first and finish with an explicitly known relay state (normally OFF);
9. only after the baseline is clean, decide the next Rule/action runtime slice from measured byte headroom and architecture evidence.

Do not redesign the dashboard during this first pass. Dashboard status polish and UX redesign are later roadmap stages.

## Frozen contracts

- phone configures/manages/diagnoses; Shelly executes installed automation locally;
- one managed automation owner per Plug relay;
- Climate user modes remain AUTO/MANUAL only;
- MANUAL entry is safe OFF; AUTO entry is safe OFF and waits for fresh usable data;
- automation faults and hard-safety lockout remain separate axes;
- hard safety always overrides normal action/timing behavior;
- all normal requested relay actions must pass through the single final relay arbiter;
- destructive/runtime mutation verifies physical identity first;
- passive reconciliation does not rewrite a valid runtime;
- hardware tests that mutate a relay end with a verified final state.

## Continuation prompt for a new chat

Copy this into the new chat after opening the repository with Local Agent:

> `https://github.com/MichalMatu/shelly-link` — kontynuuj pracę w trybie local-agent zgodnie z `AGENTS.md` i `docs/HANDOFF_NEXT_CHAT.md`. Zacznij od świeżego `main` i **nie wdrażaj od razu kolejnej funkcji**. Najpierw zrób kompletny re-audit aktualnego kodu i dokumentacji po ostatnich zmianach Rule/action: architektura, ownership, generated-runtime byte budget, config/decode/recovery, sensor display-name/runtime-byte budget, dead/duplicate code, test gaps i niespójności dokumentacji. Następnie zrób małe bezpieczne poprawki jakościowe/refaktory bez zmiany zachowania, uruchom focused testy oraz pełny canonical gate, debuguj aplikację i wgraj aktualny debug APK na podłączony Samsung S22+ **z zachowaniem danych przez `adb install -r`**. Sprawdź cold start, logcat, nawigację, Climate/History i diagnostykę runtime na telefonie. Jeżeli dotykasz realnego Shelly, najpierw zweryfikuj identity, nie przepisuj pasywnie poprawnego runtime i zakończ test ze zweryfikowanym relay OFF. Dopiero po czystym baseline zaproponuj następny najmniejszy slice Rule/action, uwzględniając aktualny limit 9500 B i bardzo mały zapas runtime.
