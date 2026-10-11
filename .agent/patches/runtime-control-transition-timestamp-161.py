from pathlib import Path

p = Path('packages/script-generator/src/shelly/generate.ts')
s = p.read_text()
assert 'ef:null,m:0,a:false,sa:0,u:[],fc:0};' in s
s = s.replace(
    'ef:null,m:0,a:false,sa:0,u:[],fc:0};',
    'ef:null,m:0,a:false,mt:null,sa:0,u:[],fc:0};',
    1,
)
assert 'function ft(q){R.m=4;R.rs=q;R.lc=nw();R.on=false;R.os=null;s(false)}' in s
s = s.replace(
    'function ft(q){R.m=4;R.rs=q;R.lc=nw();R.on=false;R.os=null;s(false)}',
    'function ft(q){var n=nw();if(R.m!=4)R.mt=n;R.m=4;R.rs=q;R.lc=n;R.on=false;R.os=null;s(false)}',
    1,
)
assert 'R.ds,R.m,R.a],d:pd()' in s
s = s.replace('R.ds,R.m,R.a],d:pd()', 'R.ds,R.m,R.a,R.mt],d:pd()', 1)
p.write_text(s)

p = Path('apps/mobile/src/flows/installations/runtimeModeTransport.ts')
s = p.read_text()
replacements = {
    '(function(){if(R.m===4)return R.m;R.m=1;R.nh=R.fh=0;R.rs="mn";if(R.on)sw(false,"mn",1);return R.m})()':
        '(function(){if(R.m===4)return R.m;if(R.m!==1)R.mt=nw();R.m=1;R.nh=R.fh=0;R.rs="mn";if(R.on)sw(false,"mn",1);return R.m})()',
    '(function(){if(R.m===4)return R.m;var n=nw();if(!R.ls||n-R.ls>C.s){ft("st");return R.m}R.m=2;R.nh=R.fh=0;R.rs="mn";if(!R.on)sw(true,"mn",1);return R.m})()':
        '(function(){if(R.m===4)return R.m;var n=nw();if(!R.ls||n-R.ls>C.s){ft("st");return R.m}if(R.m!==2)R.mt=n;R.m=2;R.nh=R.fh=0;R.rs="mn";if(!R.on)sw(true,"mn",1);return R.m})()',
    '(function(){if(R.m===4)return R.m;R.m=3;R.nh=R.fh=0;R.rs="pa";if(R.on)sw(false,"pa",1);return R.m})()':
        '(function(){if(R.m===4)return R.m;if(R.m!==3)R.mt=nw();R.m=3;R.nh=R.fh=0;R.rs="pa";if(R.on)sw(false,"pa",1);return R.m})()',
    '(function(){if(R.m===4)return R.m;R.m=0;R.nh=R.fh=0;R.rs="ar";return R.m})()':
        '(function(){if(R.m===4)return R.m;if(R.m!==0)R.mt=nw();R.m=0;R.nh=R.fh=0;R.rs="ar";return R.m})()',
}
for old, new in replacements.items():
    assert old in s, old
    s = s.replace(old, new, 1)
p.write_text(s)

p = Path('apps/mobile/src/flows/hardware-setup/schemas.ts')
s = p.read_text()
needle = '''      z.tuple([\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.boolean(),\n        z.string(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number(),\n        z.number(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.string(),\n        runtimeControlModeCodeSchema,\n        z.boolean()\n      ])\n'''
assert needle in s
replacement = needle.rstrip('\n') + ''',\n      z.tuple([\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.boolean(),\n        z.string(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number(),\n        z.number(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.number().nullable(),\n        z.string(),\n        runtimeControlModeCodeSchema,\n        z.boolean(),\n        z.number().nullable()\n      ])\n'''
s = s.replace(needle, replacement, 1)
assert 'automationRequestedRelayState: snapshot.g[18] ?? null' in s
s = s.replace(
    'automationRequestedRelayState: snapshot.g[18] ?? null',
    'automationRequestedRelayState: snapshot.g[18] ?? null,\n      lastControlTransitionUptimeMs: snapshot.g[19] ?? null',
    1,
)
p.write_text(s)

p = Path('apps/mobile/src/flows/installations/runtimeDiagnostics.test.ts')
s = p.read_text()
assert '...(overrides.includeArbitrationDiagnostics === false ? [] : [2, true])' in s
s = s.replace(
    '...(overrides.includeArbitrationDiagnostics === false ? [] : [2, true])',
    '...(overrides.includeArbitrationDiagnostics === false ? [] : [2, true, 925_000])',
    1,
)
assert 'lastChangeUptimeMs: 900_000' in s
s = s.replace(
    'lastChangeUptimeMs: 900_000',
    'lastChangeUptimeMs: 900_000,\n        lastControlTransitionUptimeMs: 925_000',
    1,
)
assert 'automationRequestedRelayState: null' in s
s = s.replace(
    'automationRequestedRelayState: null',
    'automationRequestedRelayState: null,\n        lastControlTransitionUptimeMs: null',
    1,
)
p.write_text(s)

p = Path('apps/mobile/src/flows/installations/runtimeModeTransport.test.ts')
s = p.read_text()
needle = "describe('runtime mode Script.Eval transport', () => {\n  beforeEach(() => vi.clearAllMocks());\n"
assert needle in s
if 'tracks control-mode transition uptime' not in s:
    insert = '''\n  it('tracks control-mode transition uptime without reusing relay-change timing', async () => {\n    mocks.call.mockResolvedValue({ ok: true, value: { result: '1' } });\n\n    await setInstalledAutomationRuntimeMode(installation, 'manual-off');\n\n    const request = mocks.call.mock.calls.at(-1)?.[0] as\n      | { params?: { code?: string } }\n      | undefined;\n    const code = request?.params?.code ?? '';\n    expect(code).toContain('R.mt');\n    expect(code).not.toContain('R.lc=nw()');\n  });\n'''
    s = s.replace(needle, needle + insert, 1)
p.write_text(s)

p = Path('packages/script-generator/src/__tests__/generator.test.ts')
s = p.read_text()
needle = """        'boot',\n        0,\n        false\n      ],\n"""
assert needle in s
s = s.replace(
    needle,
    """        'boot',\n        0,\n        false,\n        null\n      ],\n""",
    1,
)
p.write_text(s)

for filename in ('docs/ARCHITECTURE.md', 'docs/HANDOFF_NEXT_CHAT.md', 'docs/ROADMAP.md'):
    p = Path(filename)
    s = p.read_text()
    s = s.replace(
        'reason code and last relay-change uptime',
        'reason code, last relay-change uptime and last control-mode transition uptime',
    )
    s = s.replace(
        'reason and last relay-change uptime',
        'reason, last relay-change uptime and last control-mode transition uptime',
    )
    p.write_text(s)
