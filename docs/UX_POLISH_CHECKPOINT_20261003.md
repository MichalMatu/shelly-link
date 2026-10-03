# UX polish checkpoint — 2026-10-03

Branch: `ux/polish-foundation-20261003`
Checkpoint head before this document commit: `7d77d4be65a60c3f2c3e3d2e4ca0b8e6647f6897`
Base: `main@2c5531c5b72a452bccbe3ccd123ad9bd52fa5c97`

## Completed UX slices

- Plain Wi-Fi and BLE-only Plug Detail now show only supported capability tabs; unsupported Script/Automation/BLE tabs are hidden rather than disabled.
- Standalone Pulse Script copy uses app toast feedback for success/failure.
- Setup top navigation reuses shared `@lcl/ui` `SegmentedControl`; tests now assert the correct `tablist` / `tab` semantics.
- Time and standalone Pulse dashboard cards are status-first: current operational state precedes compact configuration and mode controls. Climate dashboard composition remains untouched.
- Dashboard presentation styles are owned by the dedicated `automation-dashboard` feature rather than legacy screen CSS.
- Thermometer dashboard opens a real Thermometer Settings route. The dashboard card is reduced to live identity/readings/status plus one settings affordance; settings owns `Identity`, `Live readings`, and `Device actions` groups.
- Canonical visual contract includes standalone Pulse dashboard and Thermometer Settings.

## Qualification already passed

For the completed slices above, the final qualified line passed:

- mobile Vitest: 109/109 files, 498/498 tests;
- focused Thermometer/settings tests: 73 passing;
- responsive Playwright: 49/49;
- canonical visual contract on macOS;
- product matrix / coverage / build / performance gates;
- `pnpm check:full`, with mobile Vitest run at `--maxWorkers=2` on the 8 GB Mac after two unrelated 5-second timeout flakes under maximum concurrency. No test timeout or repository expectation was weakened.

## Android emulator inspection

Real Android AVD inspection was performed from exact product head `7d77d4be65a60c3f2c3e3d2e4ca0b8e6647f6897` using a lighter local `google_apis` image after the original Google Play Android 36 profile caused host swap/boot thrash.

WebView evidence:

- CSS viewport: `412x891`, DPR `2.625`;
- `scrollWidth == clientWidth == 412` on both inspected states, so no horizontal overflow;
- Thermometers dashboard exposed `Przedpokój`, live Temperature/Humidity metrics, one Thermometer Settings affordance, and persistent bottom navigation;
- Thermometer Settings exposed exactly `Ustawienia termometru`, `Tożsamość`, `Odczyty na żywo`, `Akcje urządzenia`, `Ustaw czas`, delete action, and persistent bottom navigation.

Durable emulator evidence lives on separate branch `inspection/android-emulator-20261003` (full device PNGs, DOM reports, and reduced previews). The first recovered device screenshot contains a transient Android `System UI isn't responding` dialog. Therefore use this evidence for real-device geometry/flow/overflow confirmation, but do not promote the contaminated device screenshot to a golden visual baseline. Canonical visual acceptance remains the macOS Playwright contract.

## UX polish closeout

Completed after the original checkpoint:

- `9accb1bb818a76b003ef0bd8f3656e124e78df9a` established the Time / standalone Pulse detail hierarchy. Canonical `11-time-detail` was refreshed and `29-standalone-pulse-detail` was added.
- `f1bf7c4f8e4659f0380aea45f81d4239e9d483f1` added canonical `30-ble-only-plug-detail`, proving that BLE-only Plug Detail exposes only supported Device and Info capabilities.
- `e217a2725651d580621026339eb5134471267dcd` removed duplicated automation-card feedback markup. The final ownership cleanup keeps that shared feedback role beside `PlugDashboardCardShell` in `features/plugs` and reuses it for Climate, Time, standalone Pulse and BLE-only Plug cards.

Final audit findings:

- setup top navigation is the shared `SegmentedControl`; the retained `setup-top-nav` selectors are styling hooks, not a second navigation implementation;
- no hard-coded `'Pulse'` UI label remains in `HardwareSetupScreen`;
- `AppPageBack` remains only in nested discovery/settings flows, not the top-level Add Plug/Add Thermometer pages;
- Plug Detail capability filtering uses `availableTabs`, including BLE-only Device + Info and the qualified Time/Pulse capability sets;
- the remaining direct Clipboard API call sites all surface success/failure feedback;
- broad internal `climate` / `time` naming is implementation vocabulary and is deliberately not renamed in this UX slice.

Qualification note:

- one default-concurrency `pnpm check:full` attempt on the 8 GB Mac produced six heterogeneous mobile-test failures (492/498 passed), including an existing 5-second timeout and asynchronous mock interference across unrelated `hardware-setup` / `climate-delete` tests;
- the same tree passed the complete mobile suite 498/498 with `--maxWorkers=2`; no timeout or expectation was weakened;
- the stable full qualification path runs format/lint/quality/typecheck, all non-mobile tests, mobile Vitest at two workers, Product Matrix, core coverage, build/performance, full responsive E2E and canonical visual comparison;
- final visual acceptance must remain zero-delta for this ownership refactor.

## Deferred beyond UX polish

- safe standalone Pulse inline edit/replacement lifecycle;
- generalized temporary BLE discovery restoration before active standalone Pulse BLE scanning;
- watchdog/recovery/soak stabilization and the final real-hardware matrix;
- final V1 release qualification.

`main` remains unchanged by this UX branch until an explicit merge decision.
