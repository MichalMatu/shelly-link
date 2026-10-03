from pathlib import Path

path = Path("apps/mobile/src/__tests__/hardware-setup.test.tsx")
text = path.read_text()
old = "'navigation', { name: 'Menu konfiguracji' }"
new = "'tablist', { name: 'Menu konfiguracji' }"
count = text.count(old)
if count != 3:
    raise SystemExit(f"expected 3 setup navigation role assertions, found {count}")
path.write_text(text.replace(old, new))
print("updated setup container assertions to tablist")
