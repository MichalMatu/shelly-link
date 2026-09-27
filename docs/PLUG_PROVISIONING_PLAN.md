# Plug provisioning plan

Status: active implementation plan for `work/shelly-ble-transport`.

## Goal

Make Shelly Plug onboarding as close to plug-and-play as possible while preserving the existing safety rules: canonical device identity is authoritative, BLE locators are disposable transport addresses, mutations are explicit and never automatically replayed after an ambiguous failure, and feature availability is detected from the device rather than guessed from firmware version strings.

## Target onboarding

1. Discover the Plug over BLE.
2. Verify canonical identity with `Shelly.GetDeviceInfo`.
3. Read `Shelly.ListMethods` and build a capability profile for the current BLE channel.
4. If station Wi-Fi is not configured, scan with `Wifi.Scan` over BLE.
5. Let the user select an SSID and provide credentials once.
6. Apply credentials with exactly one `Wifi.SetConfig` mutation over the already verified BLE session.
7. Poll read-only `Wifi.GetStatus` until the device reports `got ip`, or surface a bounded timeout/failure without replaying `Wifi.SetConfig`.
8. When internet access is available, use `Shelly.CheckForUpdate` and, when appropriate, an explicit `Shelly.Update` operation.
9. Expect reboot/disconnect after firmware update, rediscover by canonical physical id, refresh the BLE locator, and rebuild the capability profile.
10. Continue setup using capabilities actually advertised by the updated device (time sync, scripting, settings, automation installation, and other management functions).
11. Finish onboarding only after the required configuration has been verified from the device.

## Product UX

Normal path should read as one setup flow rather than exposing transport details:

`Found Plug -> Connect Wi-Fi -> Check firmware -> Update if required -> Configure -> Ready`

BLE is the bootstrap/provisioning channel. Wi-Fi and internet are optional capabilities used when they unlock a better setup path; the user should not have to leave Shelly Link or open the vendor web UI.

The Plug Detail / Info surface should eventually show the installed firmware next to update state:

- `Up to date`
- `Update available -> <version>`
- explicit `Update` action
- reboot/reconnect progress
- verified resulting firmware version

The onboarding flow should proactively offer/require an update when the current firmware lacks capabilities needed for the requested setup. The Info action remains available later for maintenance.

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

- Verify physical identity before every BLE mutation session.
- Capability-check before invoking an optional mutation.
- Send each mutation once.
- Never automatically replay a timed-out/disconnected mutation whose result is ambiguous.
- Read-only operations may reconnect/recover a stale locator using the existing bounded recovery flow.
- After a successful mutation, verify state with read-only RPC calls.

## Firmware strategy

### Supported first path

Use the documented Shelly RPC firmware flow:

1. configure Wi-Fi over BLE;
2. wait for `got ip`;
3. `Shelly.CheckForUpdate`;
4. explicit `Shelly.Update({ stage: "stable" })` when an update is selected;
5. expect disconnect/reboot;
6. rediscover and verify the same canonical device id;
7. verify the resulting firmware and refresh capabilities.

### Offline update research path

Do not implement an undocumented raw BLE DFU protocol as the product path.

A later PoC may support a fully offline service mode by caching an official firmware image in Shelly Link and making it available to the Plug through a local URL accepted by `Shelly.Update({ url })`. This must be proven on hardware before product integration and must preserve firmware authenticity/integrity checks. Until that PoC is accepted, offline setup may proceed without firmware update when the existing capabilities are sufficient.

## Implementation slices

### Slice A - capability-aware device time

- `Shelly.ListMethods` check before `Sys.SetTime`.
- unsupported firmware gets a clear message and no mutation.
- no automatic retry.

Status: implemented; hardware exposed the `1.2.3` missing-handler case. Focused validation is being closed out.

### Slice B - BLE Wi-Fi provisioning

- add `Wifi.Scan` client support;
- reusable verified BLE provisioning service;
- SSID list sorted/deduplicated by signal;
- password entry for secured networks;
- one `Wifi.SetConfig` mutation;
- bounded read-only `Wifi.GetStatus` polling to `got ip`;
- first expose on BLE Plug Device for hardware acceptance;
- then reuse the same service from initial onboarding.

Status: next implementation slice.

### Slice C - firmware status and update in Info

- add `Shelly.CheckForUpdate` / `Shelly.Update` client support;
- show installed firmware plus stable update state;
- explicit update action;
- reboot/reconnect/reverify flow;
- capability refresh after update.

### Slice D - zero-friction onboarding orchestration

Compose the accepted primitives into one state machine:

`BLE discovery -> identity -> capabilities -> Wi-Fi if needed -> firmware check/update if needed -> rediscovery -> final configuration -> verification -> saved Plug`

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
