# Roadmap

## Product direction

Shelly Link is **climate/grow-first with a reusable local Shelly platform underneath it**.

The product is not trying to become a general-purpose replacement for every Shelly management surface. Platform work earns priority when it enables a real climate/grow use case, improves safety/reliability, reduces setup friction or provides diagnostics needed to operate the local automation confidently.

The phone configures, manages and diagnoses. Shelly executes installed automation locally.

## Now — close the current foundation cleanly

The long BLE/Plug-management iteration is feature-complete enough to checkpoint. Before starting another user-facing feature, keep the baseline clean:

- merge the accepted BLE management/provisioning/OTA/time-sync work to `main` after the final repository gate;
- keep one active product branch at a time;
- preserve dated hardware evidence separately from architecture/product docs;
- remove completed implementation plans from the active documentation set;
- do not add a new zero-friction onboarding abstraction just because the primitives now exist.

### Next architecture cleanup: one physical Plug registry

Canonical physical identity is already normalized `Shelly.GetDeviceInfo.id`, but two durable Plug registries still exist from the historical Wi-Fi and BLE flows.

Next structural cleanup should converge Wi-Fi-origin and BLE-origin saved Plug state around one physical Plug record with independent transport locators.

Acceptance for that cleanup:

- adding the same physical Plug through another transport enriches/reuses the existing record instead of creating another durable device;
- Wi-Fi and BLE locators remain replaceable metadata, never identity;
- existing saved names and automation ownership survive migration/convergence;
- no transport-specific fallback is hidden inside identity semantics;
- focused migration/deduplication regressions exist before removing the old split.

Do this as a bounded architecture slice, not mixed into a new product feature.

## Next product milestone — explicit decision gate

After the physical Plug registry is clean, choose **one** of these as the next main product milestone. Do not develop both in parallel.

### Candidate A — History / Datalogger

User value:

- understand temperature/humidity/VPD and relay behavior over time;
- diagnose why automation acted;
- validate grow/climate conditions without a separate server.

The parked `work/kvs-datalogger` branch is research/source material only. Do not merge it mechanically: it predates the current exclusive Shelly Scripts ownership model.

Before implementation choose a lifecycle compatible with current ownership, then reuse only still-valid KVS/codec/client/generator pieces. History failure must never compromise Climate safety.

### Candidate B — richer climate rules

User value:

- minimum ON/OFF times;
- cooldown/debounce behavior;
- clock/time windows;
- reusable condition composition;
- safer control of real equipment with fewer external tools.

Implement reusable typed operators rather than feature-specific runtime forks. Safety precedence and safe-OFF behavior remain explicit.

## Later — product-supporting expansion

These are valid directions only when tied to a concrete product use case:

- curated Shelly Script Library with typed/simple configurators;
- additional climate/grow sensors through the existing typed sensor model;
- additional automation templates built from shared operators;
- stronger diagnostics/recovery where field evidence shows a real need;
- persistent BLE pairing/bonding when a supported workflow truly needs BLE after provisioning;
- offline firmware servicing only after a safe hardware-proven approach exists.

Do not prioritize a capability merely because Shelly exposes an RPC for it.

## Parked / research

### KVS datalogger

`work/kvs-datalogger` stays preserved as source material until History becomes the selected product milestone.

### Offline OTA

A local cached-firmware path may be researched later. Raw undocumented `OTA.*` methods are not a product API.

### BLE soil moisture

Deferred until there is a clear product need. If resumed, start with identity/readings/diagnostics and integrate through the existing sensor/config model before adding automation behavior.

### Broad general-purpose Shelly management

Not an active goal. Shelly Link may gain reusable management capabilities, but only in support of the climate/grow product or a later explicitly approved expansion of product scope.

## Stable baseline already accepted

The following are foundation, not active roadmap items:

- local `climate-engine-v1` automation with safe-OFF behavior;
- persistent automation ownership/recovery semantics;
- 1–4 mixed supported BLE thermometers with per-sensor freshness/diagnostics;
- Climate temperature/humidity/VPD setup;
- Time automation using native Shelly schedules;
- Plug lifecycle and conservative recovery;
- shared five-section Plug Detail UX;
- Shelly HTTP management;
- Shelly BLE RPC transport and BLE-only Plug management;
- bounded stale BLE-locator recovery for reads;
- capability-aware device settings/read models;
- BLE Wi-Fi provisioning and verified HTTP transport promotion;
- explicit firmware check/update with read-only post-reboot verification;
- capability-aware device-time synchronization;
- real Samsung S22+ / Shelly Plug S Gen3 hardware evidence for the accepted paths.

Detailed dated evidence belongs in `docs/testing/hardware-matrix.md`, not here.

## Working rule

Prefer one small vertical slice, focused regressions during iteration and one broad repository gate at the acceptance boundary.

For hardware-facing work:

- verify canonical physical identity before mutation;
- never automatically replay an ambiguous mutation;
- require real-device evidence before claiming hardware support;
- record a known final relay state when relay behavior is exercised.

Merge completed slices promptly, delete retired work branches after merged `main` is verified, and preserve explicitly parked research branches rather than treating them as cleanup noise.
