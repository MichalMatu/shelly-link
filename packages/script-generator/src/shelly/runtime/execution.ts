export const renderPulseCycleExecution =
  (): string => `function cx(){if(R.pi)Timer.clear(R.pi);R.pi=R.ps=R.pc=0;R.pt=R.pn=null}
function pj(d){R.pn=nw()+d;R.pi=Timer.set(d,false,pn)}
function pc(){R.ps=4;R.pn=null;sw(false,"pc",false)}
function pf(o){var e=C.e,d=o?e[0]:e[1],v=e[4],r=v<0?-v-nw()+R.pt:d;if(r<=0)return pc();R.ps=o?2:3;sw(o,o?"po":"pf",false);pj(Math.min(d,r))}
function pn(){var e=C.e,n=nw(),v=e[4];if(R.ps==1)return pf(!e[3]);if(v<0&&n-R.pt>=-v)return pc();if(R.ps==2){R.pc++;if(v>0&&R.pc>=v)return pc();return pf(false)}pf(true)}
function px(){if(R.ps)return;var e=C.e;R.pt=nw()+e[2];if(e[2]){R.ps=1;sw(false,"pd",false);pj(e[2])}else pf(!e[3])}`;

export const renderClimateExecution = (
  pulseEnabled: boolean,
  activeWindowEnabled: boolean
): string => {
  const pulse = pulseEnabled ? renderPulseCycleExecution() : '';

  const window = activeWindowEnabled
    ? `function wu(){if(R.wi)Timer.clear(R.wi);var y=Shelly.getComponentStatus("sys"),t=y&&y.time,u=y&&y.unixtime,m=t?(t.slice(0,2)-0)*60+(t.slice(3,5)-0):-1,a=C.w[0],b=C.w[1],o,d,h=R.wo;if(!u||u<1600000000||m<0||m>1439||m!==m){R.wo=-1;R.af="tm";R.a=false;${pulseEnabled ? 'cx();' : ''}if(h!=-1&&!R.m&&!R.lk)sw(false,"tm",true);d=30000}else{o=a<b?m>=a&&m<b:m>=a||m<b;R.wo=o?1:0;if(R.af==="tm")R.af=null;d=(((o?b:a)-m+1440)%1440||1440)*60000-u%60*1000;if(!o){R.a=false;${pulseEnabled ? 'cx();' : ''}if(h!=0&&!R.m&&!R.lk)sw(false,"pw",true)}else if(h!=1&&R.pa&&R.ls&&nw()-R.ls<=C.s&&!R.m&&!R.lk&&!R.af)${pulseEnabled ? 'px()' : 'sw(true,"wi",false)'}}R.wi=Timer.set(d,false,wu)}`
    : '';

  const inactiveRequest = pulseEnabled
    ? 'var p=R.ps>0&&R.ps<4;cx();if(!R.m&&!R.lk&&!R.af)sw(false,p?"pp":q,false);return'
    : 'if(!R.m&&!R.lk&&!R.af)sw(false,q,false);return';
  const windowGate = activeWindowEnabled
    ? `if(R.wo<0){R.af="tm";R.a=false;${pulseEnabled ? 'cx();' : ''}return}if(!R.wo){R.a=false;${pulseEnabled ? 'cx();' : ''}return}`
    : '';
  const activeRequest = pulseEnabled ? 'px()' : 'sw(true,q,false)';

  return `${pulse}${pulse && window ? '\n' : ''}${window}${pulse || window ? '\n' : ''}function rq(o,q){R.pa=o;if(!o){${inactiveRequest}}${windowGate}if(R.m||R.lk||R.af)return;${activeRequest}}`;
};

export const renderClimateExecutionBoot = (activeWindowEnabled: boolean): string =>
  activeWindowEnabled ? 'wu();' : '';
