# Roadmap

## Product direction

Shelly Link is climate/grow-first with a reusable local Shelly management layer underneath it. The phone configures, manages and diagnoses; the Shelly owns the installed automation and executes it locally without requiring the phone, cloud, Home Assistant, MQTT or a 24/7 server.

New work should do at least one of these things: enable a concrete climate/grow use case, improve safety or reliability, reduce setup/maintenance friction, or improve operational diagnostics.

Durable ownership and safety rules live in docs/ARCHITECTURE.md. Real-device evidence lives in docs/testing/.

## V1 baseline

The current V1 product foundation is established:

- canonical physical Plug identity with BLE/HTTP as replaceable locators;
- one managed automation owner per Plug relay;
- Climate automation for temperature, humidity and VPD with 1–4 BLE thermometers;
- Time automation;
- one shared Pulse engine used by Climate, Time and standalone Pulse;
- optional Climate active windows and Pulse output behavior;
- AUTO/MANUAL with automation-fault and hard-safety as separate axes;
- safe-OFF boot, stale-sensor and destructive lifecycle behavior;
- Runtime Safety Supervisor;
- Climate and standalone Pulse History/Datalogger with shared History v2 storage and chart-first mobile presentation;
- capability-driven Plug Detail and nested Thermometer settings;
- BLE-to-Wi-Fi provisioning, firmware maintenance and time synchronization;
- transactional standalone Pulse script replacement;
- deterministic product-matrix, diagnostics, reconciliation and release-quality tooling.

Do not fork separate Climate/Time/Pulse engines or introduce another relay owner.

## Stage 9 — stabilization and V1 freeze

Completed stabilization evidence includes:

- deterministic AUTO/MANUAL + automation-fault + hard-safety recovery;
- controlled Shelly.Reboot recovery;
- physical mains power-cycle recovery;
- healthy-scanner sensor-silence handling;
- stopped-scanner restart with required BLE re-subscription;
- short soak/liveness observability and memory-headroom reporting;
- real Wi-Fi loss/recovery without changing device credentials;
- final 16/16 real-hardware matrix across Xiaomi/PVVX + TP357, all four control modes and VPD off/on;
- final device postflight with the production runtime preserved and the test Plug restored.

Remaining release blocker:

1. run the materially longer 8-hour soak and finish with an explicit relay OFF state.

After that soak passes, run the final freeze/release sign-off and declare V1 feature freeze. All other Stage 9 qualification work is closed.

Detailed evidence belongs in docs/testing/hardware-matrix.md and the dated acceptance records, not in this roadmap.

## Pre-freeze audit hardening — completed 2026-10-06

The refactor audit closed three narrow quality gaps without broad architecture churn:

- temporary BLE discovery preparation now rolls back internally after partial mutation and falls back to a final safe OFF state if restoration itself fails;
- ambiguous multiple enabled/running script inventories fail closed instead of being treated as no managed runtime;
- script replacement covers configuration, restart and rollback failure paths in addition to upload/verification failures.

The focused lifecycle suites and the canonical `pnpm check` pass on the completion branch. The known Darwin `04-plug-ble-discovery` screenshot drift reproduces identically on clean `main`, so it is not a regression from this hardening.

## Pre-freeze automation Detail closeout — completed 2026-10-07

Installed Climate, Time and standalone Pulse details now share one capability model for tab/icon/history/script availability while preserving intentional automation-body differences. The accepted Time and standalone Pulse detail surfaces are configuration-focused, reuse shared physical Plug Device/Info/BLE surfaces and shared script presentation, and avoid duplicated healthy dashboard state or nested destructive-action cards. The superseded parallel Pulse-detail branch has no remaining product authority.

Time + Pulse History is intentionally not part of this closeout; adding it requires a real History writer/storage capability for that runtime composition rather than a UI-only tab.

## Freeze boundary

Until V1 freeze:

- do not start another generic UX-polish round;
- do not expand Pulse with new execution modes;
- do not add Environment Profiles;
- avoid broad architecture churn unless a concrete defect requires it.

The current runtime/recovery model is mature enough that new cleanup should be evidence-driven and local.

## Post-freeze development sequence

The 8-hour soak is only the final V1 release gate. It is **not** the whole development roadmap. After V1 freeze, continue in this order so transport and hardware foundations are generalized before another large UI redesign.

### 1. Complete Shelly management parity over BLE

The BLE foundation is already real and hardware-qualified: discovery, canonical identity, RPC framing, BLE-only status/relay control, stale-locator recovery, BLE-to-Wi-Fi provisioning and time synchronization exist. The remaining work is to remove the intentional read-only/HTTP-only gaps without creating a second product stack.

Priority slices:

- make the BLE-only Device surface capability-driven rather than permanently read-only where the firmware exposes safe mutations;
- add LED/button/Cloud writes over the same shared Shelly client contracts when real-hardware evidence proves the method is safe over BLE;
- enable automation install/edit/uninstall/recovery over BLE only after identity verification, OFF-first safety, script/schedule replacement and ambiguous-failure handling have the same guarantees as HTTP;
- remove the current BLE-only `Add automation` disable only when that transport-neutral lifecycle is qualified;
- keep Wi-Fi provisioning/HTTP promotion as an optimization, not a prerequisite for managing a supported Plug;
- treat persistent pairing/bonding as a separate optimization/reliability decision, not as a reason to fork identity or lifecycle semantics.

The target remains one product model with replaceable transports:

```text
feature flow
  -> Shelly client / lifecycle
      -> HTTP transport
      -> BLE transport
```

### 2. Add Shelly Power Strip 4 Gen4 as the first multi-output device

The next hardware expansion target is **Shelly Power Strip 4 Gen4**, not an unspecified generic Gen4 Plug. Official device variants include `S4PL-00416EU` and `S4PL-10416EU`; the device has four individually controlled sockets with per-socket power metering, scripting, schedules, Bluetooth, Wi-Fi and Zigbee.

Treat this as a capability/profile port plus a deliberate multi-output product-model extension. Do not create four fake physical devices or a separate Power-Strip application flow.

Target model:

```text
one physical Shelly device
  -> 4 physical outputs
      -> zero or one managed automation owner per output
```

Required architecture/product work:

- keep one canonical physical-device identity and one saved-device record;
- model output identity explicitly instead of assuming every device is only `switch:0`;
- allow multiple installed automations on one physical device when they own different outputs;
- make dashboard/detail/navigation represent outputs under one device without duplicating Device/Info/BLE settings four times;
- reuse Climate, Time, Pulse, History and safety owners per output instead of forking Power-Strip-specific engines;
- expose per-output relay state and power/current/energy from the shared capability layer;
- discover Scripts/KVS/schedules/BLE/LED/button capabilities from the real device rather than scattering `gen === 4` or model-name checks;
- qualify identity, all four relay paths, per-output metering, automation ownership conflicts, reboot/recovery and final safe-OFF behavior on real hardware.

This slice is also the architectural proof that Shelly Link can scale from a single-output Plug to multi-output hardware without parallel screens or duplicate state.

### 3. Graphical frontend redesign

Start the large scene-oriented frontend redesign **after** BLE management parity and the multi-output model are defined. The redesign can then represent both single-output Plugs and the four-output Power Strip from one durable device/output model instead of being redone immediately after new hardware lands.

The goal remains a more visual way to understand devices and automation while reusing the frozen runtime, ownership and safety contracts. This is a frontend/product-composition project, not a backend rewrite.

## Growth track — Environment Profiles

The first larger grow-specific capability after stabilization is Day/Night environment profiles:

- separate temperature, humidity and VPD targets by phase;
- schedules that may cross midnight;
- optional phase-specific Pulse/timing settings when justified;
- local phase switching on Shelly;
- safe behavior when wall-clock time is unavailable.

The model should later extend to Dawn / Day / Dusk / Night without creating another relay owner. Dew point / condensation risk is a lightweight follow-up and should start as app/History-derived information before becoming a runtime trigger.

## Growth track — Pulse Advanced

Post-freeze candidates include:

- burst mode;
- adaptive duty based on distance from target;
- standalone active-window convenience;
- explicit phase reset/resume policy;
- accumulated ON-time / duty budget;
- richer progress and History diagnostics.

Every addition must reuse the shared Pulse engine and preserve safe-OFF precedence.

## Later platform decisions

Notifications, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain explicit later decisions after the BLE-parity and Power Strip 4 Gen4 slices. They are not prerequisites for the core post-freeze sequence.

## Working rule

Prefer small vertical slices, focused regression tests and one final repository gate when implementation changes are made. Hardware-facing behavior requires real-device evidence and an explicit final relay/device state when mutation occurs.
