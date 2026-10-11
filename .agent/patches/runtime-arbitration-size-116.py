from pathlib import Path

p=Path('packages/script-generator/src/shelly/generate.ts')
s=p.read_text()
old='function lb(d){return d&&d.length!==undefined?d.length:0;}'
new='function lb(d){return d&&d.length||0;}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function rb(d,o){if(o<0||o>=lb(d))return null;var v=typeof d==="string"?d.charCodeAt(o):d[o];if(typeof v==="string")v=v.charCodeAt(0);return v===undefined||v===null?null:v&255;}'
new='function rb(d,o){if(o<0||o>=lb(d))return null;var v=typeof d=="string"?d.charCodeAt(o):d[o];if(typeof v=="string")v=v.charCodeAt(0);return v==null?null:v&255;}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function sl(d,a,b){return typeof d==="string"?d.slice(a,b):d.slice?d.slice(a,b):null;}'
new='function sl(d,a,b){return d&&d.slice?d.slice(a,b):null;}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function sd(x){return x.advData?ad(x.advData):null;}'
new='function sd(x){return ad(x.advData);}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(a===null||b===null)return null;'
new='if(a==null||b==null)return null;'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(n===null||n===0)return null;'
new='if(!n)return null;'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(p===null){R.ds="tm";return;}'
new='if(p==null){R.ds="tm";return;}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(lo===null||hi===null||h===null||b===null){R.ds="ts";return;}'
new='if(lo==null||hi==null||h==null||b==null){R.ds="ts";return;}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function parse(x,p,j){return p===1?pt(x,j):pb(x,j);}'
new='function parse(x,p,j){return p==1?pt(x,j):pb(x,j);}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function vd(t,h){return t===null||h===null?null:sv(t)*(1-h/100);}'
new='function vd(t,h){return t==null||h==null?null:sv(t)*(1-h/100);}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function vt(h){if(h===null||h>=100)return null;'
new='function vt(h){if(h==null||h>=100)return null;'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function vh(t){if(t===null)return null;'
new='function vh(t){if(t==null)return null;'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(g===null)return{o:C.on,f:C.off};'
new='if(g==null)return{o:C.on,f:C.off};'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function fr(x,n){return x!==null&&n-x<=Math.min('
new='function fr(x,n){return x!=null&&n-x<=Math.min('
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='u=[null,null,null,null,null,null,null];'
new='u=[null,null,null,null,null,null];'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='u[5]=r;u[6]=C.ss?C.ss[j][0]:C.a;'
new='u[5]=r;'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(!u||u[6]!==x){'
new='if(!u){'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='if(u[3]!==null&&(l===null||u[3]>l))l=u[3];'
new='if(u[3]!=null&&(l==null||u[3]>l))l=u[3];'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
old='function fv(o,k){return o&&o[k]!=null?o[k]:null;}'
new='function fv(o,k){return o&&o[k];}'
if old not in s: raise SystemExit('missing: '+old[:80])
s=s.replace(old,new,1)
p.write_text(s)

p=Path('packages/script-generator/src/__tests__/generator.test.ts')
s=p.read_text()
old="        'boot'\n      ],"
new="        'boot',\n        0,\n        false\n      ],"
if old not in s: raise SystemExit('generator diagnostics expectation not found')
p.write_text(s.replace(old,new,1))
