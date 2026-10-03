from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"expected block not found in {path}: {old[:100]}")
    p.write_text(s.replace(old, new, 1))


replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    """  const runtimeControllable =\n    controlsVerified &&\n    (controlStatus?.automationMode === 'auto' ||\n      controlStatus?.automationMode === 'manual');\n  const automationRunning = controlsVerified && controlStatus?.automationMode === 'auto';\n  const manualControl = controlsVerified && controlStatus?.automationMode === 'manual';\n""",
    """  const runtimeMode = controlStatus?.automationMode;\n  const runtimeControllable =\n    controlsVerified &&\n    runtimeMode !== 'fault' &&\n    runtimeMode !== 'stopped' &&\n    runtimeMode !== 'missing';\n  const automationRunning = controlsVerified && runtimeMode === 'auto';\n  const manualControl =\n    controlsVerified && (runtimeMode === 'manual-off' || runtimeMode === 'manual-on');\n  const automationPaused = controlsVerified && runtimeMode === 'paused';\n""",
)

replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    """          <button\n            className=\"automation-control-button\"\n            type=\"button\"\n            aria-pressed={manualControl}\n            disabled={action.isPending || !runtimeControllable}\n            onClick={() => {\n              if (controlStatus?.automationMode !== 'manual') action.mutate('manual');\n            }}\n          >\n            MANUAL\n          </button>\n""",
    """          <button\n            className=\"automation-control-button\"\n            type=\"button\"\n            aria-pressed={manualControl}\n            disabled={action.isPending || !runtimeControllable}\n            onClick={() => {\n              if (!manualControl) action.mutate('manual');\n            }}\n          >\n            MANUAL\n          </button>\n          <button\n            className=\"automation-control-button\"\n            type=\"button\"\n            aria-pressed={automationPaused}\n            disabled={action.isPending || !runtimeControllable}\n            onClick={() => {\n              if (!automationPaused) action.mutate('pause');\n            }}\n          >\n            PAUSED\n          </button>\n""",
)

replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    """          onClick={() => {\n            if (!controlStatus?.relayOn) action.mutate('on');\n          }}\n""",
    """          onClick={() => {\n            if (runtimeMode !== 'manual-on') action.mutate('on');\n          }}\n""",
)
replace_once(
    "apps/mobile/src/screens/AutomationDashboardScreen.tsx",
    """          onClick={() => {\n            if (controlStatus?.relayOn) action.mutate('off');\n          }}\n""",
    """          onClick={() => {\n            if (runtimeMode !== 'manual-off') action.mutate('off');\n          }}\n""",
)

replace_once(
    "apps/mobile/src/__tests__/automation-dashboard-controls.test.tsx",
    "automationMode: 'manual',",
    "automationMode: 'manual-off',",
)
replace_once(
    "apps/mobile/src/__tests__/automation-dashboard-controls.test.tsx",
    """    const manual = screen.getByRole('button', { name: 'MANUAL' });\n    const auto = screen.getByRole('button', { name: 'AUTO' });\n""",
    """    const manual = screen.getByRole('button', { name: 'MANUAL' });\n    const paused = screen.getByRole('button', { name: 'PAUSED' });\n    const auto = screen.getByRole('button', { name: 'AUTO' });\n""",
)
replace_once(
    "apps/mobile/src/__tests__/automation-dashboard-controls.test.tsx",
    """    expect(manual).toHaveAttribute('aria-pressed', 'true');\n    expect(off).toHaveAttribute('aria-pressed', 'true');\n""",
    """    expect(manual).toHaveAttribute('aria-pressed', 'true');\n    expect(paused).toHaveAttribute('aria-pressed', 'false');\n    expect(off).toHaveAttribute('aria-pressed', 'true');\n""",
)

p = Path("apps/mobile/src/flows/installations/runtimeControl.test.ts")
s = p.read_text()
s = s.replace(
    "  pauseInstalledAutomation,\n",
    "  enterInstalledAutomationManualMode,\n  pauseInstalledAutomation,\n",
    1,
)
s = s.replace(
    "mode: 'auto' | 'manual' | 'stopped' | 'missing',",
    "mode: 'auto' | 'manual-off' | 'manual-on' | 'paused' | 'fault' | 'stopped' | 'missing',",
    1,
)
s = s.replace(
    "runtimeModeSupported: mode === 'auto' || mode === 'manual'",
    "runtimeModeSupported: !['stopped', 'missing'].includes(mode)",
    1,
)
s = s.replace(
    """  it('enters MANUAL through the converged live runtime', async () => {\n    mocks.ensureCurrent.mockResolvedValue({\n      installation,\n      status: status('auto'),\n      upgraded: false\n    });\n    mocks.readStatus.mockResolvedValue(status('manual'));\n\n    const result = await pauseInstalledAutomation(installation);\n\n    expect(mocks.setRuntimeMode).toHaveBeenCalledWith(installation, 'manual');\n    expect(result.status.automationMode).toBe('manual');\n    expect(result.status.relayOn).toBe(false);\n  });\n""",
    """  it('enters MANUAL_OFF through the converged live runtime', async () => {\n    mocks.ensureCurrent.mockResolvedValue({\n      installation,\n      status: status('auto'),\n      upgraded: false\n    });\n    mocks.readStatus.mockResolvedValue(status('manual-off'));\n\n    const result = await enterInstalledAutomationManualMode(installation);\n\n    expect(mocks.setRuntimeMode).toHaveBeenCalledWith(installation, 'manual-off');\n    expect(result.status.automationMode).toBe('manual-off');\n    expect(result.status.relayOn).toBe(false);\n  });\n\n  it('enters PAUSED through the converged live runtime', async () => {\n    mocks.ensureCurrent.mockResolvedValue({\n      installation,\n      status: status('auto'),\n      upgraded: false\n    });\n    mocks.readStatus.mockResolvedValue(status('paused'));\n\n    const result = await pauseInstalledAutomation(installation);\n\n    expect(mocks.setRuntimeMode).toHaveBeenCalledWith(installation, 'paused');\n    expect(result.status.automationMode).toBe('paused');\n    expect(result.status.relayOn).toBe(false);\n  });\n""",
    1,
)
s = s.replace("status: status('manual'),", "status: status('manual-off'),", 1)
s = s.replace("status: status('manual', false, 11),", "status: status('manual-off', false, 11),", 1)
s = s.replace("mocks.readStatus.mockResolvedValue(status('manual', true, 11));", "mocks.readStatus.mockResolvedValue(status('manual-on', true, 11));", 1)
s = s.replace(
    "expect(mocks.setRelayOn).toHaveBeenCalledWith({ relayId: 0 });",
    "expect(mocks.setRuntimeMode).toHaveBeenCalledWith(replacedInstallation, 'manual-on');\n    expect(mocks.setRelayOn).not.toHaveBeenCalled();",
    1,
)
p.write_text(s)

p = Path("apps/mobile/src/flows/installations/runtimeUpgrade.test.ts")
s = p.read_text()
s = s.replace(
    "const runtimeStatus = (scriptId: number | null, mode: 'auto' | 'manual' | 'missing') => ({",
    "const runtimeStatus = (\n  scriptId: number | null,\n  mode: 'auto' | 'manual-off' | 'manual-on' | 'paused' | 'fault' | 'missing'\n) => ({",
    1,
)
s = s.replace(
    "runtimeModeSupported: mode === 'auto' || mode === 'manual'",
    "runtimeModeSupported: mode !== 'missing'",
    1,
)
p.write_text(s)
