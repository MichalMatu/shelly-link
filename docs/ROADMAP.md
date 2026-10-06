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
- Climate History/Datalogger with chart-first mobile presentation;
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

## Freeze boundary

Until V1 freeze:

- do not start another generic UX-polish round;
- do not expand Pulse with new execution modes;
- do not add Environment Profiles;
- avoid broad architecture churn unless a concrete defect requires it.

The current runtime/recovery model is mature enough that new cleanup should be evidence-driven and local.

## First post-freeze product slice — graphical frontend redesign

After backend/runtime freeze, the next product-facing effort is the explicit graphical frontend redesign. The goal is a more visual, scene-oriented way to understand devices and automation while reusing the frozen runtime, ownership and safety contracts.

This should be a frontend/product composition project, not a backend rewrite.

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

## Hardware expansion

Shelly Plug Gen4 is the intended next Plug family after V1 freeze. Treat it as a capability/profile compatibility port against the frozen product model, not as a fork of the product flows.

Notifications, persistent BLE pairing/bonding, offline OTA and broader general-purpose Shelly management remain later decisions.

## Working rule

Prefer small vertical slices, focused regression tests and one final repository gate when implementation changes are made. Hardware-facing behavior requires real-device evidence and an explicit final relay/device state when mutation occurs.
