from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one anchor, got {count}')
    target.write_text(text.replace(old, new, 1))

replace_once(
    'docs/HANDOFF_NEXT_CHAT.md',
    """## Verification of latest product commit\n\nThe final Thermometer task (`thermometer-detail-ux-20260928-009`) completed and pushed `93d36b549`.\n\nAcceptance evidence:\n\n- focused Thermometer/routing/i18n tests passed;\n- typecheck passed;\n- `quality:ux`, repository gate, feature-boundary gate and quality self-test passed;\n- focused canonical screenshot update/verify passed;\n- full mobile suite: **396/396** tests;\n- full responsive Playwright: **36/36**;\n- pre-push reran **396/396** plus the four deterministic canonical responsive scenarios and pushed successfully.\n\nPhysical-device closeout is now complete for the current UX product tree. Samsung SM-S906B / Android 16 installed exact branch head `1c63f415fa77c02fe016dfb067d3b129b38fe494` with app data preserved. Thermometer dashboard/settings were exercised with live Xiaomi/PVVX readings. A real native Time schedule was installed on Plug S Gen3 firmware 1.7.5, its dashboard/detail were inspected, and the automation was then deleted; final `Schedule.List` was empty and the relay was verified OFF. The branch is ready for deliberate merge/closeout rather than another UX refactor pass.\n""",
    """## Verification of latest product commit\n\nThe latest product commit is `ec813098cad17c3cf01225706b8e996ef251c705` (`Inline Time detail schedule editing`). It incorporates the user's real-device review of Time Detail without changing the Climate golden master.\n\nAcceptance evidence:\n\n- Time Detail now uses the clock icon in the shared Plug tabs;\n- duplicate detail-level AUTO/MANUAL and relay ON/OFF controls were removed; those remain on the dashboard card;\n- ON/OFF schedule times are edited inline using the existing Time schedule picker, with `Save changes` directly on the detail surface;\n- the separate `Edit` step was removed;\n- Save and Delete are serialized so a destructive delete cannot race an in-flight Schedule update;\n- focused Time detail tests: **12/12**;\n- typecheck/mobile build passed;\n- `quality:ux`, repository gate, feature-boundary gate and quality self-test passed;\n- full responsive Playwright: **36/36**;\n- canonical visual verification: **4/4**; only the intentional `11-time-detail-darwin.png` baseline changed;\n- pre-push reran the full mobile suite: **396/396** and completed successfully.\n\nSamsung SM-S906B / Android 16 then installed exact product commit `ec813098cad17c3cf01225706b8e996ef251c705` with `adb install -r`, preserving app data and the user's existing 08:00/20:00 Time schedule. Read-only inspection confirmed the Time Detail surface contains Output, Shelly clock, inline `Turn ON at` / `Turn OFF at`, `Save changes`, and delete, with no duplicate AUTO/MANUAL, relay ON/OFF, or Edit action. No schedule or relay mutation was performed during this verification. The branch is again ready for deliberate merge/closeout.\n""",
)

matrix = Path('docs/testing/hardware-matrix.md')
text = matrix.read_text()
anchor = "| 2026-09-28 | Unified Time + Thermometer UX real-device closeout | PASS |"
pos = text.find(anchor)
if pos < 0:
    raise SystemExit('hardware matrix anchor missing')
line_end = text.find('\n', pos)
row = "\n| 2026-09-28 | Time Detail inline-edit correction | PASS | Samsung SM-S906B / Android 16 installed exact product commit `ec813098cad17c3cf01225706b8e996ef251c705` with `adb install -r`, preserving app data and the existing 08:00/20:00 native Time schedule. Read-only UI inspection confirmed the Automation tab uses the Time-specific clock variant in code/canonical visual coverage and the physical detail surface exposes Output, Shelly clock, inline ON/OFF time pickers, `Save changes`, and delete; duplicate detail AUTO/MANUAL, relay ON/OFF and the nested Edit step are absent. No Save, delete, relay or Schedule mutation was performed on hardware during this acceptance. Responsive E2E passed 36/36 and canonical visual verification 4/4; only the intentional Time Detail snapshot changed. |\n"
text = text[:line_end+1] + row + text[line_end+1:]
matrix.write_text(text)
