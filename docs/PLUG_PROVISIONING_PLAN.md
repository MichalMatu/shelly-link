# Plug provisioning plan

Status: active implementation plan for `work/shelly-ble-transport`.

## Goal

Make Shelly Plug onboarding as close to plug-and-play as possible while preserving the existing safety rules: canonical device identity is authoritative, transport locators are replaceable, mutations are explicit and never automatically replayed after an ambiguous failure, and feature availability is detected from the device rather than guessed from firmware version strings.

## Target onboarding

1. Discover the Plug over BLE.
2. Verify canonical identity with `Shelly.GetDeviceInfo`.
3. Read `Shelly.ListMethods` and build a capability profile for the current channel.
4. If station Wi-Fi is not configured, scan with `Wifi.Scan` over BLE.
5. Let the user select an SSID and provide credentials once.
6. Apply credentials with exactly one `Wifi.SetConfig` mutation over the already verified BLE session.
7. Poll read-only `Wifi.GetStatus` until the device reports `got ip`, or surface a bounded timeout/failure without replaying `Wifi.SetConfig`.
8. Persist `http://<sta_ip>` as a Wi-Fi locator on the same canonical Plug record.
9. Prefer the verified HTTP locator for the remaining setup whenever it is reachable.
10. When internet access is available, use `Shelly.CheckForUpdate` and, when appropriate, an explicit `Shelly.Update` operation.
11. Expect reboot/disconnect after firmware update, reconnect through a known locator, verify the same canonical physical id and rebuild the capability profile.
12. Continue setup using capabilities actually advertised by the updated device (time sync, scripting, settings, automation installation, and other management functions).
13. Finish onboarding only after the required configuration has been verified from the device.

## Secure provisioning and transport handoff

Firmware 1.7.5 introduced secure provisioning. Once a device first acquires an IP, open AP and unprotected BLE RPC enter a short grace period and are then disabled. Firmware 2.0 additionally requires BLE pairing/bonding outside the initial provisioning window.

Therefore BLE is the bootstrap channel, not a transport the onboarding state machine may assume will remain available forever.

The handoff rule is:

`BLE identity -> Wi-Fi credentials -> got ip -> persist Wi-Fi locator -> continue over verified HTTP`

`Shelly.GetDeviceInfo.provision` is part of the capability/state model when present:

- `pending` — initial provisioning window;
- `confirmed` — IP acquired and grace window active;
- `complete` — provisioning completed; unprotected BLE RPC may be unavailable;
- `locked` — setup window expired without successful provisioning.

Persistent BLE management on firmware 2.0+ is a separate feature: it requires an explicit pairing/bonding policy and must not be a prerequisite for the normal plug-and-play setup path.

## Product UX

Normal path should read as one setup flow rather than exposing transport details:

`Found Plug -> Connect Wi-Fi -> Check firmware -> Update if required -> Configure -> Ready`

The user should not need to understand whether an individual step is using BLE or HTTP, and should not have to leave Shelly Link or open the vendor web UI.

The Plug Detail / Info surface should show the installed firmware next to update state:

- `Up to date`
- `Update available -> <version>`
- explicit `Update` action
- reboot/reconnect progress
- verified resulting firmware version

The onboarding flow should proactively offer/require an update when the current firmware lacks capabilities needed for the requested setup. The Info action remains available later for maintenance.

## Identity and locator model

One physical Plug has one canonical normalized `Shelly.GetDeviceInfo.id` and may have multiple transport locators:

- BLE locator: Android address / platform BLE handle;
- Wi-Fi locator: HTTP base URL derived from the verified station IP.

Provisioning must enrich the existing Plug record with a Wi-Fi locator; it must not create a second logical Plug representing the same physical device.

Every locator is verified against canonical identity before it is used for a mutation.

## Capability-first rule

Do not gate behavior with assumptions such as `firmware >= X`. Firmware version is useful metadata and may be used for product policy, but runtime behavior must be based on `Shelly.ListMethods` and verified RPC responses.

Example capability profile:

- `wifiScan`: `Wifi.Scan`
- `wifiProvision`: `Wifi.SetConfig` + `Wifi.GetStatus`
- `firmwareCheck`: `Shelly.CheckForUpdate`
- `firmwareUpdate`: `Shelly.Update`
- `manualTimeSet`: `Sys.SetTime`
- `scripts`: relevant `Script.*` methods

The Plug S Gen3 firmware `1.2.3` hardware test is the motivating example: it accepts BLE RPC but returns `No handler for Sys.SetTime`, so the app must not infer `Sys.SetTime` support merely from generation/model.

## Mutation safety

- Verify physical identity before every mutation session.
- Capability-check before invoking an optional mutation.
- Send each mutation once.
- Never automatically replay a timed-out/disconnected mutation whose result is ambiguous.
- Read-only operations may reconnect/recover a stale locator using the existing bounded recovery flow.
- After a successful mutation, verify state with read-only RPC calls.
- A transport handoff never changes canonical identity.

## Firmware strategy

### Supported first path

Use the documented Shelly RPC firmware flow:

1. configure Wi-Fi over BLE;
2. wait for `got ip` and persist the HTTP locator;
3. verify the same Plug over HTTP;
4. `Shelly.CheckForUpdate`;
5. explicit `Shelly.Update({ stage: "stable" })` when an update is selected;
6. expect disconnect/reboot;
7. reconnect read-only, verify the canonical device id and resulting firmware;
8. refresh capabilities and continue onboarding.

`Shelly.Update` is never automatically replayed after an ambiguous timeout/disconnect.

### Offline update research path

Do not implement an undocumented raw BLE DFU protocol as the product path.

A later PoC may support a fully offline service mode by caching an official firmware image in Shelly Link and making it available to the Plug through a local URL accepted by `Shelly.Update({ url })`. This must be proven on hardware before product integration and must preserve firmware authenticity/integrity checks. Until that PoC is accepted, offline setup may proceed without firmware update when the existing capabilities are sufficient.

## Implementation slices

### Slice A - capability-aware device time

- `Shelly.ListMethods` check before `Sys.SetTime`;
- unsupported firmware gets a clear message and no mutation;
- no automatic retry.

Status: implemented. Real Plug S Gen3 firmware `1.2.3` exposed the missing-handler case and drove the capability-first contract.

### Slice B - BLE Wi-Fi provisioning

- `Wifi.Scan` client support;
- reusable verified BLE provisioning service;
- SSID list sorted/deduplicated by signal;
- password entry for secured networks;
- one `Wifi.SetConfig` mutation;
- bounded read-only `Wifi.GetStatus` polling to `got ip`;
- persist the verified Wi-Fi HTTP locator on the same Plug;
- first expose on BLE Plug Device for hardware acceptance;
- then reuse the same service from initial onboarding.

Status: software slice implemented; focused tests/build pass and Android development APK installed. Real scan/connect acceptance is next.

### Slice C - firmware status and update in Info

- `Shelly.CheckForUpdate` / `Shelly.Update` package client;
- use the verified HTTP locator after provisioning;
- show installed firmware plus stable update state;
- explicit update action;
- reboot/reconnect/reverify flow;
- capability refresh after update.

Status: package client foundation in progress.

### Slice D - zero-friction onboarding orchestration

Compose the accepted primitives into one state machine:

`BLE discovery -> identity -> capabilities -> Wi-Fi if needed -> HTTP handoff -> firmware check/update if needed -> reconnect -> final configuration -> verification -> ready`

The state machine owns progress/error recovery, while individual RPC helpers remain independently testable.

### Slice E - offline OTA PoC

Only after the normal path is stable:

- obtain/cache an official firmware artifact;
- validate its source/integrity;
- expose it to the Plug over a local network path compatible with `Shelly.Update({ url })`;
- test interruption/recovery and reboot behavior on real hardware;
- decide whether it is safe enough for product use.

## Acceptance priorities

1. real Plug S Gen3 over BLE;
2. no accidental relay/config mutations outside the explicit tested action;
3. data-preserving Android `adb install -r` during development;
4. focused tests during rapid iteration;
5. full repository gate only after the provisioning slice is accepted on hardware.
