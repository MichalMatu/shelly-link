import type { RuleControlMetric } from '@lcl/automation-core';

export const renderExecutionThresholdHelper = (
  vpdEnabled: boolean,
  metric: RuleControlMetric
): string => {
  if (!vpdEnabled) {
    return 'function th(){return{o:C.on,f:C.off}}';
  }

  const metricHelper =
    metric === 'humidity'
      ? 'function vh(t){if(t===null)return null;var s=sv(t);return s<=0?null:100*(1-C.vp/s);}'
      : 'function vt(h){if(h===null||h>=100)return null;var f=1-h/100;if(f<=0)return null;var s=C.vp/f;if(s<=0)return null;var l=Math.log(s/0.6108);return l>=17.27?null:(237.3*l)/(17.27-l);}';
  const effectiveTarget = metric === 'humidity' ? 'vh(t)' : 'vt(h)';

  return `function cl(v,a,b){return Math.min(Math.max(v,a),b);}
function sv(t){return 0.6108*Math.exp((17.27*t)/(t+237.3));}
function vd(t,h){return t===null||h===null?null:sv(t)*(1-h/100);}
${metricHelper}
function th(t,h){var lo=Math.min(C.on,C.off),hi=Math.max(C.on,C.off),g=${effectiveTarget};if(g===null)return{o:C.on,f:C.off};g=cl(g,lo,hi);var z=C.m?2:0.25;return C.d?{o:cl(g+z,lo,hi),f:cl(g-z,lo,hi)}:{o:cl(g-z,lo,hi),f:cl(g+z,lo,hi)};}`;
};
