/* ================= ASM SET: RISC-V RV32I (fixed 32-bit subset) ================= */

const RISCV_REG_ALIASES = {
  zero: 0, ra: 1, sp: 2, gp: 3, tp: 4,
  t0: 5, t1: 6, t2: 7,
  s0: 8, fp: 8, s1: 9,
  a0: 10, a1: 11, a2: 12, a3: 13, a4: 14, a5: 15, a6: 16, a7: 17,
  s2: 18, s3: 19, s4: 20, s5: 21, s6: 22, s7: 23, s8: 24, s9: 25, s10: 26, s11: 27,
  t3: 28, t4: 29, t5: 30, t6: 31,
};

const RISCV_MNEMONICS = [
  'addi', 'add', 'sub', 'lui', 'lw', 'sw', 'beq', 'bne', 'jal', 'jalr', 'nop',
];

function riscvParseReg(tok) {
  const t = String(tok).trim().toLowerCase();
  const xm = /^x(\d+)$/.exec(t);
  if (xm) {
    const n = parseInt(xm[1], 10);
    if (n < 0 || n > 31) throw new Error(`Register '${tok}' out of range (x0–x31)`);
    return n;
  }
  if (Object.prototype.hasOwnProperty.call(RISCV_REG_ALIASES, t)) {
    return RISCV_REG_ALIASES[t];
  }
  throw new Error(`riscv32: unknown register '${tok}' (expected x0–x31 or alias like sp, ra)`);
}

function riscvParseImm(tok, bits, signed) {
  let n;
  if (typeof tok === 'number') n = tok;
  else if (String(tok).startsWith('\\')) {
    n = parseInt(String(tok).slice(1), 10);
  } else if (/^-?\d+$/.test(String(tok))) {
    n = parseInt(String(tok), 10);
  } else {
    throw new Error(`Expected immediate integer, got '${tok}'`);
  }
  if (signed) {
    const min = -(1 << (bits - 1));
    const max = (1 << (bits - 1)) - 1;
    if (n < min || n > max) throw new Error(`Immediate ${n} out of range for signed ${bits}-bit`);
    if (n < 0) n = (1 << bits) + n;
  } else if (n < 0 || n >= (1 << bits)) {
    throw new Error(`Immediate ${n} out of range for unsigned ${bits}-bit`);
  }
  return n & ((1 << bits) - 1);
}

function riscvBits(n, width) {
  return (n & ((1 << width) - 1)).toString(2).padStart(width, '0');
}

function riscvParseMemArg(argsFromIndex, args) {
  const joined = args.slice(argsFromIndex).join(' ').trim();
  const compact = joined.replace(/\s+/g, '');
  const paren = /^(-?\d+|\\-?\d+)\(([^)]+)\)$/.exec(compact);
  if (paren) return { imm: paren[1], rs1: paren[2] };
  if (args.length >= argsFromIndex + 2) {
    return { imm: args[argsFromIndex], rs1: args[argsFromIndex + 1] };
  }
  throw new Error(`Expected offset(rs1) for memory operand, got '${joined}'`);
}

function riscvResolveLabelOffset(labels, instrAddr, tok, width, signed) {
  let parsed;
  if (typeof parseArgToken === 'function') {
    parsed = parseArgToken(tok);
  } else if (/^[A-Za-z_][A-Za-z0-9_]*>$/.test(tok)) {
    parsed = { type: 'extLabel', name: tok.slice(0, -1) };
  } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
    parsed = { type: 'label', name: tok };
  } else {
    return riscvParseImm(tok, width, signed);
  }
  if (parsed.type === 'extLabel' || parsed.type === 'label') {
    const target = labels[parsed.name];
    if (target === undefined) throw new Error(`Undefined label '${parsed.name}'`);
    const off = target - instrAddr;
    return riscvParseImm(String(off), width, signed);
  }
  if (parsed.type === 'dec') return riscvParseImm(String(parsed.value), width, signed);
  throw new Error(`Invalid branch/jump target '${tok}'`);
}

function riscvEncodeBuiltin(mnemonic, args, labels, instrAddr) {
  const mn = mnemonic.toUpperCase();
  const a = args.map(x => String(x).trim());

  if (mn === 'NOP') {
    return riscvBits(0, 32);
  }
  if (mn === 'ADDI') {
    const rd = riscvParseReg(a[0]);
    const rs1 = riscvParseReg(a[1]);
    const imm = riscvParseImm(a[2], 12, true);
    return riscvBits(imm, 12) + riscvBits(rs1, 5) + '000' + riscvBits(rd, 5) + '0010011';
  }
  if (mn === 'ADD') {
    const rd = riscvParseReg(a[0]);
    const rs1 = riscvParseReg(a[1]);
    const rs2 = riscvParseReg(a[2]);
    return '0000000' + riscvBits(rs2, 5) + riscvBits(rs1, 5) + '000' + riscvBits(rd, 5) + '0110011';
  }
  if (mn === 'SUB') {
    const rd = riscvParseReg(a[0]);
    const rs1 = riscvParseReg(a[1]);
    const rs2 = riscvParseReg(a[2]);
    return '0100000' + riscvBits(rs2, 5) + riscvBits(rs1, 5) + '000' + riscvBits(rd, 5) + '0110011';
  }
  if (mn === 'LUI') {
    const rd = riscvParseReg(a[0]);
    const imm = riscvParseImm(a[1], 20, false);
    return riscvBits(imm, 20) + riscvBits(rd, 5) + '0110111';
  }
  if (mn === 'LW') {
    const rd = riscvParseReg(a[0]);
    const mem = riscvParseMemArg(1, a);
    const imm = riscvParseImm(mem.imm, 12, true);
    const rs1 = riscvParseReg(mem.rs1);
    return riscvBits(imm, 12) + riscvBits(rs1, 5) + '010' + riscvBits(rd, 5) + '0000011';
  }
  if (mn === 'SW') {
    const rs2 = riscvParseReg(a[0]);
    const mem = riscvParseMemArg(1, a);
    const imm = riscvParseImm(mem.imm, 12, true);
    const rs1 = riscvParseReg(mem.rs1);
    const immVal = parseInt(riscvBits(imm, 12), 2);
    return riscvBits(immVal >> 5, 7) + riscvBits(rs2, 5) + riscvBits(rs1, 5) + '010' + riscvBits(immVal & 0x1f, 5) + '0100011';
  }
  if (mn === 'BEQ' || mn === 'BNE') {
    const rs1 = riscvParseReg(a[0]);
    const rs2 = riscvParseReg(a[1]);
    const off = riscvResolveLabelOffset(labels, instrAddr, a[2], 13, true);
    const imm13 = off & 0x1fff;
    const bit12 = (imm13 >> 12) & 1;
    const bit11 = (imm13 >> 11) & 1;
    const bits10_5 = (imm13 >> 5) & 0x3f;
    const bits4_1 = (imm13 >> 1) & 0xf;
    const f3 = mn === 'BEQ' ? '000' : '001';
    return String(bit12) + riscvBits(bits10_5, 6) + riscvBits(rs2, 5) + riscvBits(rs1, 5) + f3 + riscvBits(bits4_1, 4) + String(bit11) + '1100011';
  }
  if (mn === 'JAL') {
    const rd = a.length > 1 ? riscvParseReg(a[0]) : 1;
    const tgtTok = a.length > 1 ? a[1] : a[0];
    const off = riscvResolveLabelOffset(labels, instrAddr, tgtTok, 21, true);
    const imm = off & 0x1fffff;
    const bit20 = (imm >> 20) & 1;
    const bits10_1 = (imm >> 1) & 0x3ff;
    const bit11 = (imm >> 11) & 1;
    const bits19_12 = (imm >> 12) & 0xff;
    return String(bit20) + riscvBits(bits10_1, 10) + String(bit11) + riscvBits(bits19_12, 8) + riscvBits(rd, 5) + '1101111';
  }
  if (mn === 'JALR') {
    const rd = riscvParseReg(a[0]);
    const rs1 = riscvParseReg(a[1]);
    const imm = riscvParseImm(a[2] || '0', 12, true);
    return riscvBits(imm, 12) + riscvBits(rs1, 5) + '000' + riscvBits(rd, 5) + '1100111';
  }
  throw new Error(`Unknown riscv32 instruction '${mnemonic}'`);
}

function riscvRegName(n) {
  return n === 0 ? 'x0' : 'x' + n;
}

function riscvDisassemble(bits) {
  const b = String(bits).padStart(32, '0').slice(-32);
  const opcode = b.slice(25, 32);
  const rd = parseInt(b.slice(20, 25), 2);
  const f3 = b.slice(17, 20);
  const rs1 = parseInt(b.slice(12, 17), 2);
  const rs2 = parseInt(b.slice(7, 12), 2);
  const f7 = b.slice(0, 7);

  if (opcode === '0010011' && f3 === '000') {
    const imm = parseInt(b.slice(0, 12), 2);
    const immS = imm >= 2048 ? imm - 4096 : imm;
    if (rd === 0 && rs1 === 0 && immS === 0) return 'nop';
    return `addi ${riscvRegName(rd)}, ${riscvRegName(rs1)}, ${immS}`;
  }
  if (opcode === '0110011' && f3 === '000' && f7 === '0000000') {
    return `add ${riscvRegName(rd)}, ${riscvRegName(rs1)}, ${riscvRegName(rs2)}`;
  }
  if (opcode === '0110011' && f3 === '000' && f7 === '0100000') {
    return `sub ${riscvRegName(rd)}, ${riscvRegName(rs1)}, ${riscvRegName(rs2)}`;
  }
  if (opcode === '0110111') {
    const imm = parseInt(b.slice(0, 20), 2);
    return `lui ${riscvRegName(rd)}, ${imm}`;
  }
  if (opcode === '0000011' && f3 === '010') {
    const imm = parseInt(b.slice(0, 12), 2);
    const immS = imm >= 2048 ? imm - 4096 : imm;
    return `lw ${riscvRegName(rd)}, ${immS}(${riscvRegName(rs1)})`;
  }
  if (opcode === '0100011' && f3 === '010') {
    const imm = (parseInt(b.slice(0, 7), 2) << 5) | parseInt(b.slice(20, 25), 2);
    const immS = imm >= 2048 ? imm - 4096 : imm;
    return `sw ${riscvRegName(rs2)}, ${immS}(${riscvRegName(rs1)})`;
  }
  if (opcode === '1100011' && f3 === '000') {
    const imm = (parseInt(b[0], 2) << 12) | (parseInt(b.slice(1, 7), 2) << 5)
      | (parseInt(b.slice(20, 24), 2) << 1) | (parseInt(b[24], 2) << 11);
    const immS = imm >= 4096 ? imm - 8192 : imm;
    return `beq ${riscvRegName(rs1)}, ${riscvRegName(rs2)}, ${immS}`;
  }
  if (opcode === '1100011' && f3 === '001') {
    const imm = (parseInt(b[0], 2) << 12) | (parseInt(b.slice(1, 7), 2) << 5)
      | (parseInt(b.slice(20, 24), 2) << 1) | (parseInt(b[24], 2) << 11);
    const immS = imm >= 4096 ? imm - 8192 : imm;
    return `bne ${riscvRegName(rs1)}, ${riscvRegName(rs2)}, ${immS}`;
  }
  if (opcode === '1101111') {
    const imm = (parseInt(b[0], 2) << 20) | (parseInt(b.slice(1, 11), 2) << 1)
      | (parseInt(b[11], 2) << 11) | (parseInt(b.slice(12, 20), 2) << 12);
    const immS = imm >= (1 << 20) ? imm - (1 << 21) : imm;
    return `jal ${riscvRegName(rd)}, ${immS}`;
  }
  if (opcode === '1100111' && f3 === '000') {
    const imm = parseInt(b.slice(0, 12), 2);
    const immS = imm >= 2048 ? imm - 4096 : imm;
    return `jalr ${riscvRegName(rd)}, ${riscvRegName(rs1)}, ${immS}`;
  }
  throw new Error('Cannot disassemble instruction — no matching riscv32 opcode');
}

function createRiscv32BuiltinOpcode(mnemonic) {
  return {
    segments: null,
    wordWidth: 32,
    sourceLine: `${mnemonic} (riscv32 preset)`,
    microRaw: null,
    microProgram: null,
    pcEffect: ['beq', 'bne', 'jal', 'jalr'].includes(mnemonic) ? 'seq' : 'autoInc',
    execution: 'preset',
    presetBuiltin: true,
  };
}

function createRiscv32AsmSet() {
  const defaultOpcodes = {};
  const opcodeOrder = [];
  for (const mn of RISCV_MNEMONICS) {
    defaultOpcodes[mn.toUpperCase()] = createRiscv32BuiltinOpcode(mn);
    opcodeOrder.push(mn.toUpperCase());
  }

  return {
    id: 'riscv32',
    label: 'RISC-V RV32I (subset)',
    wordWidth: 32,
    encoding: 'fixed',
    endianness: 'little',
    operandGrammar: 'riscv',
    defaultOpcodes,
    opcodeOrder,
    consts: {},
    macros: {},

    validateUserOpcode(mnemonic, def) {
      if (def.presetBuiltin) return null;
      if (def.segments) {
        for (const seg of def.segments) {
          if (seg.kind !== 'literal') {
            return `segment token '${seg.kind}' invalid for set 'riscv32' (use literal bit patterns only for user overrides)`;
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
        return riscvEncodeBuiltin(entry.mnemonic, entry.args, labels, entry.addr);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        throw new Error(typeof formatAsmError === 'function'
          ? formatAsmError(entry.text, 0, msg)
          : msg);
      }
    },

    disassembleInstruction(isa, bitsStr) {
      return riscvDisassemble(bitsStr);
    },

    decodeMnemonicFromBits(isa, bitsStr) {
      try {
        const line = riscvDisassemble(bitsStr);
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
    createRiscv32AsmSet,
    riscvParseReg,
    riscvEncodeBuiltin,
    riscvDisassemble,
    RISCV_MNEMONICS,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createRiscv32AsmSet = createRiscv32AsmSet;
}
