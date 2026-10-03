#!/bin/sh
set -eu

BRANCH='feature/history-charts-20260930'
OLD_SHA='1f9eca28b784756175709bcc4ddc01413d6d555f'
EXPECTED_MAIN='ceac84d5a7c9d3dc2263421c079b8dddc35b54ca'

git fetch --prune origin
git switch "$BRANCH"
git reset --hard "origin/$BRANCH"
[ "$(git rev-parse HEAD)" = "$OLD_SHA" ]
[ "$(git rev-parse origin/main)" = "$EXPECTED_MAIN" ]
[ -z "$(git status --porcelain)" ]

python3 - <<'PY'
from pathlib import Path

handoff = Path('docs/HANDOFF_NEXT_CHAT.md')
text = handoff.read_text()
text = text.replace(
    'Status: **2026-09-30 — the first chart-first History visualization slice is implemented on the approved Nivo path and must remain presentation-only over the existing HistoryRecord[] data foundation.**',
    'Status: **2026-10-01 — the chart-first History visualization slice is implemented, canonical-visual verified and accepted on Samsung S22+ / Android 16.**',
    1,
)
text = text.replace(
    '5. Start with the History charts architecture/design gate; do not reopen pre-charts archaeology without new evidence.',
    '5. Start from the qualified chart-first History baseline; do not reopen storage/runtime or the completed design gate without new evidence.',
    1,
)
text = text.replace(
    '- Climate Detail already has a deliberately simple chronological History list with loading, retry, empty and partial-corruption handling;',
    '- Climate Detail now has a chart-first History surface with loading, retry, empty and partial-corruption handling;',
    1,
)
old = 'The visual change requires refreshed canonical `23-climate-history` evidence and real-device review. Keep later chart refinements presentation-only unless a concrete data-model limitation is demonstrated. If the real Shelly is touched, use identity-first access and finish with an explicitly verified relay OFF.\n'
new = '''Canonical `23-climate-history` evidence was refreshed and re-verified 4/4 on macOS. Real-device acceptance on Samsung SM-S906B / Android 16 used `adb install -r` with preserved app data: the History chart stayed inside the 1080 px viewport at `[42,549][1039,1845]`, and selector taps exercised Temperature, Humidity, Output, Power and Current. VPD was absent from the current stored records and therefore correctly omitted from the available-series grid; the unused sixth grid cell left the active series unchanged. After a clean `logcat -c`, the interaction smoke produced no matched `FATAL EXCEPTION`, `AndroidRuntime`, `Uncaught`, `TypeError`, `ReferenceError` or Capacitor/JavaScript error. No Shelly/runtime/schedule/relay mutation was performed.\n\nKeep later chart refinements presentation-only unless a concrete data-model limitation is demonstrated. If the real Shelly is touched, use identity-first access and finish with an explicitly verified relay OFF.\n'''
if old not in text:
    raise SystemExit('handoff closeout anchor not found')
handoff.write_text(text.replace(old, new, 1))

matrix = Path('docs/testing/hardware-matrix.md')
text = matrix.read_text()
row = "| 2026-10-01 | Chart-first History UI real-device acceptance | PASS | Samsung SM-S906B / Android 16 installed exact candidate `1f9eca28b784756175709bcc4ddc01413d6d555f` with `adb install -r`, preserving app data. History rendered inside the 1080 px viewport at `[42,549][1039,1845]`. Real selector taps exercised Temperature, Humidity, Output, Power and Current; VPD was absent from the current stored records and was therefore omitted from the available-series grid, while the unused sixth cell left the selection unchanged. After `logcat -c` and the interaction smoke, no `FATAL EXCEPTION`, `AndroidRuntime`, `Uncaught`, `TypeError`, `ReferenceError` or Capacitor/JavaScript error matched. Presentation-only acceptance: no Shelly/runtime/schedule/relay mutation was performed. |\n"
if row not in text:
    marker = '\nInstall/observe a generated Shelly climate runtime:\n'
    if marker not in text:
        raise SystemExit('hardware matrix command anchor not found')
    text = text.replace(marker, '\n' + row + marker, 1)
matrix.write_text(text)
PY

pnpm exec prettier --write docs/HANDOFF_NEXT_CHAT.md docs/testing/hardware-matrix.md
pnpm check
git diff --check

git add docs/HANDOFF_NEXT_CHAT.md docs/testing/hardware-matrix.md
git commit --amend --no-edit
NEW_SHA="$(git rev-parse HEAD)"
git push --force-with-lease origin HEAD:"$BRANCH"
[ -z "$(git status --porcelain)" ]
echo "QUALIFIED_HISTORY_SHA|$NEW_SHA"
