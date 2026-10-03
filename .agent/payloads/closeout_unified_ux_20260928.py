from pathlib import Path

matrix = Path('docs/testing/hardware-matrix.md')
text = matrix.read_text()
marker = '\nCurrent stabilization Shelly identity:'
row = '''\n| 2026-09-28 | Unified Time + Thermometer UX real-device closeout | PASS | Samsung SM-S906B / Android 16 installed exact `refactor/plug-ui-unification` head `1c63f415fa77c02fe016dfb067d3b129b38fe494` with `adb install -r`, preserving app data. Thermometer dashboard and nested settings rendered live Xiaomi/PVVX readings; rename, PVVX time sync, delete and technical identity were present only in nested settings. On configured Plug `shellyplugsg3-e4b063d7f530` / firmware 1.7.5, preflight `Schedule.List` was empty; a real Time automation installed 08:00 ON / 20:00 OFF as exactly two native Schedule jobs, dashboard and capability-driven Detail exposed AUTO/MANUAL and no Script tab, and deletion removed both jobs. Final `Schedule.List` was empty and relay was explicitly verified OFF at 0.0 W / 0.000 A. The same product head then passed responsive E2E 36/36 and canonical visual verification 4/4. |\n'''
if 'Unified Time + Thermometer UX real-device closeout' not in text:
    if marker not in text:
        raise SystemExit('hardware matrix insertion marker missing')
    text = text.replace(marker, row + marker, 1)
    matrix.write_text(text)

handoff = Path('docs/HANDOFF_NEXT_CHAT.md')
text = handoff.read_text()
old = '''The current product branch after later docs-only commits has not been reinstalled on the physical phone since the newest UX slices. If continuing visual review, installing the current branch on the Samsung SM-S906B is a sensible first verification step.'''
new = '''Physical-device closeout is now complete for the current UX product tree. Samsung SM-S906B / Android 16 installed exact branch head `1c63f415fa77c02fe016dfb067d3b129b38fe494` with app data preserved. Thermometer dashboard/settings were exercised with live Xiaomi/PVVX readings. A real native Time schedule was installed on Plug S Gen3 firmware 1.7.5, its dashboard/detail were inspected, and the automation was then deleted; final `Schedule.List` was empty and the relay was verified OFF. The branch is ready for deliberate merge/closeout rather than another UX refactor pass.'''
if old in text:
    text = text.replace(old, new, 1)
elif new not in text:
    raise SystemExit('handoff physical-device paragraph not found')

old2 = '''1. install the current branch on the phone and review the real Time + Thermometer UX;\n2. continue the audit only where screenshots/code show a real inconsistency;\n3. if UX is accepted, close out/merge the branch deliberately before starting the next roadmap feature;\n4. the next major roadmap slice remains History / Datalogger. `work/kvs-datalogger` is parked source material and must be reconciled with current exclusive Climate ownership rather than mechanically merged.'''
new2 = '''1. close out/merge `refactor/plug-ui-unification` deliberately;\n2. do not reopen the completed UX slices without new screenshot/user evidence;\n3. after merge, the next major roadmap slice is History / Datalogger. `work/kvs-datalogger` is parked source material and must be reconciled with current exclusive Climate ownership rather than mechanically merged.'''
if old2 in text:
    text = text.replace(old2, new2, 1)
elif new2 not in text:
    raise SystemExit('handoff remaining-work list not found')
handoff.write_text(text)
