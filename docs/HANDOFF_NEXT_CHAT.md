# Handoff — Shelly Plug BLE + shared Plug UX

Status: **2026-09-27 — implementation and focused/responsive UX validation complete; final full gate + final S22+ install/smoke still pending**

Repository: `MichalMatu/shelly-link`

Active product branch: `work/shelly-ble-transport`

Current product HEAD at handoff:

```text
d8b7623ef55fc8ad33c94d9aeb228f218d4b8452
```

Do not treat this HEAD as final real-phone accepted yet. The last final full-gate/build/install task was prepared but never executed because the Local Agent stopped taking work.

## Read first

Before changing code, read:

1. `AGENTS.md`;
2. nearest directory-level `AGENTS.md`;
3. `docs/ARCHITECTURE.md`;
4. `docs/ROADMAP.md`;
5. `docs/testing/hardware-matrix.md`;
6. `docs/UX_VISUAL_CONTRACT.md`;
7. this file.

Local Agent bindings are conversation-scoped. Never reuse a binding copied from this handoff or old `.agent` history. A new chat must use its fresh bootstrap/binding if Local Agent is available.

Do not use GitHub Actions for this continuation. Do not run Codex locally. Prefer the Local Agent/Mac host for local tests/builds/device work when available.

## Repository / branch state

Branches intentionally present at handoff:

```text
main                     d15d8cbdc63e8ab78bab94cf180dbf82612743eb
work/shelly-ble-transport d8b7623ef55fc8ad33c94d9aeb228f218d4b8452  <-- active
work/kvs-datalogger       fd149a782afd7e5925d5f5d867639295921f7429  <-- intentional parked work
agent-control             technical Local Agent control branch
```

Do not delete `work/kvs-datalogger`.

The stale, never-run final task `shelly-ux-final-full-gate-install-20260927-761` should not be resumed in a new chat; create fresh work using the new conversation binding instead.

## Product state already accepted

### BLE transport / management

The BLE management foundation is complete and real-device accepted on Samsung S22+ / Android 16:

- independent Bluetooth Add path;
- canonical identity from normalized `Shelly.GetDeviceInfo.id`;
- saved canonical `physicalId` plus replaceable BLE locator;
- BLE-only dashboard status/read and relay control;
- bounded stale-locator rediscovery with canonical identity verification;
- combined read-only BLE Detail session for Device + Info;
- stable 30-second read-only refresh;
- no automatic BLE↔Wi-Fi fallback;
- no replay of ambiguous mutations after timeout/disconnect.

Factory BLE Plug used for acceptance:

```text
physicalId        = shellyplugsg3-e4b063e3e298
bleDeviceId       = E4:B0:63:E3:E2:9A
advertisementName = ShellyPlugSG3-E4B063E3E298
model             = S3PL-00112EU
generation        = 3
firmwareId        = 20240820-134301/1.2.3-plugsg3prod0-gec79607
```

Expanded BLE Device read-only state accepted on the phone:

- LED mode `Power usage`;
- power brightness `100%`;
- night mode disabled;
- physical button `Controls relay`;
- Shelly Cloud disabled / `Not connected`;
- correct model, generation, firmware and BLE locator/advertisement.

No LED/button/Cloud/script/config mutations were added to BLE Detail.

### Dashboard card convergence

Plain saved Wi-Fi and BLE-only Plugs share the same dashboard shell (`PlugDashboardCardShell`) for the common structure:

- Plug icon;
- title;
- three-dot detail action;
- separator;
- telemetry;
- relay controls;
- automation-action slot.

The BLE dashboard no longer shows the old technical `Bluetooth · model` subtitle. Factory BLE advertisement names are presented more like Wi-Fi while user-assigned names are preserved. The BLE `Add automation` slot exists only as a disabled placeholder until a real BLE automation installation flow is implemented.

Configured Climate/Time automation cards intentionally remain specialized because they present automation metrics and AUTO/MANUAL state. Do not force them into the plain Plug card shell.

### Detail convergence

The main UX pass in this continuation moved all physical Plug Detail variants toward the same presentation contract.

Shared components now include:

- `PlugDetailIdentity`;
- `PlugDetailTop` — shared Back + identity + five-tab chrome;
- `PlugDetailNotFound`;
- `PlugDetailTabs`.

Plain saved Wi-Fi no longer uses the legacy standalone `PlugSettingsScreen`. The legacy screen was removed. Plain Wi-Fi now uses `WifiPlugDetailScreen` with the same five slots:

1. Automation;
2. Bluetooth;
3. Device;
4. Script;
5. Info.

For plain Wi-Fi, existing mature Wi-Fi mutation components remain unchanged in ownership and behavior:

- LED settings;
- physical-button mode;
- Shelly Cloud.

Automation and Script remain disabled placeholders until those features have real ownership for a plain Plug. Bluetooth routes into the existing Shelly-side BLE discovery path.

BLE Detail uses the same top/tab skeleton. Device + Info are real read-only features; unavailable Automation/Bluetooth/Script slots remain visibly disabled rather than being faked.

Configured Wi-Fi automation Detail now also uses the shared top chrome:

- Back to Plugs;
- Plug name;
- `Wi-Fi · model` identity line;
- the same five Plug tabs.

Configured Wi-Fi dashboard accessibility is transport-disambiguated as `Details/Szczegóły: <name> · Wi-Fi`; BLE uses the corresponding `· Bluetooth` suffix.

The large `InstallationDetailScreen.tsx` quality budget was **not raised**. Instead duplicated missing-state/detail chrome was extracted so repository quality gates remain valid.

## Validation already completed for the current UX implementation

The following evidence is current and should not be repeated unless a later change invalidates it.

### Source / architecture gates

Task `shelly-detail-top-clean-pass-20260926-755` produced commit:

```text
f2078bdc0eeccd3264fc46e9bceac35bb2cf5f54
```

PASS:

- mobile typecheck;
- repository quality gate;
- feature-boundary gate;
- quality self-test;
- targeted ESLint;
- UX quality gate;
- `git diff --check`.

### Focused behavior tests

Task `shelly-detail-top-test-contracts-20260926-757` produced commit:

```text
53e8b9a14b29814320edb949788707923cf31260
```

Focused Vitest result:

```text
7 test files passed
49 tests passed
```

Covered configured Wi-Fi dashboard/detail, routing, BLE-only dashboard, shared tabs and BLE Device panel.

### Responsive functional contract

Task `shelly-detail-top-responsive-nonvisual-20260926-759` produced commit:

```text
89d8425d3ed2fd0e331b1ed26b0d4fa2ba49a235
```

Playwright responsive contract excluding the visual phone-large snapshot case:

```text
16 / 16 passed
```

Accepted on phone-small, phone, tablet and desktop with the new shared Back/header hierarchy.

### Visual contract

Task `shelly-detail-top-visual-baselines-20260926-760` produced the current handoff HEAD:

```text
d8b7623ef55fc8ad33c94d9aeb228f218d4b8452
```

Exactly five configured-Wi-Fi Detail screenshots changed because the shared identity/top chrome is now visible on every tab:

```text
02-climate-automation
03-climate-ble
05-climate-device
06-climate-script
07-climate-info
```

The task regenerated only those five files, verified no other files changed, then reran the phone-large test **without** `--update-snapshots`; it passed.

Do not regenerate unrelated screenshots.

## Earlier full/hardware evidence that remains valid

The previous shared-dashboard UX checkpoint `4906c346ba7488c3943111137abe533719352294` passed full `pnpm check:full`, Android build and install on Samsung S22+. A corrected real-phone smoke then accepted the configured Wi-Fi vs BLE card geometry and BLE five-tab Detail. The hardware matrix records the exact evidence.

The current HEAD `d8b7623...` only changes the subsequent Detail convergence/header/tests/visual baselines. It still needs one final full gate and one final S22+ installation/smoke before this UX pass is called completely hardware-accepted.

## Exact remaining work — start here in the next chat

Do **not** repeat the architecture audit or earlier BLE hardware tests unless a concrete failure appears.

### 1. Verify branch and clean checkout

Use the fresh Local Agent binding if available, then verify:

```bash
git rev-parse HEAD
# must be d8b7623ef55fc8ad33c94d9aeb228f218d4b8452

git status --short
# must be empty
```

If remote HEAD moved, inspect why before running acceptance.

### 2. Run the final full software gate

```bash
pnpm check:full
```

No GitHub Actions.

### 3. Build the Android APK from the same exact HEAD

Use the existing Android flow, preserving the exact source commit. Equivalent manual path:

```bash
pnpm --filter @lcl/mobile build
cd apps/mobile
pnpm exec cap sync android
cd android
./gradlew assembleDebug
```

Record SHA-256 of:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. Install in-place on the S22+

Phone:

```text
Samsung SM-S906B / S22+
adb serial: RFCT70L7E8J
Android 16
package: app.shellylink.mobile
activity: app.shellylink.mobile/.MainActivity
```

Preserve app data:

```bash
adb -s RFCT70L7E8J install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Do not use a clean uninstall for this presentation acceptance.

### 5. Final read-only phone smoke

Do not toggle relay and do not save LED/button/Cloud/script/config changes.

On the dashboard verify both real devices are still visible and the menu/header treatment is coherent.

Configured Wi-Fi card:

- detail action is transport-disambiguated with `· Wi-Fi`;
- three-dot control remains geometrically aligned with BLE;
- open Detail;
- shared Back is visible;
- Plug name is visible;
- identity line is `Wi-Fi · S3PL-00112EU` for the current configured Plug;
- five tabs remain present;
- Automation, Bluetooth, Device, Script and Info still behave as before.

BLE-only card:

- detail action uses `· Bluetooth`;
- open exact BLE target, not the Wi-Fi card;
- shared Back/name/`Bluetooth · S3PL-00112EU` header is visible;
- same five-tab skeleton is present;
- Device still shows the accepted read-only LED/button/Cloud values;
- Info still shows correct identity/firmware/locator;
- no mutation controls appear for BLE Device.

A short stability check across the normal Detail refresh boundary is useful if convenient, but do not rerun destructive stale-locator or relay tests merely to close this presentation pass.

### 6. Close documentation only after PASS

If final full gate + APK install + phone smoke pass:

- add a new dated row to `docs/testing/hardware-matrix.md` for **final shared Plug Detail UX acceptance on exact `d8b7623...` (or the exact later doc-free product commit if source changes)**;
- update this handoff from `pending final acceptance` to `accepted`;
- record APK SHA-256 and exact installed product commit;
- run a lightweight documentation gate (`prettier/quality:repo/git diff --check`) if only docs changed afterward.

If the final phone smoke finds a real product defect, fix only that defect and rerun the smallest invalidated gates before the final full gate.

## Mutation / safety boundaries

During this final UX acceptance:

- do not click relay ON/OFF;
- do not save LED/button/Cloud changes;
- do not change scripts or schedules;
- do not pair/bond unless a separately approved test explicitly requires it;
- do not implement automatic BLE↔Wi-Fi fallback;
- do not replay mutations after timeout/disconnect.

## Likely next product work after this handoff is closed

After final acceptance, discuss the next UX/feature slice before coding. Reasonable candidates:

1. continue filling the disabled BLE Detail slots with real transport-owned functionality, one method family at a time;
2. design the first BLE mutation slice with explicit identity/mutation safety rules;
3. further converge plain/configured Plug Detail internals only where it reduces duplication without forcing mature Wi-Fi mutation flows through a generic transport abstraction;
4. design dual-transport representation for one physical Plug before any automatic transport preference/fallback.

Do not start these until the final `d8b7623...` acceptance above is closed.
