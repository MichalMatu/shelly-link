from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'sentinel not found in {path}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')

roadmap = 'docs/ROADMAP.md'
old = "The 2026-10-04 short soak/liveness-observability slice is qualified without adding a new runtime heartbeat: a post-processor derives device reboot evidence from uptime regression, endpoint and `/diag` outage windows, stopped-script streaks and first/last uptime from the existing soak JSONL. Real Plug S Gen3 smoke passed 12/12 read-only samples over about 55 s with zero reboot/outage/stopped-script findings and `mem_free` staying at or above 19334 B. This closes the observability/tooling gap only; deliberate reboot/power-cycle recovery, Wi-Fi/BLE loss/recovery, the full AUTO/MANUAL + automation-fault + hard-safety matrix, a materially longer soak and the final real-hardware matrix remain before feature freeze. Detailed evidence is in `docs/testing/soak-liveness-stabilization-acceptance-2026-10-04.md`.\n"
new = "The 2026-10-04 short soak/liveness-observability slice is qualified without adding a new runtime heartbeat: a post-processor derives device reboot evidence from uptime regression, endpoint and `/diag` outage windows, stopped-script streaks and first/last uptime from the existing soak JSONL. Real Plug S Gen3 smoke passed 12/12 read-only samples over about 55 s with zero reboot/outage/stopped-script findings and `mem_free` staying at or above 19334 B. Detailed evidence is in `docs/testing/soak-liveness-stabilization-acceptance-2026-10-04.md`.\n\nThe deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix is also qualified on 2026-10-04. The audit first requalified 53/53 generated-runtime and 44/44 mobile recovery/control tests, then added the two missing cross-axis cases: MANUAL fault + hard-safety reset preserves the independent automation fault while clearing manual request and staying OFF; AUTO fault + hard-safety reset stays OFF with `st` until fresh usable input arrives. No production source changed because the runtime already matched the architecture contract. Remaining Stage 9 work is deliberate reboot/power-cycle recovery, Wi-Fi/BLE loss/recovery, a materially longer soak and the final real-hardware matrix before feature freeze. Detailed evidence is in `docs/testing/runtime-recovery-interaction-matrix-acceptance-2026-10-04.md`.\n"
replace_once(roadmap, old, new)

handoff = 'docs/HANDOFF_NEXT_CHAT.md'
old = "The application is near feature-complete. The first Stage 9 stabilization slice is qualified: soak JSONL can now be post-processed for reboot/liveness/outage/stopped-script evidence, and a short read-only Plug S Gen3 smoke passed 12/12 samples with zero liveness faults and `mem_free` minimum 19334 B. This is observability evidence, not completion of stabilization. Default order is now:\n\n1. deliberate reboot/power-cycle plus Wi-Fi/BLE loss/recovery and the AUTO/MANUAL + automation-fault + hard-safety interaction matrix;\n2. a materially longer soak and the final real-hardware matrix;\n3. V1 feature freeze and release qualification.\n"
new = "The application is near feature-complete. Two Stage 9 stabilization slices are now qualified: soak JSONL liveness/outage/reboot observability with a short read-only Plug S Gen3 smoke, and the deterministic AUTO/MANUAL + automation-fault + hard-safety interaction matrix. The latter closed the two missing reset intersections without changing production runtime behavior. Default order is now:\n\n1. deliberate real-device reboot/power-cycle plus Wi-Fi/BLE loss and recovery;\n2. a materially longer soak and the final real-hardware matrix;\n3. V1 feature freeze and release qualification.\n"
replace_once(handoff, old, new)
