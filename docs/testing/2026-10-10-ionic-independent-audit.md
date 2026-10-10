# Independent Ionic React audit — 2026-10-10

Scope: `work/ux-evolution` only. The `main` branch was not modified. This report records **verified evidence and unresolved gates**, not a claim that the component migration is complete.

## Current verified product head

- Source/test commit: `81b36f78e4ed3e4bbce171d8c97a1e0b531ece2f`.
- Focused commits: `fc344ec2` (Ionic host interactions), `d240a625` (Plug Detail CTA), `80afbb54` (test host selectors), `a8eb3540` (bounded Vitest concurrency), `c5a778b3` (BLE candidate save), `733d33a8` (Plug dashboard CTA), `81efec8c` (unused CSS), `81b36f78` (BLE-only host assertion). See Git history for complete chronological diff.
- `pnpm check`: PASS at `81b36f78`, including **549/549 mobile unit/integration tests**. Previous parallel-run failures disappeared with explicit 2-worker Vitest and serialized workspace tests; isolated failing suites passed 83/83. The concurrency change affects test execution only.
- Canonical Darwin responsive/visual E2E: **50/50**, zero skipped/unexpected/flaky at `81efec8c`. `81b36f78` changes only one unit test after that visual run. No snapshots refreshed.
- Capacitor sync + Android debug Gradle assemble: PASS. Debug APK 5,179,520 bytes; SHA-256 `db33815dfcc43b909dee24a76a0300f4fbe08e4795f7fc240b0b19891b2ab552`.

## Physical Samsung S22+ / Android 16

- Wireless ADB target `SM-S906B` matched; historical endpoint `192.168.0.100:40973` worked during final install but is session-dependent.
- `adb install -r` returned Success. No uninstall, app data clearing, or reset. `firstInstallTime=2026-09-28 04:57:23` was unchanged before/after.
- Cold launch `LaunchState: COLD`, `MainActivity` foreground, **1005 ms**. Actual 1080 × 2340 screenshot saved under Local Agent runtime path `/tmp/shelly-ionic-81b3-20261010-s22.png` (not committed); snapshot SHA-256 `dee9f5be8be55ae55fa5a175907d69f52bc0cb3ffe74933163ad4d1d74df2350`. UIAutomator dump: 64 nodes, 24 labeled text/content-description entries.
- **Android is not error-free.** Logcat included `E/Capacitor/Console: Uncaught TypeError: Cannot read properties of undefined (reading 'triggerEvent')` (File: blank, Line: 1); no observed `FATAL EXCEPTION` or native process death. This is a nonfatal but unresolved startup/error-log defect, **not** evidence that Ionic/React itself threw it.
- Native-source inspection confirms that `@capacitor/android@7.6.7` invokes `window.Capacitor.triggerEvent(...)` via `Bridge.java:885,889`; its `native-bridge.js:218` registers `triggerEvent`. No `triggerEvent` expression was found in the built app JavaScript. The only direct plugin-side native call found in installed plugin sources was `@capacitor/app@7.1.2 AppPlugin.java:63`: on Android Back, **when a `backButton` listener is present**, it calls `bridge.triggerJSEvent("backbutton", "document")`. Capacitor `Bridge.java:269` installs document-start JS where supported. These observations identify a concrete candidate event path; the captured log did not establish that Back was pressed or that this specific callback caused the error. Disabling Capacitor Back handling would violate existing navigation behavior and is not an approved fix. A native event arriving before Capacitor's JS bridge is initialized is the **leading hypothesis**, not yet a proved root cause or event name. A similar upstream report attributed the identical startup error to beta Android System WebView (Ionic Forum thread 250101). Before patching, reconnect wireless ADB, record `dumpsys webviewupdate`, WebView package/version and channel, reproduce across multiple cold starts, and capture console stack/JS bridge initialization order. The most recent diagnostic reconnect attempt failed; no new handset state was changed.
- Real-device accessibility **labels** were observed through UIAutomator. Systematic TalkBack traversal, virtual keyboard/focus, and overlay interaction on real Android have **not** been fully signed off.

## Native HTML census and boundaries

Fresh scan after current migrations: **75 native controls in app production TSX** = **65 buttons and 10 inputs** (previous counts were 80 then 77, 76). Separately, shared `packages/ui` contains additional intentionally custom native primitives; do not conflate the counts.

- **Frozen Climate form exception:** 10 `input` instances live only in `ClimateRuleAdvancedSettings`, `ClimateRuleDeviceSelectors`, `ClimateRuleEditor`, and the Climate mode of shared `PulseCycleEditor`. Previous Ionic replacement failed canonical `16-climate-setup` visual review (~15k differing pixels), was reverted, and must not return without a visually accurate design.
- **Deliberate custom widgets requiring retained keyboard/ARIA coverage:** bottom/page navigation, tab chrome, icon-only actions, Plug speed dial, relay ON/OFF, AUTO/MANUAL, LED swatches, time wheel, custom option/menu triggers. Native markup here is not automatically an oversight.
- **Still ordinary actions, not exempt and not yet migrated:** some setup-page scan/restart/save/installation actions, Climate recovery/scan actions, Plug and sensor delete/blocked actions, standalone Pulse/Time installation removal actions, confirmation modal actions, and some developer-palette actions. Audit and migrate in small test-backed slices; do not repeat the reverted global `IonicActionButton`/modal batch (17 failures).
- Audit fixes: shared Plug card now guards Ionic hosts against navigation when editing; dev palette ignores Ionic editable controls; focused tests cover both. Only proven orphan CSS `plug-settings-check-row input[type='checkbox']` was removed; LCL tokens are untouched.

## Bundle budget

Production JS: **2,369,824 B** total, biggest file `ion-icon` **1,043,584 B**, CSS 154,245 B, 20 JS chunks; all hard performance budgets pass, but review thresholds (**1,536,098 B** JS, **686,363 B** max chunk, 15 JS chunks) are exceeded. Static HTML/preload graph includes the `ion-icon` chunk: this is an **initial-load** concern, not merely an unused lazy chunk. Investigate tree-shaking/Stencil asset packaging and measured route-level splitting, with before/after bundle and runtime verification. Do not suppress budget warnings or remove Ionic features just to change a score.

## Completion gates

1. Diagnose/reproduce or explicitly accept the Android Capacitor/WebView `triggerEvent` startup error (current blocker).
2. Finish migration of ordinary native actions **or** document each remaining exception; never claim all controls migrated with standard actions remaining.
3. Focus/keyboard/TalkBack/overlay/safety interactions on S22+ with recording and without clearing data.
4. Review and resolve JS-size regression against policy, with measured impact.
5. For **each subsequent source change**, repeat `pnpm check`, full canonical 50/50 E2E with visual diff review, Capacitor sync/build and preserving-data `adb install -r`, cold start and screenshot. Keep `main` unchanged without explicit approval.

## Same-day S22+ follow-up — WebView and Back reproducibility

On 2026-10-10 the S22+ was again available at `192.168.0.100:40973`; ADB confirmed `SM-S906B`, Android 16 and installed `app.shellylink.mobile` version `2.0.10`. No APK reinstall, package changes, data clearing, firmware update or relay action was performed.

- `dumpsys webviewupdate`: **stable `com.google.android.webview` 153.0.8010.57**, versionCode 801005703, target SDK 36. `com.google.android.webview.beta`, dev, canary and debug providers **not installed**. Chrome package version 154.0.8037.127 is separate from the selected WebView provider. Therefore the _beta-WebView_ explanation seen elsewhere does **not** fit this handset's current provider.
- Three controlled cold starts (`am force-stop` then `am start -W`) completed in **593 / 533 / 573 ms**, all in the foreground with a process running. Each was followed by 5 seconds of capture: **0 `triggerEvent` errors, 0 `E/Capacitor/Console` errors, 0 native `FATAL EXCEPTION` events**. Fresh actual screenshot: 1080 × 2340; SHA-256 `680dfee26bcbf12ab3092aefdb967f7b821ff2683a21c8a84cd68efc3825bb44`; local path `/tmp/shelly-ionic-triggerEvent-20261010-119-s22.png`.
- Three more cold starts followed by system `Back` (two after 4 seconds and one immediately after activity start) also produced **0 `triggerEvent`, 0 `E/Capacitor/Console`, 0 native fatal**. In each case Back returned to the previously foreground Android Settings screen. The app was then relaunched and left in foreground, PID present, with its `firstInstallTime=2026-09-28 04:57:23` unchanged.
- This **narrows but does not close** the original single Android bridge-console TypeError. It is not currently reproducible under 6 starts and 3 Back presses on the same unchanged APK, and does not establish an Ionic regression. Do not ship a speculative native bridge workaround. If the error recurs, capture WebView/Capacitor initialization timing, `logcat` with timestamps and devtools JS stack before altering production code. Full TalkBack/focus/keyboard testing and remaining ordinary Ionic actions are still open.

## Follow-up: Ionic BLE retry and foreground validation

- **App product commit:** `c71845097ac448eaf1b5d4a80c246f6c167fdb63`.
  The standalone Shelly BLE discovery page's ordinary restart action now uses
  `IonButton`; its onClick, disabled and busy semantics are preserved.
  The focused BLE restart test and TypeScript passed.
- **Native app controls:** 74 JSX instances: 64 buttons and 10 Climate inputs.
  The file-by-file classification is in
  `docs/testing/2026-10-10-ionic-native-control-census.md`.
  Of these, 30 are ordinary actions still to address (eight in frozen Climate),
  34 are deliberate custom buttons, and 10 are frozen Climate inputs.
- **Full `pnpm check`: PASS** at documentation HEAD `3406069f` with the above
  unchanged product code, including 549/549 mobile tests. Capacitor sync and
  debug APK assembly passed. The APK SHA-256 is
  `5f40e523285643ce70a32a973869d62c19b960a10c5265e395fc216a3c5f1544`.
- **Full canonical visual E2E is not yet green on this source.**
  Two separate runs each passed 49/50: a 7,638-pixel (3%) Time/Pulse
  screenshot difference and an unrelated LED-mode test timeout.
  Each offending test then passed in isolation (1/1), without code changes
  or snapshot updates. A third complete 50-test run was submitted as
  Local Agent task `shelly-ionic-c718-visual-full-third-20261010-137`.
  Do not treat isolated passes as equivalent to full acceptance.
- **First preserving-data S22+ install:** `adb install -r` succeeded, and
  first-install date stayed at 2026-09-28 04:57:23. The recorded 712-ms
  cold launch was immediately backgrounded while Android reported
  "Not drawing due to screen off." Its roughly 15-KB screenshot was
  effectively blank and **does not count as a valid UI screenshot**.
  `triggerEvent` occurred immediately after `Capacitor: App stopped`.
- **Corrected awake/foreground S22+ test:** a fresh cold start completed
  in **515 ms**, with `topResumedActivity` and `mCurrentFocus` both pointing
  to Shelly Link and Android reporting `mWakefulness=Awake`.
  An actual 1080 × 2340, 172,321-byte screenshot was captured:
  SHA-256 `53f26335cf5e170c91afc0e7a7076e9c8a57b7ed64139ac4ec8c8d5635d4595b`.
  UIAutomator exposed 75 nodes, 45 text/description-labeled, including
  Plug dashboard state, Climate/Pulse status, and ON/OFF controls.
  No `triggerEvent` console exception was seen during this focused start.
  The snapshot remains in the Local Agent runtime at
  `/tmp/shelly-ionic-s22-foreground-20261010-135.png`.
- **Intermittent Capacitor lifecycle issue remains open.** At
  `Bridge.java:885,889`, Capacitor 7.6.7 evaluates
  `window.Capacitor.triggerEvent(...)`. The error is associated with
  background/stop timing, but a particular missing bridge initialization
  or event type has not been conclusively established.
  Do not patch the library speculatively or waive the problem silently.
- **Bundle review still open:** JS 2,369,839 B, largest
  `ion-icon` chunk 1,043,584 B, CSS 154,245 B, 20 JS chunks.
  Hard budget passes, review thresholds fail.
- **Accessibility gap:** `@lcl/ui` Modal focus-trap discovery currently
  searches native buttons/fields and explicit `[tabindex]`, but does not
  intentionally traverse Ionic shadow-root controls. Inspect and test
  `ion-button`/field Tab order, first focus and wraparound before migrating
  more modal actions. TalkBack and keyboard interactions on S22+ remain open.

## Ionic follow-up: blocked navigation and emulator — 2026-10-10

After shared Modal Ionic Shadow DOM focus correction (`3b8756a62`), standalone LED Apply moved to IonButton (`227927674`) and its parent test now uses an Ionic host query (`695c7d5f9`). Plug and Thermometer blocked-owner navigation actions moved to Ionic (`69285bb259` and `aa172d673`) with focused owner/installation ID tests.

Native app JSX controls remaining: **71 = 61 buttons + 10 Climate inputs**; 27 ordinary actions, 34 intentional custom buttons, 10 protected Climate inputs. Full census: `docs/testing/2026-10-10-ionic-native-control-census.md`.

The earlier full `pnpm check` passed 551/551 mobile tests on `695c7d5f9`; canonical visual E2E 50/50 on `227927674` without snapshot changes. Full acceptance for the blocked-navigation commits must still be run.

Headless `medium_phone` Android 16 emulator failed to finish boot within the bounded window, before APK installation. It was stopped; there is **no emulator app acceptance**. Neither the user phone nor physical Shelly devices were contacted. Actual TalkBack, keyboard and overlay accessibility, plus background Capacitor triggerEvent, remain open.

## Latest Ionic increment: busy dialog and developer actions — 2026-10-10

App code now includes BLE restart modal IonButton and native dialog aria-busy (c3e5033ca) plus developer Clear errors and Reset all IonButtons (595ce2a3d). Unit regression checks verified both busy disablement and command behavior; accessibility testing showed that hydrated Ionic buttons can otherwise leave an incorrect aria-busy=false on the inner native button.

Native mobile TSX controls now: **68 total = 58 buttons + 10 protected Climate inputs**, in 31 files. Ordinary unmigrated actions: 24. Intentional custom buttons: 34. Full inventory in docs/testing/2026-10-10-ionic-native-control-census.md.

At product source c3e5033ca, full pnpm check passed **554/554** mobile tests, Capacitor sync and Android debug APK completed. APK SHA-256: 3c070b8e8a5b078e1b667c4af5d796fea056ab82231f374908fcddcc2720594f. The latest developer command migration (595ce2a3d) has separate 9/9 targeted tests and needs whole-project reacceptance.

Full 50-test canonical E2E is **not yet clean** for these commits. Prior full attempts were 47/50 and 45/50 under severe host load; six prior failed runtime cases passed when isolated, and two visual snapshots showed differences in unrelated Time/Pulse and thermometer screens. Do not update approved baselines or claim a clean full run. Physical S22+ unavailable; medium_phone emulator did not boot, so Android runtime accessibility and Capacitor triggerEvent still require future checking. Main stays untouched.

## Current BLE settings acceptance checkpoint — 2026-10-10

- Product commit: 1a6021e8a246667005dadbe4d72e335fbaee5b4d. Only the Shelly settings BLE scan action migrated to IonButton with explicit aria-label and unchanged callback. A separate same-labeled saved-device-card action intentionally remains native. Both relevant integration tests passed 2/2; TypeScript and pre-commit/pre-push quality gates passed.
- Current production JSX control count: 67 = 57 native buttons + 10 protected Climate inputs across 31 files; 23 ordinary actions and 34 intentional custom buttons.
- Canonical visual/responsive E2E: 49/50 on this product commit, with one unrelated 30-second LED mode timeout. The exact LED case passed 1/1 in isolation without code or snapshot updates. Clean 50/50 sign-off remains open.
- Full pnpm check task shelly-ionic-settings-scan-check-android-20261010-173 was interrupted by severe host overload (load peaked over 150) when the Local Agent worker instance ended. The recovered result is failed / interrupted_previous_attempt; no automatic replay occurred. The preserved log reached and passed the hard performance budget (JS 2,370,284 B; largest JS 1,043,584 B; CSS 154,245 B; 20 JS files), but performance review thresholds still fail. There is no confirmed successful pnpm check shell exit, and no new Android APK was assembled for this head.
- Local Agent supervisor automatically recovered to idle without a manual restart. A read-only follow-up confirmed no leftover Vitest or Playwright processes; an existing Gradle daemon remained. Repository task cancellation control has been restored to status. Avoid another high-load full test until host pressure is resolved.
- Physical Samsung S22+ unavailable. Earlier medium_phone emulator attempt failed before boot completion. No phone or physical relay was touched. Actual TalkBack, keyboard, overlays, intermittent background Capacitor triggerEvent and JS bundle optimization remain open.
