export const renderRelayArbiter =
  (): string => `function nw(){return Shelly.getUptimeMs()}
function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function ft(q){R.lk=true;R.rs=q;R.on=false;R.os=null;R.lc=nw();s(false);hw()}
function sw(o,q,f){if(!f){R.a=o;if(R.lk)return;if(R.m){if(R.on!=R.mn)return sw(R.mn,"mn",1);return}if(R.af)return}var n=nw(),c=R.on!=o;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";s(o,function(r,e){if(e)return ft("se");var w=R.lk?false:R.m?R.mn:R.af?false:R.a;if(w!=o)return sw(w,R.lk?R.rs:R.m?"mn":R.af||"sy",1);R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null;hw()})}`;
