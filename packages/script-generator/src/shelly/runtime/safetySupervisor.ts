export const renderSafetySupervisor = (): string =>
  `function ws(){return Shelly.getComponentStatus("switch:0")}
function safe(x){var e=x?x.component==="switch:0"&&x.delta&&x.delta.errors:ws().errors;if(e&&e[0])return ft(e[0]);if(!x){var n=nw();if(R.on&&R.os&&n-R.os>=C.x)ft("mx")}}`;
