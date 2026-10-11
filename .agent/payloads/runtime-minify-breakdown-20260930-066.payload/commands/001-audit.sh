set -eu
git fetch origin main
git reset --hard origin/main
rm -f scripts/.tmp-minify-audit.ts
TMP=scripts/.tmp-minify-breakdown.ts
trap 'rm -f "$TMP"' EXIT
cat > "$TMP" <<'TS'
import { transformWithEsbuild } from 'vite';
import { createDefaultShellyThermostatConfig, generateShellyThermostatScript } from '@lcl/script-generator';
const bytes=(s:string)=>new TextEncoder().encode(s).length;
const base=createDefaultShellyThermostatConfig('xiaomi_lywsd03mmc_bthome_v2','heating');
const four={...base,sensor:{...base.sensor,displayName:'Thermometer 01:AA'},sensorSet:{aggregation:'avg' as const,additionalSensors:Array.from({length:3},(_,i)=>({...base.sensor,sensorId:`sensor-${i+2}`,runtimeAddress:`02:00:00:00:00:0${i+2}`,displayName:`Thermometer 0${i+2}:AA`}))}};
for(const [name,cfg] of [['one',base],['four',four]] as const){
 const script=generateShellyThermostatScript(cfg);
 const split=script.indexOf('var C=');
 const header=script.slice(0,split), body=script.slice(split);
 const variants={
   whitespace:(await transformWithEsbuild(body,'runtime.js',{minifyWhitespace:true,minifySyntax:false,minifyIdentifiers:false,target:'es2020',format:'esm'})).code,
   syntax:(await transformWithEsbuild(body,'runtime.js',{minifyWhitespace:false,minifySyntax:true,minifyIdentifiers:false,target:'es2020',format:'esm'})).code,
   syntaxWhitespace:(await transformWithEsbuild(body,'runtime.js',{minifyWhitespace:true,minifySyntax:true,minifyIdentifiers:false,target:'es2020',format:'esm'})).code,
   full:(await transformWithEsbuild(body,'runtime.js',{minify:true,target:'es2020',format:'esm'})).code,
   protectedFull:(await transformWithEsbuild('eval(\"\");'+body,'runtime.js',{minify:true,target:'es2020',format:'esm'})).code
 };
 console.log(JSON.stringify({name,base:bytes(script),...Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,bytes(header+v)]))}));
 if(name==='four'){
   const ws=variants.whitespace, syn=variants.syntax;
   console.log('four-whitespace-prefix',ws.slice(0,500));
   console.log('four-syntax-prefix',syn.slice(0,700).replace(/\n/g,'\\n'));
 }
}
TS
pnpm exec tsx "$TMP"
git status --short
