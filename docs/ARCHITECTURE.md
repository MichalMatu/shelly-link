# Architecture

Shelly Link is a local-first climate/grow configurator and management app. The phone discovers, configures and diagnoses devices; Shelly executes installed automation locally after setup.

The architecture is intentionally reusable beyond one automation, but the product remains climate/grow-first. Device-management work is prioritized when it enables that product, improves safety/reliability, reduces setup friction or provides useful operational diagnostics.

## Product model

```text
physical Plug -> optional installed automation
```

A saved Plug is useful without automation. Automation setup starts from a concrete physical Plug. One Plug relay has at most one Shelly Link managed automation owner at a time.

`InstalledAutomation` is the durable automation ownership record. A Plug referenced by an installed automation cannot be forgotten from the app until that automation is uninstalled; forgetting an unowned Plug removes only the saved app record and does not mutate Shelly. A saved thermometer referenced by an installed Climate automation likewise cannot be removed until it is removed from or no longer owned by that automation. Uninstalling an automation remains a separate destructive operation.

The project is pre-release. Internal model/API renames are applied cohesively to current code/tests/docs instead of carrying compatibility layers for never-released development states.

## Physical identity and transport locators

Canonical Shelly identity is normalized `Shelly.GetDeviceInfo.id`.

Transport-specific addresses are locators, not identity:

- HTTP `baseUrl` / IP is a Wi-Fi locator;
- Android BLE address / CoreBluetooth UUID / `bleDeviceId` is a BLE locator;
- advertisement name and RSSI are discovery metadata only.

Before destructive operations, runtime replacement or device mutations, the app verifies that the endpoint still belongs to the expected canonical physical device.

A physical Plug may have more than one verified locator. Provisioning and transport promotion enrich transport metadata; they do not create a new physical identity.

### Canonical physical Plug registry

Saved Plugs have one durable record keyed by normalized canonical identity. The `plugs` feature owns that record and stores BLE and verified Wi-Fi/HTTP locators as independent optional transport metadata.

Wi-Fi setup and BLE discovery both enrich the same record. Hardware-setup state keeps only workflow/configuration draft state and a selected physical Plug id; it is not a second device registry. Presentation consumes the canonical registry directly rather than deduplicating transport-specific saved-device lists.

Development-state migration merges the former Wi-Fi and BLE records by canonical identity and rejects endpoint-shaped legacy ids as physical identity.

## Runtime ownership and safety

The phone owns configuration, persistence, presentation and diagnostics. Shelly owns real-time automation execution after installation.

Climate runtime invariants:

- boot starts safe OFF;
- stale or unusable sensor data makes AUTO fail OFF;
- MANUAL starts safe OFF and remains explicit user control even when automation sensor data is unavailable;
- hard safety lockout overrides AUTO and MANUAL and forces OFF;
- identity is verified before destructive/runtime mutation;
- install/edit/recover forces relay OFF before replacing managed runtime state;
- current Climate install owns the full Shelly Scripts namespace and converges it to exactly one managed runtime;
- uninstall forces relay OFF, removes managed script state and verifies the resulting device state before deleting local ownership;
- script hashes describe generated code only; display names, old script IDs and old hashes are not authorization evidence;
- hardware tests that exercise relay mutation finish with an explicitly known relay state.

Passive recovery may recognize and reconstruct valid Shelly Link-managed state, but passive reconciliation does not silently rewrite a valid runtime. Explicit install/edit/recover is the convergence boundary.

Temporary BLE discovery is the exception to exclusive long-lived script ownership. It is short-lived, disabled for run-on-boot, stops the managed automation when needed, cleans itself up and restores the prior Climate control state without redefining ownership. A failed restore remains safe OFF.

Native Time automation uses Shelly schedules rather than the Climate script runtime.

### Climate runtime control arbiter

Managed Climate control has two user control modes and separate health/safety axes:

```text
controlMode = AUTO | MANUAL
manualRequest = OFF | ON
automationRequest = OFF | ON
automationFault = null | sensor/runtime fault
safetyLockout = false | true
```

Final relay ownership is deterministic:

```text
hard safety lockout -> OFF
MANUAL              -> manual request
AUTO + fault        -> OFF
AUTO                 -> automation request
```

Entering `MANUAL` always starts safe OFF. Explicit ON/OFF is allowed only while MANUAL. Sensor loss remains an automation fault and is visible in diagnostics, but it does not revoke explicit MANUAL control. Returning to `AUTO` is explicit, starts safe OFF and requires fresh usable automation input before AUTO may energize the relay again.

A hard safety lockout is different from automation health. It forces OFF in both AUTO and MANUAL and requires deliberate recovery. The runtime supervisor owns maximum continuous ON and relay-control failure directly. Plug-native switch protection is the authority for device electrical/thermal ceilings: native protection errors are latched through `Shelly.addStatusHandler`, with boot-time and periodic `Switch.GetStatus` polling as a missed-event fallback. The first hard-safety reason wins until deliberate reset. Reset clears the manual request, keeps the relay OFF and makes AUTO wait for fresh usable automation data before it may energize again. Shelly Link does not duplicate firmware-owned power/current limits or infer an internal-device temperature cutoff from ambient-temperature specifications.

The mobile app changes managed runtime state through `Script.Eval`; it does not bypass the runtime with raw `Switch.Set`. Diagnostics expose control mode, manual request, automation-requested relay state, automation fault, hard safety lockout, final relay state, reason code, last relay-change uptime and last control-mode transition uptime.

While a Climate automation owns a Plug S Gen3, the app converges `PLUGS_UI.controls.switch:0.in_mode` to `detached` and restores the previous mode on uninstall. Real-device acceptance on Plug S Gen3 firmware 1.7.5 confirmed that this model exposes no physical `Input`/`Button` component for its built-in button while detached. Therefore physical-button takeover is not part of the Plug S Gen3 runtime contract; manual takeover is app-driven. Future device profiles may enable physical takeover only when a real local input/button event capability is verified.

### Rule/action timing pipeline

Normal Climate rule decisions do not control the relay directly. The qualified execution path is:

```text
Climate rule decision / parent request
-> optional active-window gate
-> optional shared Pulse cycle
-> requested AUTO output
-> optional relay debounce
-> minimum ON/OFF timing gate
-> AUTO/MANUAL + automation-fault + hard-safety arbiter
-> physical relay
```

The optional execution layer changes requested AUTO output only; it is not a second relay owner. Pulse phase timers and active-window boundary timers are local one-shot Shelly timers. Existing minimum ON/OFF, debounce, MANUAL, automation-fault and hard-safety ownership stays centralized in the relay/runtime arbiter. Hard safety and other forced-OFF paths remain authoritative and are never delayed by Pulse, debounce or minimum-ON timing. The legacy `minChangeMs` behavior remains the minimum-OFF/cooldown owner; adding another cooldown owner would duplicate semantics.

The shared Pulse-cycle model supports ON/OFF phases, optional initial delay, Continuous/Cycles/Duration execution, selectable start phase and safe-OFF completion. Climate configuration may optionally carry `execution.pulse` and/or `execution.activeWindow`; absence of `execution` preserves the existing steady Climate configuration shape and runtime behavior. Active windows use Shelly local time, may cross midnight and fail safe OFF when local time is not trustworthy. Parent inactive, active-window close, MANUAL takeover, automation fault and hard safety cancel the active Pulse cycle instead of allowing it to finish.

This generated Climate execution path is qualified. Existing Steady Time remains two native Shelly `Switch.Set` schedules and no script. Time + Pulse is also qualified as an explicit composition: `DailyTimeAutomationConfig` stays unchanged; native ON/OFF schedules own the daily window and call the run-on-boot Pulse script through `Script.Eval` `rq(true)` / `rq(false)` boundaries; the script owns Pulse phase timing only and reuses the same shared Pulse-cycle engine. Standalone Pulse remains the next runtime slice and must reuse that engine without a Climate/Time parent.

## Climate engine and persistent config

The stable direction is:

```text
mobile configuration
  -> typed automation model
    -> Shelly RPC transport
      -> stable Climate runtime
        -> compact persistent config/diagnostics/history
          -> sensors + clock
            -> rules/operators
              -> relay
```

The current Climate runtime is `climate-engine-v1`. Supported thermometer profiles share one generated runtime body; automation-specific values live in typed compact config. Optional Pulse and active-window execution state is also represented compactly and generated only when the configuration uses it.

Explicit Climate edits currently replace the managed runtime using the current generator instead of preserving development-era script instances. Recovery may read persisted config while retaining the current generated-runtime decoding fallback. Persistent runtime config, decode and reconciliation round-trip optional Pulse/active-window execution without moving transient phase/timer state into persistence.

History v2 uses a namespaced/versioned `shellylink.history.*` KVS ring owned by the same managed Climate runtime. History writes are observational and best-effort: KVS failure must not affect relay arbitration or safety. Runtime configuration and History remain separate persistence concerns and do not create another automation owner. Pulse-driven transitions use the existing requested/final relay and reason-code history model rather than a second History format.

## Climate sensors

A Climate automation supports 1–4 thermometers with `avg`, `min`, `max` or `firstValid` aggregation. Xiaomi/PVVX BTHome and TP357 devices may be mixed.

Normalized physical BLE `runtimeAddress` is the logical thermometer identity at the mobile/runtime boundary. Phone discovery, Plug discovery, installed config and recovery converge on that identity.

Sensor display names are presentation metadata, but the compact runtime config embeds them in generated script source. Climate config therefore caps each display name at 26 escaped UTF-8 JSON-content bytes. Keep 9500 B as the preferred generated-script optimization target; the accepted hard ceiling for the qualified Pulse/active-window runtime is **12000 B**, and the generator size guard is the final authority.

Freshness is evaluated independently per sensor. Stale/unusable members do not contribute; if no configured member remains usable, AUTO records an automation fault and safe OFF wins. Incomplete advertisements must not make old temperature/humidity values fresh. MANUAL does not use thermometer data to authorize explicit relay ON/OFF; hard safety remains independent and higher priority.

Runtime diagnostics expose one compact record per configured thermometer. Phone BLE and Plug BLE are live-reading sources; recovered identity provenance is tracked separately from live readings.

## Shelly RPC transport

The transport boundary is shared:

```text
feature flow
  -> RpcShellyClient / ShellyRpcTransport
      -> HTTP adapter
      -> BLE adapter
```

HTTP remains the preferred stable management channel once a verified Wi-Fi locator exists. BLE is also a real Shelly RPC management channel and is especially useful for bootstrap/discovery.

Transport rules:

- BLE RPC handles framing, chunking, request IDs, timeouts, serialization and connection invalidation below the feature layer;
- read-only BLE recovery may perform one bounded rediscovery after a retryable stale-locator failure and accepts only a canonical-id match;
- locator recovery updates only the locator and never changes canonical identity;
- optional capabilities are discovered with `Shelly.ListMethods`; model, generation and firmware strings do not substitute for advertised methods;
- mutating RPC is never automatically replayed after an ambiguous timeout/disconnect;
- UI/components do not own raw HTTP, GATT or Shelly RPC calls.

### Provisioning and transport promotion

The accepted bootstrap flow is:

```text
BLE identity/capabilities
-> Wifi.Scan
-> one Wifi.SetConfig
-> read-only Wifi.GetStatus
-> persist verified HTTP locator on the same physical Plug
-> verify canonical identity over HTTP
-> prefer HTTP for normal management
```

This is deterministic transport promotion, not blind BLE/Wi-Fi fallback.

Firmware maintenance uses capability-aware `Shelly.CheckForUpdate` / explicit `Shelly.Update`. Update-start ambiguity is resolved with read-only reconnect, canonical-id verification and expected-firmware verification rather than replaying the update mutation.

`Sys.SetTime` is exposed only when advertised. Undocumented raw `OTA.*` RPCs are not a product contract.

Persistent BLE pairing/bonding and offline OTA remain separate research/feature decisions; they are not prerequisites for the normal climate/grow path.

## Plug detail ownership

Plug Detail is one physical-device surface with capability-driven local sections. The shared capability vocabulary is:

```text
Automation | History | BLE | Device | Script | Info
```

A Plug shows only the sections supported by its ownership model. Climate exposes all six. Native Time Schedule omits `History` and `Script`. A plain saved Plug keeps the physical-device surfaces and an Automation empty state rather than inventing another detail shell. These sections are presentation boundaries, not new domain owners:

- **Automation** — installed automation state/configuration and deletion;
- **History** — read-only Climate operational history from the managed KVS ring;
- **BLE** — BLE state, configured sensors, readings and diagnostics;
- **Device** — Shelly-owned settings such as LED, button mode and Cloud plus explicit management actions approved for that transport/state;
- **Script** — managed runtime source/preview;
- **Info** — identity, firmware/network/health and runtime resource diagnostics.

The available capability tabs remain the first Plug Detail content. Top-level detail/intent pages do not render a duplicate page-local Back when persistent bottom navigation or platform/browser Back already returns to the parent product section. `AppPageBack` is reserved for true nested subflows that return to a specific parent context. The top chrome intentionally contains the tab strip only: do not insert a separate identity summary card between the tabs and the owning section. Identity, model, transport, firmware and network detail belong under **Info** unless a future product design gives them a new explicit owner.

A saved Plug remains navigable after its automation is removed. Plain Plug Detail selects **Automation** by default and shows an explicit no-automation state with a Plug-scoped **Add automation** action; the physical-device detail surface does not disappear with automation ownership. Dashboard card-surface navigation must not steal events from relay controls, inline name editing, menu actions or the Add automation CTA.

Device-setting forms keep local drafts. Background refresh may update the device baseline but must not overwrite a dirty user draft.

Legacy nested Settings/Diagnostics/Script pages remain retired after their data moved to the owning surface.

### BLE Plug dashboard reachability

A saved BLE Plug card treats confirmed reachability failure as state, not a transient render artifact. Once a runtime read fails, the card remains visibly offline through background refresh attempts, relay controls remain disabled while reachability is unknown/offline, and the offline state clears only after a successful runtime read. Polling must not repeatedly mount/unmount status geometry and make the card collapse or flicker.

## Dependency direction

```text
screens / routes
  -> feature flows + state
    -> package APIs
      -> domain logic + adapters

shared UI -> design tokens
```

Rules:

- screens compose and present; they do not own raw transport, storage or runtime lifecycle;
- flows own orchestration and side-effect lifecycles;
- durable state is accessed through repository/store boundaries;
- reusable Shelly protocol/domain behavior belongs in packages rather than mobile presentation;
- `packages/*` never depend on `apps/*`;
- feature public APIs and repository gates enforce dependency boundaries.

Refactor only to fix ownership, remove a concrete blocker or enable an agreed feature. File length alone is not a reason for mechanical splitting.

## Evidence and acceptance

Architecture documents contain durable contracts, not chronological test history.

Real-device claims belong in `docs/testing/hardware-matrix.md` or a focused dated acceptance record. Qualified Pulse runtime evidence is recorded in `docs/testing/pulse-v1-climate-runtime-acceptance-2026-10-01.md` and `docs/testing/pulse-v1-time-runtime-acceptance-2026-10-01.md`. UI geometry belongs in the UX contract/gallery. Session-specific implementation state belongs in `docs/HANDOFF_NEXT_CHAT.md`.

Hardware-facing behavior requires real-device acceptance. Mutating tests must record the final relay/device state when that state matters for safety.
