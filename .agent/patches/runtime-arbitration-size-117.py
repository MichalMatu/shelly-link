from pathlib import Path

p = Path("packages/script-generator/src/shelly/generate.ts")
s = p.read_text()

replacements = [
    ('function N(x){return typeof x=="number";}', 'function N(x){return x-0===x}'),
    ('function S(x){return typeof x=="string";}', 'function S(x){return x+""===x}'),
    ('m:0,a:false,sa:0', 'm:0,sa:0'),
    ('function na(a){if(a==null)return"";var s=String(a).toUpperCase(),o="";for(var i=0;i<s.length;i++){var c=s.charAt(i);if(c!=":"&&c!="-")o+=c;}return o;}', 'function na(a){var s=a==null?"":String(a).toUpperCase(),o="",i,c;for(i=0;i<s.length;i++)if((c=s[i])!=":"&&c!="-")o+=c;return o}'),
    ('function sw(o,q,f){if(!f){R.a=o;if(R.m)return}var n=nw(),c=R.on!=o,m=R.m;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";s(o,function(r,e){if(R.m!==m)return s(R.m===2);if(e)return ft("se");R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null})}', 'function sw(o,q,f){if(!f&&R.m)return;var n=nw(),c=R.on!=o,m=R.m;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";s(o,function(r,e){if(R.m!=m)return s(R.m==2);if(e)return ft("se");R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null})}'),
    ('function pe(e){if(!e||e.component!=="input:0"||!e.info||e.info.event!=="single_push"||R.m>2)return;var n=nw(),m=R.m===1?2:1,o=m===2;if(o&&(R.ls===null||n-R.ls>C.s))return ft("st");R.m=m;R.rs="pb";R.lc=n;if(R.on!==o)sw(o,"pb",true)}', 'function pe(e){if(e.component!="input:0"||e.info.event!="single_push"||R.m>2)return;var n=nw(),m=R.m==1?2:1,o=m==2;if(o&&(!R.ls||n-R.ls>C.s))return ft("st");R.m=m;R.rs="pb";R.lc=n;if(R.on!=o)sw(o,"pb",1)}'),
    ('function stale(){var n=nw();if(R.ls===null||n-R.ls>C.s){R.ds="st";R.nh=0;R.fh=0;ft("st");return}if(R.on&&R.os!==null&&n-R.os>=C.x){R.nh=0;R.fh=0;ft("mx")}}', 'function stale(){var n=nw();if(!R.ls||n-R.ls>C.s){R.ds="st";R.nh=R.fh=0;ft("st");return}if(R.on&&R.os&&n-R.os>=C.x){R.nh=R.fh=0;ft("mx")}}'),
    ('if(Shelly.addEventHandler)Shelly.addEventHandler(pe);', 'Shelly.addEventHandler(pe);'),
    ('R.eo,R.ef,R.l,R.ds,R.m,R.a],d:pd()', 'R.eo,R.ef,R.l,R.ds],d:pd()')
]

for old, new in replacements:
    if old not in s:
        raise SystemExit(f"expected generate.ts block not found: {old[:80]}")
    s = s.replace(old, new, 1)

p.write_text(s)

p = Path("packages/script-generator/src/shelly/runtimeConfigUpdate.ts")
s = p.read_text()
old = 'R.m=M;R.a=false;R.sa=0;'
new = 'R.m=M;R.sa=0;'
if old not in s:
    raise SystemExit("runtime config desired-state reset not found")
p.write_text(s.replace(old, new, 1))
