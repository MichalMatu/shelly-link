# Handoff — Stage 9 stabilization

Status: **2026-10-07 — V1 feature work is effectively closed. Physical reboot/power-cycle, BLE scanner recovery, real Wi-Fi loss/recovery, the final real-hardware matrix and the automation Detail/preproduction ownership closeout are complete. The only intentionally outstanding release blocker before freeze is the 8-hour soak.**

Repository: MichalMatu/shelly-link

## Source of truth

Start from fresh main and fresh Local Agent state. Read:

1. AGENTS.md;
2. this file;
3. docs/ARCHITECTURE.md;
4. docs/DEVELOPMENT_PLAN.md;
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

Focused lifecycle tests pass, `pnpm check` passes, and GitHub CI passed for the completed audit hardening. The Darwin `04-plug-ble-discovery` visual mismatch is unchanged at 5036 pixels on clean `main` and is therefore a pre-existing baseline drift, not a product delta.

## Documentation policy

Architecture contains durable contracts. Development Plan contains current/future product stages. This handoff contains only active state and immediate work. Real-device numbers, commit hashes, logs and one-off qualification narratives belong in docs/testing/ or Git history.

Current visual truth is the committed E2E snapshots plus docs/UX_VISUAL_CONTRACT.md.

## Remaining V1 work

1. run the 8-hour soak and leave the final relay explicitly OFF;
2. run the final freeze/release sign-off and declare V1 feature freeze.

The soak is only the last V1 release gate. It is not the complete future-development queue.

## Post-freeze continuation

The canonical post-freeze sequence lives only in `docs/DEVELOPMENT_PLAN.md`.

Do not duplicate the future roadmap in this handoff. Its purpose is the active continuation state and immediate V1 closeout only.

## Automation Detail closeout — 2026-10-07

The Pulse/combined-mode UX correction batch is closed. The final accepted architecture and presentation are:

- one shared automation Detail capability owner derives variant, icon, History and Script availability;
- Climate keeps its frozen accepted composition while using the shared capability owner underneath;
- native Time exposes no Script/History capability; Time + Pulse exposes Script but History remains intentionally unimplemented;
- standalone Pulse exposes History, BLE, Device, Script and Info through the shared Detail chrome;
- Time and standalone Pulse Detail are configuration-focused and do not duplicate the healthy dashboard operational summary;
- standalone Pulse uses the shared Pulse-cycle editor directly, without a second read-only/edit-mode presentation;
- generic script source/diagnostic UI is shared automation presentation, not Climate-owned presentation;
- Plug LED/Button/Cloud settings remain one shared physical-device surface; lowercase firmware method advertisement for `plugs_ui.*` is accepted;
- dashboard AUTO/MANUAL/direct relay controls remain dashboard-only.

PR #105 normalized capability ownership. PR #106 restored the accepted lean Time/Pulse presentation on top of that architecture and superseded the older draft PR #104. Do not revive the superseded branch or reintroduce per-screen tab lists, duplicate healthy Detail status, or Climate-prefixed names for shared automation presentation.

The only intentional capability gap in this area is **Time + Pulse History**. Treat it as a separate product decision because the writer/storage runtime capability does not yet exist for that composition.

## Verification boundary

The audit hardening passed its focused lifecycle suites, the canonical `pnpm check` and GitHub CI. Fresh real-device evidence covers Wi-Fi loss/recovery, the 16/16 final runtime matrix, final device postflight and standalone Pulse History v2. UX-4 passed the canonical `pnpm check`, responsive/visual acceptance and a real generated-runtime smoke with exact preflight restoration. The 8-hour soak remains intentionally deferred.
