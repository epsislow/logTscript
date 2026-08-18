/* ================= ASM SET: x86-32 Intel subset (variable encoding, 1+x.1 + 1+x.1c-i) ================= */

const X86_REG = {
  eax: 0, ecx: 1, edx: 2, ebx: 3, esp: 4, ebp: 5, esi: 6, edi: 7,
  ax: 0, cx: 1, dx: 2, bx: 3, sp: 4, bp: 5, si: 6, di: 7,
};

const X86_REG_NAMES = ['eax', 'ecx', 'edx', 'ebx', 'esp', 'ebp', 'esi', 'edi'];

const X86_MNEMONICS = [
  'MOV', 'ADD', 'SUB', 'CMP', 'AND', 'OR', 'XOR', 'TEST',
  'LEA', 'INC', 'DEC', 'NEG', 'NOT', 'XCHG',
  'PUSH', 'POP', 'JMP', 'JE', 'JNE',
  'JG', 'JGE', 'JL', 'JLE', 'JA', 'JAE', 'JB', 'JBE',
  'LOOP', 'LOOPE', 'LOOPZ', 'LOOPNE', 'LOOPNZ',
  'CALL', 'RET', 'NOP', 'INT',
];

const X86_COND_SHORT = {
  je: 0x74, jne: 0x75, jl: 0x7c, jle: 0x7e, jg: 0x7f, jge: 0x7d,
  jb: 0x72, jbe: 0x76, ja: 0x77, jae: 0x73,
};

const X86_COND_NEAR = {
  je: 0x84, jne: 0x85, jl: 0x8c, jle: 0x8e, jg: 0x8f, jge: 0x8d,
  jb: 0x82, jbe: 0x86, ja: 0x87, jae: 0x83,
};

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

function x86Disp32Bytes(disp) {
  const d = disp | 0;
  return [d & 0xff, (d >> 8) & 0xff, (d >> 16) & 0xff, (d >> 24) & 0xff];
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

function x86IsRegTok(tok) {
  return /^[a-z][a-z0-9]*$/i.test(String(tok).trim()) && X86_REG[String(tok).trim().toLowerCase()] != null;
}

function x86ResolveAbsAddr(labels, tok) {
  const t = String(tok).trim();
  if (/^0[xX]/.test(t) || /^-?\d+$/.test(t) || t.startsWith('\\')) {
    return x86ParseImm(t) >>> 0;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*>$/.test(t)) tok = t.slice(0, -1);
  if (typeof parseArgToken === 'function') {
    const p = parseArgToken(tok);
    if (p.type === 'label' || p.type === 'extLabel') {
      const target = labels[p.name];
      if (target === undefined) throw new Error(`Undefined label '${p.name}'`);
      return target >>> 0;
    }
    if (p.type === 'dec' || p.type === 'hex') return p.value >>> 0;
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
    const target = labels[tok];
    if (target === undefined) throw new Error(`Undefined label '${tok}'`);
    return target >>> 0;
  }
  return x86ParseImm(tok) >>> 0;
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

function x86ParseMem(tok, labels) {
  const t = String(tok).trim();
  if (!/^\[/.test(t)) throw new Error(`x86-32: expected memory operand '[…]', got '${tok}'`);
  const inner = t.replace(/^\[\s*/, '').replace(/\]\s*$/, '').trim();
  if (!inner) throw new Error(`x86-32: empty memory operand '${tok}'`);

  const regDisp = /^(\w+)\s*([+-])\s*(.+)$/i.exec(inner);
  if (regDisp && x86IsRegTok(regDisp[1])) {
    const base = x86ParseReg(regDisp[1]);
    let disp = x86ParseImm(regDisp[3]);
    if (regDisp[2] === '-') disp = -disp;
    if (base === 4 && disp === 0) {
      throw new Error(`x86-32: unsupported memory operand '${tok}' ([esp] requires SIB — use [esp±disp])`);
    }
    return { kind: 'base', base, disp };
  }

  if (x86IsRegTok(inner)) {
    const base = x86ParseReg(inner);
    if (base === 4) {
      throw new Error(`x86-32: unsupported memory operand '${tok}' ([esp] requires SIB — use [esp±disp])`);
    }
    if (base === 5) {
      return { kind: 'base', base: 5, disp: 0 };
    }
    return { kind: 'base', base, disp: 0 };
  }

  const disp = x86ResolveAbsAddr(labels || {}, inner);
  return { kind: 'abs', disp };
}

function x86MemText(mem) {
  if (mem.kind === 'abs') {
    return `[0x${(mem.disp >>> 0).toString(16)}]`;
  }
  if (mem.disp === 0) return `[${X86_REG_NAMES[mem.base]}]`;
  const sign = mem.disp >= 0 ? '+' : '-';
  const mag = Math.abs(mem.disp);
  const dispTok = mag >= 0x1000 ? `0x${mag.toString(16)}` : String(mag);
  return `[${X86_REG_NAMES[mem.base]}${sign}${dispTok}]`;
}

function x86EmitMemRef(opcode, regField, mem) {
  if (mem.kind === 'abs') {
    return x86EmitBytes([opcode, x86ModRM(0, regField, 5), ...x86Disp32Bytes(mem.disp)]);
  }
  const base = mem.base;
  const disp = mem.disp | 0;
  if (disp === 0 && base === 5) {
    return x86EmitBytes([opcode, x86ModRM(1, regField, 5), 0]);
  }
  if (disp === 0) {
    return x86EmitBytes([opcode, x86ModRM(0, regField, base)]);
  }
  if (disp >= -128 && disp <= 127) {
    return x86EmitBytes([opcode, x86ModRM(1, regField, base), disp & 0xff]);
  }
  return x86EmitBytes([opcode, x86ModRM(2, regField, base), ...x86Disp32Bytes(disp)]);
}

function x86EncodeMov(text, labels, instrByteAddr) {
  const ops = x86SplitOperands(text.replace(/^mov\s+/i, ''));
  if (ops.length !== 2) throw new Error('mov expects two operands');

  const a = ops[0].trim();
  const b = ops[1].trim();

  if (/^\[/.test(a) && !/^\[/.test(b)) {
    const mem = x86ParseMem(a, labels);
    const reg = x86ParseReg(b);
    return x86EmitMemRef(0x89, reg, mem);
  }
  if (!/^\[/.test(a) && /^\[/.test(b)) {
    const reg = x86ParseReg(a);
    const mem = x86ParseMem(b, labels);
    return x86EmitMemRef(0x8b, reg, mem);
  }
  if (!/^\[/.test(a) && !/^\[/.test(b)) {
    const dst = x86ParseReg(a);
    if (x86IsRegTok(b)) {
      const src = x86ParseReg(b);
      return x86EmitBytes([0x89, x86ModRM(3, src, dst)]);
    }
    const imm = x86ParseImm(b);
    const bytes = [0xb8 + dst, imm & 0xff, (imm >> 8) & 0xff, (imm >> 16) & 0xff, (imm >> 24) & 0xff];
    return x86EmitBytes(bytes);
  }
  throw new Error(`x86-32: unsupported mov form '${text}'`);
}

function x86EncodeLea(text, labels) {
  const ops = x86SplitOperands(text.replace(/^lea\s+/i, ''));
  if (ops.length !== 2) throw new Error('lea expects two operands');
  if (/^\[/.test(ops[0])) throw new Error('lea destination must be a register');
  if (!/^\[/.test(ops[1])) throw new Error('lea source must be a memory operand');
  const reg = x86ParseReg(ops[0]);
  const mem = x86ParseMem(ops[1], labels);
  return x86EmitMemRef(0x8d, reg, mem);
}

function x86EncodeIncDec(mnemonic, text, labels) {
  const op = mnemonic.toLowerCase();
  const arg = text.replace(/^\S+\s+/, '').trim();
  if (/^\[/.test(arg)) {
    const mem = x86ParseMem(arg, labels);
    const sub = op === 'inc' ? 0 : 1;
    return x86EmitMemRef(0xff, sub, mem);
  }
  const reg = x86ParseReg(arg);
  return x86EmitBytes([(op === 'inc' ? 0x40 : 0x48) + reg]);
}

function x86EncodeNegNot(mnemonic, text, labels) {
  const op = mnemonic.toLowerCase();
  const sub = op === 'neg' ? 3 : 2;
  const arg = text.replace(/^\S+\s+/, '').trim();
  if (/^\[/.test(arg)) {
    const mem = x86ParseMem(arg, labels);
    return x86EmitMemRef(0xf7, sub, mem);
  }
  const reg = x86ParseReg(arg);
  return x86EmitBytes([0xf7, x86ModRM(3, sub, reg)]);
}

function x86EncodeTest(text, labels) {
  const ops = x86SplitOperands(text.replace(/^test\s+/i, ''));
  if (ops.length !== 2) throw new Error('test expects two operands');
  const a = ops[0].trim();
  const b = ops[1].trim();
  if (/^\[/.test(a) || /^\[/.test(b)) {
    throw new Error('x86-32: test with memory not supported in 1+x.1c-i');
  }
  const r0 = x86ParseReg(a);
  if (x86IsRegTok(b)) {
    const r1 = x86ParseReg(b);
    return x86EmitBytes([0x85, x86ModRM(3, r1, r0)]);
  }
  const imm = x86ParseImm(b);
  if (r0 === 0 && imm >= 0 && imm <= 0xffffffff) {
    return x86EmitBytes([0xa9, ...x86Disp32Bytes(imm)]);
  }
  if (imm >= -128 && imm <= 127) {
    return x86EmitBytes([0xf7, x86ModRM(3, 0, r0), imm & 0xff]);
  }
  return x86EmitBytes([0xf7, x86ModRM(3, 0, r0), ...x86Disp32Bytes(imm)]);
}

function x86EncodeXchg(text) {
  const ops = x86SplitOperands(text.replace(/^xchg\s+/i, ''));
  if (ops.length !== 2) throw new Error('xchg expects two operands');
  const a = x86ParseReg(ops[0]);
  const b = x86ParseReg(ops[1]);
  if (a === 0 && b !== 0) return x86EmitBytes([0x90 + b]);
  if (b === 0 && a !== 0) return x86EmitBytes([0x90 + a]);
  return x86EmitBytes([0x87, x86ModRM(3, b, a)]);
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

function x86EncodeAluRegMem(mnemonic, text, labels) {
  const op = mnemonic.toLowerCase();
  const regToMem = { add: 0x01, sub: 0x29, cmp: 0x39, and: 0x21, or: 0x09, xor: 0x31 };
  const memToReg = { add: 0x03, sub: 0x2b, cmp: 0x3b, and: 0x23, or: 0x0b, xor: 0x33 };
  const ops = x86SplitOperands(text.replace(new RegExp(`^${op}\\s+`, 'i'), ''));
  if (ops.length !== 2) throw new Error(`${op} expects two operands`);
  const a = ops[0].trim();
  const b = ops[1].trim();
  if (/^\[/.test(a) && x86IsRegTok(b)) {
    const mem = x86ParseMem(a, labels);
    const reg = x86ParseReg(b);
    const opcode = regToMem[op];
    if (opcode == null) throw new Error(`x86-32: unknown ALU op '${mnemonic}'`);
    return x86EmitMemRef(opcode, reg, mem);
  }
  if (x86IsRegTok(a) && /^\[/.test(b)) {
    const reg = x86ParseReg(a);
    const mem = x86ParseMem(b, labels);
    const opcode = memToReg[op];
    if (opcode == null) throw new Error(`x86-32: unknown ALU op '${mnemonic}'`);
    return x86EmitMemRef(opcode, reg, mem);
  }
  if (x86IsRegTok(a) && x86IsRegTok(b)) {
    const dst = x86ParseReg(a);
    const src = x86ParseReg(b);
    const map = { add: 0x03, sub: 0x2b, cmp: 0x3b, and: 0x23, or: 0x0b, xor: 0x33 };
    const opcode = map[op];
    if (opcode == null) throw new Error(`x86-32: unknown ALU op '${mnemonic}'`);
    return x86EmitBytes([opcode, x86ModRM(3, dst, src)]);
  }
  return null;
}

function x86EncodeBranch(mnemonic, text, labels, instrByteAddr) {
  const mn = mnemonic.toLowerCase();
  if (mn === 'loop' || mn === 'loope' || mn === 'loopz' || mn === 'loopne' || mn === 'loopnz') {
    const target = text.replace(/^\S+\s+/, '').trim();
    const rel = x86ResolveLabel(labels, instrByteAddr, 2, target);
    if (rel < -128 || rel > 127) throw new Error(`x86-32: ${mn} offset out of rel8 range`);
    const op = { loop: 0xe2, loope: 0xe1, loopz: 0xe1, loopne: 0xe0, loopnz: 0xe0 }[mn];
    return x86EmitBytes([op, rel & 0xff]);
  }

  const target = text.replace(/^\S+\s+/, '').trim();
  const shortLen = 2;
  const nearLen = X86_COND_NEAR[mn] != null ? 6 : 5;
  const rel = x86ResolveLabel(labels, instrByteAddr, shortLen, target);

  if (mn === 'jmp') {
    if (rel >= -128 && rel <= 127) return x86EmitBytes([0xeb, rel & 0xff]);
    const rel32 = x86ResolveLabel(labels, instrByteAddr, 5, target);
    return x86EmitBytes([0xe9, ...x86Disp32Bytes(rel32)]);
  }

  const shortOp = X86_COND_SHORT[mn];
  if (shortOp != null) {
    if (rel >= -128 && rel <= 127) return x86EmitBytes([shortOp, rel & 0xff]);
    const nearOp = X86_COND_NEAR[mn];
    const rel32 = x86ResolveLabel(labels, instrByteAddr, nearLen, target);
    return x86EmitBytes([0x0f, nearOp, ...x86Disp32Bytes(rel32)]);
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
    return x86EmitBytes([0xe8, ...x86Disp32Bytes(rel32)]);
  }
  if (mn === 'MOV') return x86EncodeMov(line, labels, instrByteAddr);
  if (mn === 'LEA') return x86EncodeLea(line, labels);
  if (mn === 'INC' || mn === 'DEC') return x86EncodeIncDec(mn, line, labels);
  if (mn === 'NEG' || mn === 'NOT') return x86EncodeNegNot(mn, line, labels);
  if (mn === 'TEST') return x86EncodeTest(line, labels);
  if (mn === 'XCHG') return x86EncodeXchg(line);
  if (mn === 'JMP' || X86_COND_SHORT[mn.toLowerCase()] != null
    || mn === 'LOOP' || mn === 'LOOPE' || mn === 'LOOPZ' || mn === 'LOOPNE' || mn === 'LOOPNZ') {
    return x86EncodeBranch(mn, line, labels, instrByteAddr);
  }
  if (mn === 'ADD' || mn === 'SUB' || mn === 'CMP' || mn === 'AND' || mn === 'OR' || mn === 'XOR') {
    const memForm = x86EncodeAluRegMem(mn, line, labels);
    if (memForm) return memForm;
    const ops = x86SplitOperands(line.replace(/^\S+\s+/, ''));
    if (ops.length === 2 && x86IsRegTok(ops[1].trim()) && !/^\[/.test(ops[1])) {
      return x86EncodeAluRegMem(mn, line, labels);
    }
    return x86EncodeAluImm(mn, line, labels, instrByteAddr);
  }
  throw new Error(`x86-32: unknown instruction '${mnemonic}'`);
}

function x86SignExtend8(v) {
  v = v & 0xff;
  return v >= 0x80 ? v - 0x100 : v;
}

function x86SignExtend32(v) {
  v >>>= 0;
  return v | 0;
}

function x86ReadDisp32(bytes, off) {
  return x86SignExtend32(
    bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16) | (bytes[off + 3] << 24)
  );
}

function x86DecodeMemOperand(bytes, byteOffset, mod, rm) {
  if (mod === 0 && rm === 5) {
    const disp = x86ReadDisp32(bytes, byteOffset + 2);
    return { mem: { kind: 'abs', disp: disp >>> 0 }, extra: 4 };
  }
  if (mod === 0 && rm === 4) {
    throw new Error('x86-32: SIB addressing not supported (1+x.1c-iii)');
  }
  if (mod === 0) {
    return { mem: { kind: 'base', base: rm, disp: 0 }, extra: 0 };
  }
  if (mod === 1) {
    const disp = x86SignExtend8(bytes[byteOffset + 2]);
    return { mem: { kind: 'base', base: rm, disp }, extra: 1 };
  }
  if (mod === 2) {
    const disp = x86ReadDisp32(bytes, byteOffset + 2);
    return { mem: { kind: 'base', base: rm, disp }, extra: 4 };
  }
  return { mem: null, extra: 0 };
}

function x86DisassembleAtOffset(bitsStr, byteOffset) {
  const bytes = [];
  const bits = String(bitsStr);
  for (let i = 0; i < bits.length; i += 8) bytes.push(parseInt(bits.substr(i, 8), 2));
  if (byteOffset < 0 || byteOffset >= bytes.length) {
    throw new Error(`x86-32: decode offset byte ${byteOffset} out of range`);
  }
  const b0 = bytes[byteOffset];

  if (b0 === 0x90) return { mnemonic: 'NOP', text: 'nop', byteLength: 1, fields: {} };
  if (b0 === 0xc3) return { mnemonic: 'RET', text: 'ret', byteLength: 1, fields: {} };
  if (b0 >= 0x50 && b0 <= 0x57) {
    return { mnemonic: 'PUSH', text: `push ${X86_REG_NAMES[b0 - 0x50]}`, byteLength: 1, fields: { reg: b0 - 0x50 } };
  }
  if (b0 >= 0x58 && b0 <= 0x5f) {
    return { mnemonic: 'POP', text: `pop ${X86_REG_NAMES[b0 - 0x58]}`, byteLength: 1, fields: { reg: b0 - 0x58 } };
  }
  if (b0 >= 0x40 && b0 <= 0x47) {
    const reg = b0 - 0x40;
    return { mnemonic: 'INC', text: `inc ${X86_REG_NAMES[reg]}`, byteLength: 1, fields: { dst: reg, op: 'inc' } };
  }
  if (b0 >= 0x48 && b0 <= 0x4f) {
    const reg = b0 - 0x48;
    return { mnemonic: 'DEC', text: `dec ${X86_REG_NAMES[reg]}`, byteLength: 1, fields: { dst: reg, op: 'dec' } };
  }
  if (b0 >= 0x91 && b0 <= 0x97) {
    return { mnemonic: 'XCHG', text: `xchg eax, ${X86_REG_NAMES[b0 - 0x90]}`, byteLength: 1, fields: { a: 0, b: b0 - 0x90 } };
  }
  if (b0 >= 0xb8 && b0 <= 0xbf) {
    if (byteOffset + 5 > bytes.length) throw new Error('x86-32: truncated mov imm32');
    const reg = b0 - 0xb8;
    const imm = x86ReadDisp32(bytes, byteOffset + 1) >>> 0;
    return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[reg]}, ${imm}`, byteLength: 5, fields: { dst: reg, imm } };
  }
  if (b0 === 0xa9 && byteOffset + 5 <= bytes.length) {
    const imm = x86ReadDisp32(bytes, byteOffset + 1) >>> 0;
    return { mnemonic: 'TEST', text: `test eax, ${imm}`, byteLength: 5, fields: { dst: 0, imm, op: 'test' } };
  }
  if (b0 === 0xe0 || b0 === 0xe1 || b0 === 0xe2) {
    const rel = x86SignExtend8(bytes[byteOffset + 1]);
    const names = { 0xe0: 'loopne', 0xe1: 'loope', 0xe2: 'loop' };
    const mn = names[b0].toUpperCase();
    return { mnemonic: mn, text: `${names[b0]} ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 2, fields: { rel8: rel, loopKind: names[b0] } };
  }

  const regDestOps = {
    0x03: 'add', 0x2b: 'sub', 0x3b: 'cmp', 0x23: 'and', 0x0b: 'or', 0x33: 'xor',
  };
  const memDestOps = {
    0x01: 'add', 0x29: 'sub', 0x39: 'cmp', 0x21: 'and', 0x09: 'or', 0x31: 'xor',
  };

  if (b0 === 0x89 || b0 === 0x8b || b0 === 0x8d || b0 === 0x85 || b0 === 0x87
    || regDestOps[b0] != null || memDestOps[b0] != null) {
    if (byteOffset + 2 > bytes.length) throw new Error('x86-32: truncated modrm');
    const modrm = bytes[byteOffset + 1];
    const mod = (modrm >> 6) & 3;
    const reg = (modrm >> 3) & 7;
    const rm = modrm & 7;
    if (mod === 3) {
      if (b0 === 0x89) {
        return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[rm]}, ${X86_REG_NAMES[reg]}`, byteLength: 2, fields: { dst: rm, src: reg } };
      }
      if (b0 === 0x8b) {
        return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[reg]}, ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: reg, src: rm } };
      }
      if (b0 === 0x87) {
        return { mnemonic: 'XCHG', text: `xchg ${X86_REG_NAMES[rm]}, ${X86_REG_NAMES[reg]}`, byteLength: 2, fields: { a: rm, b: reg } };
      }
      if (b0 === 0x85) {
        return { mnemonic: 'TEST', text: `test ${X86_REG_NAMES[rm]}, ${X86_REG_NAMES[reg]}`, byteLength: 2, fields: { dst: rm, src: reg, op: 'test' } };
      }
      if (b0 === 0x8d) {
        return { mnemonic: 'LEA', text: `lea ${X86_REG_NAMES[reg]}, ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: reg, src: rm, op: 'lea' } };
      }
      const op = regDestOps[b0] || memDestOps[b0];
      if (op) {
        const regDest = regDestOps[b0] != null;
        if (regDest) {
          return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[reg]}, ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: reg, src: rm, op } };
        }
        return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[rm]}, ${X86_REG_NAMES[reg]}`, byteLength: 2, fields: { dst: rm, src: reg, op } };
      }
    } else {
      const { mem, extra } = x86DecodeMemOperand(bytes, byteOffset, mod, rm);
      const len = 2 + extra;
      if (byteOffset + len > bytes.length) throw new Error('x86-32: truncated memory modrm');
      const memTxt = x86MemText(mem);
      if (b0 === 0x89) {
        return { mnemonic: 'MOV', text: `mov ${memTxt}, ${X86_REG_NAMES[reg]}`, byteLength: len, fields: { mem, src: reg } };
      }
      if (b0 === 0x8b) {
        return { mnemonic: 'MOV', text: `mov ${X86_REG_NAMES[reg]}, ${memTxt}`, byteLength: len, fields: { dst: reg, mem } };
      }
      if (b0 === 0x8d) {
        return { mnemonic: 'LEA', text: `lea ${X86_REG_NAMES[reg]}, ${memTxt}`, byteLength: len, fields: { dst: reg, mem, op: 'lea' } };
      }
      const op = regDestOps[b0] || memDestOps[b0];
      if (op) {
        const regDest = regDestOps[b0] != null;
        if (regDest) {
          return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[reg]}, ${memTxt}`, byteLength: len, fields: { dst: reg, mem, op } };
        }
        return { mnemonic: op.toUpperCase(), text: `${op} ${memTxt}, ${X86_REG_NAMES[reg]}`, byteLength: len, fields: { mem, src: reg, op } };
      }
    }
  }

  if (b0 === 0xf7 && byteOffset + 2 <= bytes.length) {
    const modrm = bytes[byteOffset + 1];
    const mod = (modrm >> 6) & 3;
    const sub = (modrm >> 3) & 7;
    const rm = modrm & 7;
    if (mod === 3) {
      if (sub === 0) {
        let len = 3;
        let imm = x86SignExtend8(bytes[byteOffset + 2]);
        if (byteOffset + 6 <= bytes.length && (bytes[byteOffset + 2] !== 0 || bytes[byteOffset + 3] !== 0)) {
          imm = x86ReadDisp32(bytes, byteOffset + 2);
          len = 6;
        }
        return { mnemonic: 'TEST', text: `test ${X86_REG_NAMES[rm]}, ${imm}`, byteLength: len, fields: { dst: rm, imm, op: 'test' } };
      }
      if (sub === 2) return { mnemonic: 'NOT', text: `not ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: rm, op: 'not' } };
      if (sub === 3) return { mnemonic: 'NEG', text: `neg ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: rm, op: 'neg' } };
    } else {
      const { mem, extra } = x86DecodeMemOperand(bytes, byteOffset, mod, rm);
      const len = 2 + extra;
      if (sub === 0) return { mnemonic: 'TEST', text: `test ${x86MemText(mem)}, imm8`, byteLength: len, fields: { mem, op: 'test' } };
      if (sub === 2) return { mnemonic: 'NOT', text: `not ${x86MemText(mem)}`, byteLength: len, fields: { mem, op: 'not' } };
      if (sub === 3) return { mnemonic: 'NEG', text: `neg ${x86MemText(mem)}`, byteLength: len, fields: { mem, op: 'neg' } };
    }
  }

  if (b0 === 0xff && byteOffset + 2 <= bytes.length) {
    const modrm = bytes[byteOffset + 1];
    const mod = (modrm >> 6) & 3;
    const sub = (modrm >> 3) & 7;
    const rm = modrm & 7;
    if (sub === 0 || sub === 1) {
      if (mod === 3) {
        const op = sub === 0 ? 'inc' : 'dec';
        return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[rm]}`, byteLength: 2, fields: { dst: rm, op } };
      }
      const { mem, extra } = x86DecodeMemOperand(bytes, byteOffset, mod, rm);
      const op = sub === 0 ? 'inc' : 'dec';
      return { mnemonic: op.toUpperCase(), text: `${op} ${x86MemText(mem)}`, byteLength: 2 + extra, fields: { mem, op } };
    }
  }

  if (b0 === 0x83 && byteOffset + 3 <= bytes.length) {
    const modrm = bytes[byteOffset + 1];
    const subop = (modrm >> 3) & 7;
    const rm = modrm & 7;
    const imm = x86SignExtend8(bytes[byteOffset + 2]);
    const ops = ['add', 'or', 'adc', 'sbb', 'and', 'sub', 'xor', 'cmp'];
    const op = ops[subop] || 'alu';
    return { mnemonic: op.toUpperCase(), text: `${op} ${X86_REG_NAMES[rm]}, ${imm}`, byteLength: 3, fields: { dst: rm, imm, op } };
  }
  if (b0 === 0xeb && byteOffset + 2 <= bytes.length) {
    const rel = x86SignExtend8(bytes[byteOffset + 1]);
    return { mnemonic: 'JMP', text: `jmp ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 2, fields: { rel8: rel } };
  }
  const shortBranch = Object.entries(X86_COND_SHORT).find(([, v]) => v === b0);
  if (shortBranch && byteOffset + 2 <= bytes.length) {
    const rel = x86SignExtend8(bytes[byteOffset + 1]);
    return { mnemonic: shortBranch[0].toUpperCase(), text: `${shortBranch[0]} ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 2, fields: { rel8: rel, cond: shortBranch[0] } };
  }
  if (b0 === 0xe9 && byteOffset + 5 <= bytes.length) {
    const rel = x86ReadDisp32(bytes, byteOffset + 1);
    return { mnemonic: 'JMP', text: `jmp ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 5, fields: { rel32: rel } };
  }
  if (b0 === 0x0f && byteOffset + 2 <= bytes.length) {
    const b1 = bytes[byteOffset + 1];
    const nearBranch = Object.entries(X86_COND_NEAR).find(([, v]) => v === b1);
    if (nearBranch && byteOffset + 6 <= bytes.length) {
      const rel = x86ReadDisp32(bytes, byteOffset + 2);
      return { mnemonic: nearBranch[0].toUpperCase(), text: `${nearBranch[0]} ${rel >= 0 ? '+' : ''}${rel}`, byteLength: 6, fields: { rel32: rel, cond: nearBranch[0] } };
    }
  }
  if (b0 === 0xe8 && byteOffset + 5 <= bytes.length) {
    const rel = x86ReadDisp32(bytes, byteOffset + 1);
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

function x86MemByteAddr(c, mem) {
  if (mem.kind === 'abs') return mem.disp >>> 0;
  return (x86ReadReg(c, mem.base) + mem.disp) >>> 0;
}

function x86ReadMemByte(c, byteAddr) {
  byteAddr = byteAddr >>> 0;
  if (c.progDepth === 8 && byteAddr < c.progLength && typeof cpuReadProgCell === 'function') {
    const cell = cpuReadProgCell(c, byteAddr);
    if (cell == null) return 0;
    return parseInt(String(cell).padStart(8, '0').slice(-8), 2) & 0xff;
  }
  if (typeof cpuReadRamCell === 'function') {
    const cellIdx = byteAddr >> 2;
    const off = byteAddr & 3;
    const cell = cpuReadRamCell(c, cellIdx);
    if (cell == null) return 0;
    const v = parseInt(String(cell).padStart(c.ramDepth, '0').slice(-32), 2) >>> 0;
    return (v >> (off * 8)) & 0xff;
  }
  return 0;
}

function x86WriteMemByte(c, byteAddr, val) {
  byteAddr = byteAddr >>> 0;
  val = val & 0xff;
  if (c.progDepth === 8 && byteAddr < c.progLength && typeof cpuReadProgCell === 'function') {
    const bits = val.toString(2).padStart(c.progDepth, '0').slice(-c.progDepth);
    if (typeof cpuWriteProgCell === 'function') {
      cpuWriteProgCell(c, byteAddr, bits);
    } else if (c.prog) {
      c.prog[byteAddr] = bits;
    }
    return;
  }
  if (typeof cpuReadRamCell === 'function' && typeof cpuWriteRamCell === 'function') {
    const cellIdx = byteAddr >> 2;
    const off = byteAddr & 3;
    const cell = cpuReadRamCell(c, cellIdx);
    let v = cell != null ? parseInt(String(cell).padStart(c.ramDepth, '0').slice(-32), 2) >>> 0 : 0;
    const mask = 0xff << (off * 8);
    v = (v & ~mask) | (val << (off * 8));
    cpuWriteRamCell(c, cellIdx, v.toString(2).padStart(c.ramDepth, '0').slice(-c.ramDepth));
  }
}

function x86ReadMem32ZeroExt(c, mem) {
  return x86ReadMemByte(c, x86MemByteAddr(c, mem));
}

function x86WriteMemFromReg(c, mem, regVal) {
  x86WriteMemByte(c, x86MemByteAddr(c, mem), regVal);
}

function x86SetFlags(c, result, a, b, op) {
  result = result >>> 0;
  a = a >>> 0;
  b = b >>> 0;
  c.zf = result === 0 ? 1 : 0;
  c.sf = (result & 0x80000000) ? 1 : 0;
  if (op === 'sub' || op === 'cmp' || op === 'test') {
    c.cf = a < b ? 1 : 0;
    const sa = (a << 0) >> 31;
    const sb = (b << 0) >> 31;
    const sr = (result << 0) >> 31;
    c.of = (sa !== sb && sa !== sr) ? 1 : 0;
  } else if (op === 'add') {
    c.cf = result < a ? 1 : 0;
    const sa = (a << 0) >> 31;
    const sb = (b << 0) >> 31;
    const sr = (result << 0) >> 31;
    c.of = (sa === sb && sa !== sr) ? 1 : 0;
  }
}

function x86CondTake(c, cond) {
  const zf = c.zf ? 1 : 0;
  const sf = c.sf ? 1 : 0;
  const cf = c.cf ? 1 : 0;
  const of = c.of ? 1 : 0;
  switch (cond) {
    case 'je': return zf === 1;
    case 'jne': return zf === 0;
    case 'jl': return sf !== of;
    case 'jle': return zf === 1 || sf !== of;
    case 'jg': return zf === 0 && sf === of;
    case 'jge': return sf === of;
    case 'jb': return cf === 1;
    case 'jbe': return cf === 1 || zf === 1;
    case 'ja': return cf === 0 && zf === 0;
    case 'jae': return cf === 0;
    default: return false;
  }
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

function x86ApplyBranch(c, pcIdx, dec, rel8, rel32) {
  const curByte = c.progCodeTable && c.progCodeTable[pcIdx] ? c.progCodeTable[pcIdx].byteOffset : pcIdx;
  const off = rel8 != null ? rel8 : rel32;
  return x86FindCodeIndex(c, curByte + dec.byteLength + off);
}

function x86ExecuteAlu(c, op, dst, src, flagsOp) {
  let a = typeof dst === 'number' ? x86ReadReg(c, dst) : x86ReadMem32ZeroExt(c, dst);
  const b = typeof src === 'number' ? (src >>> 0) : x86ReadMem32ZeroExt(c, src);
  let res = a;
  if (op === 'add') res = (a + b) >>> 0;
  else if (op === 'sub' || op === 'cmp') res = (a - b) >>> 0;
  else if (op === 'and') res = (a & b) >>> 0;
  else if (op === 'or') res = (a | b) >>> 0;
  else if (op === 'xor') res = (a ^ b) >>> 0;
  else if (op === 'test') res = (a & b) >>> 0;
  if (op !== 'cmp' && op !== 'test') {
    if (typeof dst === 'number') x86WriteReg(c, dst, res);
    else x86WriteMemFromReg(c, dst, res);
  }
  x86SetFlags(c, res, a, b, flagsOp || op);
}

function x86ExecuteInstruction(c, ctx, isaInst, decoded, instrBits) {
  const dec = x86DisassembleAtOffset(instrBits, 0);
  const pcIdx = c.pc;
  let nextPc = pcIdx + 1;
  const f = dec.fields || {};

  if (dec.mnemonic === 'NOP') { c.pc = nextPc; return; }
  if (dec.mnemonic === 'RET') {
    if (c.spReg != null) {
      const sp = parseInt(c.regs[c.spReg], 2);
      const cell = cpuReadRamCell(c, sp);
      if (cell != null) {
        c.pc = parseInt(String(cell).padStart(c.progDepth, '0').slice(-32), 2);
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
    else if (f.mem && f.src != null) x86WriteMemFromReg(c, f.mem, x86ReadReg(c, f.src));
    else if (f.mem && f.dst != null) x86WriteReg(c, f.dst, x86ReadMem32ZeroExt(c, f.mem));
    else if (f.dst != null && f.src != null) x86WriteReg(c, f.dst, x86ReadReg(c, f.src));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'LEA') {
    if (f.mem) x86WriteReg(c, f.dst, x86MemByteAddr(c, f.mem));
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'XCHG') {
    const a = f.a != null ? f.a : f.dst;
    const b = f.b != null ? f.b : f.src;
    if (a != null && b != null) {
      const va = x86ReadReg(c, a);
      const vb = x86ReadReg(c, b);
      x86WriteReg(c, a, vb);
      x86WriteReg(c, b, va);
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'INC' || dec.mnemonic === 'DEC') {
    if (f.mem) {
      const addr = x86MemByteAddr(c, f.mem);
      let v = x86ReadMemByte(c, addr);
      v = dec.mnemonic === 'INC' ? (v + 1) & 0xff : (v - 1) & 0xff;
      x86WriteMemByte(c, addr, v);
      x86SetFlags(c, v, v, 1, dec.mnemonic === 'INC' ? 'add' : 'sub');
    } else if (f.dst != null) {
      let v = x86ReadReg(c, f.dst);
      v = dec.mnemonic === 'INC' ? (v + 1) >>> 0 : (v - 1) >>> 0;
      x86WriteReg(c, f.dst, v);
      x86SetFlags(c, v, v, 1, dec.mnemonic === 'INC' ? 'add' : 'sub');
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'NEG' || dec.mnemonic === 'NOT') {
    if (f.mem) {
      const addr = x86MemByteAddr(c, f.mem);
      let v = x86ReadMemByte(c, addr);
      v = dec.mnemonic === 'NEG' ? (-v) & 0xff : (~v) & 0xff;
      x86WriteMemByte(c, addr, v);
      if (dec.mnemonic === 'NEG') x86SetFlags(c, v, 0, v, 'sub');
    } else if (f.dst != null) {
      let v = x86ReadReg(c, f.dst);
      v = dec.mnemonic === 'NEG' ? (-v) >>> 0 : (~v) >>> 0;
      x86WriteReg(c, f.dst, v);
      if (dec.mnemonic === 'NEG') x86SetFlags(c, v, 0, v, 'sub');
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'ADD' || dec.mnemonic === 'SUB' || dec.mnemonic === 'CMP'
    || dec.mnemonic === 'AND' || dec.mnemonic === 'OR' || dec.mnemonic === 'XOR'
    || dec.mnemonic === 'TEST') {
    const op = dec.mnemonic.toLowerCase();
    if (f.imm != null) {
      x86ExecuteAlu(c, op, f.dst, f.imm | 0, op);
    } else if (f.mem && f.dst != null) {
      x86ExecuteAlu(c, op, f.dst, f.mem, op);
    } else if (f.mem && f.src != null) {
      x86ExecuteAlu(c, op, f.mem, f.src, op);
    } else if (f.dst != null && f.src != null) {
      x86ExecuteAlu(c, op, f.dst, f.src, op);
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'JMP') {
    c.pc = x86ApplyBranch(c, pcIdx, dec, f.rel8, f.rel32);
    return;
  }
  if (f.cond || dec.mnemonic === 'JE' || dec.mnemonic === 'JNE') {
    const cond = (f.cond || dec.mnemonic.toLowerCase());
    if (x86CondTake(c, cond)) {
      c.pc = x86ApplyBranch(c, pcIdx, dec, f.rel8, f.rel32);
      return;
    }
    c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'LOOP' || dec.mnemonic === 'LOOPE' || dec.mnemonic === 'LOOPNE') {
    let ecx = x86ReadReg(c, 1);
    ecx = (ecx - 1) >>> 0;
    x86WriteReg(c, 1, ecx);
    let take = ecx !== 0;
    const kind = f.loopKind || dec.mnemonic.toLowerCase();
    if (kind === 'loope' || kind === 'loopz') take = take && c.zf === 1;
    if (kind === 'loopne' || kind === 'loopnz') take = take && c.zf === 0;
    if (take && f.rel8 != null) c.pc = x86ApplyBranch(c, pcIdx, dec, f.rel8, null);
    else c.pc = nextPc;
    return;
  }
  if (dec.mnemonic === 'CALL') {
    if (typeof cpuPushReg === 'function') cpuPushReg(c, 0);
    if (f.rel32 != null) c.pc = x86ApplyBranch(c, pcIdx, dec, null, f.rel32);
    else c.pc = nextPc;
    return;
  }

  throw new Error(`x86-32: unsupported instruction '${dec.text}' at PC ${pcIdx}`);
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
    x86ParseMem,
  };
}

if (typeof globalThis !== 'undefined') {
  globalThis.createX8632AsmSet = createX8632AsmSet;
}
