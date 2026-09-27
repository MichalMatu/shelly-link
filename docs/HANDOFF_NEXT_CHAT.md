# Handoff — clean product checkpoint

Status: **2026-09-27 — BLE/Plug-management iteration merged and verified on `main`**

Repository: `MichalMatu/shelly-link`

Current base: `main`

Validated product merge: `39fa377a216bbae836569662a53e9e8dcf17aa37`

The merge tree is identical to the fully gated work-branch source `7e971171c7d16a0dfaf0cff2e8837f28c088ea5d`. `pnpm check:full` passed both before merge and again on the merge commit. The merge-commit gate included mobile 84/84 test files with 382/382 tests, automation-core 86/86 tests, script-generator coverage 138/138 tests and responsive E2E 36/36. Existing React `act(...)` and Node localStorage warnings are non-failing.

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**.

Do not expand device management merely because an RPC exists. Prioritize platform work when it enables a concrete climate/grow use case, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

The previously proposed zero-friction onboarding orchestrator is **deferred** and is not the next automatic task.

## Accepted foundation

The current baseline includes:

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

## Next bounded architecture slice

Two durable Plug registries remain from historical Wi-Fi and BLE flows. Presentation deduplicates the same physical identity, but duplicate durable records may still exist if one Plug is independently added through both entry paths.

The next structural task should create **one canonical physical Plug registry** with independent Wi-Fi/BLE locator metadata.

Acceptance:

- the same normalized `Shelly.GetDeviceInfo.id` maps to one durable physical Plug;
- adding another verified transport enriches the existing record instead of creating a second logical device;
- user name and automation ownership survive convergence/migration;
- transport locators remain replaceable metadata rather than identity;
- focused migration/deduplication regressions exist before retiring the old split.

Do not solve this with additional cross-registry UI guards.

## Next product decision after registry cleanup

Choose one main product milestone rather than developing both in parallel:

1. **History / Datalogger** — operational history of climate/VPD/relay behavior. `work/kvs-datalogger` is parked source material only; redesign lifecycle ownership before reusing its pieces.
2. **Richer climate rules** — minimum ON/OFF, cooldown/debounce, time windows and reusable condition operators with explicit safety precedence.

Broad general-purpose Shelly management, persistent BLE pairing and offline OTA remain later/explicitly approved work.

## Branch state

`work/shelly-ble-transport` is completed and may be deleted after this docs-only checkpoint is verified.

Preserve:

- `main` — clean base for the next task;
- `agent-control` — Local Agent control branch;
- `work/kvs-datalogger` — intentionally parked research/source-material branch.
