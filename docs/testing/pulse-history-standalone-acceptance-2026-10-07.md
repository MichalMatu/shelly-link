# Standalone Pulse History acceptance — 2026-10-07

## Scope

This record qualifies UX-4: standalone Pulse History/Datalogger using the existing History v2 contract. It does not add Time + Pulse History and does not create a second history format.

## Qualified code

- branch: `ux/pulse-history-20261007`
- implementation + verification candidate: `3b4de6f47c313c74833eafe4a912aa4095080f34`
- generated standalone Pulse runtime used on hardware: 3067 B

The implementation keeps Climate History behavior unchanged by default and adds a standalone-Pulse writer profile that emits the same History v2 tuple with temperature, humidity and VPD set to `null`.

## Software evidence

Focused checks passed before the full gate:

- script-generator History/runtime/size tests: 20/20;
- mobile History/tab tests: 11/11;
- `pnpm quality:ux`;
- standalone Pulse Playwright flow: 8/8 across 360×800, 390×844, 412×915, 768×1024 and 1440×900;
- only the intended Pulse visual assets changed: the existing detail chrome gained History and the new `31-standalone-pulse-history-darwin.png` baseline was added.

The canonical `pnpm check` then passed. Core coverage remained 100% for the covered runtime packages, including 157/157 automation-core tests and 238/238 script-generator tests.

The accepted Pulse History presentation is exactly three panels: Output, Power and Current. Temperature, Humidity and VPD are absent. Climate keeps its accepted five-panel History stack.

## Runtime contract

Standalone Pulse reuses the existing bounded `shellylink.history.*` ring:

- History v2;
- 24 slots;
- existing per-record size guard;
- serialized best-effort KVS writes;
- no KVS response participates in Pulse relay timing, fault state or safety;
- boot safe-OFF is confirmed before History initialization;
- Pulse starts independently of History KVS availability;
- no-op requested/final state observations may still be written so the current reason/request is not silently lost.

The mobile reader/hook/presentation ownership was neutralized only as far as needed to serve Climate and standalone Pulse. No parallel Pulse reader or record shape was introduced.

## Real Plug S Gen3 acceptance

Device:

- canonical id: `shellyplugsg3-e4b063e3e298`;
- model: `S3PL-00112EU`;
- firmware: `2.0.1`.

The direct-IP preflight initially timed out, so mDNS was used. The reachable device state differed from the older Stage 9 postflight baseline: it currently contained one enabled but stopped `Shelly Link Thermostat` script, Matter was disabled, schedules were empty, relay was OFF and History KVS was empty. The UX-4 smoke therefore preserved that actual current state instead of deleting the stopped runtime or changing Matter.

Before mutation the existing script source was backed up and verified at SHA-256 `5ea035e915849ecadac84ced0502168ee59b5c741846633710a4a5a41d5e06d8`.

The temporary UX-4 standalone Pulse runtime used relay 0 with 1000 ms ON / 2000 ms OFF, continuous execution. Observed hardware behavior:

1. the candidate script started and the physical relay produced repeated ON/OFF phases;
2. live samples observed non-zero load while ON (about 4.6–4.9 W and 0.214–0.235 A);
3. History v2 metadata reached `[2,24,6,6]`;
4. six Pulse records were decoded, all with temperature/humidity/VPD equal to `null`;
5. records included both requested/final ON flags and OFF flags with Pulse reason codes;
6. the writer remained bounded to the shared History namespace.

Cleanup then:

- stopped the temporary runtime;
- explicitly forced relay OFF;
- deleted all UX-4 History KVS keys;
- restored the original script byte-for-byte;
- restored its enabled/stopped state;
- re-verified empty schedules;
- re-verified relay OFF and empty History KVS.

Final restored source SHA-256 matched the preflight backup exactly.

## Result

**Standalone Pulse History UX-4 is qualified.**

Time + Pulse History remains a separate product decision. Do not infer that it is enabled from this acceptance.
