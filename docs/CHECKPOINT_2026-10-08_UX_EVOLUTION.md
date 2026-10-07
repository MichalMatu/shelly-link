# Checkpoint — Ionic UX evolution

Date: 2026-10-08

Repository: `MichalMatu/shelly-link`

Development branch: `work/ux-evolution`

Base branch remains `main`. The UX branch was created from `main@7e9fdaa5f7d7c514313d2c962a2cc02bb26615b7`; no UX migration commits have been merged into `main`.

## Purpose

This branch is the isolated development line for gradually replacing hand-built standard controls with Ionic React where that reduces custom interaction code, while preserving Shelly Link product composition, LCL design tokens and the frozen Climate visual contract.

The migration is deliberately incremental. Ionic owns standard interaction behavior; LCL tokens own the visual language; product feature components continue to own Shelly Link-specific composition.

## Completed migration slices

The current branch includes:

- growth-aware performance budgets instead of fixed limits that would immediately block normal application growth;
- `setupIonicReact()` initialization for the installed Ionic React runtime;
- Settings Appearance migrated to `IonSegment` / `IonSegmentButton`;
- Settings Language migrated to `IonSelect` / `IonSelectOption`;
- generated LCL RGB color companions used by the Ionic theme bridge;
- Ionic background/text/primary mappings plus the intermediate `--ion-color-step-*` scale derived from LCL light/dark tokens;
- Settings-specific focus/selected-state styling that avoids relying on the raw Ionic default palette;
- the Settings Ionic controls isolated behind a lazy-loaded `IonicSettingsControl` module so the heavier framework control graph is not imported directly by the rest of the Settings screen.

Existing locale and theme preference owners remain unchanged. The migration does not move product state or side effects into Ionic components.

## Validation checkpoint

The code checkpoint at `53bb7b5c8558992a881a081698d2394222af98dc` was validated through draft PR #113 solely to run repository CI.

CI run `37703419452` passed:

- static;
- tests;
- build;
- responsive;
- aggregate checks.

The draft PR was then closed without merge.

This proves repository CI at the checkpoint. It does **not** replace the separate physical Android acceptance requirement or a Darwin canonical visual review when a future slice materially changes rendered geometry.

## Cleanup

The temporary validation PR is closed and unmerged.

Orphaned Local Agent payload files created while recovering the interrupted Settings task were removed from the `agent-control` queue. Historical result/task records remain normal control-plane history and are not product source.

## Current boundaries

Do not use this branch as permission for a broad visual rewrite.

Keep these boundaries:

- frozen Climate dashboard/detail composition remains unchanged;
- `@lcl/design-tokens` remains the visual source of truth;
- Ionic is preferred for standard controls where it removes custom focus/keyboard/overlay behavior;
- product-specific cards, telemetry, History, Plug runtime controls and safety presentation remain Shelly Link components;
- shared `@lcl/ui` primitives are not automatically replaced when doing so would introduce Ionic into a package boundary or erase a real product role.

## Recommended next slice

The next small migration should stay inside Settings: migrate the Diagnostics secondary action buttons (copy support report / clear diagnostics) to `IonButton`, keeping their existing behavior and visual role.

Why this is next:

- same already-migrated non-frozen screen;
- no device/BLE/runtime behavior;
- no Climate golden-master risk;
- can reuse the existing lazy Ionic Settings boundary;
- gives a small, reviewable proof for framework buttons before touching shared Add Plug navigation, global overlays or device-setting surfaces.

After that, reassess Add Plug segmented navigation. It is a larger contract change than it first appears because `quality:ux` currently enforces the shared `@lcl/ui SegmentedControl` for add-device navigation.
