export const compactGeneratedShellyScript = (script: string): string =>
  script.replace(/\n\s*/g, '');

const runtimeTokenAliases: Readonly<Record<string, string>> = {
  null: 'Q',
  false: 'F',
  true: 'G',
  Math: 'M',
  JSON: 'J',
  Shelly: 'L'
};

const isIdentifierStart = (character: string): boolean => /[A-Za-z_$]/.test(character);
const isIdentifierPart = (character: string): boolean => /[A-Za-z0-9_$]/.test(character);

export const aliasGeneratedClimateRuntimeTokens = (script: string): string => {
  let compacted = '';
  let index = 0;

  while (index < script.length) {
    const character = script[index]!;
    if (character === '"' || character === "'") {
      const quote = character;
      compacted += character;
      index += 1;
      while (index < script.length) {
        const stringCharacter = script[index]!;
        compacted += stringCharacter;
        index += 1;
        if (stringCharacter === '\\' && index < script.length) {
          compacted += script[index]!;
          index += 1;
          continue;
        }
        if (stringCharacter === quote) break;
      }
      continue;
    }

    if (isIdentifierStart(character)) {
      let end = index + 1;
      while (end < script.length && isIdentifierPart(script[end]!)) end += 1;
      const token = script.slice(index, end);
      compacted += runtimeTokenAliases[token] ?? token;
      index = end;
      continue;
    }

    compacted += character;
    index += 1;
  }

  return `var Q=null,F=false,G=true,M=Math,J=JSON,L=Shelly;${compacted}`;
};
