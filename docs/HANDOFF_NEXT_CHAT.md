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

Focused lifecycle tests pass, `pnpm check` passes, and GitHub CI passed for the completed audit hardening. The Darwin `04-plug-ble-discovery` visual mismatch is unchanged at 5036 pixels on clean `main` and is therefore a pre-existing baseline drift, not a product delta.

## Documentation policy

Architecture contains durable contracts. Roadmap contains current/future product stages. This handoff contains only active state and immediate work. Real-device numbers, commit hashes, logs and one-off qualification narratives belong in docs/testing/ or Git history.

Current visual truth is the committed E2E snapshots plus docs/UX_VISUAL_CONTRACT.md.

## Remaining V1 work

1. run the 8-hour soak and leave the final relay explicitly OFF;
2. run the final freeze/release sign-off and declare V1 feature freeze;
3. after freeze, start the graphical frontend redesign.

The non-soak Stage 9 hardware closeout is complete: Wi-Fi loss/recovery passed without credential changes; Xiaomi/PVVX and TP357 each passed 8/8 matrix cases; the production Plug remained on its existing enabled/running Climate runtime; and the separate test Plug was restored to Matter ON, zero scripts, zero schedules and relay OFF.

Do not use stabilization as an excuse to add new Pulse modes, Environment Profiles or another generic UX-polish round.

## Active UX correction plan — Pulse and combined modes

This is an explicit user-approved UX correction batch. Keep it bounded to the items below; do not turn it into a generic pre-freeze redesign or backend refactor.

### UX-1 — Climate + Pulse setup ordering

- [x] Move `Zachowanie wyjścia` directly below the VPD section and before advanced settings.
- [x] When Pulse is selected, render its cycle fields immediately below `Zachowanie wyjścia`.
- [x] Keep the primary `Wyślij` / `Zapisz zmiany` action at the true end of the complete form.
- [x] Preserve one shared `PulseCycleEditor`; do not fork Climate-specific Pulse controls.

Target order:

`devices -> rule mode -> thresholds -> VPD -> output behavior -> Pulse fields -> advanced -> save`

### UX-2 — Standalone Pulse detail capability parity

- [x] Restore the BLE scan action in standalone Pulse detail when the Plug supports it.
- [x] Add a Pulse-specific automation icon instead of reusing the clock icon.
- [x] Review the detail tabs as capability-driven surfaces rather than a hard-coded reduced Pulse set.
- [x] Keep Device, Script and Info behavior aligned with the same physical Plug capabilities used elsewhere.

### UX-3 — Time + Pulse detail capability parity

- [x] Expose the Script tab when Time has Pulse runtime installed.
- [x] Keep plain native Time without a Script tab.
- [x] Derive tab availability from the installed runtime/capabilities rather than one static Time tab list.

### UX-4 — Pulse History / datalogger

- [x] Generalize the current Climate-only History read/presentation ownership where practical.
- [x] Add History to standalone Pulse detail.
- [x] Pulse History minimum panels: Output ON/OFF, Power W and Current A.
- [x] Consider cycle/duty/transition information only after the minimum useful history is working.
- [x] Reuse the existing `shellylink.history.*` record model if it remains compatible; do not invent a parallel history format without evidence.
- [x] Add a small shared/bounded history writer to standalone Pulse runtime because standalone Pulse currently does not persist History records.
- [ ] Evaluate the same History capability for Time + Pulse after standalone Pulse is proven. This remains the explicit follow-up after the standalone slice is accepted.
- [x] History writes remain observational/best-effort and must never affect relay arbitration or safety.

### UX-5 — Standalone Pulse dashboard card

- [x] Reduce duplicated healthy-state information such as `Stan Pulse`, requested output, physical relay output and phase all simultaneously saying ON.
- [x] Make the card status-first and immediately understandable: current phase/state, time to next transition and compact cycle configuration.
- [x] Show detailed requested-vs-final output, reason/fault and safety information primarily when they differ or require attention.
- [x] Keep AUTO/MANUAL and physical relay controls visually subordinate to the primary Pulse state.
- [x] Preserve compact telemetry at the bottom.
- [x] Produce a reviewed screenshot before accepting the new composition.

Preferred mental model:

`Pulse state -> next transition/progress -> ON/OFF cycle -> mode/control -> telemetry`

### UX-6 — Explain combined modes clearly

The UI must make this model obvious:

- Climate / Time decides **when** output is requested.
- Pulse decides **how** the output behaves while that request is active.

- [x] For Climate, prefer wording equivalent to `Wyjście podczas pracy: Stałe ON / Pulse ON-OFF`.
- [x] For Time, prefer wording equivalent to `Wyjście w aktywnym przedziale: Stałe ON / Pulse ON-OFF`.
- [x] Review the standalone `Pulse` entry description so it does not read like another Time schedule.
- [x] Avoid presenting Climate + Pulse or Time + Pulse as two unrelated automations stacked together.

### UX-7 — Copy and small semantic cleanup

- [x] Standalone Pulse install action must not say `Zapisz harmonogram w Shelly`; use Pulse-specific copy.
- [x] Replace overly technical standalone Pulse helper text with user-oriented language.
- [x] Check setup/detail labels for leftover Time-specific wording reused by Pulse.
- [x] Do not change runtime semantics while fixing labels.

### Execution order

Implement and verify in this order unless a concrete dependency requires otherwise:

1. UX-1 setup ordering.
2. UX-2 + UX-3 capability parity.
3. UX-7 copy/semantic cleanup.
4. UX-5 standalone Pulse dashboard card.
5. UX-4 Pulse History/datalogger.
6. UX-6 final combined-mode wording pass across the affected screens.

For every slice:

- make the smallest cohesive change;
- add/update focused tests;
- capture the affected real rendered screen(s);
- do not refresh unrelated frozen Climate baselines;
- run the repository-required focused checks and final gate before merge;
- mark completed checklist items here so unfinished work remains visible.

### Current handoff cut

The bounded Pulse UX correction batch is complete through UX-4. Standalone Pulse reuses History v2 and exposes exactly three History panels: Output, Power and Current. Climate keeps its accepted five-panel History presentation unchanged.

UX-4 passed focused runtime/mobile tests, responsive Pulse E2E, reviewed Darwin visuals, the canonical `pnpm check`, and a real Plug S Gen3 smoke of the generated History writer. Detailed evidence is in `docs/testing/pulse-history-standalone-acceptance-2026-10-07.md`.

Time + Pulse History remains intentionally unimplemented and is a separate product decision. Do not reopen the completed Pulse UX batch without a concrete defect or explicit new requirement.

## Verification boundary

The audit hardening passed its focused lifecycle suites, the canonical `pnpm check` and GitHub CI. Fresh real-device evidence covers Wi-Fi loss/recovery, the 16/16 final runtime matrix, final device postflight and standalone Pulse History v2. UX-4 passed the canonical `pnpm check`, responsive/visual acceptance and a real generated-runtime smoke with exact preflight restoration. The 8-hour soak remains intentionally deferred.
