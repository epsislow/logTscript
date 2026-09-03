/* ================= ASM SET: ARM A32 (32-bit ARM mode subset, 1+x.2) ================= */

const A32_MNEMONICS = ['MOV', 'ADD', 'SUB', 'CMP', 'AND', 'ORR', 'LDR', 'STR', 'B', 'BL', 'BX'];

const A32_COND_AL = 0xe;

function a32ParseReg(tok) {
  const t = String(tok).trim().toLowerCase();
  const m = /^r(\d+)$/.exec(t);
  if (!m) throw new Error(`arm-a32: unknown register '${tok}' (expected r0–r15)`);
  const n = parseInt(m[1], 10);
  if (n < 0 || n > 15) throw new Error(`Register '${tok}' out of range (r0–r15)`);
  return n;
}

function a32ParseImm(tok) {
  let t = String(tok).trim();
  if (t.startsWith('#')) t = t.slice(1);
  if (t.startsWith('\\')) return parseInt(t.slice(1), 10);
  if (/^0[xX]/.test(t)) return parseInt(t, 16);
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  throw new Error(`arm-a32: expected immediate, got '${tok}'`);
}

function a32WordToBits(word) {
  const bytes = [
    word & 0xff,
    (word >> 8) & 0xff,
    (word >> 16) & 0xff,
    (word >> 24) & 0xff,
  ];
  return bytes.map(b => b.toString(2).padStart(8, '0')).join('');
}

function a32BitsToWord(bitsStr) {
  const bytes = [];
  for (let i = 0; i < 32; i += 8) bytes.push(parseInt(bitsStr.substr(i, 8), 2));
  return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
}

function a32ResolveBranch(labels, instrByteAddr, tok) {
  let name = tok;
  if (/^[A-Za-z_][A-Za-z0-9_]*>$/.test(tok)) name = tok.slice(0, -1);
  if (typeof parseArgToken === 'function') {
    const p = parseArgToken(tok);
    if (p.type === 'label' || p.type === 'extLabel') {
      const target = labels[p.name];
      if (target === undefined) throw new Error(`Undefined label '${p.name}'`);
      return ((target - instrByteAddr - 8) / 4) | 0;
    }
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
    const target = labels[tok];
    if (target === undefined) throw new Error(`Undefined label '${tok}'`);
    return ((target - instrByteAddr - 8) / 4) | 0;
  }
  return a32ParseImm(tok);
}

function a32SplitOperands(text) {
  const parts = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function a32ParseMem(text) {
  const m = /^\[\s*(r\d+)\s*,\s*#?\s*(.+?)\s*\]$/i.exec(text.trim());
  if (!m) throw new Error(`arm-a32: expected [rn, #imm] memory operand, got '${text}'`);
  const rn = a32ParseReg(m[1]);
  const imm = a32ParseImm(m[2]);
  if (imm < 0 || imm > 4095) throw new Error(`arm-a32: offset ${imm} out of range 0..4095`);
  return { rn, imm };
}

function a32EncodeBuiltin(mnemonic, args, labels, instrByteAddr, text) {
  const mn = String(mnemonic).toUpperCase();
  const line = text || [mnemonic, ...args].join(' ');

  if (mn === 'MOV') {
    const ops = a32SplitOperands(line.replace(/^mov\s+/i, ''));
    if (ops.length !== 2) throw new Error('mov expects two operands');
    const rd = a32ParseReg(ops[0]);
    if (/^r\d/i.test(ops[1])) {
      const rm = a32ParseReg(ops[1]);
      const word = (A32_COND_AL << 28) | 0x01A00000 | (rd << 12) | rm;
      return a32WordToBits(word);
    }
    const imm = a32ParseImm(ops[1]);
    if (imm < 0 || imm > 255) throw new Error('arm-a32: mov immediate must be 0..255 in MVP');
    const word = (A32_COND_AL << 28) | 0x03A00000 | (rd << 12) | imm;
    return a32WordToBits(word);
  }

  if (mn === 'ADD' || mn === 'SUB') {
    const op = line.replace(/^(add|sub)\s+/i, '');
    const ops = a32SplitOperands(op);
    if (ops.length !== 3) throw new Error(`${mn.toLowerCase()} expects rd, rn, operand`);
    const rd = a32ParseReg(ops[0]);
    const rn = a32ParseReg(ops[1]);
    const baseImm = mn === 'ADD' ? 0x02800000 : 0x02400000;
    if (/^r\d/i.test(ops[2])) {
      const rm = a32ParseReg(ops[2]);
      const baseReg = mn === 'ADD' ? 0x00800000 : 0x00400000;
      const word = (A32_COND_AL << 28) | baseReg | (rn << 16) | (rd << 12) | rm;
      return a32WordToBits(word);
    }
    const imm = a32ParseImm(ops[2]);
    if (imm < 0 || imm > 4095) throw new Error('arm-a32: immediate out of range 0..4095');
    const word = (A32_COND_AL << 28) | baseImm | (rn << 16) | (rd << 12) | imm;
    return a32WordToBits(word);
  }

  if (mn === 'CMP') {
    const ops = a32SplitOperands(line.replace(/^cmp\s+/i, ''));
    if (ops.length !== 2) throw new Error('cmp expects rn, rm');
    const rn = a32ParseReg(ops[0]);
    const rm = a32ParseReg(ops[1]);
    const word = (A32_COND_AL << 28) | 0x01500000 | (rn << 16) | rm;
    return a32WordToBits(word);
  }

  if (mn === 'AND' || mn === 'ORR') {
    const ops = a32SplitOperands(line.replace(/^(and|orr)\s+/i, ''));
    if (ops.length !== 3) throw new Error(`${mn.toLowerCase()} expects rd, rn, rm`);
    const rd = a32ParseReg(ops[0]);
    const rn = a32ParseReg(ops[1]);
    const rm = a32ParseReg(ops[2]);
    const base = mn === 'AND' ? 0x00000000 : 0x01800000;
    const word = (A32_COND_AL << 28) | base | (rn << 16) | (rd << 12) | rm;
    return a32WordToBits(word);
  }

  if (mn === 'LDR' || mn === 'STR') {
    const ops = a32SplitOperands(line.replace(/^(ldr|str)\s+/i, ''));
    if (ops.length !== 2) throw new Error(`${mn.toLowerCase()} expects reg, [rn, #imm]`);
    const rd = a32ParseReg(ops[0]);
    const mem = a32ParseMem(ops[1]);
    const base = mn === 'LDR' ? 0x05900000 : 0x05800000;
    const word = (A32_COND_AL << 28) | base | (mem.rn << 16) | (rd << 12) | mem.imm;
    return a32WordToBits(word);
  }

  if (mn === 'B' || mn === 'BL') {
    const target = line.replace(/^\S+\s+/, '').trim();
    const off = a32ResolveBranch(labels, instrByteAddr, target);
    if (off < -0x800000 || off > 0x7fffff) throw new Error('arm-a32: branch offset out of range');
    const base = mn === 'B' ? 0x0a000000 : 0x0b000000;
    const word = (A32_COND_AL << 28) | base | (off & 0xffffff);
    return a32WordToBits(word);
  }

  if (mn === 'BX') {
    if (args.length !== 1) throw new Error('bx expects one register');
    const rm = a32ParseReg(args[0]);
    const word = (A32_COND_AL << 28) | 0x012fff10 | rm;
    return a32WordToBits(word);
  }

  throw new Error(`arm-a32: unknown instruction '${mnemonic}'`);
}

function a32DisassembleAtOffset(bitsStr, byteOffset) {
  const bits = String(bitsStr);
  const totalBytes = bits.length / 8;
  if (byteOffset < 0 || byteOffset + 4 > totalBytes) {
    throw new Error(`arm-a32: decode offset byte ${byteOffset} out of range`);
  }
  const word = a32BitsToWord(bits.substr(byteOffset * 8, 32));
  const cond = (word >>> 28) & 0xf;
  const op = (word >>> 25) & 7;
  const rd = (word >> 12) & 0xf;
  const rn = (word >> 16) & 0xf;
  const rm = word & 0xf;
  const imm12 = word & 0xfff;

  if (cond !== A32_COND_AL) {
    throw new Error(`arm-a32: unsupported condition ${cond} at byte ${byteOffset}`);
  }

  if ((word & 0x0ffffff0) === 0x012fff10) {
    return { mnemonic: 'BX', text: `bx r${rm}`, byteLength: 4, fields: { rm } };
  }
  if ((word & 0x0f000000) === 0x0a000000) {
    const off = ((word & 0xffffff) << 8) >> 8;
    return { mnemonic: 'B', text: `b ${off >= 0 ? '+' : ''}${off * 4}`, byteLength: 4, fields: { offset: off } };
  }
  if ((word & 0x0f000000) === 0x0b000000) {
    const off = ((word & 0xffffff) << 8) >> 8;
    return { mnemonic: 'BL', text: `bl ${off >= 0 ? '+' : ''}${off * 4}`, byteLength: 4, fields: { offset: off } };
  }
  if ((word & 0x0fe00000) === 0x01a00000) {
    return { mnemonic: 'MOV', text: `mov r${rd}, r${rm}`, byteLength: 4, fields: { rd, rm } };
  }
  if ((word & 0x0fe00000) === 0x03a00000) {
    return { mnemonic: 'MOV', text: `mov r${rd}, #${imm12}`, byteLength: 4, fields: { rd, imm: imm12 } };
  }
  if ((word & 0x0fe00000) === 0x00800000) {
    return { mnemonic: 'ADD', text: `add r${rd}, r${rn}, r${rm}`, byteLength: 4, fields: { rd, rn, rm } };
  }
  if ((word & 0x0fe00000) === 0x02800000) {
    return { mnemonic: 'ADD', text: `add r${rd}, r${rn}, #${imm12}`, byteLength: 4, fields: { rd, rn, imm: imm12 } };
  }
  if ((word & 0x0fe00000) === 0x00400000) {
    return { mnemonic: 'SUB', text: `sub r${rd}, r${rn}, r${rm}`, byteLength: 4, fields: { rd, rn, rm } };
  }
  if ((word & 0x0fe00000) === 0x02400000) {
    return { mnemonic: 'SUB', text: `sub r${rd}, r${rn}, #${imm12}`, byteLength: 4, fields: { rd, rn, imm: imm12 } };
  }
  if ((word & 0x0fff0000) === 0x01500000) {
    return { mnemonic: 'CMP', text: `cmp r${rn}, r${rm}`, byteLength: 4, fields: { rn, rm } };
  }
  if ((word & 0x0fe00000) === 0x00000000) {
    return { mnemonic: 'AND', text: `and r${rd}, r${rn}, r${rm}`, byteLength: 4, fields: { rd, rn, rm } };
  }
  if ((word & 0x0fe00000) === 0x01800000) {
    return { mnemonic: 'ORR', text: `orr r${rd}, r${rn}, r${rm}`, byteLength: 4, fields: { rd, rn, rm } };
  }
  if ((word & 0x0fe00000) === 0x05900000) {
    return { mnemonic: 'LDR', text: `ldr r${rd}, [r${rn}, #${imm12}]`, byteLength: 4, fields: { rd, rn, imm: imm12 } };
  }
  if ((word & 0x0fe00000) === 0x05800000) {
    return { mnemonic: 'STR', text: `str r${rd}, [r${rn}, #${imm12}]`, byteLength: 4, fields: { rd, rn, imm: imm12 } };
  }

  throw new Error(`arm-a32: no matching opcode at byte ${byteOffset} (0x${word.toString(16)})`);
}

function a32ReadReg(c, r) {
  if (r < 0 || r >= c.regCount) return 0;
  return parseInt(c.regs[r], 2) >>> 0;
}

function a32WriteReg(c, r, val) {
  if (r < 0 || r >= c.regCount) return;
  c.regs[r] = (val >>> 0).toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
}

function a32ReadMemWord(c, byteAddr) {
  if (typeof cpuReadRamCell !== 'function') return 0;
  const idx = byteAddr >> 2;
  const cell = cpuReadRamCell(c, idx);
  if (cell == null) return 0;
  return parseInt(String(cell).padStart(c.regDepth, '0').slice(-32), 2) >>> 0;
}

function a32WriteMemWord(c, byteAddr, val) {
  if (typeof cpuWriteRamCell !== 'function') return;
  const idx = byteAddr >> 2;
  cpuWriteRamCell(c, idx, (val >>> 0).toString(2).padStart(c.regDepth, '0').slice(-c.regDepth));
}

function a32FindCodeIndex(c, byteOffset) {
  if (!c.progCodeTable) return 0;
  for (let i = 0; i < c.progCodeTable.length; i++) {
    if (c.progCodeTable[i].byteOffset === byteOffset) return i;
  }
  for (let i = 0; i < c.progCodeTable.length; i++) {
    if (c.progCodeTable[i].byteOffset >= byteOffset) return i;
  }
  return c.progCodeTable.length - 1;
}

function a32ExecuteInstruction(c, ctx, isaInst, decoded, instrBits) {
  const dec = a32DisassembleAtOffset(instrBits, 0);
  const pcIdx = c.pc;
  let nextPc = pcIdx + 1;
  const f = dec.fields || {};

  if (c.condZero == null) c.condZero = 0;

  if (dec.mnemonic === 'MOV') {
    if (f.imm != null) a32WriteReg(c, f.rd, f.imm);
    else a32WriteReg(c, f.rd, a32ReadReg(c, f.rm));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'ADD') {
    const a = a32ReadReg(c, f.rn);
    const b = f.imm != null ? f.imm : a32ReadReg(c, f.rm);
    a32WriteReg(c, f.rd, (a + b) >>> 0);
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'SUB') {
    const a = a32ReadReg(c, f.rn);
    const b = f.imm != null ? f.imm : a32ReadReg(c, f.rm);
    a32WriteReg(c, f.rd, (a - b) >>> 0);
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'CMP') {
    const res = (a32ReadReg(c, f.rn) - a32ReadReg(c, f.rm)) >>> 0;
    c.condZero = res === 0 ? 1 : 0;
    c.zf = c.condZero;
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'AND') {
    a32WriteReg(c, f.rd, a32ReadReg(c, f.rn) & a32ReadReg(c, f.rm));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'ORR') {
    a32WriteReg(c, f.rd, a32ReadReg(c, f.rn) | a32ReadReg(c, f.rm));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'LDR') {
    const addr = (a32ReadReg(c, f.rn) + f.imm) >>> 0;
    a32WriteReg(c, f.rd, a32ReadMemWord(c, addr));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'STR') {
    const addr = (a32ReadReg(c, f.rn) + f.imm) >>> 0;
    a32WriteMemWord(c, addr, a32ReadReg(c, f.rd));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'B') {
    const curByte = c.progCodeTable[pcIdx].byteOffset;
    nextPc = a32FindCodeIndex(c, curByte + 8 + f.offset * 4);
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'BL') {
    const curByte = c.progCodeTable[pcIdx].byteOffset;
    a32WriteReg(c, 14, curByte + 8);
    nextPc = a32FindCodeIndex(c, curByte + 8 + f.offset * 4);
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'BX') {
    nextPc = a32ReadReg(c, f.rm) >> 2;
    c.pc = nextPc;
    return;
  }

  throw new Error(`arm-a32: unsupported instruction '${dec.text}' at PC ${pcIdx}`);
}

function createArmA32AsmSet() {
  const defaultOpcodes = {};
  const opcodeOrder = [];
  for (const mn of A32_MNEMONICS) {
    defaultOpcodes[mn] = {
      segments: null,
      wordWidth: 32,
      sourceLine: `${mn} (arm-a32 preset)`,
      presetBuiltin: true,
      execution: 'preset',
      pcEffect: 'autoInc',
    };
    opcodeOrder.push(mn);
  }

  return {
    id: 'arm-a32',
    label: 'ARM A32 (32-bit ARM mode subset)',
    wordWidth: 8,
    encoding: 'variable',
    wordEmitBytes: 4,
    endianness: 'little',
    operandGrammar: 'arm-a32',
    cpuRequirements: {
      regCount: 16,
      regDepth: 32,
      progDepth: 8,
      spReg: 13,
    },
    defaultOpcodes,
    opcodeOrder,
    consts: {},
    macros: {},

    encodeInstruction(isa, entry, labels, encodeCtx) {
      try {
        const addr = entry.addr != null ? entry.addr : 0;
        return a32EncodeBuiltin(entry.mnemonic, entry.args || [], labels, addr, entry.text);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        throw new Error(typeof formatAsmError === 'function'
          ? formatAsmError(entry.text, 0, msg)
          : msg);
      }
    },

    disassembleInstruction(isa, bitsStr) {
      return a32DisassembleAtOffset(bitsStr, 0).text;
    },

    disassembleAtOffset(isa, bitsStr, byteOffset) {
      return a32DisassembleAtOffset(bitsStr, byteOffset);
    },

    decodeMnemonicFromBits(isa, bitsStr) {
      try {
        const dec = a32DisassembleAtOffset(bitsStr, 0);
        return { mnemonic: dec.mnemonic, fields: dec.fields || {} };
      } catch (_) {
        return null;
      }
    },

    executeInstruction(c, ctx, isaInst, decoded, instrBits) {
      a32ExecuteInstruction(c, ctx, isaInst, decoded, instrBits);
    },

    validateUserOpcode(mnemonic, def) {
      if (def.presetBuiltin) return null;
      return 'arm-a32 preset does not support user opcode overrides in MVP 1+x.2';
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createArmA32AsmSet,
    a32EncodeBuiltin,
    a32DisassembleAtOffset,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createArmA32AsmSet = createArmA32AsmSet;
}
