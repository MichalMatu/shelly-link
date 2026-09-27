# Handoff — clean product checkpoint

Status: **2026-09-27 — current BLE/Plug-management iteration accepted; closeout/merge in progress**

Repository: `MichalMatu/shelly-link`

Closeout branch: `work/shelly-ble-transport`

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**.

Do not expand device management merely because an RPC exists. Prioritize platform work when it enables a concrete climate/grow use case, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

The previously proposed zero-friction onboarding orchestrator is **deferred**, not the next automatic task.

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

## Known architecture debt — next bounded cleanup

Two durable Plug registries remain from historical Wi-Fi and BLE flows. The dashboard prevents a duplicate visual card for the same physical identity, but duplicate durable records may still exist if the same Plug is independently added through both paths.

The next structural slice should create **one canonical physical Plug registry** with independent Wi-Fi/BLE locator metadata. Do not solve this with more cross-registry guards or transport-specific identity rules.

## Next product decision

After the physical Plug registry cleanup, choose one main product milestone rather than developing both in parallel:

1. **History / Datalogger** — operational history of climate/VPD/relay behavior, using `work/kvs-datalogger` only as parked source material and redesigning lifecycle ownership first.
2. **Richer climate rules** — minimum ON/OFF, cooldown/debounce, time windows and reusable condition operators with explicit safety precedence.

Broad general-purpose Shelly management, persistent BLE pairing and offline OTA remain later/explicitly approved work.

## Closeout rule

Before retiring `work/shelly-ble-transport`:

- run the final full repository gate on the exact source candidate;
- merge to `main` only after it passes;
- verify merged `main`;
- update this handoff to the final `main` SHA/checkpoint;
- delete the completed work branch;
- preserve `work/kvs-datalogger` as an intentionally parked research branch.
