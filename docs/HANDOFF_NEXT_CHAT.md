# Handoff — Shelly Plug BLE + shared Plug UX

Status: **2026-09-27 — implementation + focused/responsive/visual validation complete; final full gate + final S22+ install/smoke pending**

Repository: `MichalMatu/shelly-link`

Active branch: `work/shelly-ble-transport`

## Important commit distinction

The exact **product/source commit under final acceptance** is:

```text
d8b7623ef55fc8ad33c94d9aeb228f218d4b8452
```

The branch HEAD is now a **documentation-only descendant** of that product commit because this handoff was refreshed after the UX code/snapshot work. Do not require `git rev-parse HEAD` to equal `d8b7623...` blindly. Instead verify that all commits after `d8b7623...` are documentation-only before building/testing. If source code changed after `d8b7623...`, treat the newer source commit as a new candidate and rerun the invalidated gates.

The product commit `d8b7623...` has **not yet received the final full `pnpm check:full` + final APK install + final S22+ smoke after the last Detail-header convergence**. Do not call this UX slice fully hardware-accepted until those steps pass.

## Read first

Before changing code:

1. `AGENTS.md`;
2. nearest directory-level `AGENTS.md`;
3. `docs/ARCHITECTURE.md`;
4. `docs/ROADMAP.md`;
5. `docs/testing/hardware-matrix.md`;
6. `docs/UX_VISUAL_CONTRACT.md`;
7. this handoff.

Local Agent bindings are conversation-scoped. Never reuse a binding from old chat history or `.agent` files. Use only the fresh bootstrap/binding from the new chat.

Do not use GitHub Actions for this continuation. Do not run Codex locally. Prefer the Local Agent/Mac host for tests/build/device work when available.

## Intentional branches

Only these branches were present at handoff:

```text
main
work/shelly-ble-transport   <-- active product work
work/kvs-datalogger         <-- intentional parked work, do not delete
agent-control               <-- technical Local Agent control branch
```

The stale never-run task `shelly-ux-final-full-gate-install-20260927-761` was removed from `agent-control` before handoff. A new chat must create fresh work with its own binding rather than resuming that task.

## What is already complete

### BLE transport / management

Real-device accepted on Samsung S22+ / Android 16:

- independent Bluetooth Add path;
- canonical identity from normalized `Shelly.GetDeviceInfo.id`;
- `SavedBlePlug` keeps canonical `physicalId` plus replaceable BLE locator;
- BLE-only dashboard status/read and relay control;
- bounded stale-locator rediscovery with canonical identity verification;
- combined read-only BLE Detail session for Device + Info;
- stable automatic read-only refresh;
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

BLE Device read-only values accepted on the phone:

- LED mode `Power usage`;
- power brightness `100%`;
- night mode disabled;
- physical button `Controls relay`;
- Shelly Cloud disabled / `Not connected`;
- correct model/generation/firmware/BLE locator.

No BLE LED/button/Cloud/script/config mutation surface was added.

### Dashboard card convergence

Plain saved Wi-Fi and BLE-only Plugs share `PlugDashboardCardShell` for:

- Plug icon;
- title;
- three-dot Detail action;
- separator;
- telemetry;
- relay controls;
- automation-action slot.

BLE no longer shows the old technical `Bluetooth · model` subtitle on the dashboard. Factory advertisement names are presented more like Wi-Fi while user-assigned names remain untouched.

BLE has the same `Add automation` slot as plain Wi-Fi, but it is disabled until a real BLE automation-install flow exists.

Configured Climate/Time automation cards intentionally remain specialized because they show automation metrics and AUTO/MANUAL state. Do not force them into the plain Plug card shell.

### Detail convergence

Shared presentation components now include:

- `PlugDetailIdentity`;
- `PlugDetailTop` — Back + identity + five-tab chrome;
- `PlugDetailNotFound`;
- `PlugDetailTabs`.

Plain saved Wi-Fi no longer uses the legacy standalone `PlugSettingsScreen`; that legacy screen was removed. Plain Wi-Fi now uses `WifiPlugDetailScreen` with the same five slots:

1. Automation;
2. Bluetooth;
3. Device;
4. Script;
5. Info.

Plain Wi-Fi keeps its existing mature mutation ownership/components for LED, physical-button mode and Shelly Cloud. Automation and Script are disabled placeholders until real feature ownership exists. Bluetooth continues into the existing Shelly-side BLE discovery path.

BLE Detail uses the same top/tab skeleton. Device + Info are real read-only features; unavailable Automation/Bluetooth/Script slots remain visibly disabled rather than faked.

Configured Wi-Fi automation Detail also uses the shared top chrome:

- Back to Plugs;
- Plug name;
- `Wi-Fi · model` identity line;
- same five Plug tabs.

Configured Wi-Fi dashboard Detail accessibility is transport-disambiguated with `· Wi-Fi`; BLE uses `· Bluetooth`.

The `InstallationDetailScreen.tsx` quality budget was **not increased**. Duplicate missing-state/detail chrome was extracted so the repository quality gate remains valid.

## Validation already completed — do not repeat unless later source changes invalidate it

### Source / architecture gate

Task `shelly-detail-top-clean-pass-20260926-755`, source commit:

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

### Focused behavior regression

Task `shelly-detail-top-test-contracts-20260926-757`, commit:

```text
53e8b9a14b29814320edb949788707923cf31260
```

Result:

```text
7 test files passed
49 tests passed
```

### Responsive functional contract

Task `shelly-detail-top-responsive-nonvisual-20260926-759`, commit:

```text
89d8425d3ed2fd0e331b1ed26b0d4fa2ba49a235
```

Result:

```text
16 / 16 Playwright cases passed
```

Phone-small, phone, tablet and desktop passed with the new Back/header hierarchy.

### Visual contract

Task `shelly-detail-top-visual-baselines-20260926-760` produced product commit:

```text
d8b7623ef55fc8ad33c94d9aeb228f218d4b8452
```

Exactly five configured-Wi-Fi Detail screenshots changed because the shared Detail top is now present on every tab:

```text
02-climate-automation
03-climate-ble
05-climate-device
06-climate-script
07-climate-info
```

Only those five files changed. The phone-large visual test was then rerun **without** `--update-snapshots` and passed.

Do not regenerate unrelated screenshots.

## Earlier full/hardware evidence that remains valid

The previous shared-dashboard candidate `4906c346ba7488c3943111137abe533719352294` passed full `pnpm check:full`, Android build/install and corrected S22+ smoke. That acceptance proved the shared dashboard geometry and BLE five-tab Detail/read-only Device behavior. See `docs/testing/hardware-matrix.md` for exact dated evidence.

The later commits through `d8b7623...` add the plain/configured Wi-Fi Detail convergence, shared Detail top, contract tests and updated visual baselines. They are the part that still needs the **final full gate + final S22+ install/smoke**.

## Exact remaining work — start here

Do not redo architecture discovery or destructive BLE hardware acceptance unless a concrete failure appears.

### 1. Verify checkout and product diff

On `work/shelly-ble-transport`:

```bash
git status --short
```

Must be clean.

Confirm that commits after product commit `d8b7623...` are documentation-only. A useful check is:

```bash
git diff --name-only d8b7623ef55fc8ad33c94d9aeb228f218d4b8452..HEAD
```

Expected at handoff: handoff/documentation only. If source files appear, inspect before proceeding.

### 2. Final full software gate

Run from the current clean branch checkout:

```bash
pnpm check:full
```

Because the commits after `d8b7623...` are docs-only, this validates the same product source tree.

### 3. Build Android APK

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

### 4. Install in-place on Samsung S22+

```text
model: Samsung SM-S906B / S22+
adb serial: RFCT70L7E8J
Android: 16
package: app.shellylink.mobile
activity: app.shellylink.mobile/.MainActivity
```

Preserve app data:

```bash
adb -s RFCT70L7E8J install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Do not perform a clean uninstall for this presentation acceptance.

### 5. Final read-only phone smoke

No relay toggle and no settings/script/config mutation.

Configured Wi-Fi card/detail:

- Detail action is disambiguated by `· Wi-Fi`;
- three-dot geometry remains coherent with BLE;
- shared Back is visible;
- Plug name is visible;
- identity line is `Wi-Fi · S3PL-00112EU` for the current configured Plug;
- five tabs are present;
- Automation/Bluetooth/Device/Script/Info still work as before.

BLE-only card/detail:

- target is disambiguated by `· Bluetooth`;
- open the exact BLE card, not Wi-Fi;
- shared Back/name/`Bluetooth · S3PL-00112EU` top is visible;
- same five-tab skeleton is present;
- Device still shows accepted read-only LED/button/Cloud values;
- Info still shows correct identity/firmware/locator;
- no BLE mutation controls appear.

A short refresh-boundary stability check is useful if convenient, but do not rerun stale-locator or relay lifecycle tests merely to close this presentation pass.

### 6. Final documentation closeout only after PASS

If full gate + build/install + phone smoke pass:

- append a new dated row to `docs/testing/hardware-matrix.md` for final shared Plug Detail UX acceptance;
- record exact product source commit and APK SHA-256;
- change this handoff status from pending final acceptance to accepted;
- if only docs change after that, run a lightweight docs gate (`prettier`, `quality:repo`, `git diff --check`).

If a real product defect appears, fix only that defect, rerun the smallest invalidated focused gates, then rerun the final full gate.

## Safety / mutation boundaries for final acceptance

Do not:

- click relay ON/OFF;
- save LED/button/Cloud changes;
- change scripts or schedules;
- pair/bond unless separately approved;
- add automatic BLE↔Wi-Fi fallback;
- replay mutations after timeout/disconnect.

## After final acceptance

Discuss the next product slice before coding. Reasonable next candidates are:

1. fill disabled BLE Detail slots with real transport-owned functionality one method family at a time;
2. design the first BLE mutation slice with explicit identity/mutation safety;
3. continue internal Detail convergence only where it genuinely reduces duplication without forcing stable Wi-Fi mutations through a generic transport abstraction;
4. design dual-transport representation for one physical Plug before automatic transport preference/fallback.

Do not start these until the final acceptance above is closed.
