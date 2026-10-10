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
- Android debug APK was built/synced/assembled from `34995a8442b1f760d6ebd0fe3d1baf4948522513`, SHA-256 `37acd5235e3b728e3d643b5c3ba4ccde1de7109f12e09b3e72710da6862bb071`, size 5,179,520 bytes. **Not installed**: Wireless ADB mDNS returned no services and `adb devices` returned no device on 2026-10-10. No uninstall or data clear was performed; new phone acceptance requires reconnection, `adb install -r`, cold start, logs and screenshots.

Remaining: continue only reviewed safe standard-control slices, preserve frozen Climate layout, evaluate navigation/modal interoperability and CSS cleanup, reconnect physical Samsung S22+ for preserving-data acceptance, and complete an end-to-end rerun before declaring full Ionic completion. Do not merge `main` without the user's explicit instruction.
