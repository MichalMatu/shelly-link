export type HistoryWriterProfile = 'climate' | 'standalone-pulse';

export const renderHistoryWriter = (
  profile: HistoryWriterProfile = 'climate'
): string => `var H=[0,0,null,0,0];
function hz(v,m){return v==null?null:Math.round(v*m)}
function hc(a,b){if(!b)return 1;if(a[5]!=b[5]||a[6]!=b[6]||a[7]!=b[7]||a[8]!=b[8])return 1;var d=[3,10,50];for(var i=2;i<5;i++){if(a[i]==null||b[i]==null){if(a[i]!=b[i])return 1}else if(Math.abs(a[i]-b[i])>=d[i-2])return 1}return 0}
${profile === 'standalone-pulse' ? 'function hr(){var y=Shelly.getComponentStatus("sys"),w=Shelly.getComponentStatus("switch:"+C.i),f=(R.a?1:0)|(R.on?2:0);return[y&&y.unixtime>0?y.unixtime:null,Math.floor(nw()/1000),null,null,null,f,R.rs,R.af,null,hz(w&&w.apower,10),hz(w&&w.current,1000)]}' : 'function hr(){var y=Shelly.getComponentStatus("sys"),w=ws(),f=(R.a?1:0)|(R.on?2:0)|(R.m?4:0)|(R.mn?8:0)|(R.lk?16:0);return[y&&y.unixtime>0?y.unixtime:null,Math.floor(nw()/1000),hz(R.t,10),hz(R.h,10),hz(R.vp,1000),f,R.rs,R.af,R.lk?R.rs:null,hz(w&&w.apower,10),hz(w&&w.current,1000)]}'}
function hw(){try{if(!H[3]||H[4])return;var r=hr();if(!hc(r,H[2]))return;var n=H[0],v=JSON.stringify([2,[r]]);if(v.length>253)return;H[4]=1;Shelly.call("KVS.Set",{key:"shellylink.history."+("0"+n).slice(-2),value:v},function(x,e){if(e){H[4]=0;return}H[2]=r;H[0]=(n+1)%24;H[1]=Math.min(24,H[1]+1);Shelly.call("KVS.Set",{key:"shellylink.history.meta",value:JSON.stringify([2,24,H[0],H[1]])},function(){H[4]=0})})}catch(e){H[4]=0}}
function hi(){try{Shelly.call("KVS.Get",{key:"shellylink.history.meta"},function(r,e){if(!e&&r&&typeof r.value==="string")try{var m=JSON.parse(r.value);if(m[0]===2&&m[1]===24&&m[2]>=0&&m[2]<24&&m[3]>=0&&m[3]<=24){H[0]=m[2];H[1]=m[3]}}catch(x){}H[3]=1;hw()})}catch(e){H[3]=1}}`;
