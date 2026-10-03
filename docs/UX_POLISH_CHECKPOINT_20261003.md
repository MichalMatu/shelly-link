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

## Next slice

Continue UX polish with **Time Detail / standalone Pulse Detail hierarchy** only. Desired information order:

1. current operational status;
2. clearly separated configuration;
3. editing where supported (Time only);
4. clearly separated destructive uninstall action.

Constraints:

- do not change Climate detail or frozen Climate golden surfaces;
- do not add runtime controls to standalone Pulse detail;
- do not change Time/Pulse runtime, transport, persistence, polling, device identity checks, deletion semantics, or mutation lifecycle;
- retain existing tabs/capabilities and current safe delete modals;
- add/review canonical visual evidence for standalone Pulse detail; existing Time detail visual is `11-time-detail`.

## Post-checkpoint progress

- `9accb1bb818a76b003ef0bd8f3656e124e78df9a` completed the Time / standalone Pulse detail hierarchy. Canonical `11-time-detail` was refreshed and `29-standalone-pulse-detail` was added; canonical visual and `pnpm check:full` passed.
- Next evidence-only slice adds a canonical BLE-only Plug Detail state; no product runtime or device behavior is changed.
