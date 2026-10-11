from pathlib import Path
import re

handoff_path = Path('docs/HANDOFF_NEXT_CHAT.md')
matrix_path = Path('docs/testing/hardware-matrix.md')

handoff = handoff_path.read_text()

handoff = re.sub(
    r'^Status: \*\*.*?\*\*$',
    'Status: **2026-10-05 — PR #89 healthy-scanner sensor-silence recovery and PR #91 stopped-scanner re-subscription recovery are both merged and hardware-qualified on `main`; PR #90 build/test orchestration is merged. Physical mains power-cycle, remaining Wi-Fi/BLE loss/recovery, long soak and final hardware closeout remain.**',
    handoff,
    count=1,
    flags=re.M,
)

handoff = handoff.replace(
    '- PR #90 — tooling-only build/test orchestration split with canonical `pnpm check` scope preserved.',
    '- PR #90 — tooling-only build/test orchestration split with canonical `pnpm check` scope preserved;\n- PR #91 — hardware-qualified BLE scanner re-subscription after an actually stopped scanner is restarted by the watchdog.',
)

start = handoff.index('## Active unmerged work')
end = handoff.index('## Current product / UX contract')
new_section = '''## Scanner recovery closeout\n\nPR #91 `Fix BLE scanner re-subscription after restart` is merged as `50fc9f083f013a0652d44011da6a6eff534fab9d`. The real-device A/B gate on Plug S Gen3 firmware 1.7.5 proved that unmodified `main` could restart a scanner after `BLE.Scanner.stop()` (`isRunning() == true` and `R.sa` advanced) while target event delivery remained dead (`R.l` did not advance for 75 s).\n\nThe PR #91 candidate added a fresh `BLE.Scanner.subscribe(...)` before the watchdog restart. Two consecutive physical stop/restart cycles then restored fresh target frames. The temporary candidate was removed after the gate and the original installed runtime was restored byte-for-byte with final relay OFF. Fresh PR CI #659 passed the canonical repository gate and responsive smoke before merge.\n\nDetailed evidence: `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`.\n\nThe accepted scanner contract is now split deliberately:\n\n- sensor silence while `BLE.Scanner.isRunning()` remains true does **not** justify a scanner restart (PR #89);\n- an actually stopped scanner must receive a fresh subscription before watchdog restart so event delivery resumes (PR #91).\n\n'''
handoff = handoff[:start] + new_section + handoff[end:]

old_qual = 'PR #89 scanner-watchdog hardware acceptance is complete and merged. The real-device gate used target-address isolation to create the exact no-accepted-frame condition on the physical Plug while leaving BLE/RF scanning live; it is not a claim that the sensor was physically RF-shielded. Detailed evidence: `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`.'
new_qual = 'PR #89 scanner-watchdog sensor-silence acceptance and PR #91 stopped-scanner re-subscription acceptance are both complete and merged. PR #89 used target-address isolation while BLE scanning stayed healthy; PR #91 explicitly stopped the scanner and proved that restart without re-subscription restored scanner liveness but not event delivery. Detailed evidence: `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md` and `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`.'
if old_qual not in handoff:
    raise RuntimeError('qualification paragraph not found')
handoff = handoff.replace(old_qual, new_qual)

handoff = handoff.replace(
    'Do not infer what a physical phone is running from this document. A phone claim is valid only when a fresh deployment task records the exact source SHA, authorized device, `adb install -r` result, cold start and live process. Preserve app data by default; do not substitute a clean uninstall unless explicitly required and approved.',
    'Do not infer what a physical phone is running from this document. Reuse the canonical Wireless ADB procedure in `docs/PHONE_WIRELESS_ADB.md`. A phone claim is valid only when a fresh deployment task records the exact source SHA, authorized device, preserving-data `adb install -r` result, cold start and live process. Preserve app data by default; use the destructive clean uninstall/install path only when the acceptance explicitly requires fresh-store behavior.',
)

old_order = '''Default order is now:\n\n1. resolve PR #91 with an A/B real-device scanner stop -> watchdog restart -> event-delivery test, closing it if current `main` already recovers correctly;\n2. qualify physical mains power-cycle plus remaining Wi-Fi/BLE loss/recovery;\n3. run a materially longer soak and close the final real-hardware matrix;\n4. declare V1 feature freeze and run release qualification.'''
new_order = '''Default order is now:\n\n1. qualify physical mains power-cycle plus remaining Wi-Fi/BLE loss/recovery on the current merged runtime;\n2. run a materially longer soak and close the final real-hardware matrix;\n3. declare V1 feature freeze and run release qualification;\n4. only after the runtime/backend freeze, begin the explicit new graphical frontend redesign rather than another incremental UX-polish round.'''
if old_order not in handoff:
    raise RuntimeError('next-work order not found')
handoff = handoff.replace(old_order, new_order)

old_evidence = 'Detailed recovery evidence already on `main`: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`, `docs/testing/reboot-recovery-acceptance-2026-10-04.md` and `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md`.'
new_evidence = 'Detailed recovery evidence already on `main`: `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`, `docs/testing/reboot-recovery-acceptance-2026-10-04.md`, `docs/testing/scanner-watchdog-sensor-silence-acceptance-2026-10-04.md` and `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`.'
if old_evidence not in handoff:
    raise RuntimeError('evidence line not found')
handoff = handoff.replace(old_evidence, new_evidence)

handoff_path.write_text(handoff)

matrix = matrix_path.read_text()
if 'scanner-stop-resubscribe-acceptance-2026-10-05.md' not in matrix:
    lines = matrix.splitlines()
    insert_at = None
    for i, line in enumerate(lines):
        if line.startswith('| 2026-10-04 | BLE scanner watchdog sensor-silence recovery'):
            insert_at = i + 1
            break
    if insert_at is None:
        raise RuntimeError('PR89 scanner hardware-matrix row not found')
    row = '| 2026-10-05 | BLE scanner stopped -> watchdog restart -> re-subscription recovery | PASS | Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5. On pre-#91 `main`, explicit `BLE.Scanner.stop()` was followed by watchdog scanner restart (`isRunning()` true, `R.sa` advanced) but `R.l` stayed unchanged for the full 75 s window, proving event delivery did not return. The #91 candidate re-subscribed before restart and restored fresh configured target frames in 2/2 consecutive stop/restart cycles (`R.l` advanced each time). Original runtime was restored byte-for-byte after A/B and final relay was verified OFF at 0.0 W / 0.0 A. Detailed evidence: `docs/testing/scanner-stop-resubscribe-acceptance-2026-10-05.md`. |'
    lines.insert(insert_at, row)
    matrix = '\n'.join(lines) + ('\n' if matrix.endswith('\n') else '')
    matrix_path.write_text(matrix)

print('updated', handoff_path, matrix_path)
