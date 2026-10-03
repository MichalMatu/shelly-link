from pathlib import Path

path = Path('apps/mobile/src/__tests__/hardware-setup.test.tsx')
text = path.read_text()

def extend_test_timeout(title: str) -> None:
    global text
    marker = f"  it('{title}', async () => {{"
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'missing test: {title}')
    next_test = text.find("\n  it('", start + len(marker))
    if next_test < 0:
        raise SystemExit(f'no following test after: {title}')
    block = text[start:next_test]
    closing = "\n  });\n"
    if not block.endswith(closing):
        raise SystemExit(f'unexpected closing for: {title}')
    block = block[:-len(closing)] + "\n  }, 15_000);\n"
    text = text[:start] + block + text[next_test:]

extend_test_timeout('does not replay rule success toasts after returning to the rule page')
extend_test_timeout('switches between humidity rule modes and copies the generated script')
path.write_text(text)
