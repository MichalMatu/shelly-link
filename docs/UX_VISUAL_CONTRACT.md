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

The accepted Climate/humidity Plug UI is frozen on branch `golden/climate-ui-20260928` at commit `823b51ef0d58ff731d8d25df8d54db968d97cea5`.

Protected states include the Plugs dashboard Climate card and Climate Automation, BLE, Device, Script and Info detail surfaces. Their composition, ordering, spacing, controls and tab chrome are the target design. Refactors may change implementation only if these golden renders stay unchanged.

Do not refresh Climate snapshots as part of unrelated work. Changing the frozen design requires an explicit product-design decision.

## Shared UI ownership

1. `@lcl/design-tokens` owns raw visual values.
2. `@lcl/ui` owns reusable interaction geometry and generic primitives.
3. Product composition stays in the mobile app or the owning feature.
4. If two screens represent the same role, they must reuse the same component/role instead of copying JSX or CSS.
5. Do not create parallel Time-, Climate- or device-specific visual systems when the role is already shared.

Current shared patterns include:

- `SegmentedControl` for add-device segmented navigation;
- shared Plug dashboard shell and Plug controls;
- shared Plug detail tabs and Plug Device/Info surfaces;
- shared `Disclosure` behavior;
- Thermometer presentation under `features/thermometers`.

## Product contracts

### Plug dashboard

Climate is the visual reference. Time uses the same card structure and control language; only automation-specific content may differ.

Time must not reintroduce legacy `Working`, `Daily schedule` badges, a separate `Details` footer or a parallel card layout. AUTO/MANUAL, ON/OFF, telemetry and the detail affordance follow the shared Plug pattern.

### Plug detail

Physical Plug detail is capability-driven. Reuse the shared tab and surface components. Time and Climate may expose different capabilities, but must not own separate detail chrome.

Saved-Plug forget actions remove the saved device from the app without uninstalling durable automation ownership.

Managed Climate Button Mode is read-only while Climate owns the relay; do not show a disabled editable form.

### Thermometers

Dashboard cards prioritize identity, live readings and compact telemetry. Rename, PVVX time sync, delete and technical identity belong in nested Thermometer settings, not as a cluster of permanent dashboard actions.

### Add Plug

The normal flow stays simple. Technical scan range is available through the compact `Zakres skanowania` disclosure and remains visible in its collapsed summary.

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

Before pushing a completed UX slice, run the repository-required focused checks and the final full gate. On macOS, pre-push also exercises the canonical visual contract; non-macOS environments keep responsive/behavioral coverage without redefining Darwin screenshots.
