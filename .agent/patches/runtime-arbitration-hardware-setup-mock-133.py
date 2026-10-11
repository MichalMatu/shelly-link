from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'expected one match in {path}, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1))


path = 'apps/mobile/src/__tests__/hardware-setup.test.tsx'
replace_once(
    path,
    """    let relayOn = false;\n    let thermostatScriptId = 1;\n""",
    """    let relayOn = false;\n    let buttonMode: 'momentary' | 'detached' = 'momentary';\n    let thermostatScriptId = 1;\n"""
)
replace_once(
    path,
    """          case 'Schedule.List':\n            return rpcResult({ jobs: [], rev: 0 });\n""",
    """          case 'Shelly.ListMethods':\n            return rpcResult({ methods: ['PLUGS_UI.GetConfig', 'PLUGS_UI.SetConfig'] });\n          case 'PLUGS_UI.GetConfig':\n            return rpcResult({\n              leds: { mode: 'switch' },\n              controls: { 'switch:0': { in_mode: buttonMode } }\n            });\n          case 'PLUGS_UI.SetConfig': {\n            const params = body.params as\n              | {\n                  config?: {\n                    controls?: {\n                      'switch:0'?: { in_mode?: 'momentary' | 'detached' };\n                    };\n                  };\n                }\n              | undefined;\n            const nextMode = params?.config?.controls?.['switch:0']?.in_mode;\n            if (nextMode) buttonMode = nextMode;\n            return rpcResult({ restart_required: false });\n          }\n          case 'Schedule.List':\n            return rpcResult({ jobs: [], rev: 0 });\n"""
)
