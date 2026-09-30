export const CLIMATE_RUNTIME_CONTROL_MODE_CODES = {
  auto: 0,
  manual: 1
} as const;

export type ClimateRuntimeControlMode = keyof typeof CLIMATE_RUNTIME_CONTROL_MODE_CODES;

export type ClimateRuntimeControlState = {
  mode: ClimateRuntimeControlMode;
  manualRequestOn: boolean;
  automationFault: string | null;
  safetyLockout: boolean;
  safetyReason: string | null;
};

export const climateRuntimeControlModeFromCode = (
  code: number | null | undefined
): ClimateRuntimeControlMode | null => {
  if (code === CLIMATE_RUNTIME_CONTROL_MODE_CODES.auto) return 'auto';
  if (code === CLIMATE_RUNTIME_CONTROL_MODE_CODES.manual) return 'manual';
  return null;
};

export const decodeClimateRuntimeControlState = (
  result: string
): ClimateRuntimeControlState | null => {
  try {
    const value = JSON.parse(result) as unknown;
    if (!Array.isArray(value) || value.length !== 5) return null;

    const mode = climateRuntimeControlModeFromCode(
      typeof value[0] === 'number' ? value[0] : null
    );
    if (!mode) return null;
    if (value[1] !== 0 && value[1] !== 1) return null;
    if (value[2] !== null && typeof value[2] !== 'string') return null;
    if (value[3] !== 0 && value[3] !== 1) return null;
    if (value[4] !== null && typeof value[4] !== 'string') return null;

    return {
      mode,
      manualRequestOn: value[1] === 1,
      automationFault: value[2],
      safetyLockout: value[3] === 1,
      safetyReason: value[4]
    };
  } catch {
    return null;
  }
};

const encodedRuntimeState = 'JSON.stringify([R.m,R.mn?1:0,R.af,R.lk?1:0,R.lk?R.rs:null])';

export const climateRuntimeControlStateEvalCode = `typeof R==="object"&&typeof sw==="function"?${encodedRuntimeState}:""`;

export const climateRuntimeSetControlModeEvalCode = (
  mode: ClimateRuntimeControlMode
): string => {
  if (mode === 'manual') {
    return '(function(){if(R.lk)return-2;if(R.m!=1)R.mt=nw();R.m=1;R.nh=R.fh=0;R.mn=false;R.rs="mn";sw(false,"mn",1);return 1})()';
  }
  return '(function(){if(R.lk)return-2;if(R.m)R.mt=nw();R.m=0;R.nh=R.fh=0;R.mn=false;R.a=false;R.ls=null;R.af="st";R.rs="ar";sw(false,"ar",1);return 0})()';
};

export const climateRuntimeResetSafetyLockoutEvalCode = `(function(){if(!R.lk)return ${encodedRuntimeState};R.lk=false;R.mn=false;R.a=false;R.nh=R.fh=0;R.ls=null;if(!R.m)R.af="st";R.rs=R.m?"mn":"ar";sw(false,R.rs,1);return ${encodedRuntimeState}})()`;

export const climateRuntimeSetManualRelayEvalCode = (on: boolean): string => {
  const returnValue = on ? 1 : 0;
  const booleanValue = on ? 'true' : 'false';
  return `(function(){if(R.lk)return-2;if(R.m!=1)return-1;R.mn=${booleanValue};R.rs="mn";sw(${booleanValue},"mn",1);return ${returnValue}})()`;
};

export const climateRuntimeRestoreControlStateEvalCode = (
  state: ClimateRuntimeControlState
): string => {
  const mode = CLIMATE_RUNTIME_CONTROL_MODE_CODES[state.mode];
  const manualRequest = state.manualRequestOn ? 'true' : 'false';
  const automationFault = JSON.stringify(state.automationFault);
  const lockout = state.safetyLockout ? 'true' : 'false';
  const safetyReason = JSON.stringify(state.safetyReason ?? 'lk');
  const finalRelay = state.safetyLockout
    ? 'false'
    : state.mode === 'manual' && state.manualRequestOn
      ? 'true'
      : 'false';

  return `(function(){R.m=${mode};R.mn=${manualRequest};R.af=${automationFault};R.lk=${lockout};R.rs=R.lk?${safetyReason}:R.m?"mn":R.af||"ar";R.a=false;R.ls=null;R.mt=nw();R.nh=R.fh=0;sw(${finalRelay},R.rs,1);return ${encodedRuntimeState}})()`;
};
