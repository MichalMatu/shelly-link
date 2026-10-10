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

### Ionic component migration — independently review before closeout

The UX reliability stage is closed, but **full Ionic control migration remains in progress** on `work/ux-evolution`; never alter `main` or delegate to child chats. See the updated `docs/CHECKPOINT_2026-10-08_UX_EVOLUTION.md` and `docs/UX_VISUAL_CONTRACT.md`.

Already adopted: `IonApp` root, Time/Pulse numeric inputs, segments, selection and actions, saved Plug/Shelly/Thermometer inline name inputs, LED HSL `IonRange`, Settings and Add forms, and multiple Plug settings controls. The stable product code was validated by `pnpm check` (546/546 mobile tests) on `89e95b43f9352f2653417658272b3a0bf2e93bdb`, with responsive E2E **50/50** on `34995a8442b1f760d6ebd0fe3d1baf4948522513`.

An updated census found **80 remaining native HTML controls in 36 files**. Many are deliberate custom icon/gesture/navigation/relay controls; some are still ordinary actions requiring classification/migration. Do not claim full migration or replace them blindly. A Climate input/checkbox Ionic experiment introduced a ~5% visual screenshot regression and was **fully reverted** to protect frozen Climate; do not update snapshots to conceal this. Review every remaining standard control with the same visual contract and test each slice.

The same pre-experiment product APK (SHA-256 `37acd5235e3b728e3d643b5c3ba4ccde1de7109f12e09b3e72710da6862bb071`) was successfully installed via Wireless ADB `192.168.0.100:40973` on Samsung S22+ / Android 16 using `install -r`, preserving app data. Cold start **628 ms**, active process, screenshot 1080 × 2340. Android/WebView warnings only; do not interpret the generic warnings as fatal startup failures.

Next: finish classification and migration of remaining standard controls, preserve intentionally bespoke controls with documented rationale, run exhaustive `pnpm check`, responsive E2E and visual diff review, then real-device acceptance. Assess removal of genuinely unused CSS and dependency/JS growth as separate measured work. `main` stays untouched without explicit approval.

### Independent Ionic closeout audit — next conversation

The **safe handoff head** after a failed ordinary/modal `IonicActionButton` batch is `ceb48075b62f102811d679c3bfbf604df4f3ad23` plus documentation-only commits. The unsuccessful 16-file action/focus experiment was completely reverted; GitHub reports no source diff against `f056eb706242126d1d2c36d1bf0db5cb16e2d773`, and only documentation differences against the accepted Android code `34995a8442b1f760d6ebd0fe3d1baf4948522513`. Do not infer success from its passing TypeScript/UX gates: affected Vitest suites had 17 failures. Do not reintroduce the batch wholesale.

The next conversation's mission is to challenge the Ionic migration and fix actual omissions, **not** to disguise remaining custom HTML controls or the frozen Climate form with unreviewed visual baseline updates. See the UX checkpoint for the exact remaining classes, known 80-control census and safe acceptance. Work only on `work/ux-evolution`, preserve `main` and Android data, do not use subchats, and verify Local Agent state before queuing tasks.

### Ionic React audit update — 2026-10-10 (newest status)

**Component migration is still open.** Read `docs/testing/2026-10-10-ionic-independent-audit.md` for evidence, exception categories and Android diagnostics; earlier 80-control and APK values above are historical.

- Latest verified **application** source: `81b36f78e4ed3e4bbce171d8c97a1e0b531ece2f`. `pnpm check` passed (549/549 mobile tests), canonical responsive/visual E2E **50/50** (snapshots unchanged), Capacitor sync and Android debug APK build passed.
- Samsung S22+ received that APK with `adb install -r` and **data preserved**; cold start 1005 ms and screenshot 1080 × 2340 succeeded. **Critical qualification:** logcat captured `Uncaught TypeError: Cannot read properties of undefined (reading 'triggerEvent')` from Capacitor/Console, without a native fatal crash. Wireless ADB later reconnected successfully at the same endpoint; stable WebView `153.0.8010.57` (no beta/dev/canary) was confirmed. Six further cold starts, including three system Back trials, showed no recurrence, no Capacitor console error and no native fatal. The original single `triggerEvent` error remains unproven and intermittent. Do not call Android error-free or migration fully verified until bridge/WebView issue is understood.
- Current census: **75 native controls** in production mobile TSX (65 buttons, 10 sensitive Climate inputs), plus separate `@lcl/ui` primitives. Deliberate navigation/gesture/relay controls remain justified; ordinary scan/retry/delete/setup/modal actions still require individual migration or recorded exemption. Climate form migration produced unacceptable visual drift and must not be reattempted unchanged.
- Bundled JS 2,369,824 B; initial `ion-icon` chunk 1,043,584 B. Review-size thresholds are exceeded despite green hard budget. Real-device TalkBack/keyboard/focus/overlays and bundle optimization remain open.
- Next actions: preserve the successful S22+ bridge-reproduction evidence; if `triggerEvent` reappears, capture its exact native event and JavaScript stack before patching. Continue small test-backed ordinary-action slices, remaining phone accessibility/TalkBack and measured JS-bundle optimization, with full gates for each product code change. No `main` edits, no subchats/Codex, and no snapshot refresh to mask Climate regressions.

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
