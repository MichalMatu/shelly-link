# Handoff — Stage 9 stabilization

Status: **2026-10-06 — V1 feature work is effectively closed. Physical reboot/power-cycle, BLE scanner recovery, real Wi-Fi loss/recovery and the final real-hardware matrix are qualified. The only intentionally outstanding release blocker before freeze is the 8-hour soak.**

Repository: MichalMatu/shelly-link

## Source of truth

Start from fresh main and fresh Local Agent state. Read:

1. AGENTS.md;
2. this file;
3. docs/ARCHITECTURE.md;
4. docs/ROADMAP.md;
5. docs/UX_VISUAL_CONTRACT.md when changing presentation;
6. docs/testing/hardware-matrix.md and only the dated acceptance records relevant to the behavior being changed.

Historical PR descriptions and chat state are not canonical.

## Accepted product/runtime baseline

Keep these contracts:

- one canonical physical Plug record and one managed automation owner per relay;
- the phone configures/manages/diagnoses; Shelly executes the automation locally;
- Climate, Time and standalone Pulse reuse the shared timing/Pulse foundations;
- AUTO/MANUAL, automation fault and hard safety remain separate concepts;
- forced-OFF and hard safety always win;
- destructive/runtime mutations require physical-device identity verification when ownership is known;
- mutating RPCs are not automatically replayed after ambiguous failures;
- React presents device/runtime state but does not own automation timing;
- temporary BLE discovery must preserve only recognized managed runtime state and leave the relay safe if restoration fails;
- Climate dashboard/detail composition remains frozen unless a deliberate product-design change replaces it.

Current scanner contract:

- target sensor silence while the scanner is still running does not justify a scanner restart;
- if the scanner is actually stopped, the watchdog must subscribe again before restarting it so event delivery returns.

## Refactor-audit closeout

The audit found no reason for another broad refactor. The three narrow hardening items are complete:

- BLE discovery preparation is internally transactional after partial mutation, with safe-OFF fallback when rollback fails;
- ambiguous multiple enabled/running scripts fail closed;
- script replacement has focused config/start/rollback failure coverage.

Focused lifecycle tests pass, `pnpm check` passes, and GitHub CI passes on the current PR head. The Darwin `04-plug-ble-discovery` visual mismatch is unchanged at 5036 pixels on clean `main` and is therefore a pre-existing baseline drift, not a product delta.

## Documentation policy

Architecture contains durable contracts. Roadmap contains current/future product stages. This handoff contains only active state and immediate work. Real-device numbers, commit hashes, logs and one-off qualification narratives belong in docs/testing/ or Git history.

The old September UX capture bundle under artifacts/ux-reference is not canonical; current visual truth is the committed E2E snapshots plus docs/UX_VISUAL_CONTRACT.md.

## Remaining V1 work

1. run the 8-hour soak and leave the final relay explicitly OFF;
2. run the final freeze/release sign-off and declare V1 feature freeze;
3. after freeze, start the graphical frontend redesign.

The non-soak Stage 9 hardware closeout is complete: Wi-Fi loss/recovery passed without credential changes; Xiaomi/PVVX and TP357 each passed 8/8 matrix cases; the production Plug remained on its existing enabled/running Climate runtime; and the separate test Plug was restored to Matter ON, zero scripts, zero schedules and relay OFF.

Do not use stabilization as an excuse to add new Pulse modes, Environment Profiles or another generic UX-polish round.

## Verification boundary

The audit hardening passed its focused lifecycle suites, the canonical `pnpm check` and GitHub CI. Fresh real-device evidence now covers Wi-Fi loss/recovery, the 16/16 final runtime matrix and final device postflight. The 8-hour soak remains intentionally deferred.
