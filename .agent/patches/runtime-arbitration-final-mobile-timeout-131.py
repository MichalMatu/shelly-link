from pathlib import Path

path = Path('apps/mobile/src/__tests__/climate-delete.test.tsx')
text = path.read_text()
old = "await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));"
new = "await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1), { timeout: 3_000 });"
if text.count(old) != 1:
    raise SystemExit(f'expected exactly one delete success wait, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
