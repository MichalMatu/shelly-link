import {
  climateRuntimeControlModeFromCode,
  climateRuntimeRestoreControlStateEvalCode,
  climateRuntimeResetSafetyLockoutEvalCode,
  climateRuntimeSetControlModeEvalCode,
  climateRuntimeSetManualRelayEvalCode,
  decodeClimateRuntimeControlState,
  type ClimateRuntimeControlState
} from '../index.js';
import { describe, expect, it } from 'vitest';

describe('climate runtime control protocol', () => {
  it('maps only supported runtime mode codes', () => {
    expect(climateRuntimeControlModeFromCode(0)).toBe('auto');
    expect(climateRuntimeControlModeFromCode(1)).toBe('manual');
    expect(climateRuntimeControlModeFromCode(2)).toBeNull();
  });

  it('decodes complete AUTO and MANUAL runtime state payloads', () => {
    expect(decodeClimateRuntimeControlState('[0,0,null,0,null]')).toEqual({
      mode: 'auto',
      manualRequestOn: false,
      automationFault: null,
      safetyLockout: false,
      safetyReason: null
    });
    expect(decodeClimateRuntimeControlState('[1,1,"st",1,"max"]')).toEqual({
      mode: 'manual',
      manualRequestOn: true,
      automationFault: 'st',
      safetyLockout: true,
      safetyReason: 'max'
    });
  });

  it('rejects malformed runtime state payloads', () => {
    expect(decodeClimateRuntimeControlState('not-json')).toBeNull();
    expect(decodeClimateRuntimeControlState('{}')).toBeNull();
    expect(decodeClimateRuntimeControlState('[0,0,null,0]')).toBeNull();
    expect(decodeClimateRuntimeControlState('["0",0,null,0,null]')).toBeNull();
    expect(decodeClimateRuntimeControlState('[9,0,null,0,null]')).toBeNull();
    expect(decodeClimateRuntimeControlState('[0,2,null,0,null]')).toBeNull();
    expect(decodeClimateRuntimeControlState('[0,0,7,0,null]')).toBeNull();
    expect(decodeClimateRuntimeControlState('[0,0,null,2,null]')).toBeNull();
    expect(decodeClimateRuntimeControlState('[0,0,null,0,7]')).toBeNull();
  });

  it('renders explicit AUTO and MANUAL control commands', () => {
    const manual = climateRuntimeSetControlModeEvalCode('manual');
    expect(manual).toContain('R.m=1');
    expect(manual).toContain('R.mn=false');
    expect(manual).toContain('sw(false,"mn",1)');

    const auto = climateRuntimeSetControlModeEvalCode('auto');
    expect(auto).toContain('R.m=0');
    expect(auto).toContain('R.af="st"');
    expect(auto).toContain('sw(false,"ar",1)');
  });

  it('renders boolean manual relay commands for both requested states', () => {
    expect(climateRuntimeSetManualRelayEvalCode(true)).toContain(
      'R.mn=true;R.rs="mn";sw(true,"mn",1);return 1'
    );
    expect(climateRuntimeSetManualRelayEvalCode(false)).toContain(
      'R.mn=false;R.rs="mn";sw(false,"mn",1);return 0'
    );
  });

  it('restores AUTO, MANUAL ON and hard safety state without inventing a third mode', () => {
    const auto: ClimateRuntimeControlState = {
      mode: 'auto',
      manualRequestOn: false,
      automationFault: 'st',
      safetyLockout: false,
      safetyReason: null
    };
    const autoCode = climateRuntimeRestoreControlStateEvalCode(auto);
    expect(autoCode).toContain('R.m=0');
    expect(autoCode).toContain('R.af="st"');
    expect(autoCode).toContain('sw(false,R.rs,1)');

    const manualOn: ClimateRuntimeControlState = {
      mode: 'manual',
      manualRequestOn: true,
      automationFault: 'st',
      safetyLockout: false,
      safetyReason: null
    };
    const manualCode = climateRuntimeRestoreControlStateEvalCode(manualOn);
    expect(manualCode).toContain('R.m=1');
    expect(manualCode).toContain('R.mn=true');
    expect(manualCode).toContain('sw(true,R.rs,1)');

    const locked: ClimateRuntimeControlState = {
      mode: 'manual',
      manualRequestOn: true,
      automationFault: null,
      safetyLockout: true,
      safetyReason: null
    };
    const lockedCode = climateRuntimeRestoreControlStateEvalCode(locked);
    expect(lockedCode).toContain('R.lk=true');
    expect(lockedCode).toContain('R.rs=R.lk?"lk"');
    expect(lockedCode).toContain('sw(false,R.rs,1)');

    const lockedWithReason: ClimateRuntimeControlState = {
      ...locked,
      safetyReason: 'max'
    };
    expect(climateRuntimeRestoreControlStateEvalCode(lockedWithReason)).toContain(
      'R.rs=R.lk?"max"'
    );
  });

  it('renders a deliberate safety lockout reset that stays safe OFF', () => {
    expect(climateRuntimeResetSafetyLockoutEvalCode).toContain('R.lk=false');
    expect(climateRuntimeResetSafetyLockoutEvalCode).toContain('R.mn=false');
    expect(climateRuntimeResetSafetyLockoutEvalCode).toContain('R.a=false');
    expect(climateRuntimeResetSafetyLockoutEvalCode).not.toContain('R.mt=');
    expect(climateRuntimeResetSafetyLockoutEvalCode).toContain('sw(false,R.rs,1)');
    expect(climateRuntimeResetSafetyLockoutEvalCode).toContain('if(!R.m)R.af="st"');
  });
});
