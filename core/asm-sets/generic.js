/* ================= ASM SET: generic (segment-based, current default) ================= */

function createGenericAsmSet() {
  return {
    id: 'generic',
    label: 'Generic segment ISA',
    wordWidth: null,
    encoding: 'fixed',
    endianness: 'na',
    operandGrammar: 'generic',
    defaultOpcodes: {},
    opcodeOrder: [],
    consts: {},
    macros: {},

    parseFieldToken(token) {
      if (typeof parseFieldToken === 'function') {
        return parseFieldToken(token);
      }
      throw new Error(`Invalid ASM field token '${token}'`);
    },

    validateUserOpcode(mnemonic, def) {
      return null;
    },

    parseProgramArg(token, ctx) {
      if (typeof parseArgToken === 'function') {
        return parseArgToken(token);
      }
      throw new Error(`Unrecognized argument '${token}'`);
    },

    formatDisasmArg(seg, fieldBits) {
      return null;
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGenericAsmSet };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createGenericAsmSet = createGenericAsmSet;
}
