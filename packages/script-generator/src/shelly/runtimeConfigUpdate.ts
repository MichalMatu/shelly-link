import { normalizeConfig } from './config.js';
import {
  serializeShellyRuntimeConfig,
  SHELLY_RUNTIME_CONFIG_STORAGE_KEY
} from './runtimeConfig.js';

export const generateShellyRuntimeConfigUpdateEval = (input: unknown): string => {
  const config = normalizeConfig(input);
  const configJson = serializeShellyRuntimeConfig(config);
  const storageKey = JSON.stringify(SHELLY_RUNTIME_CONFIG_STORAGE_KEY);
  const storageValue = JSON.stringify(configJson);
  const capabilityCheck = `${
    (config.rule.minimumOnMs ?? 0) > 0 ? 'if(typeof U==="undefined")return"iv";' : ''
  }${config.rule.relayDebounce ? 'if(typeof D==="undefined")return"iv";' : ''}${
    config.execution?.pulse ? 'if(typeof px!=="function")return"iv";' : ''
  }${config.execution?.activeWindow ? 'if(typeof wu!=="function")return"iv";' : ''}`;
  const resetExecution =
    config.execution !== undefined
      ? 'if(typeof cx==="function")cx("cu");if(R.pa!==void 0)R.pa=false;if(R.wg!==void 0){R.wg++;R.wo=-1}'
      : '';
  const restartWindow = config.execution?.activeWindow
    ? 'if(typeof wu==="function")wu();'
    : '';

  return `(function(){var N=${configJson},M=R.m,Q=R.mn,L=R.lk,Z=R.lk?R.rs:null,T=R.mt;${capabilityCheck}if(typeof vc!=="function"||!vc(N))return"iv";if(typeof Script==="undefined"||!Script.storage||!Script.storage.setItem)return"ns";Script.storage.setItem(${storageKey},${storageValue});${resetExecution}C=N;R.ls=null;R.l=0;R.t=null;R.h=null;R.tt=null;R.ht=null;R.b=null;R.r=null;R.rs=L?(Z||"lk"):M?"mn":"cu";R.ds="boot";R.lc=nw();R.nh=0;R.fh=0;R.cv=null;R.vp=null;R.eo=null;R.ef=null;R.m=M;R.mn=Q;R.lk=L;R.mt=T;R.a=false;R.af="st";R.sa=0;R.u=[];R.fc=0;if(typeof D!=="undefined"){R.db=null;R.di=0}var O=R.lk?false:R.m?R.mn:false;R.on=O;R.os=O?R.lc:null;s(O);${restartWindow}if(typeof hw==="function")hw();return C.k;})()`;
};
