/* ================= ASM SET: variable8 (SPIKE 1+x.4a — variable-length encoding) ================= */

const VARIABLE8_W8_BITS = '11000000';
const VARIABLE8_W16_PREFIX = '11100000';

function variable8ParseImm(token, max, name) {
  const t = String(token).trim();
  let n;
  if (/^\\/.test(t)) n = parseInt(t.slice(1), 10);
  else if (/^0[xX]/.test(t)) n = parseInt(t, 16);
  else if (/^\d+$/.test(t)) n = parseInt(t, 10);
  else throw new Error(`variable8: expected integer for ${name}, got '${token}'`);
  if (!Number.isFinite(n) || n < 0 || n > max) {
    throw new Error(`variable8: ${name} must be 0..${max}, got '${token}'`);
  }
  return n;
}

function variable8EncodeBuiltin(mnemonic, args) {
  const mn = String(mnemonic).toUpperCase();
  if (mn === 'W8') {
    if (args.length) throw new Error('w8 takes no operands');
    return VARIABLE8_W8_BITS;
  }
  if (mn === 'W16') {
    if (args.length !== 1) throw new Error('w16 expects one immediate operand');
    const imm = variable8ParseImm(args[0], 255, 'w16 immediate');
    return VARIABLE8_W16_PREFIX + imm.toString(2).padStart(8, '0');
  }
  throw new Error(`variable8: unknown instruction '${mnemonic}'`);
}

function variable8DisassembleAtOffset(bitsStr, byteOffset) {
  const bits = String(bitsStr);
  const totalBytes = bits.length / 8;
  if (byteOffset < 0 || byteOffset >= totalBytes) {
    throw new Error(`variable8: decode offset byte ${byteOffset} out of range`);
  }
  const bitOff = byteOffset * 8;
  const b0 = bits.substr(bitOff, 8);
  if (b0.length < 8) {
    throw new Error(`variable8: truncated instruction at byte ${byteOffset}`);
  }
  if (b0 === VARIABLE8_W8_BITS) {
    return { mnemonic: 'W8', text: 'w8', byteLength: 1, bitLength: 8, fields: {} };
  }
  if (b0 === VARIABLE8_W16_PREFIX) {
    const b1 = bits.substr(bitOff + 8, 8);
    if (b1.length < 8) {
      throw new Error(`variable8: truncated w16 at byte ${byteOffset}`);
    }
    const imm = parseInt(b1, 2);
    return {
      mnemonic: 'W16',
      text: `w16 ${imm}`,
      byteLength: 2,
      bitLength: 16,
      fields: { imm },
    };
  }
  throw new Error(`variable8: no matching opcode at byte ${byteOffset} (byte 0x${parseInt(b0, 2).toString(16)})`);
}

function createVariable8AsmSet() {
  const mnemonics = ['W8', 'W16'];
  const defaultOpcodes = {};
  const opcodeOrder = [];
  for (const mn of mnemonics) {
    defaultOpcodes[mn] = {
      segments: null,
      wordWidth: mn === 'W8' ? 8 : 16,
      sourceLine: `${mn} (variable8 preset)`,
      microRaw: null,
      microProgram: null,
      pcEffect: 'autoInc',
      execution: 'preset',
      presetBuiltin: true,
    };
    opcodeOrder.push(mn);
  }

  return {
    id: 'variable8',
    label: 'Variable encoding SPIKE (8-bit unit, 8/16-bit instr)',
    wordWidth: 8,
    encoding: 'variable',
    endianness: 'na',
    operandGrammar: 'variable8',
    defaultOpcodes,
    opcodeOrder,
    consts: {},
    macros: {},

    encodeInstruction(isa, entry, labels, encodeCtx) {
      try {
        return variable8EncodeBuiltin(entry.mnemonic, entry.args || []);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        throw new Error(typeof formatAsmError === 'function'
          ? formatAsmError(entry.text, 0, msg)
          : msg);
      }
    },

    disassembleInstruction(isa, bitsStr) {
      const bits = String(bitsStr);
      if (bits.length === 8) {
        return variable8DisassembleAtOffset(bits, 0).text;
      }
      if (bits.length === 16) {
        return variable8DisassembleAtOffset(bits, 0).text;
      }
      throw new Error(`variable8: disassembleInstruction expects 8 or 16 bits, got ${bits.length}`);
    },

    disassembleAtOffset(isa, bitsStr, byteOffset) {
      return variable8DisassembleAtOffset(bitsStr, byteOffset);
    },

    decodeMnemonicFromBits(isa, bitsStr) {
      try {
        const dec = variable8DisassembleAtOffset(bitsStr, 0);
        return { mnemonic: dec.mnemonic, fields: dec.fields || {} };
      } catch (_) {
        return null;
      }
    },

    validateUserOpcode(mnemonic, def) {
      if (def.presetBuiltin) return null;
      return 'variable8 preset does not support user opcode overrides in SPIKE 1+x.4a';
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createVariable8AsmSet,
    variable8EncodeBuiltin,
    variable8DisassembleAtOffset,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createVariable8AsmSet = createVariable8AsmSet;
}
