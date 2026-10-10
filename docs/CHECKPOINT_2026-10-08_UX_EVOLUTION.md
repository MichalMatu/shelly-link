# UX evolution checkpoint — updated 2026-10-10

Repository: `MichalMatu/shelly-link`. Continue **only** on `work/ux-evolution`; do not merge or edit `main` as part of this checkpoint.

## Active product contract

- Ionic React is initialized and themed through LCL design tokens.
- Settings, Add Plug, Add Thermometer, and standard Plug settings controls already use Ionic. Do not undo completed slices.
- Plug physical-button behavior has two directly visible Ionic radio choices rather than a small alert/select modal. The Climate-owned read-only button mode remains read-only.
- No cross-app redesign: Climate dashboard/detail composition and runtime/safety boundaries stay frozen. The narrowly reviewed Ionic form control geometry is documented in `docs/UX_VISUAL_CONTRACT.md`.
- React displays device state; Shelly remains the source of truth for automation behavior, safety, and relay control.

## Systemic user-facing data presentation

The source fix is shared presentation, not just replacing the visible `Automation reason: ab` incident:

- `apps/mobile/src/app/runtimeReasonPresentation.ts` translates known compact Climate/Pulse runtime codes. `ab` gets the localized _above threshold_ label, Pulse-specific codes take precedence when overlapping, and unknown codes receive a neutral translated fallback instead of raw wire values.
- Supported Pulse reasons now include window and lockout states across supported languages.
- UI boundaries for configuration, BLE, provisioning, and firmware no longer concatenate arbitrary exception payloads into messages.
- `mutationError` at hardware setup preserves only an explicit allowlist of already-localized, actionable guidance (such as Bluetooth permission steps, missing Shelly Scripts, and invalid Shelly responses). Unknown technical text becomes `common.operationFailed`.
- Shelly address validation distinguishes an empty field from a malformed address with localized, actionable feedback.
- Non-finite diagnostic measurements render as missing instead of `NaN` or `Infinity`.
- `scripts/quality/ux-gate.mjs` detects selected unsafe runtime reason/error patterns; `quality:selftest` exercises both passing and deliberately failing fixtures. New focused tests guard the reason formatter and safe feedback boundary.

This is a guardrail, not a claim that every future API payload or third-party error string has already been exhaustively classified. Expand explicit localized mappings as new real-world codes are discovered; never expose unrecognized data by default.

## E2E and visuals

- Responsive E2E improved from **23/50** at the start of this effort to **50/50 passing** on the final verified source `3ef4f5752a791edcf7b8fb90f019a7e3066c1439` (0 skipped, 0 unexpected, 0 flaky).
- The BLE scan-loading screenshot `04-plug-ble-discovery` remains unchanged; E2E now holds its scanner RPC preparation to capture a stable loading state, then verifies that failure feedback is localized separately.
- Five specifically reviewed Darwin screenshots were accepted for intentional Ionic presentation differences: `05-climate-device`, `17-plain-plug-settings`, `28-thermometer-settings`, `20-climate-button-mode-managed`, and `15-add-plug`. No general snapshot refresh was authorized.
- The scan network action has been restored to full width, including its touch area. No layout rewrite of frozen Climate was undertaken.
- `pnpm quality:ux` and the 27-case `pnpm quality:selftest` passed during snapshot acceptance; all commit hooks passed.
- Final full `pnpm check` **passed** on `3ef4f5752a791edcf7b8fb90f019a7e3066c1439` (format, lint, quality, tests, typecheck, builds and performance budget). The performance gate still flags intentional JS growth for review, without exceeding hard limits.

## Android acceptance

The current UX code candidate `7ffe113224b079ce3cdd766eee3cedcd7287bddb` was built, synced through Capacitor, and assembled as an Android debug APK (SHA-256 `4d370cde0589bec3dd11f454f855b0952bc3aaba16b1f8ad5c714a1f075a563a`).

Wireless ADB was verified on 2026-10-10 using the user-provided endpoint `192.168.0.100:40973`. The device responded as `SM-S906B`, Android 16, wireless debugging enabled. The endpoint is session-specific and may change; rediscover or reconnect when needed.

On 2026-10-10, `adb install -r` returned `Success` on Samsung S22+ / Android 16 without uninstall or data clearing. Android still reports `firstInstallTime=2026-09-28` and `lastUpdateTime=2026-10-10`. A subsequent cold start succeeded in **891 ms**, with `MainActivity` resumed, the app process running, and a 1080 × 2340 screenshot captured. A later stable screenshot confirmed readable English labels (including `Automation reason: Above threshold`) and a usable dark-mode dashboard for both Humidifier and Fan. The log contains platform/WebView/Capacitor warnings but no observed fatal startup error. Do not use the destructive `android:phone-alpha` helper for future preserving-data checks.

## Acceptance and handoff

The UX reliability/presentation stage is **verified**: final `pnpm check` passed, responsive E2E passed 50/50, and physical Android build/install/cold-start/screenshot were verified. The installed APK was built from `7ffe113224b079ce3cdd766eee3cedcd7287bddb`; subsequent commits through `3ef4f5752a791edcf7b8fb90f019a7e3066c1439` changed only documentation formatting. The installed application code therefore matches the verified product source.

No outstanding functional or visual regression is recorded from this stage. Future work can separately review JS growth reported by the performance gate and any new real-world diagnostic codes. Leave `main` untouched until explicitly instructed to merge. Do not use subchats for this work.

## Full Ionic migration continuation — 2026-10-10

This is a **subsequent, still-in-progress component migration**, separate from the already accepted UX reliability stage above. The isolated branch remains `work/ux-evolution` and `main` is untouched.

- `IonApp` now encloses the existing shell. Time and standalone Pulse standard controls/actions use `IonInput`, `IonSelect`, `IonSegment` and `IonButton`; Plug, Thermometer and saved Shelly inline renaming use `IonInput`, and the LED HSL picker uses `IonRange`.
- Existing Climate composition is preserved; its advanced numeric/rule controls remain an explicitly sensitive migration slice. The app still has bespoke page navigation, icon/gesture controls and CSS—do **not** call the whole Ionic migration complete.
- All six Ionic adaptation regressions were fixed with public Ionic host/event tests. One parallel-load race in a BLE polling test was deterministically gated, with **no change** to BLE runtime behavior.
- Full `pnpm check` **passed** on code commit `89e95b43f9352f2653417658272b3a0bf2e93bdb`, including **546/546 mobile tests**, package coverage, builds and hard performance limits. JS-size review warnings remain.
- Complete responsive E2E passed **50/50**, 0 failed, 0 skipped and 0 flaky on `34995a8442b1f760d6ebd0fe3d1baf4948522513`. The reviewed `11-time-detail` snapshot is the only code-independent change after the final source check. All accepted Climate screenshots remained unchanged.
- Android debug APK was built/synced/assembled from `34995a8442b1f760d6ebd0fe3d1baf4948522513`, SHA-256 `37acd5235e3b728e3d643b5c3ba4ccde1de7109f12e09b3e72710da6862bb071`, size 5,179,520 bytes. Wireless ADB mDNS initially failed to find the device, but explicitly reconnecting to the user's prior address `192.168.0.100:40973` succeeded. Verified Samsung `SM-S906B` / Android 16, then `adb install -r` returned `Success`, **without uninstalling or clearing application data**. Cold start finished in **628 ms**, the process remained live and a 1080 × 2340 screenshot was captured. Logcat showed Android/Chromium/Capacitor warnings, not a fatal startup exception.
- The follow-up census reported **80 native HTML controls in 36 production TSX files** (including custom navigation, icon, relay and gestures). This figure is not a completion percentage. The majority of normal Time/Pulse/Plug settings controls have moved to Ionic, but some plain actions and special controls remain; do not claim zero legacy controls.
- A narrow attempt to replace Climate's seven numeric fields and two checkboxes with Ionic passed 72/72 targeted unit tests but produced an unacceptable ~5% visual drift in `16-climate-setup` (15,432–15,480 pixels, missing native-looking borders/units during iteration). **All changes from this experiment were reverted** on `work/ux-evolution`; a source comparison to `f9f4d33f0e2af43088c04ecadb7a11f65b9aa943` showed no remaining code diff. Do not update Climate golden snapshots simply to declare migration complete.
  Remaining: continue only reviewed safe standard-control slices, preserve frozen Climate layout, evaluate navigation/modal interoperability and CSS cleanup, and complete an end-to-end rerun before declaring full Ionic completion. Do not merge `main` without the user's explicit instruction.

## Independent Ionic audit handoff — 2026-10-10

- Final safe source rollback commit: `ceb48075b62f102811d679c3bfbf604df4f3ad23`. Compare against `f056eb706242126d1d2c36d1bf0db5cb16e2d773`: **zero changed files**. Compare against approved device source `34995a8442b1f760d6ebd0fe3d1baf4948522513`: only handoff/contract documentation differs.
- An attempted follow-up `IonicActionButton` batch migrated ordinary actions and confirmation-dialog buttons. TypeScript and the UX gate passed, but the wider tests surfaced incompatible Ionic host locators and modal-action interaction regressions (17 failures in the affected run). The entire 16-file experiment, including its modal focus-trap alteration, was reverted. **Do not reapply it wholesale.**
- The working Ionic features from previous phases remain: Settings, Add Plug, Add Thermometer, Plug controls, Time/Pulse, inline device names, LED ranges, and the `IonApp` root. Existing native controls in deliberate navigation/gesture/relay widgets and frozen Climate settings are **not evidence of a broken installation**, but still need a component-by-component classification before anyone claims 100% Ionic conversion.
- Closeout acceptance requires green full `pnpm check`, unchanged Climate screenshots, responsive E2E 50/50, and — if source changes again — a new Android build and `adb install -r` with data preserved. The previously accepted APK and physical-phone evidence remain valid because the product sources are unchanged.
- A new chat should perform an **independent adversarial audit**, prioritize overlooked standard controls and accessibility, fix verified omissions in narrowly scoped slices, and only then decide whether the migration can be called complete. Never bulk-update snapshots to hide Climate drift, alter `main`, or delegate to subchats.

## Independent Ionic adversarial audit — 2026-10-10 (current)

The historic completed UX-reliability stage above must not be confused with the **still-unfinished** Ionic component closeout. The latest verified **application** commit is `81b36f78e4ed3e4bbce171d8c97a1e0b531ece2f`; subsequent dated-evidence edits are documentation-only. All work stayed on `work/ux-evolution`, without touching `main`.

- Full `pnpm check` passed, including **549/549** mobile tests; canonical responsive and Darwin visual E2E passed **50/50**, no snapshot updates. Capacitor Android sync/build passed; APK SHA-256 `db33815dfcc43b909dee24a76a0300f4fbe08e4795f7fc240b0b19891b2ab552`.
- Data-preserving `adb install -r` on Samsung S22+ / Android 16 succeeded, then a **1005 ms** cold start, foreground activity, real 1080 × 2340 screenshot and UIAutomator labels. **Not a clean Android runtime closeout:** logcat recorded a nonfatal `Capacitor/Console` unhandled `triggerEvent` TypeError. Wireless ADB reconnected successfully. Installed WebView is stable `com.google.android.webview` **153.0.8010.57**, with no beta/dev/canary provider installed. Three further cold starts (593/533/573 ms) and three cold-start-plus-system-Back trials showed **zero** `triggerEvent`, Capacitor console or native fatal errors. Original one-off `triggerEvent` remains unexplained and intermittent; no speculative patch or app-data mutation was made.
- Remaining native production HTML controls: **75 in the app** (65 buttons, 10 frozen Climate inputs), plus separate shared UI primitives. Some buttons are intentionally custom navigation/gesture/relay/LED/time-wheel widgets; **ordinary action buttons still remain**. Do not declare migration complete, revert Climate's visual freeze or repeat the failed bulk modal/primary-action conversion.
- JS performance review remains open: 2,369,824 B total, 1,043,584 B largest (initially loaded `ion-icon` chunk), 20 JS chunks. Hard budget passes; review thresholds fail. Only demonstrably unused checkbox CSS was removed.
- Detailed evidence, exact remaining categories, Android caveats and ordered gates: `docs/testing/2026-10-10-ionic-independent-audit.md`. Diagnose Android bridge/WebView first; finish audited standard actions and accessibility; rerun all acceptance gates after **any** further product changes. No background task is implied by this checkpoint.

### Ionic BLE restart and S22+ corrected acceptance (2026-10-10)

Latest **product** change: `c71845097ac448eaf1b5d4a80c246f6c167fdb63`.
The Shelly BLE standalone restart action uses `IonButton` with unchanged
busy/disabled/onClick behavior. The app now has **74** native controls,
classified file-by-file in `docs/testing/2026-10-10-ionic-native-control-census.md`.

The full `pnpm check` passed with **549/549** mobile tests, and Android sync
and debug build passed. The installed APK hash is
`5f40e523285643ce70a32a973869d62c19b960a10c5265e395fc216a3c5f1544`.
Full responsive/visual E2E still had **49/50** on two attempts, caused by
different cases (Time/Pulse visual 3% and LED timeout); both passed in
isolation without code or snapshot changes. A full rerun was queued.
Do not mark this product commit fully accepted until a clean full run exists.

The first 712-ms S22+ cold launch was immediately backgrounded on a dark
screen and the screenshot was effectively blank, so it did not verify UI.
A corrected test with the screen awake kept the app truly foregrounded:
cold start **515 ms**, actual 1080 × 2340 screenshot (172,321 B), and
UIAutomator **75 nodes / 45 labels**. No `triggerEvent` in that start.
The exception had occurred when `Capacitor: App stopped`; this background
race is still unexplained. Physical app data remained preserved.
Do not treat the one clean focused launch as full TalkBack/keyboard sign-off.

Current evidence and gaps:
`docs/testing/2026-10-10-ionic-independent-audit.md`.
