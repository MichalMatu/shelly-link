# UX visual contract

This document defines the current visual rules. Historical audit notes, one-off debugging details and superseded measurements do not belong here.

## Source of truth

- Canonical screen names live in `apps/mobile/e2e/visual-contract.ts`.
- Canonical screenshot baselines live next to `apps/mobile/e2e/responsive.spec.ts`.
- Canonical visual viewport: `412×915`.
- Canonical renderer: macOS (`darwin`).
- `pnpm quality:ux` protects frozen visual assets and shared UX rules.

New top-level screens or materially different full-screen states must be added to `visual-contract.ts` and receive a reviewed baseline in the same change.

## Frozen Climate golden master

The accepted Climate/humidity Plug UI is frozen at immutable commit `823b51ef0d58ff731d8d25df8d54db968d97cea5`; the deleted historical branch name is not part of the contract.

Protected states include the Plugs dashboard Climate card and Climate Automation, BLE, Device, Script and Info detail surfaces. Their composition, ordering, spacing, controls and tab chrome are the target design. Refactors may change implementation only if these golden renders stay unchanged.

Do not refresh Climate snapshots as part of unrelated work. Changing the frozen design requires an explicit product-design decision.

History/Datalogger is the explicit product-design exception approved for the current v1 slice: Climate Detail intentionally expands the shared tab chrome from five to six items by adding **History**. The existing Automation, BLE, Device, Script and Info composition remains frozen; only the tab chrome delta and the History surface receive refreshed/reviewed baselines.

The accepted History surface is a vertically stacked set of five compact metric panels: **Temperature, Humidity, Output, Power and Current**. Each panel owns its own Y scale and current-value/range presentation; unlike units are never normalized onto one shared visual axis. Temperature, humidity, power and current use calm independent domains with meaningful minimum spans so tiny sensor noise does not fill the card. Power and current remain zero-aware. Continuous series use `monotoneX` smoothing, a restrained area tint, subtle metric-colored glow and a latest-value point. Output is deliberately different: a crisp square step track with horizontal/vertical transitions only, no curve smoothing and no filled polygon.

The five panels share the same elapsed-time X domain and one compact time row below the stack. The old interactive legend, crosshair and tooltip are removed from the accepted design because each metric is already continuously visible with its current value and range. VPD remains available in the typed History data/scaling layer but is not part of the accepted five-panel phone stack. Real Shelly timestamps remain preferred, monotonic uptime is the fallback, and record order is the final fallback. `@nivo/line` remains the approved production chart dependency for the continuous panels.

History cards use the existing design-token system for dark/light surfaces, borders, radius and shadows; do not introduce raw parallel color systems. Climate keeps the accepted five-panel stack. Standalone Pulse reuses the same History surface with exactly three panels: **Output, Power and Current**; Temperature, Humidity and VPD stay absent. The canonical Pulse History state is `31-standalone-pulse-history`. Both profiles must retain no horizontal page overflow.

## Shared UI ownership

1. `@lcl/design-tokens` owns raw visual values.
2. `@lcl/ui` owns reusable interaction geometry and generic primitives.
3. Product composition stays in the mobile app or the owning feature.
4. If two screens represent the same role, they must reuse the same component/role instead of copying JSX or CSS.
5. Do not create parallel Time-, Climate- or device-specific visual systems when the role is already shared.

Current shared patterns include:

- `SegmentedControl` for setup and add-device segmented navigation;
- shared Plug dashboard shell and Plug controls;
- shared Plug detail tabs and Plug Device/Info surfaces;
- shared `Disclosure` behavior;
- Thermometer presentation under `features/thermometers`;
- one shared `PulseCycleEditor` / pulse form model for Climate, Time and standalone Pulse setup.

## Product contracts

### Plug dashboard

Climate is the visual reference. Time uses the same card structure and control language; only automation-specific content may differ.

Time must not reintroduce legacy `Working`, `Daily schedule` badges, a separate `Details` footer or a parallel card layout. AUTO/MANUAL, ON/OFF, telemetry and the detail affordance follow the shared Plug pattern.

Time and standalone Pulse dashboard cards are status-first: current operational status appears before a compact schedule/cycle configuration summary. Configuration remains visible but secondary. Climate keeps its frozen live-metric composition. Canonical dashboard states are `10-time-dashboard` and `27-standalone-pulse-dashboard`.

### Plug detail

Physical Plug detail is capability-driven. Reuse the shared tab and surface components. Time and Climate may expose different capabilities, but must not own separate detail chrome.

Time and standalone Pulse Automation detail are configuration-focused and deliberately do not repeat the healthy operational summary already visible on the dashboard. Runtime/offline/ownership warnings may still appear when action is required. Time edits its schedule inline; standalone Pulse keeps the shared Pulse-cycle editor directly visible. The destructive uninstall action is visually separated without another nested card. Runtime AUTO/MANUAL and direct relay controls remain dashboard-only. Climate detail keeps its accepted composition. All installed-automation variants derive tab/icon/history/script availability from the shared automation Detail capability owner rather than hard-coded per-screen lists. Canonical states are `11-time-detail` and `29-standalone-pulse-detail`.

Saved-Plug forget actions are available only when no installed automation owns that physical Plug. When ownership exists, removal is blocked with an explanation and a direct route to the owning automation. Thermometer removal lives in nested Thermometer settings rather than on the dashboard card; removal is blocked when an installed Climate automation references that thermometer, with a direct route to the owning automation.

Managed Climate Button Mode is read-only while Climate owns the relay; do not show a disabled editable form.

BLE-only Plug Detail exposes only the Device and Info capabilities; unsupported Automation, BLE and Script tabs stay absent. The canonical browser state is `30-ble-only-plug-detail`.

### Thermometers

Dashboard cards prioritize identity, live readings and compact telemetry. Rename, PVVX time sync, delete and technical identity belong in nested Thermometer settings, not as a cluster of permanent dashboard actions. The nested page groups Identity, Live readings and Device actions; its canonical state is `28-thermometer-settings`.

### Add Plug

The normal flow stays simple. Technical scan range is available through the compact `Zakres skanowania` disclosure and remains visible in its collapsed summary.

### Pulse setup/editor

Climate and Time use the same optional Pulse editor: `Zachowanie wyjścia` stays compact in Steady mode and reveals the shared Pulse-cycle fields only after selecting Pulse. Standalone Pulse uses the exact same editor/model with Pulse always active rather than introducing a parallel form.

Canonical accepted states are `24-climate-pulse-setup`, `25-time-pulse-setup` and `26-standalone-pulse-setup`. The intentional product-entry/setup deltas also update `08-automation-intent`, `09-time-setup` and `16-climate-setup`. The frozen Climate Automation detail golden remains unchanged; new setup controls must not leak into that legacy inline detail composition without an explicit product-design decision.

## Accepted baseline

The status-first Time/standalone Pulse hierarchy, nested Thermometer settings, capability-driven Plug detail, shared setup navigation and shared Plug dashboard feedback ownership are accepted product contracts. Historical test counts and host-specific qualification notes belong in Git history or dated testing evidence, not here.

## Surface roles

Keep intentional roles distinct:

- `demo-panel` — page-level working panel;
- `automation-card` — object card;
- `app-settings__section` — settings group;
- `saved-list__item` — saved-device card/row;
- `plug-detail-framed-section` — titled diagnostic/settings fieldset;
- `installation-ble-card` — bordered list container;
- `lcl-card` — generic package-level card primitive.

Do not normalize these by copying radius/padding values between selectors. A new surface role requires an explicit contract update and reviewed visual delta.

## Visual rules

- Page-level H1 geometry belongs to `app-page-header`.
- Shared component geometry must not be redeclared in screen CSS.
- `Disclosure` controls collapsed/expanded visibility; screen CSS must not bypass it.
- Navigation chevrons use icon components, not font glyphs.
- Inline titles crossing `plug-detail-framed-section` borders use the shared masked legend treatment.
- Add Plug speed-dial keeps the primary `+` fixed; Wi-Fi is above it and Bluetooth to its left with matching center distance.
- Snapshot updates are never used only to make a failing refactor green. Explain and review the visual delta first.

## Verification

Normal visual verification:

```sh
pnpm quality:ux
pnpm e2e:visual
```

For an intentional visual change:

```sh
pnpm e2e:visual:update
pnpm e2e:visual
```

Before pushing a completed UX slice, run the repository-required focused checks and the final full gate. The pre-push hook is intentionally limited to the fast UX/repository policy gates and does not run responsive or canonical visual acceptance. Run `pnpm e2e:visual` explicitly on macOS when Darwin screenshot acceptance is required, and run `pnpm e2e:responsive` when responsive acceptance is required; CI remains authoritative for its configured responsive gate.
