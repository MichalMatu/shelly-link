from pathlib import Path

ROOT = Path(".")

acceptance = """# Physical mains power-cycle recovery acceptance — 2026-10-06

Product baseline: `b7c77e435110e23a1b01a3f017793534b68befc0` (`main`, after PR #91).

## Scope

This is the real-device Stage 9 acceptance for a true physical mains interruption of the configured Shelly Plug S Gen3. It is intentionally distinct from the previously accepted `Shelly.Reboot` software-reboot gate.

No production source, runtime configuration, schedules or automation settings were changed for this test.

Device:

- canonical id: `shellyplugsg3-e4b063d7f530`;
- model: `S3PL-00112EU`;
- generation: 3;
- firmware: `20260311-095902/1.7.5-g9979d16` (`1.7.5`).

## Preflight

Immediately before the physical interruption, read-only evidence established:

- device uptime: `163508 s`;
- exactly one managed script, id `1`, `Shelly Link Thermostat`, enabled and running;
- managed source: `8962 B`;
- managed source SHA-256: `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e`;
- native schedule count: `0`;
- runtime in AUTO;
- no automation fault;
- no hard-safety lockout;
- physical relay OFF at `0.0 W / 0.0 A`.

The operator then physically disconnected the Plug from mains, waited several seconds, reconnected it and confirmed that it returned to Wi-Fi. No `Shelly.Reboot` RPC was used.

## Postflight

Read-only postflight on the recovered device verified:

- canonical identity, model, generation and firmware unchanged;
- uptime reset from `163508 s` to `98 s`, proving a new physical boot;
- script id `1` returned enabled and running;
- managed source remained byte-identical at `8962 B`;
- source SHA-256 remained `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e`;
- native schedules remained empty;
- runtime returned to AUTO;
- no automation fault remained after fresh BLE input;
- no hard-safety lockout was introduced;
- final physical relay state was explicitly verified OFF at `0.0 W / 0.0 A`.

History v2 independently recorded the safe boot boundary at uptime `3 s`:

```text
[null, 3, null, null, null, 0, "b", "st", null, 0, 0]
```

Flags `0` with reason `b` and automation fault `st` prove that requested and final output were OFF at boot. By uptime `11 s`, fresh sensor data had been accepted and the runtime was back in normal AUTO operation without an automation fault.

## Acceptance

Physical mains power-cycle recovery is accepted on the configured Plug S Gen3:

- boot begins safe OFF;
- device uptime resets;
- the same managed source returns enabled/running without replacement;
- native schedules are unchanged;
- AUTO does not inherit an unsafe stale output across the power interruption;
- fresh BLE input restores normal runtime operation;
- no spurious hard-safety lockout is introduced;
- final relay state is explicitly known and OFF.

This closes the physical mains power-cycle Stage 9 gate.

Remaining blockers before V1 freeze are:

1. real Wi-Fi loss/recovery qualification;
2. the materially longer 8-hour soak;
3. final real-hardware matrix;
4. final release qualification.

The Wi-Fi gate and 8-hour soak were explicitly deferred on 2026-10-06 because the required network interruption and endurance window were not available at this checkpoint. Physical RF shielding / sensor disappearance is optional additional evidence, not a separate V1 blocker after PR #89 and PR #91.
"""
Path("docs/testing/power-cycle-recovery-acceptance-2026-10-06.md").write_text(acceptance)

# README
p = Path("README.md")
s = p.read_text()
old = """Stage 9 stabilization is in progress. Soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety recovery matrix, controlled real-device `Shelly.Reboot` recovery, healthy-scanner sensor-silence handling and stopped-scanner watchdog re-subscription/event-delivery recovery are qualified. Physical mains power-cycle recovery, remaining Wi-Fi recovery qualification, a materially longer soak and the final hardware matrix remain before V1 feature freeze and release qualification."""
new = """Stage 9 stabilization is in progress. Soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety recovery matrix, controlled real-device `Shelly.Reboot` recovery, physical mains power-cycle recovery, healthy-scanner sensor-silence handling and stopped-scanner watchdog re-subscription/event-delivery recovery are qualified. Remaining blockers before V1 feature freeze are real Wi-Fi loss/recovery qualification and the materially longer 8-hour soak, followed by the final hardware matrix and release qualification."""
if old not in s:
    raise SystemExit("README status text not found")
p.write_text(s.replace(old, new, 1))

# HANDOFF
p = Path("docs/HANDOFF_NEXT_CHAT.md")
s = p.read_text()
old = """Status: **2026-10-05 — PR #89 healthy-scanner sensor-silence recovery and PR #91 stopped-scanner re-subscription recovery are both merged and hardware-qualified on `main`; PR #90 build/test orchestration is merged. Physical mains power-cycle, remaining Wi-Fi/BLE loss/recovery, long soak and final hardware closeout remain.**"""
new = """Status: **2026-10-06 — PR #89 healthy-scanner sensor-silence recovery, PR #91 stopped-scanner re-subscription recovery and the true physical mains power-cycle gate are hardware-qualified. Remaining V1 blockers are real Wi-Fi loss/recovery and the 8-hour soak; final hardware matrix and release qualification follow those gates.**"""
if old not in s:
    raise SystemExit("HANDOFF status text not found")
s = s.replace(old, new, 1)

start = s.index("## Next work")
end = s.index("## Verification reminders", start)
next_work = """## Next work

The application is near feature-complete. Six Stage 9 runtime/recovery slices are now qualified on `main`: soak/liveness observability, the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix, deliberate real-device software reboot recovery, healthy-scanner sensor silence -> stale/OFF -> fresh-BLE AUTO recovery from PR #89, stopped-scanner watchdog restart -> re-subscription -> event-delivery recovery from PR #91, and true physical mains power-cycle recovery.

The 2026-10-06 physical power-cycle gate used a real mains OFF -> ON interruption. Device uptime reset from `163508 s` to `98 s`; History recorded safe OFF at uptime `3 s`; the same 8962 B managed source / SHA-256 `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e` returned enabled/running; schedules remained empty; fresh BLE restored healthy AUTO; no hard-safety lockout was introduced; final relay was explicitly OFF.

Physical BLE RF shielding / sensor disappearance is not a separate V1 blocker. PR #89 already qualifies the runtime contract for target-frame loss while the scanner remains healthy, and PR #91 qualifies actual scanner stop/restart/re-subscription. A literal RF/power-off proof may be added later as extra evidence.

Remaining order:

1. qualify real Wi-Fi loss/recovery without changing Shelly credentials;
2. run the materially longer 8-hour soak with explicit final relay OFF;
3. run and close the final real-hardware matrix, restoring the production runtime afterward;
4. declare V1 feature freeze and run final release qualification;
5. only after the runtime/backend freeze, begin the explicit new graphical frontend redesign.

The Wi-Fi interruption and 8-hour soak are explicitly deferred from the 2026-10-06 checkpoint because the required network control and endurance window were not available.

Detailed recovery evidence on `main`: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`, `docs/testing/reboot-recovery-acceptance-2026-10-04.md`, `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`, `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md` and `docs/testing/power-cycle-recovery-acceptance-2026-10-06.md`.

Enabling active Standalone Pulse BLE scan is technically unblocked, but remains a separate explicit product/UX slice rather than being smuggled into stabilization work.

Do not add another generic UX-polish round or expand Pulse with unrelated runtime modes unless a concrete defect or accepted product change requires it.

"""
s = s[:start] + next_work + s[end:]
p.write_text(s)

# ROADMAP
p = Path("docs/ROADMAP.md")
s = p.read_text()
old = """Verify heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL interaction matrix, automation-fault and hard-safety recovery, Pulse recovery/cancellation semantics, long soak, script-memory headroom, final hardware matrix and final UX acceptance. Then declare v1 feature freeze."""
new = """Verify heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi loss/recovery, AUTO/MANUAL interaction matrix, automation-fault and hard-safety recovery, Pulse recovery/cancellation semantics, long soak, script-memory headroom, final hardware matrix and final UX acceptance. Then declare v1 feature freeze."""
if old not in s:
    raise SystemExit("ROADMAP Stage 9 opener not found")
s = s.replace(old, new, 1)
anchor = """The 2026-10-04 deterministic recovery-interaction slice qualifies the full existing AUTO/MANUAL + automation-fault + hard-safety precedence without changing production runtime semantics. Two generated-runtime cross-axis cases close the previously uncovered intersections: MANUAL + automation fault + hard safety through safety reset, and AUTO + automation fault + hard safety through reset and fresh-input recovery. Hard safety remains highest priority, safety reset stays OFF, MANUAL preserves an independent automation fault while allowing later explicit manual control, and AUTO remains `st`/OFF until fresh usable input arrives. Detailed evidence is in `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`."""
if anchor not in s:
    raise SystemExit("ROADMAP interaction anchor not found")
addition = anchor + """

The 2026-10-06 physical mains power-cycle gate is qualified on the configured Plug S Gen3 / firmware 1.7.5. A real mains OFF -> ON interruption reset uptime from `163508 s` to `98 s`; History recorded boot-safe OFF at uptime `3 s`; the same 8962 B managed source / SHA-256 `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e` returned enabled/running; schedules stayed empty; fresh BLE restored healthy AUTO; no hard-safety lockout appeared; final relay was explicitly OFF. PR #89 and PR #91 already qualify the required BLE sensor-silence and scanner-stop recovery contracts, so literal RF shielding is optional additional evidence rather than a V1 blocker. Remaining blockers before freeze are real Wi-Fi loss/recovery and the materially longer 8-hour soak; after those, run the final real-hardware matrix and release qualification. Detailed evidence is in `docs/testing/power-cycle-recovery-acceptance-2026-10-06.md`."""
s = s.replace(anchor, addition, 1)
p.write_text(s)

# Hardware matrix: append dated row immediately after PR91 row.
p = Path("docs/testing/hardware-matrix.md")
s = p.read_text()
needle = """| 2026-10-05 | BLE scanner stopped -> watchdog restart -> re-subscription recovery | PASS | Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5. On pre-#91 `main`, explicit `BLE.Scanner.stop()` was followed by watchdog scanner restart (`isRunning()` true, `R.sa` advanced) but `R.l` stayed unchanged for the full 75 s window, proving event delivery did not return. The #91 candidate re-subscribed before restart and restored fresh configured target frames in 2/2 consecutive stop/restart cycles (`R.l` advanced each time). Original runtime was restored byte-for-byte after A/B and final relay was verified OFF at 0.0 W / 0.0 A. Detailed evidence: `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`. |"""
if needle not in s:
    raise SystemExit("hardware matrix PR91 row not found")
row = needle + """
| 2026-10-06 | Physical mains power-cycle recovery | PASS | Configured Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5. A real physical mains OFF -> ON interruption reset uptime `163508 -> 98 s`. History recorded boot-safe OFF at uptime `3 s` with flags `0`, reason `b`, automation fault `st`. Script id 1 returned enabled/running with byte-identical 8962 B source SHA-256 `80aa315eaf88c2b977b2d92c388d5a85d50b5d331f78ccd05726e21799d9f37e`; schedules remained empty; fresh BLE restored healthy AUTO; no hard-safety lockout was introduced; final relay was explicitly OFF at 0.0 W / 0.0 A. Detailed evidence: `docs/testing/power-cycle-recovery-acceptance-2026-10-06.md`. |"""
s = s.replace(needle, row, 1)
p.write_text(s)
