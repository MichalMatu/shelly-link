# Handoff — clean product checkpoint

Status: **2026-09-27 — current BLE/Plug-management iteration merged to `main`; next v1 product track agreed**

Repository: `MichalMatu/shelly-link`

Current branch: `main`

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**.

Do not expand device management merely because an RPC exists. Prioritize platform work when it enables a concrete climate/grow use case, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

The previously proposed zero-friction onboarding orchestrator remains **deferred**, not the next automatic task.

## Accepted foundation

The current product baseline includes:

- local `climate-engine-v1` automation with safe-OFF behavior;
- 1–4 supported BLE thermometers with aggregation and per-sensor diagnostics;
- Climate temperature/humidity/VPD configuration;
- Time automation through native Shelly schedules;
- physical Plug lifecycle/recovery with canonical identity verification;
- five-section Plug Detail UX: Automation, BLE, Device, Script, Info;
- Shelly management over HTTP and BLE;
- bounded stale BLE-locator recovery for read-only access;
- BLE Wi-Fi provisioning and verified promotion to HTTP;
- explicit firmware check/update with read-only post-reboot verification;
- capability-aware device-time synchronization;
- real-device evidence on Samsung SM-S906B / Android 16 and Shelly Plug S Gen3.

Detailed dated hardware evidence belongs in `docs/testing/hardware-matrix.md`.

## Most recent hardware acceptance

Real-device provisioning/OTA/time-sync source: `21d8675470a3d6425b0733cc708bdff55cb0d2cd`.

APK SHA-256: `59c0bcbdc4122c565df43f3918437410ccca27a079acb790e634e7803dbd2c35`.

Accepted real flow:

```text
BLE identity/capabilities
-> Wifi.Scan
-> one Wifi.SetConfig
-> Wifi.GetStatus
-> verified HTTP locator on the same physical Plug
-> HTTP identity verification
-> Shelly.CheckForUpdate
-> one Shelly.Update
-> read-only reboot/reconnect verification
-> capability refresh
-> Sys.SetTime when advertised
```

The factory Plug moved from firmware `1.2.3` to `2.0.1`; `Sys.SetTime` was absent before the update and advertised afterward. The user confirmed time synchronization works. No automatic mutation replay occurred and no relay mutation was part of that acceptance.

## Durable safety/architecture contracts

- Canonical Plug identity is normalized `Shelly.GetDeviceInfo.id`.
- Wi-Fi and BLE addresses are replaceable transport locators, never identity.
- Identity is verified before destructive/device mutations.
- Optional behavior is capability-driven via `Shelly.ListMethods`.
- Ambiguous mutations are never automatically replayed after timeout/disconnect.
- BLE read-only locator recovery is bounded and accepts only a canonical-id match.
- Once a verified HTTP locator exists, normal management prefers HTTP; this is explicit transport promotion, not blind fallback.
- The phone configures/manages/diagnoses; Shelly executes installed automation locally.
- Page-level duplicate Back navigation remains absent from Plug Detail; the five tabs are first content.

## Next bounded structural cleanup

Two durable Plug registries remain from historical Wi-Fi and BLE flows. The dashboard prevents a duplicate visual card for the same physical identity, but duplicate durable records may still exist if the same Plug is independently added through both paths.

The next structural slice should create **one canonical physical Plug registry** with independent Wi-Fi/BLE locator metadata. Do not solve this with more cross-registry guards or transport-specific identity rules.

## Agreed v1 product sequence

After the unified Plug registry, the next product slices should be developed in this order rather than in parallel:

1. **History / Datalogger** — resume from `work/kvs-datalogger` as source material, redesigning it around the current exclusive script/runtime lifecycle; log measurements plus relay state, reason/trigger, fault/safety context and relevant rule state.
2. **Rule/action expansion** — Pulse ON, Pulse OFF, minimum ON/OFF, cooldown, debounce, time windows combined with sensor rules, simple reusable `AND` / `OR` composition. Model pulse as an action and restore the state implied by the automation after a pulse.
3. **Physical-button manual takeover** — first physical button press while automation is in `AUTO` always changes mode to safe `MANUAL_OFF`; if relay was ON it is forced OFF, if already OFF only the mode changes. Subsequent physical presses toggle `MANUAL_OFF <-> MANUAL_ON`. Manual takeover never silently returns to `AUTO`; the app must explicitly resume automation. Normal automation must stop driving the relay immediately after takeover. History should log a `physical_button_takeover`-style reason. Future safety/fault logic remains higher priority than manual mode and may force OFF.
4. **Runtime safety supervisor** — maximum power, current, Plug temperature and maximum continuous ON time; safety is a layer above ordinary automation and manual mode, can force OFF and may latch a fault until acknowledged.
5. **Dashboard master control** — clear `RUNNING / PAUSED` automation state; PAUSED means safe OFF while datalogging/diagnostics/safety continue. Manual physical-button takeover is a separate visible state, not the same thing as PAUSED.
6. **UX redesign round 2** — status-first dashboard after the above semantics are stable. Emphasize current climate, output, control source/reason, safety and History; push BLE/firmware/script/transport detail deeper under Device/Info/Advanced.

High-value script/runtime improvements include transition reason codes, last-transition time, explicit control-source state (`automation` / `manual` / `safety`), startup guard, min ON/OFF, cooldown/debounce state, latched safety faults and multi-sensor disagreement/outlier diagnostics.

The working v1-complete target is: Climate + multi-sensor + time-aware rules + pulse actions + timing guards + deterministic physical-button takeover + History + safety supervisor + master RUN/PAUSE + existing local provisioning/OTA + final UX simplification.

After that point, new capabilities should clear a higher product-value bar rather than simply increasing Shelly management breadth.

## Physical-button takeover acceptance contract

Before marking the takeover slice complete, cover at least:

- `AUTO + relay ON -> physical button -> MANUAL_OFF`;
- `AUTO + relay OFF -> physical button -> MANUAL_OFF`;
- `MANUAL_OFF -> MANUAL_ON -> MANUAL_OFF` on subsequent button presses;
- automation cannot immediately reassert relay state while manual takeover is active;
- safety/fault OFF overrides manual ON;
- the control-source/reason is visible to diagnostics/history.

The intended priority model is:

```text
SAFETY / FAULT
    > MANUAL physical-button override
        > AUTO automation
```

## Parked / later

- `work/kvs-datalogger` remains preserved until the History slice starts; do not mechanically rebase/merge it.
- Persistent BLE pairing/bonding, offline OTA, broad general-purpose Shelly management and BLE soil-moisture remain later/explicitly approved work.
- Alarm/notification delivery and richer automatic outlier handling are useful later additions once the v1 core above is stable.

## Current checkpoint

The long BLE/Plug-management iteration was merged to `main`, its work branch was deleted, and `work/kvs-datalogger` was intentionally preserved.

Clean checkpoint before the subsequent docs-only roadmap updates: `0f61e0eaaae38c9e6d98c27f8857dbe0f43a0bad`.

The v1 roadmap and physical-button takeover updates are docs-only descendants on `main`; verify the current `main` SHA before starting implementation in the next chat.
