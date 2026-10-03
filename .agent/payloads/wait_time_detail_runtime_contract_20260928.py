from pathlib import Path

p = Path('apps/mobile/src/__tests__/automation-detail.test.tsx')
s = p.read_text()
old = "    expect(auto).toHaveAttribute('aria-pressed', 'true');\n    expect(manual).toHaveAttribute('aria-pressed', 'false');\n"
new = "    await waitFor(() => expect(auto).toHaveAttribute('aria-pressed', 'true'));\n    expect(manual).toHaveAttribute('aria-pressed', 'false');\n"
if s.count(old) != 1:
    raise SystemExit(f'expected one initial AUTO assertion, got {s.count(old)}')
p.write_text(s.replace(old, new, 1))
print('Time detail unit waits for initial runtime state')
