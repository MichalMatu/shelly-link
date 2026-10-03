from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'expected one match in {path}, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1))


replace_once(
    'packages/script-generator/src/shelly/runtimeConfigUpdate.ts',
    'var N=${configJson},M=R.m,O=R.on;',
    'var N=${configJson},M=R.m,O=R.on,A=R.a;'
)
replace_once(
    'packages/script-generator/src/shelly/runtimeConfigUpdate.ts',
    'R.m=M;R.a=false;R.sa=0;',
    'R.m=M;R.a=A;R.sa=0;'
)
replace_once(
    'packages/script-generator/src/__tests__/persistent-runtime-config.test.ts',
    "it('generates an in-place config update that preserves runtime control mode and output', () => {",
    "it('generates an in-place config update that preserves runtime control mode, output and requested state', () => {"
)
replace_once(
    'packages/script-generator/src/__tests__/persistent-runtime-config.test.ts',
    '      a: false,\n      sa: 0,',
    '      a: true,\n      sa: 0,'
)
