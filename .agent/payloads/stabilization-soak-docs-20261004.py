from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise SystemExit(f"sentinel not found in {path}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


matrix_path = "docs/testing/hardware-matrix.md"
matrix_old = "| 2026-10-02 | Pulse operational-status Android install/cold-start smoke | PASS | Samsung SM-S906B / Android 16 built and installed exact Pulse status implementation `6a6f07cc21f8c56927ef7ffb277bd3ae05bfcdd2` with preserving-data `adb install -r`; APK SHA-256 `da7f8204aa2be550f583297646a8072055a04b2c27d83fea70e362fea1c554c5`. `firstInstallTime` stayed `2026-09-28 04:57:23`, cold starts returned OK, WebView reached `readyState: complete`, and the real 411 CSS px dashboard had `scrollWidth == clientWidth`. The preserved installation is steady Climate rather than Pulse, so this is explicitly not live Pulse status hardware acceptance. An intermittent Capacitor/WebView `triggerEvent` console warning appeared 1/2/0 times across three successful cold starts and did not block rendering. No Shelly runtime, schedule or relay mutation was performed. |\n"
matrix_new = matrix_old + "| 2026-10-04 | Short soak liveness + memory-headroom smoke | PASS | Configured Plug S Gen3 `shellyplugsg3-e4b063d7f530`, firmware 1.7.5, exact tooling candidate `ef2fc6303dc8cde981fe4191b782c307edad18e9`: 12/12 read-only samples over about 55 s passed with uptime `204425 -> 204496`, 0 detected reboots, 0 endpoint or `/diag` outage, 0 stopped-script samples/streaks, `mem_used` max 5782 B, `mem_peak` max 10066 B and `mem_free` min 19334 B. Pre/postflight verified the same canonical identity, production script 1 still running and relay OFF. No mutating RPC was issued. Detailed evidence: `docs/testing/soak-liveness-stabilization-acceptance-2026-10-04.md`. |\n"
replace_once(matrix_path, matrix_old, matrix_new)

matrix_command_old = "Run a longer soak when runtime stability matters:\n\n```bash\nSHELLY_URL=http://<shelly-ip> SCRIPT_ID=1 make shelly-soak-run\n```\n"
matrix_command_new = matrix_command_old + "\nPost-process an existing soak JSONL for reboot/liveness/outage evidence:\n\n```bash\npnpm exec tsx scripts/hardware/shelly-soak-liveness-report.ts <soak.jsonl>\n```\n"
replace_once(matrix_path, matrix_command_old, matrix_command_new)

roadmap_path = "docs/ROADMAP.md"
roadmap_old = "Verify heartbeat/watchdog, reboot/power-cycle recovery, Wi-Fi/BLE loss, AUTO/MANUAL interaction matrix, automation-fault and hard-safety recovery, Pulse recovery/cancellation semantics, long soak, script-memory headroom, final hardware matrix and final UX acceptance. Then declare v1 feature freeze.\n"
roadmap_new = roadmap_old + "\nThe 2026-10-04 short soak/liveness-observability slice is qualified without adding a new runtime heartbeat: a post-processor derives device reboot evidence from uptime regression, endpoint and `/diag` outage windows, stopped-script streaks and first/last uptime from the existing soak JSONL. Real Plug S Gen3 smoke passed 12/12 read-only samples over about 55 s with zero reboot/outage/stopped-script findings and `mem_free` staying at or above 19334 B. This closes the observability/tooling gap only; deliberate reboot/power-cycle recovery, Wi-Fi/BLE loss/recovery, the full AUTO/MANUAL + automation-fault + hard-safety matrix, a materially longer soak and the final real-hardware matrix remain before feature freeze. Detailed evidence is in `docs/testing/soak-liveness-stabilization-acceptance-2026-10-04.md`.\n"
replace_once(roadmap_path, roadmap_old, roadmap_new)

handoff_path = "docs/HANDOFF_NEXT_CHAT.md"
handoff_old = "The application is near feature-complete. After this restoration slice is merged, default order is:\n\n1. watchdog/recovery/soak stabilization and final real-hardware matrix;\n2. V1 feature freeze and release qualification.\n"
handoff_new = "The application is near feature-complete. The first Stage 9 stabilization slice is qualified: soak JSONL can now be post-processed for reboot/liveness/outage/stopped-script evidence, and a short read-only Plug S Gen3 smoke passed 12/12 samples with zero liveness faults and `mem_free` minimum 19334 B. This is observability evidence, not completion of stabilization. Default order is now:\n\n1. deliberate reboot/power-cycle plus Wi-Fi/BLE loss/recovery and the AUTO/MANUAL + automation-fault + hard-safety interaction matrix;\n2. a materially longer soak and the final real-hardware matrix;\n3. V1 feature freeze and release qualification.\n"
replace_once(handoff_path, handoff_old, handoff_new)
