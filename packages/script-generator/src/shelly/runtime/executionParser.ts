export const renderExecutionRuntimeParser = (
  bthomeEnabled: boolean,
  tp357Enabled: boolean
): string => {
  const common = `function lb(d){return d&&d.length!==undefined?d.length:0;}
function rb(d,o){if(o<0||o>=lb(d))return null;var v=typeof d==="string"?d.charCodeAt(o):d[o];if(typeof v==="string")v=v.charCodeAt(0);return v==null?null:v&255;}`;
  const bthome = bthomeEnabled
    ? `
function sl(d,a,b){return typeof d==="string"?d.slice(a,b):d.slice?d.slice(a,b):null;}
function ad(d){var l=lb(d),o=0;while(o<l){var n=rb(d,o);if(!n)return null;var s=o+1,e=s+n;if(e>l)return null;if(rb(d,s)===22&&rb(d,s+1)===210&&rb(d,s+2)===252)return sl(d,s+3,e);o=e;}return null;}
function sd(x){return x.advData?ad(x.advData):null;}
function r2(d,o,s){var a=rb(d,o),b=rb(d,o+1);if(a===null||b===null)return null;var v=a|(b<<8);return s&&v&32768?v-65536:v;}
function pb(x,j){var d=sd(x);if(!d){R.ds="bm";return;}var t=null,h=null,b=null,o=1,l=lb(d),k,v;while(o<l){k=rb(d,o++);if(k==0)o++;else if(k==1)b=rb(d,o++);else if(k==12)o+=2;else if(k==2){v=r2(d,o,1);if(v==null){R.ds="bs";return;}t=v/100;o+=2;}else if(k==3){v=r2(d,o,0);if(v==null){R.ds="bs";return;}h=v/100;o+=2;}else if(k==46){h=rb(d,o++);if(h==null){R.ds="bs";return;}}else if(k==69){v=r2(d,o,1);if(v==null){R.ds="bs";return;}t=v/10;o+=2;}else{R.ds="bo";break;}}meas(t,h,b,x.rssi,j);}`
    : '';
  const tp357 = tp357Enabled
    ? `
function mf(d){var l=lb(d),o=0;while(o<l){var n=rb(d,o);if(n===null||n===0)return null;var s=o+1,e=s+n;if(e>l)return null;if(rb(d,s)===255&&n>=7)return s+1;o=e;}return null;}
function pt(x,j){var d=x.advData;if(!d){R.ds="ta";return;}var p=mf(d);if(p===null){R.ds="tm";return;}var lo=rb(d,p+1),hi=rb(d,p+2),h=rb(d,p+3),b=rb(d,p+4);if(lo===null||hi===null||h===null||b===null){R.ds="ts";return;}var raw=lo|(hi<<8);if(raw&32768)raw-=65536;var t=raw/10;if(h>100||t<-50||t>100){R.ds="tr";return;}b&=3;b=b===0?1:b===1?50:b===2?100:null;meas(t,h,b,x.rssi,j);}`
    : '';
  const dispatch =
    bthomeEnabled && tp357Enabled
      ? '\nfunction parse(x,p,j){return p==1?pt(x,j):pb(x,j)}'
      : '';

  return `${common}${bthome}${tp357}${dispatch}`;
};

export const renderExecutionRuntimeParseCall = (
  bthomeEnabled: boolean,
  tp357Enabled: boolean
): string => {
  if (bthomeEnabled && tp357Enabled) {
    return 'var p=C.ss?C.ss[j][2]:C.p;parse(x,p,j);';
  }
  return tp357Enabled ? 'pt(x,j);' : 'pb(x,j);';
};
