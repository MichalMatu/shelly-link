export const renderRelayArbiter = (
  minimumOnEnabled = false,
  debounceEnabled = false,
  executionEnabled = false
): string => {
  const timingGate = minimumOnEnabled
    ? 'var n=nw(),c=R.on!=o,t=R.on?(C.u||0):C.c;if(!f&&c&&n-R.lc<t)return R.rs="mc";'
    : 'var n=nw(),c=R.on!=o;if(o&&!f&&c&&n-R.lc<C.c)return R.rs="mc";';

  if (!executionEnabled) {
    if (!debounceEnabled) {
      return `function nw(){return Shelly.getUptimeMs()}
function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function ft(q){if(R.lk)return hw();R.lk=true;R.rs=q;R.on=false;R.os=null;R.lc=nw();s(false);hw()}
function sw(o,q,f){if(!f){R.a=o;if(R.lk)return;if(R.m){if(R.on!=R.mn)return sw(R.mn,"mn",1);return}if(R.af)return}${timingGate}s(o,function(r,e){if(e)return ft("se");var w=R.lk?false:R.m?R.mn:R.af?false:R.a;if(w!=o)return sw(w,R.lk?R.rs:R.m?"mn":R.af||"sy",1);R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null;hw()})}`;
    }

    const debounceTimingGate = minimumOnEnabled
      ? 'var t=R.on?(C.u||0):C.c;if(c&&n-R.lc<t)return R.rs="mc";'
      : 'if(o&&c&&n-R.lc<C.c)return R.rs="mc";';

    return `function nw(){return Shelly.getUptimeMs()}
function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function ft(q){if(R.lk)return hw();R.lk=true;R.rs=q;R.on=false;R.os=null;R.lc=nw();R.db=null;R.di=0;s(false);hw()}
function sw(o,q,f){var n=nw(),c=R.on!=o;if(f){R.db=null;R.di=0}else{R.a=o;if(R.lk)return;if(R.m){if(R.on!=R.mn)return sw(R.mn,"mn",1);return}if(R.af)return;var d=o?(C.y||0):(C.z||0);if(!c){R.db=null;R.di=0}else if(d){if(R.db!==o){R.db=o;R.di=n;R.rs="db";Timer.set(d,false,function(){if(R.db===o&&R.di===n)sw(o,q,false)});return}if(n-R.di<d)return R.rs="db"}else{R.db=null;R.di=0}${debounceTimingGate}}s(o,function(r,e){if(e)return ft("se");var w=R.lk?false:R.m?R.mn:R.af?false:R.a;if(w!=o)return sw(w,R.lk?R.rs:R.m?"mn":R.af||"sy",1);R.on=o;R.rs=q;if(c){R.lc=n;R.db=null;R.di=0}R.os=o?n:null;hw()})}`;
  }

  const retryTimingGate = minimumOnEnabled
    ? 'var t=R.on?(C.u||0):C.c;if(!f&&c&&n-R.lc<t){R.rs="mc";var g=R.rg;Timer.set(t-(n-R.lc),false,function(){if(g===R.rg&&R.a===o)sw(o,q,false)});return}'
    : 'if(o&&!f&&c&&n-R.lc<C.c){R.rs="mc";var g=R.rg;Timer.set(C.c-(n-R.lc),false,function(){if(g===R.rg&&R.a===o)sw(o,q,false)});return}';

  if (!debounceEnabled) {
    return `function nw(){return Shelly.getUptimeMs()}
function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function ft(q){if(R.lk)return hw();cx(q);R.rg++;R.lk=true;R.rs=q;R.on=false;R.os=null;R.lc=nw();s(false);hw()}
function sw(o,q,f){R.rg++;if(!f){R.a=o;if(R.lk)return;if(R.m){if(R.on!=R.mn)return sw(R.mn,"mn",1);return}if(R.af)return}var n=nw(),c=R.on!=o;${retryTimingGate}s(o,function(r,e){if(e)return ft("se");var w=R.lk?false:R.m?R.mn:R.af?false:R.a;if(w!=o)return sw(w,R.lk?R.rs:R.m?"mn":R.af||"sy",1);R.on=o;R.rs=q;if(c)R.lc=n;R.os=o?n:null;hw()})}`;
  }

  const retryDebounceTimingGate = minimumOnEnabled
    ? 'var t=R.on?(C.u||0):C.c;if(c&&n-R.lc<t){R.rs="mc";var g=R.rg;Timer.set(t-(n-R.lc),false,function(){if(g===R.rg&&R.a===o)sw(o,q,false)});return}'
    : 'if(o&&c&&n-R.lc<C.c){R.rs="mc";var g=R.rg;Timer.set(C.c-(n-R.lc),false,function(){if(g===R.rg&&R.a===o)sw(o,q,false)});return}';

  return `function nw(){return Shelly.getUptimeMs()}
function s(o,c){Shelly.call("Switch.Set",{id:C.i,on:o},c)}
function ft(q){if(R.lk)return hw();cx(q);R.rg++;R.lk=true;R.rs=q;R.on=false;R.os=null;R.lc=nw();R.db=null;R.di=0;s(false);hw()}
function sw(o,q,f){R.rg++;var n=nw(),c=R.on!=o;if(f){R.db=null;R.di=0}else{R.a=o;if(R.lk)return;if(R.m){if(R.on!=R.mn)return sw(R.mn,"mn",1);return}if(R.af)return;var d=o?(C.y||0):(C.z||0);if(!c){R.db=null;R.di=0}else if(d){if(R.db!==o){R.db=o;R.di=n;R.rs="db";Timer.set(d,false,function(){if(R.db===o&&R.di===n)sw(o,q,false)});return}if(n-R.di<d)return R.rs="db"}else{R.db=null;R.di=0}${retryDebounceTimingGate}}s(o,function(r,e){if(e)return ft("se");var w=R.lk?false:R.m?R.mn:R.af?false:R.a;if(w!=o)return sw(w,R.lk?R.rs:R.m?"mn":R.af||"sy",1);R.on=o;R.rs=q;if(c){R.lc=n;R.db=null;R.di=0}R.os=o?n:null;hw()})}`;
};
