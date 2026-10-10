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

- Responsive E2E improved from **23/50** at the start of this effort to **50/50 passing** on source `593b36c3b93473d86a405240a5385486fcd93df2` before the subsequent focused localization/validation changes.
- The BLE scan-loading screenshot `04-plug-ble-discovery` remains unchanged; E2E now holds its scanner RPC preparation to capture a stable loading state, then verifies that failure feedback is localized separately.
- Five specifically reviewed Darwin screenshots were accepted for intentional Ionic presentation differences: `05-climate-device`, `17-plain-plug-settings`, `28-thermometer-settings`, `20-climate-button-mode-managed`, and `15-add-plug`. No general snapshot refresh was authorized.
- The scan network action has been restored to full width, including its touch area. No layout rewrite of frozen Climate was undertaken.
- `pnpm quality:ux` and the 27-case `pnpm quality:selftest` passed during snapshot acceptance; all commit hooks passed.
- Final full `pnpm check` **passed** on `3ef4f5752a791edcf7b8fb90f019a7e3066c1439` (format, lint, quality, tests, typecheck, builds and performance budget). The performance gate still flags intentional JS growth for review, without exceeding hard limits.

## Android acceptance

The current UX code candidate `7ffe113224b079ce3cdd766eee3cedcd7287bddb` was built, synced through Capacitor, and assembled as an Android debug APK (SHA-256 `4d370cde0589bec3dd11f454f855b0952bc3aaba16b1f8ad5c714a1f075a563a`).

Wireless ADB was verified on 2026-10-10 using the user-provided endpoint `192.168.0.100:40973`. The device responded as `SM-S906B`, Android 16, wireless debugging enabled. The endpoint is session-specific and may change; rediscover or reconnect when needed.

On 2026-10-10, `adb install -r` returned `Success` on Samsung S22+ / Android 16 without uninstall or data clearing. Android still reports `firstInstallTime=2026-09-28` and `lastUpdateTime=2026-10-10`. A subsequent cold start succeeded in **891 ms**, with `MainActivity` resumed, the app process running, and a 1080 × 2340 screenshot captured. The log contains platform/WebView/Capacitor warnings but no observed fatal startup error. Do not use the destructive `android:phone-alpha` helper for future preserving-data checks.

## Completion criteria and handoff

1. Obtain a green `pnpm check` on the final UX head; if failure, fix root cause and retain meaningful translated user-facing errors.
2. Confirm complete responsive E2E on the final head, without indiscriminate snapshot updates.
3. Build/sync/assemble and install via Wireless ADB with `install -r`, then inspect the cold start, log warnings, and an actual phone screenshot.
4. Record exact source commit, test result, and device acceptance here and in the UX section of `docs/HANDOFF_NEXT_CHAT.md`.

Leave `main` untouched until explicitly instructed to merge. Do not use subchats for this work.
