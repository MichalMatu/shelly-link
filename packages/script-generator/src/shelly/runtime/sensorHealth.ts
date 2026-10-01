export const renderSensorHealth = (
  executionEnabled = false,
  pulseEnabled = false
): string => {
  if (!executionEnabled) {
    return `function sf(q){R.af=q;R.ds=q;R.nh=R.fh=0;if(R.lk){hw();return}if(!R.m)sw(false,q,1);else hw()}
function stale(){var n=nw();if(!R.ls||n-R.ls>C.s)sf("st")}`;
  }

  return `function sf(q){R.af=q;R.ds=q;R.nh=R.fh=0;R.pa=false;${pulseEnabled ? 'cx(q);' : ''}if(R.lk){hw();return}if(!R.m)sw(false,q,1);else hw()}
function stale(){var n=nw();if(!R.ls||n-R.ls>C.s)sf("st")}`;
};
