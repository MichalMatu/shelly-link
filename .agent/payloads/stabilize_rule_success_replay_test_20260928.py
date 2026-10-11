from pathlib import Path

path = Path('apps/mobile/src/__tests__/hardware-setup.test.tsx')
text = path.read_text()
start_marker = "  it('does not replay rule success toasts after returning to the rule page', async () => {"
start = text.find(start_marker)
if start == -1:
    raise SystemExit('rule success replay test start not found')
end = text.find("\n  it('", start + len(start_marker))
if end == -1:
    raise SystemExit('next hardware setup test boundary not found')
block = text[start:end]
old = "      { timeout: 3000 }\n"
if block.count(old) != 1:
    raise SystemExit(f'expected exactly one 3000ms relay dialog timeout in target test, got {block.count(old)}')
block = block.replace(old, "      { timeout: 10000 }\n", 1)
path.write_text(text[:start] + block + text[end:])
print('Stabilized rule-success replay relay-dialog wait from 3s to 10s')
