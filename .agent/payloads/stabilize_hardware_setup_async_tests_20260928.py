from pathlib import Path

path = Path('apps/mobile/src/__tests__/hardware-setup.test.tsx')
text = path.read_text()

# The shared add helper performs real async verification through the mocked Shelly RPC path.
# Under the full parallel suite it can legitimately take several seconds, so do not use
# Testing Library's ~1s default for the success toast. Scope the replacement strictly to
# addShellyThroughUi because another independent test intentionally checks the same copy.
helper_start_marker = "const addShellyThroughUi = async (name = 'Przedpokój') => {"
helper_start = text.find(helper_start_marker)
if helper_start == -1:
    raise SystemExit('addShellyThroughUi start not found')
helper_end = text.find("\n};", helper_start + len(helper_start_marker))
if helper_end == -1:
    raise SystemExit('addShellyThroughUi end not found')
helper_end += len("\n};")
helper = text[helper_start:helper_end]
old_toast = "  expect(await screen.findByText('Dodano gniazdko.')).toBeInTheDocument();\n"
new_toast = """  expect(
    await screen.findByText('Dodano gniazdko.', {}, { timeout: 10000 })
  ).toBeInTheDocument();
"""
if helper.count(old_toast) != 1:
    raise SystemExit(f'expected one success wait inside addShellyThroughUi, got {helper.count(old_toast)}')
helper = helper.replace(old_toast, new_toast, 1)
text = text[:helper_start] + helper + text[helper_end:]

# This test already allows 6s for the relay dialog, but Vitest's default whole-test timeout
# is 5s. Give only this hardware-safe end-to-end unit scenario enough total budget.
start_marker = "  it('requires the real hardware safe relay test after script upload before ready state', async () => {"
start = text.find(start_marker)
if start == -1:
    raise SystemExit('hardware-safe relay test start not found')
next_test = text.find("\n  it('", start + len(start_marker))
if next_test == -1:
    raise SystemExit('next hardware setup test boundary not found')
block = text[start:next_test]
trimmed = block.rstrip()
trailing = block[len(trimmed):]
if not trimmed.endswith("  });"):
    raise SystemExit('hardware-safe relay test block does not end with expected Vitest closure')
trimmed = trimmed[:-len("  });")] + "  }, 15000);"
text = text[:start] + trimmed + trailing + text[next_test:]

path.write_text(text)
print('Stabilized shared Shelly add wait and hardware-safe relay test budget')
