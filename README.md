# Shelly Link

**Local-first climate and grow automation without a hub.**

Shelly Link is a mobile configurator and management app built around a simple product model:

```text
BLE thermometer -> Shelly Plug -> local automation -> relay
```

The phone discovers, configures and diagnoses. The Shelly executes installed automation locally, so the normal runtime does not require the app to stay open and does not depend on cloud services, Home Assistant, MQTT or a 24/7 server.

## Product direction

Shelly Link is **climate/grow-first**. The reusable Shelly management layer underneath it is intentionally broader than one automation, but that platform is not the product goal by itself.

New device-management capabilities should earn priority by doing at least one of these things:

- enabling a concrete climate/grow use case;
- improving reliability or safety;
- reducing setup/maintenance friction for supported hardware;
- providing diagnostics needed to operate the local automation confidently.

This keeps the architecture reusable without turning the app into a general-purpose clone of the vendor UI.

## What the app does today

- discovers and manages Shelly Plug S Gen3 over Wi-Fi and BLE;
- uses normalized `Shelly.GetDeviceInfo.id` as physical identity and treats network/BLE addresses as replaceable locators;
- supports Xiaomi LYWSD03MMC / PVVX BTHome v2 and TP357 BLE thermometers;
- supports 1–4 thermometers in one Climate automation with `avg`, `min`, `max` or `firstValid` aggregation;
- configures temperature, humidity and VPD rules;
- installs and manages a local Shelly Script runtime;
- exposes Plug, BLE, automation, script and device diagnostics without moving runtime ownership to the phone;
- records Climate History/Datalogger data locally on Shelly and reads it through a typed mobile path;
- provides chart-first Climate History visualization for temperature, humidity, output, power and current;
- provides AUTO/MANUAL control, runtime fault/safety diagnostics and safe recovery behavior;
- supports BLE bootstrap provisioning to Wi-Fi, verified transport promotion to HTTP, firmware status/update and capability-aware device-time synchronization;
- keeps user-triggered device mutations identity-verified and avoids automatic replay after ambiguous transport failures.

## Current status

The project is pre-release/beta. Core local automation, multi-sensor Climate, canonical Plug ownership/recovery, chart-first History/Datalogger, Runtime Safety Supervisor, Pulse V1, BLE management, BLE-to-Wi-Fi provisioning and the verified OTA/time-sync path have real-device evidence on Samsung S22+ / Android 16 and Shelly Plug S Gen3.

Stage 9 stabilization is in its final closeout. Soak/liveness observability, deterministic AUTO/MANUAL + automation-fault + hard-safety recovery, controlled `Shelly.Reboot`, physical mains power-cycle recovery, healthy-scanner sensor-silence handling, stopped-scanner watchdog re-subscription, real Wi-Fi loss/recovery and the final 16/16 real-hardware runtime matrix are qualified. The only intentionally outstanding release blocker before V1 feature freeze is the materially longer 8-hour soak. After freeze, the active development direction continues with BLE-management parity, Shelly Power Strip 4 Gen4 multi-output support, and then the larger graphical frontend redesign.

See [Roadmap](docs/ROADMAP.md), [Architecture](docs/ARCHITECTURE.md), [Current handoff](docs/HANDOFF_NEXT_CHAT.md) and the [Hardware test matrix](docs/testing/hardware-matrix.md).

## Downloads

The latest Android beta build is available in GitHub Releases:

```text
https://github.com/MichalMatu/shelly-link/releases/latest
```

## Project page

```text
https://michalmatu.github.io/shelly-link/
```

## Developer documentation

The active documentation set is intentionally small:

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Current handoff](docs/HANDOFF_NEXT_CHAT.md)
- [Performance handoff](docs/PERFORMANCE_HANDOFF.md)
- [Wireless Android device workflow](docs/PHONE_WIRELESS_ADB.md)
- [Hardware test matrix](docs/testing/hardware-matrix.md)
- [UX visual contract](docs/UX_VISUAL_CONTRACT.md)
- [UX visual gallery](docs/UX_VISUAL_GALLERY.md)

Repository operating rules live in [AGENTS.md](AGENTS.md) and the nearest directory-level `AGENTS.md` files.

## License

Shelly Link is source-available under a noncommercial license. Commercial use, app store distribution, product bundling or paid services require written permission or a separate commercial license.

Copyright (c) 2026 Michal Matuszewski. See [LICENSE](LICENSE).
