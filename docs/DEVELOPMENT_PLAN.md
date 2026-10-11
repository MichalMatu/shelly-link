# Development Plan

This file is the single source of truth for Shelly Link development direction and sequencing.

Durable runtime, ownership and safety contracts live in `docs/ARCHITECTURE.md`.
Immediate continuation state lives in `docs/HANDOFF_NEXT_CHAT.md`.
Real-device qualification evidence lives in `docs/testing/`.

## Product direction

Shelly Link remains climate/grow-first and local-first.

The phone configures, manages and diagnoses. Shelly executes installed automation locally without requiring the phone, cloud, Home Assistant, MQTT or a 24/7 server.

Development should prefer one reusable core over device-specific or UI-specific parallel implementations.

## 0. Close and freeze Core 1 / V1

Do not broaden V1 while stabilization is being closed.

Remaining release work:

1. run the materially longer 8-hour soak and finish with an explicit relay OFF state;
2. run final freeze/release sign-off;
3. declare the current runtime and recovery model the stable Core 1 baseline.

After freeze, new product work belongs to Core 2 rather than being mixed into the qualified V1 baseline.

## 1. Core 2 foundation

Core 2 is the next architecture layer. It should generalize the current single-output Plug model without rewriting the qualified automation runtime unnecessarily.

### Device and output model

Move toward:

```text
physical device
  -> outputs / inputs
  -> capabilities
  -> telemetry
  -> optional managed automations per output
```

One physical device remains one saved device. A multi-output Shelly must not become several fake Plug records.

The ownership rule becomes explicit at output level:

```text
one physical output -> zero or one managed automation owner
```

Existing single-output Plug S devices are simply devices with one output.

### Capability-driven Shelly support

Prefer discovered/profiled capabilities over scattered model/generation checks.

Core 2 should expose the useful data Shelly already provides when available, including output state, power/current/voltage/energy, device health/protection state, internal temperature and relevant runtime/resource information.

The purpose is not to collect telemetry for its own sake. It should support better diagnostics, History, hardware support and safety decisions.

### Equipment-aware safety and anomaly policies

Keep Shelly native protection as the first hard-safety authority.

Core 2 may add local policies based on the configured equipment and available telemetry, for example detecting a clearly abnormal load for a device that normally consumes far less power.

Safety behavior that must work without the phone stays local on Shelly. The phone configures and explains it.

Exact thresholds and policies are hardware/use-case decisions and must not be invented globally.

### Script package foundation

Create a clean contract for reusable Shelly Script packages before importing a large script catalog.

A package should be able to describe its source, compatibility/capability requirements, configurable inputs, lifecycle/conflicts and installation behavior without making the user edit JavaScript manually.

Do not turn script packages into a second automation lifecycle owner.

### Code quality

Core 2 is also the point to keep improving modularity, separation of responsibilities and directory structure where real boundaries justify it.

Keep the existing rules:

- one owner per state/lifecycle/side effect;
- screens compose rather than own transport/runtime behavior;
- no duplicate old/new implementations;
- narrow package/feature APIs;
- delete obsolete pre-release paths instead of preserving compatibility cruft;
- do not split files mechanically only because they are large.

## 2. Shelly Power Strip 4 Gen4

Use Shelly Power Strip 4 Gen4 as the first real multi-output device and the proof of the Core 2 device/output model.

Target:

```text
one physical Power Strip
  -> output 0
  -> output 1
  -> output 2
  -> output 3
```

Each output may have its own relay state, metering and managed automation ownership.

Device-level surfaces such as identity, firmware, network, BLE and general device settings remain shared once for the physical strip.

Reuse existing Climate, Time, Pulse, History and safety foundations per output rather than creating Power-Strip-specific engines or four duplicate Plug screens.

## 3. Shelly Script Catalog

Turn useful Shelly scripts into discoverable, configurable product capabilities.

Start from the script-package contract and reuse existing Shelly examples where licensing, compatibility and safety allow it.

The user experience should be closer to:

```text
choose extension/script
-> configure supported options
-> validate device capabilities/conflicts
-> install/manage
```

rather than copying or editing JavaScript.

Organize the catalog by useful product purpose such as BLE integrations, sensors, energy, presence, buttons, scheduling, virtual components and other local integrations.

## 4. Grow UI / frontend redesign

Keep the current UI as the stable Classic/Technical interface.

Develop a more visual Grow UI against the same core, stores, flows and device/automation contracts. Do not fork transport, persistence or automation logic for the new frontend.

Before a stronger visual redesign, deliberately increase use of the existing Ionic React component layer on low-risk standard controls. The intended layering is:

```text
@lcl/design-tokens -> visual values and themes
Ionic React        -> standard interaction behavior
@lcl/ui            -> genuinely shared product-agnostic roles/adapters
mobile features    -> Shelly Link product composition
```

Do this incrementally rather than converting every custom component. Prefer Ionic where it removes custom focus, keyboard, picker, toggle, range, modal or button behavior. Keep product-specific cards, telemetry, History, runtime controls and other meaningful Shelly Link composition custom unless a framework component clearly fits the same role.

Stabilize this control layer before the larger Grow UI redesign so the visual redesign is not implemented twice. Frozen Climate renders remain protected throughout infrastructure migration.

The Grow UI should be designed against the Core 2 device/output model so it naturally handles both single-output Plugs and multi-output devices.

The product-level UX may present equipment such as Light, Fan, Humidifier or Heater while keeping the underlying Shelly/output mapping as implementation detail.

## 5. Generic BLE sensors

This remains a later expansion, not a current blocker.

Shelly Link is intentionally BLE-focused for environmental sensors. Generalize the current sensor parsing path so additional BLE sensors can be added without hard-coding every product through unrelated application layers.

The target is a neutral sensor/measurement model plus reusable parser/profile registration, while retaining stricter code paths where a protocol requires them.

## 6. Full Shelly management parity over BLE

The existing BLE transport foundation remains valid and should not be rewritten.

Later, close the remaining BLE-only management gaps where useful:

- capability-driven device mutations;
- automation install/edit/uninstall/recovery where the same safety guarantees as HTTP can be preserved;
- remove artificial Wi-Fi requirements where BLE can safely perform the same operation.

Persistent pairing/bonding remains a separate reliability/product decision.

## 7. Advanced automation composition

After the Core 2 device/output model and script ecosystem are stable, expand automation composition.

Order:

1. richer same-device/cross-output logic;
2. interlocks and derived signals where useful;
3. cross-device local automation with explicit failure/safe-state semantics.

Do not make the phone a required 24/7 automation controller.

## 8. Grow-specific expansion

Build larger growbox functions on the same foundations rather than creating new parallel engines.

Candidates include:

- Day/Night and later Dawn/Day/Dusk/Night environment profiles;
- irrigation;
- CO2, light and soil-related inputs where supported;
- advanced Pulse behavior;
- richer diagnostics and notifications.

These are product slices after the common device/output/safety/script foundations are in place.

## Sequencing rule

The intended order is:

```text
Core 1 freeze
  -> Core 2 foundation
  -> Power Strip 4 Gen4
  -> Shelly Script Catalog
  -> Grow UI
  -> Generic BLE sensors
  -> Full BLE management parity
  -> Advanced cross-output / cross-device automation
  -> broader grow features
```

Small prototypes may be explored earlier when they do not create a second architecture, but production implementation should preserve this dependency order.

## Working rule

Prefer small vertical slices with explicit ownership, focused regression coverage and one final repository quality gate.

Hardware-facing behavior requires real-device evidence. UX work requires real render/responsive acceptance. Documentation should describe the current architecture and this development plan, not preserve superseded plans as parallel truth.
