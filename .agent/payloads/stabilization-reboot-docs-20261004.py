from pathlib import Path

handoff=Path('docs/HANDOFF_NEXT_CHAT.md')
text=handoff.read_text()
text=text.replace(
    '# Handoff — BLE restore generalized; stabilization is next',
    '# Handoff — Stage 9 stabilization in progress'
)
old_status='Status: **2026-10-04 — PR #83 is merged to `main`. Safe standalone Pulse inline replacement is closed. Temporary Plug BLE discovery runtime preservation is generalized in the current completion slice; active standalone Pulse BLE scan UI remains intentionally disabled until it is accepted as a separate product/UX slice.**'
new_status='Status: **2026-10-04 — PR #85 soak/liveness observability is merged. Controlled real-device `Shelly.Reboot` recovery is now qualified: boot-safe OFF was recorded in History, the same Climate runtime/source restarted without rewrite, and AUTO recovered only after fresh BLE input. Physical mains power-cycle and loss/recovery matrix work remain.**'
if old_status not in text:
    raise SystemExit('handoff status anchor missing')
text=text.replace(old_status,new_status)
old_qual='Focused mobile tests, typecheck, repository quality gates and UX quality gates pass on the formatted implementation branch. The completion head still requires the canonical final `pnpm check` before merge. No real-hardware acceptance is claimed by this handoff unless a dated hardware record is added separately.'
new_qual='Focused mobile tests, typecheck, repository quality gates and UX quality gates passed for the BLE restoration implementation, followed by its final canonical gate and merge. That restoration slice itself made no hardware claim. Current Stage 9 hardware evidence is recorded separately in the dated testing documents.'
if old_qual not in text:
    raise SystemExit('handoff qualification anchor missing')
text=text.replace(old_qual,new_qual)
old_next='''The application is near feature-complete. The first Stage 9 stabilization slice is qualified: soak JSONL can now be post-processed for reboot/liveness/outage/stopped-script evidence, and a short read-only Plug S Gen3 smoke passed 12/12 samples with zero liveness faults and `mem_free` minimum 19334 B. This is observability evidence, not completion of stabilization. Default order is now:\n\n1. deliberate reboot/power-cycle plus Wi-Fi/BLE loss/recovery and the AUTO/MANUAL + automation-fault + hard-safety interaction matrix;\n2. a materially longer soak and the final real-hardware matrix;\n3. V1 feature freeze and release qualification.'''
new_next='''The application is near feature-complete. Two Stage 9 slices are now qualified: soak/liveness observability, and a deliberate real-device software reboot. The configured Plug recorded boot-safe OFF at uptime 4 s, restarted the same byte-identical managed Climate source, retained empty schedules and recovered AUTO only after fresh BLE input. This is not a physical mains power-cycle claim. Default order is now:\n\n1. physical mains power-cycle plus Wi-Fi/BLE loss/recovery and the AUTO/MANUAL + automation-fault + hard-safety interaction matrix;\n2. a materially longer soak and the final real-hardware matrix;\n3. V1 feature freeze and release qualification.\n\nDetailed reboot evidence: `docs/testing/reboot-recovery-acceptance-2026-10-04.md`.'''
if old_next not in text:
    raise SystemExit('handoff next-work anchor missing')
text=text.replace(old_next,new_next)
handoff.write_text(text)

roadmap=Path('docs/ROADMAP.md')
text=roadmap.read_text()
anchor='The 2026-10-04 short soak/liveness-observability slice is qualified without adding a new runtime heartbeat: a post-processor derives device reboot evidence from uptime regression, endpoint and `/diag` outage windows, stopped-script streaks and first/last uptime from the existing soak JSONL. Real Plug S Gen3 smoke passed 12/12 read-only samples over about 55 s with zero reboot/outage/stopped-script findings and `mem_free` staying at or above 19334 B. This closes the observability/tooling gap only; deliberate reboot/power-cycle recovery, Wi-Fi/BLE loss/recovery, the full AUTO/MANUAL + automation-fault + hard-safety matrix, a materially longer soak and the final real-hardware matrix remain before feature freeze. Detailed evidence is in `docs/testing/soak-liveness-stabilization-acceptance-2026-10-04.md`.'
if anchor not in text:
    raise SystemExit('roadmap Stage 9 anchor missing')
addition=anchor+'\n\nThe 2026-10-04 controlled software-reboot slice is also qualified on the configured Plug S Gen3 / firmware 1.7.5. `Shelly.Reboot` was capability-advertised and sent exactly once after identity verification. Device uptime reset from about 208053 s; History recorded a boot-safe record at uptime 4 s with requested/final OFF, reason `b` and automation fault `st`; the same 8847 B managed source / SHA-256 `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6` returned enabled/running; schedules stayed empty; fresh BLE later cleared `st` and normal AUTO output resumed. This closes deliberate software reboot recovery only. Physical mains power-cycle, Wi-Fi/BLE loss/recovery, the full interaction/fault/safety matrix, long soak and final hardware matrix remain. Detailed evidence is in `docs/testing/reboot-recovery-acceptance-2026-10-04.md`.'
text=text.replace(anchor,addition)
roadmap.write_text(text)

matrix=Path('docs/testing/hardware-matrix.md')
text=matrix.read_text()
heading='## 2026-10-04 Controlled software reboot recovery'
if heading not in text:
    text += '''\n\n## 2026-10-04 Controlled software reboot recovery\n\n- **PASS — configured Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5:** `Shelly.Reboot` was advertised and issued exactly once after canonical identity verification. Preflight runtime was AUTO with the relay ON under the live humidifying rule. The reboot entered Shelly shutdown (`-109`, `shutting down in 959 ms`); postflight uptime was 143 s versus about 208053 s before reboot. History v2 independently recorded boot-safe OFF at uptime 4 s with flags `0`, reason `b`, automation fault `st` and `0 W / 0 A`. The same script id 1 returned enabled/running with byte-identical 8847 B source SHA-256 `eaa12322ffe9d8777df08706264b039294ecc515df9795f63da49ecb0f8a53c6`; schedules remained empty. Fresh BLE later cleared the automation fault and AUTO legally resumed requested/final ON. Final relay state was explicitly observed ON with no safety lockout. This is software reboot evidence, not a physical mains power-cycle claim. Detailed evidence: `docs/testing/reboot-recovery-acceptance-2026-10-04.md`.\n'''
matrix.write_text(text)
