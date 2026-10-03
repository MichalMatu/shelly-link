from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"expected block not found in {path}: {old[:80]}")
    p.write_text(s.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, count: int) -> None:
    p = Path(path)
    s = p.read_text()
    if s.count(old) < count:
        raise SystemExit(f"expected {count} blocks not found in {path}: {old[:80]}")
    p.write_text(s.replace(old, new, count))

replace_once(
    "packages/script-generator/src/shelly/generate.ts",
    'm:0,sa:0,u:[],fc:0',
    'm:0,a:false,sa:0,u:[],fc:0',
)
replace_once(
    "packages/script-generator/src/shelly/generate.ts",
    'function sw(o,q,f){if(!f&&R.m)return;var n=nw(),c=R.on!=o,m=R.m;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";s(o,function(r,e){if(R.m!=m)return s(R.m==2);if(e)return ft("se");R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null})}',
    'function sw(o,q,f){if(!f){R.a=o;if(R.m)return}var n=nw(),c=R.on!=o,m=R.m;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";s(o,function(r,e){if(R.m!=m)return s(R.m==2);if(e)return ft("se");R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null})}',
)
replace_once(
    "packages/script-generator/src/shelly/generate.ts",
    'R.eo,R.ef,R.l,R.ds],d:pd()',
    'R.eo,R.ef,R.l,R.ds,R.m,R.a],d:pd()',
)
replace_once(
    "packages/script-generator/src/shelly/runtimeConfigUpdate.ts",
    'R.m=M;R.sa=0;',
    'R.m=M;R.a=false;R.sa=0;',
)
replace_count(
    "packages/script-generator/src/__tests__/generator.test.ts",
    '    getComponentStatus:',
    '    addEventHandler: () => 1,\n    getComponentStatus:',
    2,
)
replace_once(
    "packages/script-generator/src/__tests__/multi-sensor-runtime.test.ts",
    '    getComponentStatus:',
    '    addEventHandler: () => 1,\n    getComponentStatus:',
)
