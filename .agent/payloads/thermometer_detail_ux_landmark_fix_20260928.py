from pathlib import Path

path = Path('apps/mobile/src/screens/hardware-setup/HardwareSetupScreen.tsx')
text = path.read_text()
old = """  if (sensorSettingsOnlyId) {
    return (
      <main className="demo-shell hardware-shell">
        <header className="demo-header app-page-header">
"""
new = """  if (sensorSettingsOnlyId) {
    return (
      <main
        className="demo-shell hardware-shell"
        aria-label={t('hardware.sensor.settingsTitle')}
      >
        <header className="demo-header app-page-header">
"""
if text.count(old) != 1:
    raise SystemExit(f'expected one settings-only main anchor, got {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('Labeled Thermometer settings main landmark')
