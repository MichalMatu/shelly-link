# Handoff — Plug provisioning, OTA and transport promotion

Status: **2026-09-27 — hardware accepted and final full software gate passed**

Repository: `MichalMatu/shelly-link`

Active branch: `work/shelly-ble-transport`

## Accepted evidence

Real-device provisioning/OTA/time-sync source: `21d8675470a3d6425b0733cc708bdff55cb0d2cd`.

APK SHA-256: `59c0bcbdc4122c565df43f3918437410ccca27a079acb790e634e7803dbd2c35`.

Installed in-place with `adb install -r` on Samsung SM-S906B / Android 16, preserving app data. Factory Plug: `shellyplugsg3-e4b063e3e298`, model `S3PL-00112EU`.

Accepted hardware flow:

```text
BLE discovery
-> canonical Shelly.GetDeviceInfo.id verification
-> Shelly.ListMethods
-> Wifi.Scan over BLE
-> one Wifi.SetConfig
-> read-only Wifi.GetStatus polling
-> persist verified wifiBaseUrl on the same Plug
-> promote normal management to verified HTTP
-> Shelly.CheckForUpdate
-> one Shelly.Update(stage=stable)
-> read-only reconnect after reboot
-> verify same physicalId and expected firmware
-> refresh capabilities
-> Sys.SetTime over preferred verified transport
```

Observed result: firmware `1.2.3` did not advertise `Sys.SetTime`; Wi-Fi provisioning succeeded and reported `192.168.0.17`; HTTP verification matched the same canonical id; stable `2.0.1` was offered; one explicit update produced `fw_id=20260923-075613/2.0.1-ge1a198b`; post-update `Shelly.CheckForUpdate` was empty; `Sys.SetTime` then appeared in `Shelly.ListMethods`; the user confirmed time synchronization works. No relay mutation was performed.

## Current source state

After hardware acceptance, repository-gate cleanup changed only formatting/test typing plus the Wi-Fi network picker from native `<select>` to shared `@lcl/ui SelectField`. Final software-gated source: `5059feaaa654a2522f65b57bd0918652ac9a46ca`. Do not claim that later selector presentation was separately re-accepted on hardware.

`pnpm check:full` on `5059feaaa...` passed: mobile 84/84 files and 381/381 tests; automation-core 3/3 files and 86/86 tests; script coverage 10/10 files and 138/138 tests; responsive E2E 36/36. Format, lint, UX/repository/feature gates, typechecks, coverage and builds passed. Existing React `act(...)` and Node localStorage warnings are non-failing.

## Product contracts

- Canonical identity is normalized `Shelly.GetDeviceInfo.id`; BLE/Wi-Fi addresses are locators.
- One saved Plug may carry `bleDeviceId` and optional verified `wifiBaseUrl`; provisioning enriches the same logical Plug.
- BLE is the bootstrap channel. After verified Wi-Fi provisioning, normal management prefers HTTP. This is explicit transport promotion, not blind fallback.
- Optional features are gated by `Shelly.ListMethods`.
- `Wifi.SetConfig`, `Shelly.Update` and `Sys.SetTime` are sent once and are never automatically replayed after an ambiguous failure.
- Firmware reboot ambiguity is resolved by read-only reconnect/identity/firmware verification, not mutation replay.
- BLE LED/button/Cloud state remains read-only.
- Page-level Plug Detail Back remains absent; five tabs are first content, identity follows.
- Raw advertised `OTA.*` methods remain unsupported because they are undocumented.

## Next slice

Build the zero-friction onboarding orchestrator from the accepted primitives:

```text
Found Plug -> identity/capabilities -> Wi-Fi if needed -> HTTP handoff
-> firmware check/update if needed -> reconnect/verify -> final configuration -> Ready
```

Do not redo broad BLE/OTA discovery. Persistent BLE pairing/bonding on firmware 2.x and offline OTA are separate later slices.
