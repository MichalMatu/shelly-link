from pathlib import Path

path = Path('apps/mobile/src/__tests__/hardware-setup.test.tsx')
text = path.read_text()
start_marker = "  it('allows rule install when Shelly.GetStatus omits Scripts but Script.List works', async () => {"
end_marker = "  it('blocks rule install when Shelly status does not expose BLE', async () => {"
start = text.find(start_marker)
end = text.find(end_marker, start + len(start_marker))
if start < 0 or end < 0:
    raise SystemExit('target hardware setup test block not found')
block = text[start:end]
old = '{ timeout: 3000 }'
if block.count(old) != 1:
    raise SystemExit(f'expected one 3s timeout in target test, got {block.count(old)}')
block = block.replace(old, '{ timeout: 10000 }', 1)
path.write_text(text[:start] + block + text[end:])
print('Extended only the omits-Scripts relay-dialog test wait to 10s')
