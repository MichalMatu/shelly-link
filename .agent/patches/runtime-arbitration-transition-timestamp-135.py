from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'expected one match in {path}, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1))


path = 'apps/mobile/src/flows/installations/runtimeModeTransport.ts'
replace_once(
    path,
    "R.m=1;R.nh=R.fh=0;R.rs=\"mn\";if(R.on)",
    "R.m=1;R.nh=R.fh=0;R.rs=\"mn\";R.lc=nw();if(R.on)"
)
replace_once(
    path,
    "R.m=2;R.nh=R.fh=0;R.rs=\"mn\";if(!R.on)",
    "R.m=2;R.nh=R.fh=0;R.rs=\"mn\";R.lc=n;if(!R.on)"
)
replace_once(
    path,
    "R.m=3;R.nh=R.fh=0;R.rs=\"pa\";if(R.on)",
    "R.m=3;R.nh=R.fh=0;R.rs=\"pa\";R.lc=nw();if(R.on)"
)
replace_once(
    path,
    "R.m=0;R.nh=R.fh=0;R.rs=\"ar\";return R.m",
    "R.m=0;R.nh=R.fh=0;R.rs=\"ar\";R.lc=nw();return R.m"
)

replace_once(
    'apps/mobile/src/flows/installations/runtimeModeTransport.test.ts',
    "code: expect.stringContaining('R.m=1')",
    "code: expect.stringMatching(/R\\.m=1;.*R\\.lc=nw\\(\\)/)"
)
