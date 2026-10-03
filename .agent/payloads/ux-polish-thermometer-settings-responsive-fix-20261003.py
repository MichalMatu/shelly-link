from pathlib import Path

path = Path('apps/mobile/src/features/thermometers/components/ThermometerSettingsPage.css')
source = path.read_text()
old = 'grid-template-columns: repeat(2, minmax(0, 1fr));'
count = source.count(old)
if count != 2:
    raise SystemExit(f'expected two fixed grids, got {count}')
source = source.replace(old, 'grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));')
path.write_text(source)
