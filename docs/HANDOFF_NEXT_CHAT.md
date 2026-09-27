# Handoff — clean product checkpoint

Status: **2026-09-27 — BLE/Plug-management iteration merged; v1 sequence and post-freeze Gen4 boundary agreed**

Repository: `MichalMatu/shelly-link`

Current branch: `main`

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly management platform underneath it**.

Do not expand device management merely because an RPC exists. Prioritize platform work when it enables a concrete climate/grow use case, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

The zero-friction onboarding orchestrator remains deferred.

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

## Durable architecture/safety contracts

- Canonical Plug identity is normalized `Shelly.GetDeviceInfo.id`.
- Wi-Fi and BLE addresses are replaceable transport locators, never identity.
- Identity is verified before destructive/device mutations.
- Optional behavior is capability-driven via `Shelly.ListMethods`.
- Ambiguous mutations are never automatically replayed after timeout/disconnect.
- BLE read-only locator recovery is bounded and accepts only a canonical-id match.
- Once a verified HTTP locator exists, normal management prefers HTTP; this is explicit transport promotion, not blind fallback.
- The phone configures/manages/diagnoses; Shelly executes installed automation locally.

## Next bounded structural cleanup

Create **one canonical physical Plug registry** with independent Wi-Fi/BLE locator metadata. The current Wi-Fi and BLE registries may represent the same physical Plug twice. Do not fix this with more cross-registry guards.

## Agreed v1 implementation sequence

After the unified registry, work in this order rather than in parallel:

1. **Runtime control/state arbitration** — freeze AUTO/MANUAL/PAUSED/FAULT semantics, one final relay-decision owner, stable reason codes and last-transition state. Physical button takeover belongs here: first press in AUTO always enters safe `MANUAL_OFF`; subsequent presses toggle manual OFF/ON; return to AUTO is explicit.
2. **History / Datalogger** — resume from `work/kvs-datalogger` as source material, not a mechanical merge. Use the frozen control/reason vocabulary so History records measurements plus relay state, mode, trigger/reason, manual takeover and future safety context.
3. **Runtime safety supervisor** — max power, current, Plug/device temperature and max continuous ON; startup guard; latched fault/lockout; deliberate reset. Safety stays above manual and automation and can always force OFF.
4. **Rule/action expansion** — Pulse ON/OFF, minimum ON/OFF, cooldown, debounce, time windows, scheduled triggers and simple AND/OR. Pulse is an action, and all requested actions pass through the control/safety arbiter.
5. **Dashboard master control** — explicit RUNNING / PAUSED semantics. PAUSED means safe OFF while History/diagnostics/safety continue; manual takeover remains a separate visible state.
6. **UX redesign round 2** — status-first dashboard only after the above semantics are stable. Emphasize climate, output, reason/control source, safety and History; move transport/script/firmware detail deeper.
7. **Runtime watchdog + stabilization** — watchdog/heartbeat, boot/restart diagnostics, reboot/power-cycle recovery, Wi-Fi/BLE loss, control-mode interaction matrix, long soak, memory headroom, final hardware matrix and UX acceptance.
8. **v1 FEATURE FREEZE** — stop expanding runtime/product behavior without an explicit post-v1 decision.

## Physical-button takeover contract

Minimum behavior:

- `AUTO + relay ON -> physical button -> MANUAL_OFF`;
- `AUTO + relay OFF -> physical button -> MANUAL_OFF`;
- subsequent `MANUAL_OFF -> MANUAL_ON -> MANUAL_OFF` toggles;
- automation cannot reassert relay state during manual takeover;
- return to AUTO is explicit from the app;
- safety/fault OFF overrides manual ON;
- History records the takeover reason and control-source transition.

Intended arbitration model:

```text
SAFETY / FAULT
    > PAUSED
        > MANUAL
            > AUTO
```

## v1 completion target

Feature-complete v1 means the existing Climate/multi-sensor/provisioning foundation plus:

- unified physical Plug persistence;
- frozen control-state arbitration;
- physical-button manual takeover;
- History / Datalogger;
- power/current/device-temperature/max-runtime safety;
- Pulse/timing/AND-OR rule/action expansion;
- RUNNING / PAUSED master control;
- final UX redesign;
- watchdog/reboot/recovery/soak stabilization.

## Post-freeze device expansion

**Shelly Plug Gen4 is the next intended device type, but only after v1 feature freeze.**

Treat it as a compatibility port against the frozen Shelly Link contract, not as a reason to redesign v1. Use capability/profile-driven support and shared regression contracts. Avoid scattered generation checks and separate Gen3/Gen4 product flows.

Gen4 should prove that the platform can add a second physical Plug type by supplying capabilities/transports to the same product model.

## Parked / later

- `work/kvs-datalogger` remains intentionally preserved until the History slice; do not mechanically rebase/merge it.
- Persistent BLE pairing/bonding, offline OTA, broad general-purpose Shelly management and BLE soil-moisture remain later/explicitly approved work.
- Notifications and richer automatic outlier handling are useful post-v1 additions.

## Current checkpoint

The long BLE/Plug-management work branch was merged and deleted. `work/kvs-datalogger` remains parked intentionally.

The roadmap/handoff changes after the merge are docs-only descendants on `main`. Before starting implementation in a new chat, read this file, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, the relevant `AGENTS.md` files, and verify the current `main` SHA.
