# Handoff — Stage 9 stabilization

Status: **2026-10-07 — V1 feature work is effectively closed. The two-Plug real-load harness is qualified by a passing 5-minute smoke. The only intentionally outstanding release blocker before freeze is the prepared 8-hour soak. Resume from `docs/CHECKPOINT_2026-10-07_PRE_SOAK.md`.**

Repository: MichalMatu/shelly-link

## Source of truth

For V1 release/freeze work, start from fresh `main` and fresh Local Agent state. Read:

1. AGENTS.md;
2. docs/CHECKPOINT_2026-10-07_PRE_SOAK.md;
3. this file;
4. docs/ARCHITECTURE.md;
5. docs/DEVELOPMENT_PLAN.md;
6. docs/UX_VISUAL_CONTRACT.md when changing presentation;
7. docs/testing/hardware-matrix.md and only the dated acceptance records relevant to the behavior being changed.

For the isolated UX migration, continue only on `work/ux-evolution` and also read `docs/CHECKPOINT_2026-10-08_UX_EVOLUTION.md`. That branch is intentionally separate from the V1 `main` freeze line.

Historical PR descriptions and chat state are not canonical.

## UX evolution branch — 2026-10-10

The isolated UX line remains `work/ux-evolution`; `main` is deliberately untouched. Read `docs/CHECKPOINT_2026-10-08_UX_EVOLUTION.md` (updated 2026-10-10) and `docs/UX_VISUAL_CONTRACT.md` before resuming.

Settings, Add Plug, Add Thermometer, and multiple Plug settings controls now use Ionic. Physical Plug button modes are two visible Ionic radio choices. Climate remains composition-frozen except the five explicitly reviewed Ionic control screenshot deltas; no broad redesign is authorized.

The app now has a shared localized Climate/Pulse runtime reason presenter (`ab` = above threshold, unknown codes = localized fallback) and a vetted localized-error boundary for hardware setup. Generic RPC/transport exceptions must not appear in end-user cards or toast copy. Preserve helpful known cases such as Bluetooth permissions and Shelly firmware/Matter guidance. The UX quality gate and its negative self-tests cover selected regression patterns.

Final responsive E2E passed **50/50** (0 flaky) on `3ef4f5752a791edcf7b8fb90f019a7e3066c1439`. The `04-plug-ble-discovery` baseline is unchanged; a deterministic test captures the loading state before asserting error feedback. Full `pnpm check` also passed on that source. The performance gate is green, with JS-size review warnings.

Wireless ADB to Samsung S22+ / Android 16 was verified at `192.168.0.100:40973` on 2026-10-10 (the endpoint may change). APK from UX code commit `7ffe113224b079ce3cdd766eee3cedcd7287bddb` was installed via **`adb install -r` with data preserved**. Android cold start succeeded in 891 ms, with a 1080 × 2340 screenshot and a running foreground activity. A later stable screenshot confirmed the dark-mode dashboard and translated `Above threshold` label. Full evidence, APK hash and caveats are in the UX checkpoint. Never use the destructive alpha-install script for preserving-data checks. No merge into `main` without explicit authorization.

### Full Ionic completion work (in progress)

The previous UX reliability stage remains closed, but the **subsequent full component migration is not yet finished**. On `work/ux-evolution`, the Time and standalone Pulse form controls and actions now use Ionic (`IonInput`, `IonSelect`, `IonSegment`, `IonButton`), inline Plug/Thermometer name editing uses `IonInput`, the LED HSL editor uses `IonRange`, and the app is mounted under `IonApp`. Current visually reviewed form baselines are `09`, `25`, `26`, and `29`; Climate's original editor and established composition remain untouched. `docs/UX_VISUAL_CONTRACT.md` records the precise accepted deltas.

Remaining work is the native-control audit in hardware setup and Climate rule/advanced forms, deliberate assessment of shared modal/navigation primitives, and removal of obsolete control CSS. Do not swap bespoke wheel/gesture/icon controls indiscriminately merely to inflate Ionic counts. Retain existing owners, local runtime safety and E2E baselines; no automatic snapshot bulk refresh. The new Ionic follow-up passed full `pnpm check` on `89e95b43f9352f2653417658272b3a0bf2e93bdb` (546/546 mobile tests) and full responsive E2E 50/50 on `34995a8442b1f760d6ebd0fe3d1baf4948522513`; `11-time-detail` is also individually reviewed. Android APK from that head was built/synced, but **not installed** because Wireless ADB mDNS/devices were empty. Exact APK hash and all pending acceptance steps are documented in the UX checkpoint. Full Ionic migration remains open; `main` remains untouched.

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

1. run the prepared two-Plug 8-hour soak (humidifier Climate + fan Standalone Pulse) and accept the explicit dual-relay OFF boundary;
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

The audit hardening passed its focused lifecycle suites, the canonical `pnpm check` and GitHub CI. Fresh real-device evidence covers Wi-Fi loss/recovery, the 16/16 final runtime matrix, final device postflight, standalone Pulse History v2 and the 5-minute two-Plug real-load soak preflight. UX-4 passed the canonical `pnpm check`, responsive/visual acceptance and a real generated-runtime smoke with exact preflight restoration. The 8-hour soak remains intentionally deferred.
