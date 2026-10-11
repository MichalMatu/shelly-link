from pathlib import Path

p = Path('/tmp/runtime-arbitration-113.py')
lines = p.read_text().splitlines()
dq = chr(34)
old_target = (
    "const renderRuntimeState = (): string =>\n  'var R={ls:null,l:0,t:null,h:null,tt:null,ht:null,b:null,r:null,on:false,rs:"
    + dq
    + "boot"
    + dq
    + ",ds:"
    + dq
    + "boot"
    + dq
    + ",lc:0,os:null,nh:0,fh:0,cv:null,vp:null,eo:null,ef:null,m:0,sa:0,u:[],fc:0};';"
)
new_target = (
    "const renderRuntimeState = (): string =>\n  'var R={ls:null,l:0,t:null,h:null,tt:null,ht:null,b:null,r:null,on:false,rs:"
    + dq
    + "boot"
    + dq
    + ",ds:"
    + dq
    + "boot"
    + dq
    + ",lc:0,os:null,nh:0,fh:0,cv:null,vp:null,eo:null,ef:null,m:0,a:false,sa:0,u:[],fc:0};';"
)
if not lines[16].startswith('old_state = '):
    raise SystemExit(f'unexpected line 17: {lines[16]!r}')
if not lines[17].startswith('new_state = '):
    raise SystemExit(f'unexpected line 18: {lines[17]!r}')
lines[16] = 'old_state = ' + repr(old_target)
lines[17] = 'new_state = ' + repr(new_target)
p.write_text('\n'.join(lines) + '\n')
