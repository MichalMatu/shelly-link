from pathlib import Path

# Reuse the already validated consumer patch from task 124 first.
# This helper only updates the two remaining tests that still used the legacy 'manual' mode.

p = Path("apps/mobile/src/flows/installations/healthRecovery.test.ts")
s = p.read_text()
old = """  it('keeps intentional MANUAL mode out of recovery', () => {\n    expect(\n      installationRecoveryState({\n        ...healthyInput,\n        automationMode: 'manual'\n      })\n    ).toBeNull();\n  });\n"""
new = """  it('keeps intentional manual modes out of recovery', () => {\n    for (const automationMode of ['manual-off', 'manual-on'] as const) {\n      expect(\n        installationRecoveryState({\n          ...healthyInput,\n          automationMode\n        })\n      ).toBeNull();\n    }\n  });\n"""
if old not in s:
    raise SystemExit("healthRecovery legacy MANUAL test not found")
p.write_text(s.replace(old, new, 1))

p = Path("apps/mobile/src/flows/installations/runtimeModeTransport.test.ts")
s = p.read_text()
s = s.replace(
    "it('sets MANUAL inside the running script and verifies the eval result', async () => {",
    "it('sets MANUAL_OFF inside the running script and verifies the eval result', async () => {",
    1,
)
s = s.replace(
    "await setInstalledAutomationRuntimeMode(installation, 'manual');",
    "await setInstalledAutomationRuntimeMode(installation, 'manual-off');",
    1,
)
s = s.replace(
    "it('reads live MANUAL/AUTO state without using Script.Stop', async () => {",
    "it('reads live MANUAL_OFF/AUTO state without using Script.Stop', async () => {",
    1,
)
s = s.replace("mode: 'manual',", "mode: 'manual-off',", 1)
p.write_text(s)
