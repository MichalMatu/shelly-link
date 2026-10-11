from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"expected block not found in {path}: {old[:120]!r}")
    p.write_text(s.replace(old, new, 1))


path = "apps/mobile/src/__tests__/climate-delete.test.tsx"
replace_once(
    path,
    """    config: {\n      ...base,\n      sensor: {\n        ...base.sensor,\n        runtimeAddress: 'A4:C1:38:4F:24:CD',\n        displayName: 'Przedpokój'\n      }\n    },\n    nowMs: 1000\n""",
    """    config: {\n      ...base,\n      sensor: {\n        ...base.sensor,\n        runtimeAddress: 'A4:C1:38:4F:24:CD',\n        displayName: 'Przedpokój'\n      }\n    },\n    buttonInputModeBeforeInstall: 'momentary',\n    nowMs: 1000\n""",
)
replace_once(
    path,
    """  let relayOn = true;\n  let scripts: ScriptEntry[] = [\n""",
    """  let relayOn = true;\n  let buttonMode: 'momentary' | 'detached' = 'detached';\n  let scripts: ScriptEntry[] = [\n""",
)
replace_once(
    path,
    """        params?: { id?: number; on?: boolean };\n""",
    """        params?: {\n          id?: number;\n          on?: boolean;\n          config?: { controls?: { 'switch:0'?: { in_mode?: 'momentary' | 'detached' } } };\n        };\n""",
)
replace_once(
    path,
    """        case 'Shelly.GetStatus':\n""",
    """        case 'Shelly.ListMethods':\n          result = { methods: ['PLUGS_UI.GetConfig', 'PLUGS_UI.SetConfig'] };\n          break;\n        case 'PLUGS_UI.GetConfig':\n          result = {\n            leds: { mode: 'switch' },\n            controls: { 'switch:0': { in_mode: buttonMode } }\n          };\n          break;\n        case 'PLUGS_UI.SetConfig': {\n          const nextMode = body.params?.config?.controls?.['switch:0']?.in_mode;\n          if (nextMode) buttonMode = nextMode;\n          result = { restart_required: false };\n          break;\n        }\n        case 'Shelly.GetStatus':\n""",
)
replace_once(
    path,
    """    expect(shelly.relayOn).toBe(false);\n    expect(shelly.scripts).toEqual([]);\n  });\n\n  it('keeps the local entry when Shelly script deletion fails', async () => {\n""",
    """    expect(shelly.relayOn).toBe(false);\n    expect(shelly.scripts).toEqual([]);\n    expect(shelly.rpcCalls).toContainEqual(\n      expect.objectContaining({ method: 'PLUGS_UI.SetConfig' })\n    );\n  });\n\n  it('keeps the local entry when Shelly script deletion fails', async () => {\n""",
)
