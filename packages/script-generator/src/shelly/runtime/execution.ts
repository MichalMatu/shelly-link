export const renderClimateExecution = (
  pulseEnabled: boolean,
  activeWindowEnabled: boolean
): string => {
  const pulse = pulseEnabled
    ? `function cx(q){R.pg++;R.ps=null;R.pp=0;R.pc=0;R.pn=null;R.pr=q}
function pj(d){var g=++R.pg;R.pn=nw()+d;Timer.set(Math.max(1,d),false,function(){if(g===R.pg)pe()})}
function pe(){var e=C.e,n=nw(),l=n-R.ps,a=l-e[2],c=e[0]+e[1],o=e[3],m=e[4],v=e[5],z,r,k,b,d;if(l<e[2]){R.pp=1;R.pc=0;d=e[2]-l;sw(false,"pd",false);return pj(d)}if(m===1){z=o?v*c:(v-1)*c+e[0];if(a>=z){R.pp=4;R.pc=v;R.pn=null;R.pr="pc";sw(false,"pc",false);return}}if(m===2&&a>=v){R.pp=4;R.pc=o?Math.floor(v/c):Math.floor((v+e[1])/c);R.pn=null;R.pr="pc";sw(false,"pc",false);return}r=a%c;k=Math.floor(a/c);if(o){if(r<e[1]){b=false;z=r;d=e[1]}else{b=true;z=r-e[1];d=e[0]}R.pc=k}else{if(r<e[0]){b=true;z=r;d=e[0]}else{b=false;z=r-e[0];d=e[1]}R.pc=b?k:k+1}d-=z;if(m===2)d=Math.min(d,v-a);R.pp=b?2:3;R.pr=b?"po":"pf";sw(b,R.pr,false);pj(d)}
function px(){if(R.ps!==null||R.pp===4)return;R.ps=nw();R.pr=null;pe()}`
    : '';

  const window = activeWindowEnabled
    ? `function wu(){var y=Shelly.getComponentStatus("sys"),t=y&&y.time,u=y&&y.unixtime,m,a=C.w[0],b=C.w[1],o,d,g=++R.wg,old=R.wo;if(!t||!u||u<1600000000){R.wo=-1;R.af="tm";${pulseEnabled ? 'cx("tm");' : ''}if(!R.m&&!R.lk)sw(false,"tm",true);Timer.set(30000,false,function(){if(g===R.wg)wu()});return}m=(t.slice(0,2)-0)*60+(t.slice(3,5)-0);if(m<0||m>1439||m!==m){R.wo=-1;R.af="tm";${pulseEnabled ? 'cx("tm");' : ''}if(!R.m&&!R.lk)sw(false,"tm",true);Timer.set(30000,false,function(){if(g===R.wg)wu()});return}o=a<b?m>=a&&m<b:m>=a||m<b;R.wo=o?1:0;if(R.af==="tm")R.af=null;d=((o?b:a)-m+1440)%1440;if(!d)d=1440;d=(d*60-(u%60))*1000;Timer.set(Math.max(1,d),false,function(){if(g===R.wg)wu()});if(!o){${pulseEnabled ? 'cx("pw");' : ''}if(!R.m&&!R.lk)sw(false,"pw",true);return}if(old!==1&&R.pa&&R.ls&&nw()-R.ls<=C.s&&!R.m&&!R.lk&&!R.af)${pulseEnabled ? 'px()' : 'sw(true,"wi",false)'}}`
    : '';

  const inactiveRequest = pulseEnabled
    ? 'var p=R.ps!==null&&R.pp>0&&R.pp<4;cx("pp");if(!R.m&&!R.lk&&!R.af)sw(false,p?"pp":q,false);return'
    : 'if(!R.m&&!R.lk&&!R.af)sw(false,q,false);return';
  const windowGate = activeWindowEnabled
    ? `if(R.wo<0){R.af="tm";${pulseEnabled ? 'cx("tm");' : ''}return}if(R.wo!==1){${pulseEnabled ? 'cx("pw");' : ''}return}`
    : '';
  const activeRequest = pulseEnabled ? 'px()' : 'sw(true,q,false)';

  return `${pulse}${pulse && window ? '\n' : ''}${window}${pulse || window ? '\n' : ''}function rq(o,q){R.pa=o;if(!o){${inactiveRequest}}if(R.m||R.lk)return;${windowGate}if(R.af)return;${activeRequest}}`;
};

export const renderClimateExecutionBoot = (activeWindowEnabled: boolean): string =>
  activeWindowEnabled ? 'wu();' : '';
