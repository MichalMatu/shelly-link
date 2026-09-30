import { aliasGeneratedClimateRuntimeTokens } from '../shelly/scriptText.js';

describe('aliasGeneratedClimateRuntimeTokens', () => {
  it('aliases only exact runtime tokens outside quoted strings', () => {
    const source =
      'var a=null,b=false,c=true;Math.max(1,2);JSON.stringify(a);Shelly.call("X",{note:"null false true Math JSON Shelly",single:\'Shelly true\'});var nullable=nullValue;';

    expect(aliasGeneratedClimateRuntimeTokens(source)).toBe(
      'var Q=null,F=false,G=true,M=Math,J=JSON,L=Shelly;var a=Q,b=F,c=G;M.max(1,2);J.stringify(a);L.call("X",{note:"null false true Math JSON Shelly",single:\'Shelly true\'});var nullable=nullValue;'
    );
  });

  it('preserves escaped quote content while continuing to alias later tokens', () => {
    expect(
      aliasGeneratedClimateRuntimeTokens(
        'var a="Shelly \\" null";Shelly.call("X",{on:false});'
      )
    ).toBe(
      'var Q=null,F=false,G=true,M=Math,J=JSON,L=Shelly;var a="Shelly \\" null";L.call("X",{on:F});'
    );
  });
});
