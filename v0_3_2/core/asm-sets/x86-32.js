/* ================= ASM SET: x86-32 Intel subset (variable encoding, 1+x.1) ================= */

const X86_REG = {
  eax: 0, ecx: 1, edx: 2, ebx: 3, esp: 4, ebp: 5, esi: 6, edi: 7,
  ax: 0, cx: 1, dx: 2, bx: 3, sp: 4, bp: 5, si: 6, di: 7,
};

const X86_REG_NAMES = ['eax', 'ecx', 'edx', 'ebx', 'esp', 'ebp', 'esi', 'edi'];

const X86_MNEMONICS = [
  'MOV', 'ADD', 'SUB', 'CMP', 'AND', 'OR', 'XOR',
  'PUSH', 'POP', 'JMP', 'JE', 'JNE', 'CALL', 'RET', 'NOP', 'INT',
];

function x86ParseReg(tok) {
  const t = String(tok).trim().toLowerCase();
  if (X86_REG[t] == null) {
    throw new Error(`x86-32: unknown register '${tok}' (expected eax–edi)`);
  }
  return X86_REG[t];
}

function x86ParseImm(tok) {
  const t = String(tok).trim();
  if (t.startsWith('\\')) return parseInt(t.slice(1), 10);
  if (/^0[xX]/.test(t)) return parseInt(t, 16);
  if (/^-?\d+$/.test(t)) return parseInt(t, 10);
  throw new Error(`x86-32: expected integer, got '${tok}'`);
}

function x86ModRM(mod, reg, rm) {
  return ((mod & 3) << 6) | ((reg & 7) << 3) | (rm & 7);
}

function x86EmitBytes(bytes) {
  return bytes.map(b => ((b >>> 0) & 0xff).toString(2).padStart(8, '0')).join('');
}

function x86SplitOperands(text) {
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

function x86ParseMem(tok) {
  const t = String(tok).trim();
  const m = /^\[\s*(ebp|esp)\s*([+-])\s*(.+?)\s*\]$/i.exec(t);
  if (!m) throw new Error(`x86-32: unsupported memory operand '${tok}' (MVP: [ebp±disp8] or [esp±disp8])`);
  const base = x86ParseReg(m[1]);
  let disp = x86ParseImm(m[3]);
  if (m[2] === '-') disp = -disp;
  if (disp < -128 || disp > 127) {
    throw new Error(`x86-32: disp8 out of range for '${tok}'`);
  }
  return { base, disp: disp & 0xff };
}

function x86ResolveLabel(labels, instrByteAddr, instrLen, tok) {
  let name = tok;
  if (/^[A-Za-z_][A-Za-z0-9_]*>$/.test(tok)) name = tok.slice(0, -1);
  if (typeof parseArgToken === 'function') {
    const p = parseArgToken(tok);
    if (p.type === 'label' || p.type === 'extLabel') {
      const target = labels[p.name];
      if (target === undefined) throw new Error(`Undefined label '${p.name}'`);
      return target - (instrByteAddr + instrLen);
    }
    if (p.type === 'dec' || p.type === 'hex') return p.value;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
    const target = labels[tok];
    if (target === undefined) throw new Error(`Undefined label '${tok}'`);
    return target - (instrByteAddr + instrLen);
  }
  return x86ParseImm(tok);
}

function x86EncodeMov(text, labels, instrByteAddr) {
  const ops = x86SplitOperands(text.replace(/^mov\s+/i, ''));
  if (ops.length !== 2) throw new Error('mov expects two operands');

  const a = ops[0].trim();
  const b = ops[1].trim();

  if (/^\[/.test(a) && !/^\[/.test(b)) {
    const mem = x86ParseMem(a);
    const reg = x86ParseReg(b);
    return x86EmitBytes([0x89, x86ModRM(1, reg, mem.base), mem.disp]);
  }
  if (!/^\[/.test(a) && /^\[/.test(b)) {
    const reg = x86ParseReg(a);
    const mem = x86ParseMem(b);
    return x86EmitBytes([0x8b, x86ModRM(1, reg, mem.base), mem.disp]);
  }
  if (!/^\[/.test(a) && !/^\[/.test(b)) {
    const dst = x86ParseReg(a);
    if (/^[a-z]/i.test(b)) {
      const src = x86ParseReg(b);
      return x86EmitBytes([0x89, x86ModRM(3, src, dst)]);
    }
    const imm = x86ParseImm(b);
    const bytes = [0xb8 + dst, imm & 0xff, (imm >> 8) & 0xff, (imm >> 16) & 0xff, (imm >> 24) & 0xff];
    return x86EmitBytes(bytes);
  }
  throw new Error(`x86-32: unsupported mov form '${text}'`);
}

function x86EncodeAluImm(mnemonic, text, labels, instrByteAddr) {
  const op = mnemonic.toLowerCase();
  const subop = { add: 0, sub: 5, cmp: 7, and: 4, or: 1, xor: 6 }[op];
  if (subop == null) throw new Error(`x86-32: unknown ALU op '${mnemonic}'`);
  const ops = x86SplitOperands(text.replace(new RegExp(`^${op}\\s+`, 'i'), ''));
  if (ops.length !== 2) throw new Error(`${op} expects two operands`);
  const dst = x86ParseReg(ops[0]);
  const imm = x86ParseImm(ops[1]);
  if (imm >= -128 && imm <= 127) {
    return x86EmitBytes([0x83, x86ModRM(3, subop, dst), imm & 0xff]);
  }
  throw new Error(`x86-32: ${op} immediate must fit in signed byte (use mov + add for larger)`);
}

function x86EncodeAluReg(mnemonic, text) {
  const op = mnemonic.toLowerCase();
  const map = { add: 0x03, sub: 0x2b, cmp: 0x39, and: 0x23, or: 0x0b, xor: 0x33 };
  const opcode = map[op];
  if (opcode == null) throw new Error(`x86-32: unknown ALU op '${mnemonic}'`);
  const ops = x86SplitOperands(text.replace(new RegExp(`^${op}\\s+`, 'i'), ''));
  if (ops.length !== 2) throw new Error(`${op} expects two operands`);
  const dst = x86ParseReg(ops[0]);
  const src = x86ParseReg(ops[1]);
  return x86EmitBytes([opcode, x86ModRM(3, src, dst)]);
}

function x86EncodeBranch(mnemonic, text, labels, instrByteAddr) {
  const mn = mnemonic.toLowerCase();
  const target = text.replace(/^\S+\s+/, '').trim();
  const rel = x86ResolveLabel(labels, instrByteAddr, 2, target);
  if (mn === 'jmp') {
    if (rel >= -128 && rel <= 127) {
      return x86EmitBytes([0xeb, rel & 0xff]);
    }
    const rel32 = x86ResolveLabel(labels, instrByteAddr, 5, target);
    return x86EmitBytes([
      0xe9,
      rel32 & 0xff, (rel32 >> 8) & 0xff, (rel32 >> 16) & 0xff, (rel32 >> 24) & 0xff,
    ]);
  }
  if (mn === 'je' || mn === 'jne') {
    if (rel >= -128 && rel <= 127) {
      return x86EmitBytes([mn === 'je' ? 0x74 : 0x75, rel & 0xff]);
    }
    const rel32 = x86ResolveLabel(labels, instrByteAddr, 6, target);
    const opcode = mn === 'je' ? [0x0f, 0x84] : [0x0f, 0x85];
    return x86EmitBytes([
      ...opcode,
      rel32 & 0xff, (rel32 >> 8) & 0xff, (rel32 >> 16) & 0xff, (rel32 >> 24) & 0xff,
    ]);
  }
  throw new Error(`x86-32: unknown branch '${mnemonic}'`);
}

function x86EncodeBuiltin(mnemonic, args, labels, instrByteAddr, text) {
  const mn = String(mnemonic).toUpperCase();
  const line = text || [mnemonic, ...args].join(' ');

  if (mn === 'NOP') {
    if (args.length) throw new Error('nop takes no operands');
    return x86EmitBytes([0x90]);
  }
  if (mn === 'RET') {
    if (args.length) throw new Error('ret takes no operands');
    return x86EmitBytes([0xc3]);
  }
  if (mn === 'PUSH') {
    if (args.length !== 1) throw new Error('push expects one register');
    return x86EmitBytes([0x50 + x86ParseReg(args[0])]);
  }
  if (mn === 'POP') {
    if (args.length !== 1) throw new Error('pop expects one register');
    return x86EmitBytes([0x58 + x86ParseReg(args[0])]);
  }
  if (mn === 'INT') {
    if (args.length !== 1) throw new Error('int expects one immediate');
    return x86EmitBytes([0xcd, x86ParseImm(args[0]) & 0xff]);
  }
  if (mn === 'CALL') {
    if (args.length !== 1) throw new Error('call expects one label');
    const rel32 = x86ResolveLabel(labels, instrByteAddr, 5, args[0]);
    return x86EmitBytes([
      0xe8,
      rel32 & 0xff, (rel32 >> 8) & 0xff, (rel32 >> 16) & 0xff, (rel32 >> 24) & 0xff,
    ]);
  }
  if (mn === 'MOV') return x86EncodeMov(line, labels, instrByteAddr);
  if (mn === 'JMP' || mn === 'JE' || mn === 'JNE') return x86EncodeBranch(mn, line, labels, instrByteAddr);
  if (mn === 'ADD' || mn === 'SUB' || mn === 'CMP' || mn === 'AND' || mn === 'OR' || mn === 'XOR') {
    const ops = x86SplitOperands(line.replace(/^\S+\s+/, ''));
    if (ops.length === 2 && /^[a-z]/i.test(ops[1].trim()) && !/^\[/.test(ops[1])) {
      return x86EncodeAluReg(mn, line);
    }
    return x86EncodeAluImm(mn, line, labels, instrByteAddr);
  }
  throw new Error(`x86-32: unknown instruction '${mnemonic}'`);
}

function x86BytesFromBits(bitsStr) {
  const bits = String(bitsStr);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) {
    out.push(parseInt(bits.substr(i, 8), 2));
  }
  return out;
}

function x86SignExtend8(v) {
  v = v & 0xff;
  return v >= 0x80 ? v - 0x100 : v;
}

function x86SignExtend32(v) {
  v >>>= 0;
  return v | 0;
}

function x86DisassembleAtOffset(bitsStr, byteOffset) {
  const bytes = x86BytesFromBits(bitsStr);
  if (byteOffset < 0 || byteOffset >= bytes.length) {
    throw new Error(`x86-32: decode offset byte ${byteOffset} out of range`);
  }
  const b0 = bytes[byteOffset];

  if (b0 === 0x90) {
    return { mnemonic: 'NOP', text: 'nop', byteLength: 1, fields: {} };
  }
  if (b0 === 0xc3) {
    return { mnemonic: 'RET', text: 'ret', byteLength: 1, fields: {} };
  }
  if (b0 >= 0x50 && b0 <= 0x57) {
    return { mnemonic: 'PUSH', text: `push ${X86_REG_NAMES[b0 - 0x50]}`, byteLength: 1, fields: { reg: b0 - 0x50 } };
  }
  if (b0 >= 0x58 && b0 <= 0x5f) {
    return { mnemonic: 'POP', text: `pop ${X86_REG_NAMES[b0 - 0x58]}`, byteLength: 1, fields: { reg: b0 - 0x58 } };
  }
  if (b0 >= 0xb8 && b0 <= 0xbf) {
    if (byteOffset + 5 > bytes.length) throw new Error('x86-32: truncated mov imm32');
    const reg = b0 - 0xb8;
    const imm = bytes[byteOffset + 1] | (bytes[byteOffset + 2] << 8)
      | (bytes[byteOffset + 3] << 16) | (bytes[byteOffset + 4] << 24);
    return {
      mnemonic: 'MOV',
      text: `mov ${X86_REG_NAMES[reg]}, ${imm >>> 0}`,
      byteLength: 5,
      fields: { dst: reg, imm: imm >>> 0 },
    };
  }
  if (b0 === 0x89 || b0 === 0x8b || b0 === 0x03 || b0 === 0x2b || b0 === 0x39
    || b0 === 0x23 || b0 === 0x0b || b0 === 0x33
    || b0 === 0x01 || b0 === 0x29 || b0 === 0x21 || b0 === 0x09 || b0 === 0x31) {
    if (byteOffset + 2 > bytes.length) throw new Error('x86-32: truncated modrm');
    const modrm = bytes[byteOffset + 1];
    const mod = (modrm >> 6) & 3;
    const reg = (modrm >> 3) & 7;
    const rm = modrm & 7;
    if (mod === 3) {
      const regOps = {
        0x03: 'add', 0x2b: 'sub', 0x39: 'cmp', 0x23: 'and', 0x0b: 'or', 0x33: 'xor',
        0x01: 'add', 0x29: 'sub', 0x21: 'and', 0x09: 'or', 0x31: 'xor',
      };
      if (b0 === 0x89) {
        return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[rm]}, ${X86_REG_NAMES[reg]}`, byteLength: 2, fields: { dst: rm, src: reg } };
      }
      if (b0 === 0x8b) {
        return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[reg]}, ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: reg, src: rm } };
      }
      const op = regOps[b0] || 'alu';
      return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[rm]}, ${X86_REG_NAMES[reg]}`, byteLength: 2, fields: { dst: rm, src: reg } };
    }
    if (mod === 1 && byteOffset + 3 <= bytes.length) {
      const disp = x86SignExtend8(bytes[byteOffset + 2]);
      const sign = disp >= 0 ? '+' : '-';
      const mem = `[${X86_REG_NAMES[rm]}${sign}${Math.abs(disp)}]`;
      if (b0 === 0x89) {
        return { mnemonic: 'MOV', text: `mov ${mem}, ${X86_REG_NAMES[reg]}`, byteLength: 3, fields: { memBase: rm, disp, src: reg } };
      }
      if (b0 === 0x8b) {
        return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[reg]}, ${mem}`, byteLength: 3, fields: { dst: reg, memBase: rm, disp } };
      }
    }
  }
  if (b0 === 0x83 && byteOffset + 3 <= bytes.length) {
    const modrm = bytes[byteOffset + 1];
    const subop = (modrm >> 3) & 7;
    const rm = modrm & 7;
    const imm = x86SignExtend8(bytes[byteOffset + 2]);
    const ops = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'];
    const op = ops[subop] || 'alu';
    return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[rm]}, ${imm}`, byteLength: 3, fields: { dst: rm, imm } };
  }
  if (b0 === 0xeb && byteOffset + 2 <= bytes.length) {
    const rel = x86SignExtend8(bytes[byteOffset + 1]);
    return { mnemonic: 'JMP', text: `jmp ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 2, fields: { rel8: rel } };
  }
  if (b0 === 0x74 || b0 === 0x75) {
    const rel = x86SignExtend8(bytes[byteOffset + 1]);
    const op = b0 === 0x74 ? 'je' : 'jne';
    return { mnemonic: op.toUpperCase(), text: `${op} ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 2, fields: { rel8: rel, cond: b0 === 0x74 ? 'eq' : 'ne' } };
  }
  if (b0 === 0xe9 && byteOffset + 5 <= bytes.length) {
    const rel = x86SignExtend32(
      bytes[byteOffset + 1] | (bytes[byteOffset + 2] << 8)
      | (bytes[byteOffset + 3] << 16) | (bytes[byteOffset + 4] << 24)
    );
    return { mnemonic: 'JMP', text: `jmp ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 5, fields: { rel32: rel } };
  }
  if (b0 === 0xe8 && byteOffset + 5 <= bytes.length) {
    const rel = x86SignExtend32(
      bytes[byteOffset + 1] | (bytes[byteOffset + 2] << 8)
      | (bytes[byteOffset + 3] << 16) | (bytes[byteOffset + 4] << 24)
    );
    return { mnemonic: 'CALL', text: `call ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 5, fields: { rel32: rel } };
  }
  if (b0 === 0xcd && byteOffset + 2 <= bytes.length) {
    return { mnemonic: 'INT', text: `int 0x${bytes[byteOffset + 1].toString(16)}`, byteLength: 2, fields: { imm: bytes[byteOffset + 1] } };
  }
  throw new Error(`x86-32: no matching opcode at byte ${byteOffset} (0x${b0.toString(16)})`);
}

function x86ReadReg(c, r) {
  if (r < 0 || r >= c.regCount) return 0;
  return parseInt(c.regs[r], 2) >>> 0;
}

function x86WriteReg(c, r, val) {
  if (r < 0 || r >= c.regCount) return;
  c.regs[r] = (val >>> 0).toString(2).padStart(c.regDepth, '0').slice(-c.regDepth);
}

function x86ReadMem32(c, base, disp) {
  const byteAddr = (x86ReadReg(c, base) + disp) >>> 0;
  if (typeof cpuReadRamCell !== 'function') return 0;
  const idx = byteAddr >> 2;
  const cell = cpuReadRamCell(c, idx);
  if (cell == null) return 0;
  return parseInt(String(cell).padStart(c.ramDepth, '0').slice(-32), 2) >>> 0;
}

function x86WriteMem32(c, base, disp, val) {
  const byteAddr = (x86ReadReg(c, base) + disp) >>> 0;
  if (typeof cpuWriteRamCell !== 'function') return;
  const idx = byteAddr >> 2;
  cpuWriteRamCell(c, idx, (val >>> 0).toString(2).padStart(c.ramDepth, '0').slice(-c.ramDepth));
}

function x86SetFlags(c, result, op) {
  result = result >>> 0;
  c.zf = result === 0 ? 1 : 0;
  c.sf = (result & 0x80000000) ? 1 : 0;
  if (op === 'sub' || op === 'cmp') {
    c.cf = 0;
  }
}

function x86ExecuteInstruction(c, ctx, isaInst, decoded, instrBits) {
  const dec = x86DisassembleAtOffset(instrBits, 0);
  const pcIdx = c.pc;
  let nextPc = pcIdx + 1;
  const f = dec.fields || {};

  if (dec.mnemonic === 'NOP') {
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'RET') {
    if (c.spReg != null) {
      const sp = parseInt(c.regs[c.spReg], 2);
      const cell = cpuReadRamCell(c, sp);
      if (cell != null) {
        nextPc = parseInt(String(cell).padStart(c.progDepth, '0').slice(-32), 2) / (c.progEncoding === 'variable' ? 1 : 1);
        c.pc = nextPc;
        return;
      }
    }
    c.halted = 1;
    c.pc = pcIdx;
    return;
  }
  if (dec.mnemonic === 'INT') {
    c.halted = 1;
    c.trapCause = f.imm != null ? f.imm : 0;
    c.pc = pcIdx;
    return;
  }
  if (dec.mnemonic === 'PUSH') {
    if (typeof cpuPushReg === 'function') cpuPushReg(c, f.reg);
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'POP') {
    if (typeof cpuPopReg === 'function') cpuPopReg(c, f.reg);
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'MOV') {
    if (f.imm != null) x86WriteReg(c, f.dst, f.imm);
    else if (f.memBase != null && f.disp != null && f.src != null) {
      x86WriteMem32(c, f.memBase, f.disp, x86ReadReg(c, f.src));
    } else if (f.memBase != null && f.disp != null && f.dst != null) {
      x86WriteReg(c, f.dst, x86ReadMem32(c, f.memBase, f.disp));
    } else if (f.dst != null && f.src != null) {
      x86WriteReg(c, f.dst, x86ReadReg(c, f.src));
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'ADD' || dec.mnemonic === 'SUB') {
    const dst = f.dst;
    let a = x86ReadReg(c, dst);
    const b = f.imm != null ? (f.imm | 0) : x86ReadReg(c, f.src);
    const res = dec.mnemonic === 'ADD' ? (a + b) >>> 0 : (a - b) >>> 0;
    x86WriteReg(c, dst, res);
    x86SetFlags(c, res, dec.mnemonic.toLowerCase());
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'CMP') {
    const a = x86ReadReg(c, f.dst);
    const b = f.imm != null ? (f.imm | 0) : x86ReadReg(c, f.src);
    const res = (a - b) >>> 0;
    x86SetFlags(c, res, 'cmp');
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'JMP') {
    const curByte = c.progCodeTable && c.progCodeTable[pcIdx] ? c.progCodeTable[pcIdx].byteOffset : pcIdx;
    if (f.rel8 != null) {
      const targetByte = curByte + dec.byteLength + f.rel8;
      nextPc = x86FindCodeIndex(c, targetByte);
    } else if (f.rel32 != null) {
      const targetByte = curByte + dec.byteLength + f.rel32;
      nextPc = x86FindCodeIndex(c, targetByte);
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'JE' || dec.mnemonic === 'JNE') {
    const take = dec.mnemonic === 'JE' ? c.zf : !c.zf;
    if (take && f.rel8 != null) {
      const curByte = c.progCodeTable[pcIdx].byteOffset;
      nextPc = x86FindCodeIndex(c, curByte + dec.byteLength + f.rel8);
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'CALL') {
    if (typeof cpuPushReg === 'function') {
      cpuPushReg(c, 0);
    }
    if (f.rel32 != null) {
      const curByte = c.progCodeTable[pcIdx].byteOffset;
      nextPc = x86FindCodeIndex(c, curByte + dec.byteLength + f.rel32);
    }
    c.pc = nextPc;
    return;
  }

  throw new Error(`x86-32: unsupported instruction '${dec.text}' at PC ${pcIdx}`);
}

function x86FindCodeIndex(c, byteOffset) {
  if (!c.progCodeTable) return 0;
  for (let i = 0; i < c.progCodeTable.length; i++) {
    if (c.progCodeTable[i].byteOffset === byteOffset) return i;
  }
  for (let i = 0; i < c.progCodeTable.length; i++) {
    if (c.progCodeTable[i].byteOffset >= byteOffset) return i;
  }
  return c.progCodeTable.length - 1;
}

function createX8632AsmSet() {
  const defaultOpcodes = {};
  const opcodeOrder = [];
  for (const mn of X86_MNEMONICS) {
    defaultOpcodes[mn] = {
      segments: null,
      wordWidth: 8,
      sourceLine: `${mn} (x86-32 preset)`,
      presetBuiltin: true,
      execution: 'preset',
      pcEffect: 'autoInc',
    };
    opcodeOrder.push(mn);
  }

  return {
    id: 'x86-32',
    label: 'x86-32 Intel subset (variable-length)',
    wordWidth: 8,
    encoding: 'variable',
    wordEmitBytes: 4,
    endianness: 'little',
    operandGrammar: 'x86-intel',
    cpuRequirements: {
      regCount: 8,
      regDepth: 32,
      progDepth: 8,
      spReg: 4,
    },
    defaultOpcodes,
    opcodeOrder,
    consts: {},
    macros: {},

    encodeInstruction(isa, entry, labels, encodeCtx) {
      try {
        const addr = entry.addr != null ? entry.addr : 0;
        return x86EncodeBuiltin(entry.mnemonic, entry.args || [], labels, addr, entry.text);
      } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        throw new Error(typeof formatAsmError === 'function'
          ? formatAsmError(entry.text, 0, msg)
          : msg);
      }
    },

    disassembleInstruction(isa, bitsStr) {
      return x86DisassembleAtOffset(bitsStr, 0).text;
    },

    disassembleAtOffset(isa, bitsStr, byteOffset) {
      return x86DisassembleAtOffset(bitsStr, byteOffset);
    },

    decodeMnemonicFromBits(isa, bitsStr) {
      try {
        const dec = x86DisassembleAtOffset(bitsStr, 0);
        return { mnemonic: dec.mnemonic, fields: dec.fields || {} };
      } catch (_) {
        return null;
      }
    },

    executeInstruction(c, ctx, isaInst, decoded, instrBits) {
      x86ExecuteInstruction(c, ctx, isaInst, decoded, instrBits);
    },

    validateUserOpcode(mnemonic, def) {
      if (def.presetBuiltin) return null;
      return 'x86-32 preset does not support user opcode overrides in MVP 1+x.1';
    },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createX8632AsmSet,
    x86EncodeBuiltin,
    x86DisassembleAtOffset,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createX8632AsmSet = createX8632AsmSet;
}
