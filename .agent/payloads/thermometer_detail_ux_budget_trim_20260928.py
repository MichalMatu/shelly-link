from pathlib import Path

path = Path('apps/mobile/src/screens/hardware-setup/pages/SensorSetupPage.tsx')
text = path.read_text()
old = """  const sensorDeviceCount = flow.sensorDevices.length;
  const shouldRunSavedSensorLiveScan =
    sensorDeviceCount > 0 && !addOnly && !isSensorGattPending;
"""
new = """  const shouldRunSavedSensorLiveScan =
    flow.sensorDevices.length > 0 && !addOnly && !isSensorGattPending;
"""
if text.count(old) != 1:
    raise SystemExit(f'expected one sensor count helper, got {text.count(old)}')
text = text.replace(old, new, 1)
old = """  const readingsForSensor = (device: SensorDraftDevice) =>
    flow.sensorSamplesById[device.id.toUpperCase()] ?? [];

"""
if text.count(old) != 1:
    raise SystemExit(f'expected one readings helper, got {text.count(old)}')
text = text.replace(old, '', 1)
old = "samples={readingsForSensor(device)}"
new = "samples={flow.sensorSamplesById[device.id.toUpperCase()] ?? []}"
if text.count(old) != 1:
    raise SystemExit(f'expected one readings usage, got {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('Trimmed redundant SensorSetupPage helpers under repository line budget')
