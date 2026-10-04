import { GENERATOR_VERSION, normalizeConfig } from './config.js';
import { configHash, stableStringify } from './hash.js';
import {
  createShellyRuntimeConfig,
  SHELLY_RUNTIME_CONFIG_STORAGE_KEY
} from './runtimeConfig.js';
import { renderRuntimeDiagnostics } from './runtime/diagnostics.js';
import {
  renderClimateExecution,
  renderClimateExecutionBoot
} from './runtime/execution.js';
import { renderHistoryWriter } from './runtime/historyWriter.js';
import { renderRelayArbiter } from './runtime/relayArbiter.js';
import { renderSafetySupervisor } from './runtime/safetySupervisor.js';
import { renderSensorHealth } from './runtime/sensorHealth.js';
import { renderRuntimeState } from './runtime/state.js';
import {
  aliasGeneratedClimateRuntimeTokens,
  compactGeneratedShellyScript
} from './scriptText.js';

export type ShellyScriptGeneratorMode = 'climate-engine-v1' | 'discovery-debug';

const COMPOSITE_MEASUREMENT_WINDOW_MS = 90_000;
const MINIMUM_ON_GENERATOR_VERSION = '0.6.2';
const DEBOUNCE_GENERATOR_VERSION = '0.6.3';
const EXECUTION_GENERATOR_VERSION = '0.7.0';
export const SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES = 12_000;

const renderPersistentConfigLoader = (
  minimumOnEnabled = false,
  debounceEnabled = false,
  pulseEnabled = false,
  activeWindowEnabled = false
): string => {
  const minimumOnValidator = minimumOnEnabled ? '&&(c.u===void 0||N(c.u)&&c.u>=0)' : '';
  const debounceValidator = debounceEnabled
    ? '&&(c.y===void 0||N(c.y)&&c.y>=0)&&(c.z===void 0||N(c.z)&&c.z>=0)'
    : '';
  const executionRange =
    pulseEnabled || activeWindowEnabled
      ? 'function B(x,a,b){return N(x)&&x>=a&&x<=b}\n'
      : '';
  const pulseValidator = pulseEnabled
    ? 'function ve(e){return e&&e.length==5&&B(e[0],1e3,864e5)&&B(e[1],1e3,864e5)&&B(e[2],0,864e5)&&(e[3]===0||e[3]===1)&&(e[4]===0||B(e[4],1,1e5)||B(e[4],-6048e5,-1e3))}\n'
    : '';
  const activeWindowValidator = activeWindowEnabled
    ? 'function vw(w){return w&&w.length==2&&B(w[0],0,1439)&&B(w[1],0,1439)&&w[0]!==w[1]}\n'
    : '';
  const executionValidator = `${pulseEnabled ? '&&ve(c.e)' : ''}${activeWindowEnabled ? '&&vw(c.w)' : ''}`;

  return `var E=0;
function N(x){return x-0===x}
function S(x){return x+""===x}
${executionRange}${pulseValidator}${activeWindowValidator}function vs(c){var a=c.ss;if(a===void 0)return c.ag===void 0;if(!Array.isArray(a)||a.length<2||a.length>4||!N(c.ag)||c.ag<0||c.ag>3)return false;for(var i=0,s;i<a.length;i++){s=a[i];if(!Array.isArray(s)||s.length!==3||!S(s[0])||!S(s[1])||(s[2]!==0&&s[2]!==1))return false;}return true;}
function vc(c){return c&&c.v===1&&(c.p===0||c.p===1)&&S(c.a)&&S(c.fa)&&S(c.n)&&S(c.k)&&N(c.i)&&c.i>=0&&N(c.r)&&c.r>=-100&&c.r<=-20&&N(c.on)&&N(c.off)&&(c.d===0||c.d===1)&&(c.m===0||c.m===1)&&N(c.h)&&c.h>=1&&c.h<=10&&N(c.c)&&c.c>0${minimumOnValidator}${debounceValidator}&&N(c.s)&&c.s>0&&N(c.x)&&c.x>0&&N(c.vp)&&c.vp>=0&&c.vp<=5&&(c.d?c.on>c.off:c.on<c.off)&&vs(c)${executionValidator};}
function lc(d){if(typeof Script=="undefined"||!Script.storage||!Script.storage.getItem)return d;try{var x=Script.storage.getItem(${JSON.stringify(SHELLY_RUNTIME_CONFIG_STORAGE_KEY)});if(!x)return d;var c=JSON.parse(x);if(vc(c))return c;}catch(e){}E=1;return d;}
C=lc(C);`;
};

const renderThresholdHelper =
  (): string => `function cl(v,a,b){return Math.min(Math.max(v,a),b);}
function sv(t){return 0.6108*Math.exp((17.27*t)/(t+237.3));}
function vd(t,h){return t===null||h===null?null:sv(t)*(1-h/100);}
function vt(h){if(h===null||h>=100)return null;var f=1-h/100;if(f<=0)return null;var s=C.vp/f;if(s<=0)return null;var l=Math.log(s/0.6108);return l>=17.27?null:(237.3*l)/(17.27-l);}
function vh(t){if(t===null)return null;var s=sv(t);return s<=0?null:100*(1-C.vp/s);}
function th(t,h){if(!C.vp)return{o:C.on,f:C.off};var lo=Math.min(C.on,C.off),hi=Math.max(C.on,C.off),g=C.m?vh(t):vt(h);if(g===null)return{o:C.on,f:C.off};g=cl(g,lo,hi);var z=C.m?2:0.25;return C.d?{o:cl(g+z,lo,hi),f:cl(g-z,lo,hi)}:{o:cl(g-z,lo,hi),f:cl(g+z,lo,hi)};}`;

const renderRuntimeParser =
  (): string => `function lb(d){return d&&d.length!==undefined?d.length:0;}
function rb(d,o){if(o<0||o>=lb(d))return null;var v=typeof d==="string"?d.charCodeAt(o):d[o];if(typeof v==="string")v=v.charCodeAt(0);return v==null?null:v&255;}
function sl(d,a,b){return typeof d==="string"?d.slice(a,b):d.slice?d.slice(a,b):null;}
function ad(d){var l=lb(d),o=0;while(o<l){var n=rb(d,o);if(!n)return null;var s=o+1,e=s+n;if(e>l)return null;if(rb(d,s)===22&&rb(d,s+1)===210&&rb(d,s+2)===252)return sl(d,s+3,e);o=e;}return null;}
function sd(x){return x.advData?ad(x.advData):null;}
function r2(d,o,s){var a=rb(d,o),b=rb(d,o+1);if(a===null||b===null)return null;var v=a|(b<<8);return s&&v&32768?v-65536:v;}
function pb(x,j){var d=sd(x);if(!d){R.ds="bm";return;}var t=null,h=null,b=null,o=1,l=lb(d),k,v;while(o<l){k=rb(d,o++);if(k==0)o++;else if(k==1)b=rb(d,o++);else if(k==12)o+=2;else if(k==2){v=r2(d,o,1);if(v==null){R.ds="bs";return;}t=v/100;o+=2;}else if(k==3){v=r2(d,o,0);if(v==null){R.ds="bs";return;}h=v/100;o+=2;}else if(k==46){h=rb(d,o++);if(h==null){R.ds="bs";return;}}else if(k==69){v=r2(d,o,1);if(v==null){R.ds="bs";return;}t=v/10;o+=2;}else{R.ds="bo";break;}}meas(t,h,b,x.rssi,j);}
function mf(d){var l=lb(d),o=0;while(o<l){var n=rb(d,o);if(n===null||n===0)return null;var s=o+1,e=s+n;if(e>l)return null;if(rb(d,s)===255&&n>=7)return s+1;o=e;}return null;}
function pt(x,j){var d=x.advData;if(!d){R.ds="ta";return;}var p=mf(d);if(p===null){R.ds="tm";return;}var lo=rb(d,p+1),hi=rb(d,p+2),h=rb(d,p+3),b=rb(d,p+4);if(lo===null||hi===null||h===null||b===null){R.ds="ts";return;}var raw=lo|(hi<<8);if(raw&32768)raw-=65536;var t=raw/10;if(h>100||t<-50||t>100){R.ds="tr";return;}b&=3;b=b===0?1:b===1?50:b===2?100:null;meas(t,h,b,x.rssi,j);}
function parse(x,p,j){return p==1?pt(x,j):pb(x,j)}`;

const renderMeasurementHelper = (executionEnabled = false): string => {
  if (!executionEnabled) {
    return `function fr(x,n){return x!==null&&n-x<=Math.min(${COMPOSITE_MEASUREMENT_WINDOW_MS},C.s);}
function av(v,t,n){var z=[],q,u,i;for(i=0;i<R.u.length;i++){u=R.u[i];if(u&&fr(u[t],n)&&u[v]!=null)z.push(u[v]);}R.fc=z.length;if(!z.length)return null;if(C.ag===3||C.ag===undefined)return z[0];q=z[0];if(C.ag===1){for(i=1;i<z.length;i++)q=Math.min(q,z[i]);return q;}if(C.ag===2){for(i=1;i<z.length;i++)q=Math.max(q,z[i]);return q;}q=0;for(i=0;i<z.length;i++)q+=z[i];return q/z.length;}
function meas(t,h,b,r,j){var n=nw(),u=R.u[j],p=t!=null||h!=null;R.r=r;if(b!=null)R.b=b;if(!p){R.ds="cv";return;}if(!u){u=[null,null,null,null,null,null,null];R.u[j]=u;}u[5]=r;u[6]=C.ss?C.ss[j][0]:C.a;if(b!=null)u[4]=b;if(t!=null){u[0]=t;u[2]=n;}if(h!=null){u[1]=h;u[3]=n;}var tf=av(0,2,n),hf=av(1,3,n),v=C.m?hf:tf;R.t=tf;R.h=hf;R.tt=n;R.ht=n;R.cv=v;if(C.vp){if(v==null||tf==null||hf==null){R.ds="cv";return;}t=tf;h=hf;}else{if(v==null){R.ds="cv";return;}t=tf;h=hf;}R.ls=n;R.af=null;R.ds="ok";var T=th(t,h);R.eo=T.o;R.ef=T.f;R.vp=C.vp?vd(t,h):null;var go=C.d?v>T.o:v<T.o,stop=C.d?v<T.f:v>T.f,gr=C.d?"ab":"bl",sr=C.d?"bl":"ab";if(go){R.nh++;R.fh=0;if(R.nh<C.h){sw(R.on,gr+"h",false);return;}sw(true,gr,false);return;}if(stop){R.fh++;R.nh=0;sw(false,sr,false);return;}R.nh=0;R.fh=0;sw(R.on,"ib",false);}`;
  }

  return `function fr(x,n){return x!==null&&n-x<=Math.min(${COMPOSITE_MEASUREMENT_WINDOW_MS},C.s);}
function av(v,t,n){var z=[],q,u,i;for(i=0;i<R.u.length;i++){u=R.u[i];if(u&&fr(u[t],n)&&u[v]!=null)z.push(u[v]);}R.fc=z.length;if(!z.length)return null;if(C.ag===3||C.ag===undefined)return z[0];q=z[0];if(C.ag===1){for(i=1;i<z.length;i++)q=Math.min(q,z[i]);return q;}if(C.ag===2){for(i=1;i<z.length;i++)q=Math.max(q,z[i]);return q;}q=0;for(i=0;i<z.length;i++)q+=z[i];return q/z.length;}
function meas(t,h,b,r,j){var n=nw(),u=R.u[j],p=t!=null||h!=null;R.r=r;if(b!=null)R.b=b;if(!p){R.ds="cv";return;}if(!u){u=[null,null,null,null,null,null,null];R.u[j]=u;}u[5]=r;u[6]=C.ss?C.ss[j][0]:C.a;if(b!=null)u[4]=b;if(t!=null){u[0]=t;u[2]=n;}if(h!=null){u[1]=h;u[3]=n;}var tf=av(0,2,n),hf=av(1,3,n),v=C.m?hf:tf;R.t=tf;R.h=hf;R.tt=n;R.ht=n;R.cv=v;if(C.vp){if(v==null||tf==null||hf==null){R.ds="cv";return;}t=tf;h=hf;}else{if(v==null){R.ds="cv";return;}t=tf;h=hf;}R.ls=n;R.af=null;R.ds="ok";var T=th(t,h);R.eo=T.o;R.ef=T.f;R.vp=C.vp?vd(t,h):null;var go=C.d?v>T.o:v<T.o,stop=C.d?v<T.f:v>T.f,gr=C.d?"ab":"bl",sr=C.d?"bl":"ab";if(go){R.nh++;R.fh=0;if(R.nh<C.h){rq(R.pa,gr+"h");return;}rq(true,gr);return;}if(stop){R.fh++;R.nh=0;rq(false,sr);return;}R.nh=0;R.fh=0;rq(R.pa,"ib");}`;
};

export const generateShellyThermostatScript = (input: unknown): string => {
  const config = normalizeConfig(input);
  const mode: ShellyScriptGeneratorMode = 'climate-engine-v1';
  const minimumOnEnabled = (config.rule.minimumOnMs ?? 0) > 0;
  const debounceEnabled = config.rule.relayDebounce !== undefined;
  const pulseEnabled = config.execution?.pulse !== undefined;
  const activeWindowEnabled = config.execution?.activeWindow !== undefined;
  const executionEnabled = pulseEnabled || activeWindowEnabled;
  const generatorVersion = executionEnabled
    ? EXECUTION_GENERATOR_VERSION
    : debounceEnabled
      ? DEBOUNCE_GENERATOR_VERSION
      : minimumOnEnabled
        ? MINIMUM_ON_GENERATOR_VERSION
        : GENERATOR_VERSION;
  const hash = configHash(config);
  const cfgJson = stableStringify(createShellyRuntimeConfig(config, hash));
  const capabilities = `${minimumOnEnabled ? 'var U=1;' : ''}${debounceEnabled ? 'var D=1;' : ''}`;
  const executionBoot = renderClimateExecutionBoot(activeWindowEnabled);
  const body = `${capabilities ? `${capabilities}\n` : ''}var C=${cfgJson};
${renderPersistentConfigLoader(minimumOnEnabled, debounceEnabled, pulseEnabled, activeWindowEnabled)}
${renderRuntimeState(debounceEnabled, executionEnabled, pulseEnabled, activeWindowEnabled)}
${renderRelayArbiter(minimumOnEnabled, debounceEnabled, executionEnabled, pulseEnabled)}
${renderSafetySupervisor()}
${renderSensorHealth(executionEnabled, pulseEnabled)}
${executionEnabled ? `${renderClimateExecution(pulseEnabled, activeWindowEnabled)}\n` : ''}function na(a){var s=a==null?"":String(a).toUpperCase(),o="",i,c;for(i=0;i<s.length;i++)if((c=s[i])!=":"&&c!="-")o+=c;return o}
${renderThresholdHelper()}
${renderMeasurementHelper(executionEnabled)}
${renderRuntimeParser()}
function pd(){var n=nw(),s=C.ss,a=[],i,u,x,l,f;for(i=0;i<(s?s.length:1);i++){x=s?s[i][0]:C.a;u=R.u[i];if(!u||u[6]!=x){a.push([x,null,null,null,null,null,0]);continue;}l=u[2];if(u[3]!=null&&(l==null||u[3]>l))l=u[3];f=C.vp?fr(u[2],n)&&fr(u[3],n):fr(C.m?u[3]:u[2],n);a.push([x,u[0],u[1],u[4],u[5],l,f?1:0]);}return a;}
${renderRuntimeDiagnostics(executionEnabled, pulseEnabled, activeWindowEnabled)}
${renderHistoryWriter()}
if(typeof HTTPServer!=="undefined"&&HTTPServer.registerEndpoint){HTTPServer.registerEndpoint("diag",function(q,p){p.code=200;p.headers=[["Content-Type","application/json"]];p.body=diag();p.send();});}
function ix(a){var z=na(a),s=C.ss;if(!s)return z==C.a?0:-1;for(var i=0;i<s.length;i++)if(z==s[i][0])return i;return-1;}
function ev(e,x){if(e!=BLE.Scanner.SCAN_RESULT||!x)return;var j=ix(x.addr);if(j<0)return;R.l=nw();if(x.rssi!=null&&x.rssi<C.r){R.r=x.rssi;R.ds="rl";return;}var p=C.ss?C.ss[j][2]:C.p;parse(x,p,j);}
function br(){if(BLE.Scanner.isRunning)return BLE.Scanner.isRunning();if(BLE.Scanner.IsRunning)return BLE.Scanner.IsRunning();return null}
function bs(){R.sa=nw();if(br()===true)return;var f=BLE.Scanner.start||BLE.Scanner.Start;if(!f||f.call(BLE.Scanner,{duration_ms:-1,active:false,interval_ms:241,window_ms:61,rssi_thr:0})==null)sf("bf")}
function bw(){if(br()===false){BLE.Scanner.subscribe(function(e,x){ev(e,x)});bs()}}
if(E){R.ds="cf";ft("cf")}else{Shelly.addStatusHandler(safe);sw(false,"b",true);safe();${executionBoot}BLE.Scanner.subscribe(function(e,x){ev(e,x)});Timer.set(1000,false,bs);Timer.set(30000,true,function(){safe();stale();bw()});Timer.set(1500,false,hi)}`;
  const compactBody = aliasGeneratedClimateRuntimeTokens(
    compactGeneratedShellyScript(body).replace(/;}/g, '}')
  );

  const script = `// LCL
// g: ${generatorVersion}
// m: ${mode}
// h: ${hash}
${compactBody}
`;
  const scriptBytes = new TextEncoder().encode(script).length;
  if (scriptBytes > SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES) {
    throw new Error(
      `Generated Shelly thermostat script is ${scriptBytes} bytes; maximum is ${SHELLY_THERMOSTAT_SCRIPT_MAX_BYTES}.`
    );
  }
  return script;
};

export { generateShellyBleDiscoveryScript } from './discovery.js';
