# Handoff — runtime arbitration checkpoint

Status: **2026-09-27 — Runtime control/state arbitration completed; History / Datalogger is next**

Repository: `MichalMatu/shelly-link`

## Accepted foundation

Shelly Link remains climate/grow-first and local-first: the phone configures, manages and diagnoses; Shelly executes installed automation locally.

Current accepted foundation:

- one canonical physical Plug registry keyed by normalized `Shelly.GetDeviceInfo.id`; BLE and HTTP addresses are locators, not identity;
- local `climate-engine-v1` with safe boot OFF, stale-data OFF and 1–4 BLE thermometers;
- Climate runtime arbitration with priority `FAULT > PAUSED > MANUAL > AUTO`;
- diagnostics expose control mode, automation-requested relay state, final relay state, reason, last relay-change uptime and last control-mode transition uptime;
- managed manual control is `MANUAL_OFF` / `MANUAL_ON`; entering manual is safe OFF, relay ON/OFF is allowed only while manual, and return to AUTO is explicit;
- PAUSED is safe OFF; FAULT cannot silently resume; safety/fault can override manual ON;
- managed Climate control changes mode through `Script.Eval`, not raw relay RPC from presentation;
- install/update converges Plug S Gen3 button mode to `detached`; uninstall restores the pre-install mode after safe script removal;
- Time automation remains native Shelly Schedule ownership, separate from the Climate runtime;
- BLE-only Plug Detail exposes the same local forget/remove action as the Wi-Fi Plug surface.

## Plug S Gen3 physical-button capability

Real-device characterization on `shellyplugsg3-e4b063d7f530`, model `S3PL-00112EU`, firmware 1.7.5 established a hardware limitation:

- `detached` correctly prevents the physical button from directly toggling the relay;
- the built-in button does not appear as `input:0` or `button:0`;
- `Shelly.addEventHandler` receives no button event for a physical press;
- `Button.GetConfig/GetStatus` for id 0 and a `button.single_push` webhook bound to cid 0 are rejected.

Therefore Plug S Gen3 manual takeover is app-driven. Do not reintroduce a simulated `input:0` contract or switch the button back to `momentary` while Climate owns the relay. Physical takeover may be added for a future device only after capability and real-hardware verification.

Detailed real-device evidence belongs in `docs/testing/hardware-matrix.md`.

## Next slice — History / Datalogger

Use `work/kvs-datalogger` as parked source material only; do not mechanically merge or rebase it. Reconcile it with the current exclusive Climate script ownership and runtime arbitration first.

History should explain why the relay changed. At minimum preserve:

- timestamp;
- temperature, humidity and VPD;
- automation-requested and final relay state;
- control mode;
- reason/trigger code;
- safety/fault context;
- useful power/current data when available.

History failure must never compromise Climate safety or relay control.

## Contracts to preserve

- one managed automation owner per Plug relay;
- one final Climate relay-decision owner;
- identity verification before destructive/runtime mutation;
- passive recovery does not silently rewrite a valid runtime;
- UI presents state; flows own RPC side effects and lifecycle;
- `packages/*` never import `apps/*`;
- no compatibility shims for unreleased development states unless they are deliberate migrations;
- hardware-facing acceptance records the final relay state;
- preserve `work/kvs-datalogger` until the History slice explicitly consumes it.

Before continuing, read this file, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, relevant `AGENTS.md` files and verify current `main`.
