/* ================= ASM SET: ARM Thumb 16-bit subset ================= */

const THUMB_MNEMONICS = ['movs', 'adds', 'subs', 'b', 'beq', 'bne', 'ldr', 'str'];

function thumbParseReg(tok) {
  const t = String(tok).trim().toLowerCase();
  const m = /^r(\d+)$/.exec(t);
  if (!m) throw new Error(`arm-thumb: unknown register '${tok}' (expected r0–r7)`);
  const n = parseInt(m[1], 10);
  if (n < 0 || n > 7) throw new Error(`Register '${tok}' out of range (r0–r7 in this subset)`);
  return n;
}

function thumbParseImm(tok, maxBits, signed) {
  let n;
  if (String(tok).startsWith('\\')) n = parseInt(String(tok).slice(1), 10);
  else if (/^-?\d+$/.test(String(tok))) n = parseInt(String(tok), 10);
  else throw new Error(`Expected immediate, got '${tok}'`);
  if (signed) {
    const min = -(1 << (maxBits - 1));
    const max = (1 << (maxBits - 1)) - 1;
    if (n < min || n > max) throw new Error(`Immediate ${n} out of range`);
    if (n < 0) n = (1 << maxBits) + n;
  } else if (n < 0 || n >= (1 << maxBits)) {
    throw new Error(`Immediate ${n} out of range for ${maxBits}-bit`);
  }
  return n;
}

function thumbBits(n, w) {
  return (n & ((1 << w) - 1)).toString(2).padStart(w, '0');
}

function thumbResolveBranch(labels, instrAddr, tok) {
  if (typeof parseArgToken === 'function') {
    const p = parseArgToken(tok);
    if (p.type === 'label' || p.type === 'extLabel') {
      const target = labels[p.name];
      if (target === undefined) throw new Error(`Undefined label '${p.name}'`);
      return target - instrAddr;
    }
    if (p.type === 'dec') return p.value;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*>$/.test(tok)) {
    const name = tok.slice(0, -1);
    const target = labels[name];
    if (target === undefined) throw new Error(`Undefined external label '${name}'`);
    return target - instrAddr;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
    const target = labels[tok];
    if (target === undefined) throw new Error(`Undefined label '${tok}'`);
    return target - instrAddr;
  }
  return thumbParseImm(tok, 8, true);
}

function thumbEncodeBuiltin(mnemonic, args, labels, instrAddr) {
  const mn = mnemonic.toLowerCase();
  const a = args.map(x => String(x).trim());

  if (mn === 'movs') {
    const rd = thumbParseReg(a[0]);
    const imm = thumbParseImm(a[1].replace(/^#/, ''), 8, false);
    // Thumb-1 MOV immediate: bits[15:11]=00100, Rd[10:8], imm8[7:0]
    const word = 0x2000 | ((rd & 7) << 8) | (imm & 0xff);
    return thumbBits(word, 16);
  }
  if (mn === 'adds') {
    const rd = thumbParseReg(a[0]);
    const rn = thumbParseReg(a[1]);
    const rm = thumbParseReg(a[2]);
    const word = 0x1800 | (rm << 6) | (rn << 3) | rd;
    return thumbBits(word, 16);
  }
  if (mn === 'subs') {
    const rd = thumbParseReg(a[0]);
    const rn = thumbParseReg(a[1]);
    const rm = thumbParseReg(a[2]);
    const word = 0x1a00 | (rm << 6) | (rn << 3) | rd;
    return thumbBits(word, 16);
  }
  if (mn === 'b') {
    let off = thumbResolveBranch(labels, instrAddr, a[0]);
    if (off % 2 !== 0) throw new Error('Branch offset must be halfword aligned');
    off = off >> 1;
    if (off < -256 || off > 255) throw new Error('Branch offset out of range (-256..255 halfwords)');
    const word = 0xe000 | (off & 0x7ff);
    return thumbBits(word, 16);
  }
  if (mn === 'beq' || mn === 'bne') {
    let off = thumbResolveBranch(labels, instrAddr, a[0]);
    if (off % 2 !== 0) throw new Error('Branch offset must be halfword aligned');
    off = off >> 1;
    if (off < -128 || off > 127) throw new Error('Conditional branch offset out of range');
    const cond = mn === 'beq' ? 0x0 : 0x1;
    const word = 0xd000 | (off << 3) | cond;
    return thumbBits(word, 16);
  }
  if (mn === 'ldr') {
    const rd = thumbParseReg(a[0]);
    const m = /^(\d+|\\-?\d+)\s*\(\s*(r\d)\s*\)$/.exec(a.slice(1).join(' '))
      || /^(\d+|\\-?\d+)\((r\d)\)$/.exec(a.slice(1).join(' ').replace(/\s+/g, ''));
    if (!m && a.length >= 3) {
      const imm = thumbParseImm(a[1], 5, false);
      const rn = thumbParseReg(a[2]);
      const word = 0x6800 | (imm << 6) | (rn << 3) | rd;
      return thumbBits(word, 16);
    }
    if (m) {
      const imm = thumbParseImm(m[1], 5, false);
      const rn = thumbParseReg(m[2]);
      const word = 0x6800 | (imm << 6) | (rn << 3) | rd;
      return thumbBits(word, 16);
    }
    throw new Error(`ldr syntax: ldr rd, imm(rn)`);
  }
  if (mn === 'str') {
    const rd = thumbParseReg(a[0]);
    const imm = thumbParseImm(a[1], 5, false);
    const rn = thumbParseReg(a[2]);
    const word = 0x6000 | (imm << 6) | (rn << 3) | rd;
    return thumbBits(word, 16);
  }
  throw new Error(`Unknown arm-thumb instruction '${mnemonic}'`);
}

function thumbDisassemble(bits) {
  const b = String(bits).padStart(16, '0').slice(-16);
  const word = parseInt(b, 2);
  const hi = (word >> 12) & 0xf;
  const rd = word & 7;
  const rn = (word >> 3) & 7;
  const rm = (word >> 6) & 7;

  if ((word & 0xf800) === 0x2000) {
    const movRd = (word >> 8) & 7;
    const imm = word & 0xff;
    return `movs r${movRd}, #${imm}`;
  }
  if ((word & 0xfe00) === 0x1a00) {
    return `subs r${rd}, r${rn}, r${rm}`;
  }
  if ((word & 0xfe00) === 0x1800) {
    return `adds r${rd}, r${rn}, r${rm}`;
  }
  if ((word & 0xf800) === 0xe000) {
    const off = ((word & 0x7ff) << 21) >> 21;
    return `b ${off * 2}`;
  }
  if ((word & 0xf800) === 0xd000) {
    const off = ((word >> 3) & 0xff) << 24 >> 24;
    const cond = word & 0xf;
    return cond === 0 ? `beq ${off * 2}` : `bne ${off * 2}`;
  }
  if ((word & 0xf800) === 0x6800) {
    const imm = (word >> 6) & 0x1f;
    return `ldr r${rd}, ${imm}(r${rn})`;
  }
  if ((word & 0xf800) === 0x6000) {
    const imm = (word >> 6) & 0x1f;
    return `str r${rd}, ${imm}(r${rn})`;
  }
  throw new Error('Cannot disassemble instruction — no matching arm-thumb opcode');
}

function createThumbBuiltinOpcode(mnemonic) {
  return {
    segments: null,
    wordWidth: 16,
    sourceLine: `${mnemonic} (arm-thumb preset)`,
    microRaw: null,
    microProgram: null,
    pcEffect: ['b', 'beq', 'bne'].includes(mnemonic) ? 'seq' : 'autoInc',
    execution: 'preset',
    presetBuiltin: true,
  };
}

function createArmThumbAsmSet() {
  const defaultOpcodes = {};
  const opcodeOrder = [];
  for (const mn of THUMB_MNEMONICS) {
    defaultOpcodes[mn.toUpperCase()] = createThumbBuiltinOpcode(mn);
    opcodeOrder.push(mn.toUpperCase());
  }

  return {
    id: 'arm-thumb',
    label: 'ARM Thumb 16-bit (subset)',
    wordWidth: 16,
    encoding: 'fixed',
    endianness: 'little',
    operandGrammar: 'thumb',
    defaultOpcodes,
    opcodeOrder,
    consts: {},
    macros: {},

    validateUserOpcode(mnemonic, def) {
      if (def.presetBuiltin) return null;
      if (def.segments) {
        for (const seg of def.segments) {
          if (seg.kind !== 'literal') {
            return `segment token '${seg.kind}' invalid for set 'arm-thumb' (use literal bit patterns only for user overrides)`;
          }
        }
      }
      return null;
    },

    encodeInstruction(isa, entry, labels, encodeCtx) {
      const def = isa.opcodes[entry.mnemonic];
      if (!def) throw new Error(`Unknown instruction '${entry.mnemonic}'`);
      if (def.segments && def.segments.length) {
        if (typeof encodeInstructionGeneric === 'function') {
          return encodeInstructionGeneric(isa, entry, labels, encodeCtx);
        }
        throw new Error('Generic encode not available for user override');
      }
      try {
        return thumbEncodeBuiltin(entry.mnemonic, entry.args, labels, entry.addr);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        throw new Error(typeof formatAsmError === 'function'
          ? formatAsmError(entry.text, 0, msg)
          : msg);
      }
    },

    disassembleInstruction(isa, bitsStr) {
      return thumbDisassemble(bitsStr);
    },

    decodeMnemonicFromBits(isa, bitsStr) {
      try {
        const line = thumbDisassemble(bitsStr);
        const mnemonic = line.split(/\s+/)[0].toUpperCase();
        return { mnemonic, fields: {} };
      } catch (_) {
        return null;
      }
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createArmThumbAsmSet,
    thumbEncodeBuiltin,
    thumbDisassemble,
    THUMB_MNEMONICS,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createArmThumbAsmSet = createArmThumbAsmSet;
}
