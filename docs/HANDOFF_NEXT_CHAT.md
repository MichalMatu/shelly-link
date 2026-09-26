# Handoff — Shelly BLE management

Status: **2026-09-26 — BLE read-only management + shared Plug dashboard UX accepted on Samsung S22+**

Repository: `MichalMatu/shelly-link`

Active branch: `work/shelly-ble-transport`

## Source of truth

Read in this order before changing code:

1. `AGENTS.md`;
2. nearest directory-level `AGENTS.md`;
3. `docs/ARCHITECTURE.md`;
4. `docs/ROADMAP.md`;
5. `docs/testing/hardware-matrix.md`;
6. `docs/UX_VISUAL_CONTRACT.md`;
7. this handoff for the current branch checkpoint.

Local Agent bindings are conversation-scoped. Always use the fresh bootstrap supplied to the active chat; never copy a binding from repository history.

## Current software checkpoint

Exact product head installed for final S22+ hardware acceptance:

```text
4906c346ba7488c3943111137abe533719352294
```

Final APK SHA-256:

```text
c72110b8d4016cdb412711f5f42a196b83a90924bb1ba9d2bf62e4484e5e9524
```

Latest read-only Device implementation checkpoint before final documentation/handoff commits:

```text
8b240cfc925022020fed3ceb0d11321e3a7ef53a  Test independent BLE Device read-only sections
```

Relevant implementation / cleanup checkpoints in this continuation:

```text
9b8c1d01eb8e1bb1ea58ba5e77173f47b4248352  Show read-only Device data in BLE detail
5ca6c3cd62c93c4cd441b3cd73c997323dac067c  Format BLE Device read-only panel
e14e4c24bc803d6786c7a955f6ef7df7eb151611  Remove obsolete BLE Info recovery test
8b240cfc925022020fed3ceb0d11321e3a7ef53a  Test independent BLE Device read-only sections
```

Earlier accepted checkpoints remain valid:

```text
486db40f90ec16d9dceac7d6266eb50fdfc86064  Polish Plug add speed dial
c3ffc6667f4f35b95091c740307dc9a29dc7bbcf  Add read-only BLE Plug detail
aa3cd140e8378f5446ceefc9e8d9c172aea23fb4  Share BLE read-only locator recovery
1db4d3fae8b889838cd25cba5dd4eb85b20b6fa6  Format BLE read-only recovery flow
fcb6ded01a23490afd909f3aa8386c8fe72c4b4e  Consolidate BLE management documentation
```

Do not rebuild these slices without a concrete defect.

## Accepted product state

- Wi-Fi/HTTP remains the stable management path and must not be refactored merely for BLE reuse.
- BLE RPC transport/framing and Android/Capacitor GATT binding are implemented.
- Bluetooth Add is independent of Wi-Fi Add and verifies canonical physical identity with normalized `Shelly.GetDeviceInfo.id`.
- `SavedBlePlug` stores canonical `physicalId` plus replaceable `bleDeviceId`; advertisement name/RSSI are metadata/prioritization only.
- BLE-only dashboard status and relay ON/OFF are hardware-accepted.
- Add Plug speed-dial uses the accepted L layout: Wi-Fi above `+`, Bluetooth left, equal distance, transport actions accented while expanded, click-away/Escape/trigger collapse, reduced-motion support.
- BLE-only Plug Detail is hardware-accepted as read-only and transport-aware; it does not fake an HTTP `baseUrl`.
- Read-only dashboard runtime/status and BLE Detail share the same bounded stale-locator rediscovery primitive.
- Locator replacement requires canonical `Shelly.GetDeviceInfo.id` match, persists only the refreshed BLE locator and retries the original read once.
- Relay/settings/script/config mutations are outside rediscovery and are never automatically replayed after timeout/disconnect.
- No automatic BLE↔Wi-Fi fallback or transport merging exists yet.
- Plain saved Wi-Fi and BLE-only dashboard cards now share `PlugDashboardCardShell` for the common Plug icon/name/menu, telemetry, relay controls and automation-action slot. Configured Climate/Time automation cards intentionally remain specialized because they present automation metrics and AUTO/MANUAL state.
- BLE-only uses the same automation-action slot as plain Wi-Fi but keeps `Add automation` disabled until a real BLE automation-install flow exists; it is not a fake action.

## New read-only Device slice

BLE-only Detail now uses one combined query/read model and one verified BLE transport session for Info + Device instead of opening independent GATT pipelines.

The Device summary reads only user-meaningful Shelly-owned state:

- `PLUGS_UI.GetConfig` — LED mode, power-mode brightness when present, night-mode enable/brightness/window and physical-button input mode;
- `Cloud.GetConfig` + `Cloud.GetStatus` — Cloud enabled and connected state;
- existing device identity/status data remains in Info.

Important boundaries:

- getter support is independent from setter support; `readConfig()` does not require the corresponding mutation RPC;
- PLUGS_UI and Cloud presentation are independent, so support for one does not hide the other;
- the read model stops on the first failed RPC instead of continuing unnecessary reads;
- the existing 30-second Detail refresh cadence is preserved and is now accepted on real S22+ hardware;
- one retryable BLE offline/timeout failure may invoke the existing bounded stale-locator recovery, then retry the combined read exactly once;
- the old Info-only BLE query/recovery pipeline was removed after grep proved it had no production consumer;
- no LED, button, Cloud, script or config mutation surface was added;
- Wi-Fi Device mutation flows remain unchanged and separate.

A transport-neutral read model is worthwhile at the **read/session boundary**, not as a forced rewrite of all Wi-Fi Device flows. Share package RPC schemas/clients and verified read transport ownership; keep mature Wi-Fi mutation flows intact until a real product need justifies convergence.

## What is intentionally not shown on BLE Device

Do not expand Device just because an RPC getter exists. The current product decision is to omit low-value technical/configuration data such as Wi-Fi credentials/config, BLE radio config, Cloud server endpoint, MQTT/WebSocket configuration, system location and general system config. Those belong in diagnostics or a future explicitly designed surface if a real user need appears.

## Software evidence

Repository/hygiene audit `shelly-ble-reaudit-hygiene-20260926-702` confirmed no untracked garbage, TODO/FIXME/HACK/XXX backlog or new raw BLE/fetch ownership escape in the Plug presentation boundary. The empty root `dummy` and obsolete pre-v1 `pomysly.txt` scratchpad were retired; intentional UX/hardware artifact placeholders were preserved.

The read-only Device work passed:

- `shelly-ble-device-readonly-full-gate-20260926-706`: full `pnpm check:full`, including mobile 355/355 at that checkpoint and responsive Playwright 36/36;
- `shelly-ble-readonly-postcleanup-gate-20260926-710`: shelly-client 98/98, mobile 352/352 after obsolete Info-pipeline removal, both typechecks, repository/feature gates, Prettier and `git diff --check`;
- `shelly-ble-readonly-focused-final-20260926-712`: latest LED/button/Cloud behavior, both typechecks, repository gates and Prettier all green;
- `shelly-ble-readonly-final-full-gate-20260926-713` on exact head `fe478b6b5ffacb60124562cbfe339f2a9cde4ab5`: full `pnpm check:full` PASS with shelly-client 98/98, mobile 353/353, responsive Playwright 36/36, plus formatting, lint, UX/repository gates, workspace typecheck, core coverage and builds;
- `shelly-shared-plug-card-ui-gate-20260926-734`: focused mobile 39/39, the 17 directly affected Playwright LED/button/Cloud cases, mobile typecheck, UX/repository gates, Prettier and `git diff --check` all PASS;
- `shelly-shared-plug-card-final-phone-20260926-735` on exact product head `4906c346ba7488c3943111137abe533719352294`: full `pnpm check:full` PASS, Android build/Gradle PASS, APK SHA-256 `c72110b8d4016cdb412711f5f42a196b83a90924bb1ba9d2bf62e4484e5e9524`, and install on `SM-S906B` PASS. The task later failed only because its first smoke harness incorrectly expected a `· Wi-Fi` accessibility suffix on the configured automation card, not because product/build validation failed;
- `shelly-shared-plug-card-phone-smoke-20260926-737`: corrected real-phone smoke PASS using explicit `· Bluetooth` targeting and readiness polling.

The varying mobile total reflects removal of the obsolete Info-only recovery test/pipeline and addition of the independent Device-section regression, not relaxed assertions or skipped production behavior.

## Real-device evidence accepted

Factory-fresh BLE-only Plug used for transport/runtime and final Device acceptance:

```text
physicalId        = shellyplugsg3-e4b063e3e298
bleDeviceId       = E4:B0:63:E3:E2:9A
advertisementName = ShellyPlugSG3-E4B063E3E298
model             = S3PL-00112EU
generation        = 3
firmwareId         = 20240820-134301/1.2.3-plugsg3prod0-gec79607
```

Samsung S22+ / Android 16 hardware acceptance already passed for BLE Add/runtime, status/read, relay control and stale-locator recovery. The saved locator was deliberately changed to `02:00:00:00:00:01`; read-only recovery restored `E4:B0:63:E3:E2:9A`, preserved canonical identity/metadata and made no settings/script/config mutation. Final relay state for that lifecycle acceptance was OFF.

The expanded BLE-only Device presentation is also accepted on the S22+ using exact product head `dfff96748e81f55baff22fa4b9d635b4e436e859`, installed with `adb install -r` so app data remained intact. A clean Detail load showed the full read-only state within 5 seconds:

- LED mode `Power usage`;
- power-mode brightness `100%`;
- night mode disabled;
- physical button mode `Controls relay`;
- Shelly Cloud disabled and `Not connected`;
- model `S3PL-00112EU`, gen 3;
- firmware `20240820-134301/1.2.3-plugsg3prod0-gec79607`;
- Bluetooth locator/advertisement `E4:B0:63:E3:E2:9A · ShellyPlugSG3-E4B063E3E298`.

The RPC trace completed the expected read-only sequence through `Cloud.GetStatus` and disconnected normally. After crossing the 30-second automatic refresh interval, a 42-second snapshot retained the same expected Device/Info rows with no `Refreshing` or connection-failure state. Logcat showed two BLE connect calls and two matching disconnect calls, with no app timeout/offline/failure/exception console error. No relay toggle and no settings/script/config mutation was performed during this Device acceptance.

The final shared-dashboard UX was re-accepted on the same S22+ using exact head `4906c346ba7488c3943111137abe533719352294`. The configured Wi-Fi and BLE-only cards both presented `S3PL-00112EU`; the detail-menu targets were horizontally aligned at x `884..1005`, while Android UI Automator reported only a 3 px height rounding difference. BLE remained transport-disambiguated in accessibility as `Details: S3PL-00112EU · Bluetooth`. Its card showed `0.0 W · 246 V · 0 Wh · —` and the common `Add automation` slot disabled. Opening the exact BLE target reached the shared five-tab Detail; Device again showed `Power usage`, `100%`, night mode disabled, `Controls relay`, Cloud disabled / `Not connected`, no mutation controls, and the same stable state after the 30-second refresh interval. No relay/settings/script/config mutation was performed.

Full dated evidence is recorded in `docs/testing/hardware-matrix.md`.

## Visual-contract debt

The canonical browser visual contract still contains the existing 19 deterministic states and does not have a native-GATT BLE-only Detail state. The new Device panel reuses the accepted `plug-detail-framed-section` / diagnostic-row hierarchy. Real-phone inspection is now complete; do not create a fake browser GATT harness merely to manufacture a screenshot baseline. Add a deterministic seam only if future BLE Detail work makes that worthwhile.

## Repository / branch hygiene

The branch audit found only `main`, active `work/shelly-ble-transport`, intentionally parked `work/kvs-datalogger`, and technical `agent-control`. Do not delete `work/kvs-datalogger`; Roadmap preserves it as source material for the future datalogger redesign.

Legacy size hotspots remain outside this slice (`AutomationDashboardScreen.tsx`, `InstallationDetailScreen.tsx`, global `theme.css` and several large test files). Treat file size as an alarm only when those areas are materially touched; do not expand this BLE task into mechanical splitting.

## Safe next work

1. If continuing UX convergence, migrate the plain saved Wi-Fi Plug from the older standalone `PlugSettingsScreen` into the same five-tab Detail skeleton, while preserving the mature Wi-Fi mutation flows. Do not force configured automation cards into the plain-card shell.
2. Only after explicit approval, design the first BLE **mutation** slice; preserve canonical identity verification and never auto-replay a timeout/disconnect mutation.
3. Define pairing/bonding behavior only for firmware/platform combinations that actually require it.
4. Consider a future dual-transport representation for one physical Plug before automatic transport selection/fallback.
5. Keep script/config lifecycle changes separate from BLE transport work unless a product decision explicitly requires them.

The old hardware-first BLE spike journal remains retired; durable conclusions live in Architecture, Roadmap and the hardware matrix, while detailed experiment history remains in Git history.
