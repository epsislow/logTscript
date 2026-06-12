/* ================= ASM ISA ASSEMBLER ================= */

function parseFieldToken(token) {
  const t = token.trim();
  if (/^[01]+$/.test(t)) {
    return { kind: 'literal', bits: t };
  }
  const m = /^(R|A)(S)?(\d+)b$/i.exec(t);
  if (m) {
    const prefix = m[1].toUpperCase();
    const signed = !!m[2];
    const width = parseInt(m[3], 10);
    if (prefix === 'R') return { kind: 'reg', width, signed };
    return { kind: 'addr', width, signed };
  }
  const m2 = /^(S)?(\d+)b$/i.exec(t);
  if (m2) {
    return { kind: 'imm', width: parseInt(m2[2], 10), signed: !!m2[1] };
  }
  throw new Error(`Invalid ASM field token '${token}'`);
}

function segmentWidth(seg) {
  if (seg.kind === 'literal') return seg.bits.length;
  return seg.width;
}

function formatAsmError(lineText, col, message) {
  const pointer = ' '.repeat(Math.max(0, col)) + '^^^';
  return `${message}\n${lineText}\n${pointer}`;
}

function parseIsaBody(rawSource) {
  const opcodes = {};
  const opcodeOrder = [];
  let wordWidth = null;

  const lines = rawSource.split('\n');
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    const hash = line.indexOf('#');
    if (hash >= 0) line = line.slice(0, hash);
    line = line.trim();
    if (!line || line === ':') continue;

    const colon = line.indexOf(':');
    if (colon < 0) throw new Error(`Expected ':' in ISA opcode definition at line ${li + 1}: ${line}`);

    const mnemonic = line.slice(0, colon).trim().toUpperCase();
    if (!mnemonic) throw new Error(`Missing mnemonic at line ${li + 1}`);
    if (opcodes[mnemonic]) throw new Error(`Duplicate mnemonic '${mnemonic}' in ISA definition`);

    const rhs = line.slice(colon + 1).trim();
    const parts = rhs.split('+').map(p => p.trim()).filter(Boolean);
    if (!parts.length) throw new Error(`ISA opcode '${mnemonic}' has no bit segments`);

    const segments = parts.map(p => parseFieldToken(p));
    const width = segments.reduce((s, seg) => s + segmentWidth(seg), 0);
    if (wordWidth === null) wordWidth = width;
    else if (wordWidth !== width) {
      throw new Error(`ISA opcode '${mnemonic}' encodes to ${width} bits but wordWidth is ${wordWidth}`);
    }

    opcodes[mnemonic] = { segments, wordWidth: width, sourceLine: line };
    opcodeOrder.push(mnemonic);
  }

  if (wordWidth === null) throw new Error('ISA definition has no opcodes');
  return { opcodes, wordWidth, opcodeOrder };
}

function splitProgramRaw(raw) {
  const logical = [];
  const physicalLines = raw.split('\n');
  for (let pi = 0; pi < physicalLines.length; pi++) {
    let line = physicalLines[pi];
    const lineNo = pi + 1;
    const hash = line.indexOf('#');
    if (hash >= 0) line = line.slice(0, hash);
    const parts = line.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) logical.push({ text: trimmed, lineNo });
    }
  }
  return logical;
}

function parseProgramEntry(text, lineNo) {
  const labelInstr = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(text);
  if (labelInstr) {
    const label = labelInstr[1];
    const rest = labelInstr[2].trim();
    if (!rest) return [{ type: 'label', name: label, lineNo, text }];
    const entry = parseProgramEntry(rest, lineNo);
    return [{ type: 'label', name: label, lineNo, text: rest }, ...entry];
  }
  const onlyLabel = /^([A-Za-z_][A-Za-z0-9_]*)\s*:$/.exec(text);
  if (onlyLabel) return [{ type: 'label', name: onlyLabel[1], lineNo, text }];

  const tokens = text.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const mnemonic = tokens[0].toUpperCase();
  const args = tokens.slice(1);
  return [{ type: 'instr', mnemonic, args, lineNo, text }];
}

function parseProgramLines(raw) {
  const entries = [];
  for (const { text, lineNo } of splitProgramRaw(raw)) {
    entries.push(...parseProgramEntry(text, lineNo));
  }
  return entries;
}

function pass1CollectLabels(entries) {
  const labels = {};
  let addr = 0;
  for (const e of entries) {
    if (e.type === 'label') labels[e.name] = addr;
    if (e.type === 'instr') {
      e.addr = addr;
      addr++;
    }
  }
  return labels;
}

function packUnsigned(value, width) {
  if (value < 0 || value >= (1 << width)) {
    throw new Error(`value ${value} out of range for unsigned ${width}b field`);
  }
  return value.toString(2).padStart(width, '0');
}

function packSigned(value, width) {
  const min = -(1 << (width - 1));
  const max = (1 << (width - 1)) - 1;
  if (value < min || value > max) {
    throw new Error(`Relative jump offset (${value}) is out of bounds for a signed ${width}b field (Must be between ${min} and +${max}).`);
  }
  if (value >= 0) return packUnsigned(value, width);
  const mod = 1 << width;
  const twos = (mod + value).toString(2);
  return twos.slice(-width);
}

function parseArgToken(tok) {
  if (tok.startsWith('\\')) {
    const n = tok.slice(1);
    if (!/^-?\d+$/.test(n)) throw new Error(`Invalid decimal literal '${tok}'`);
    return { type: 'dec', value: parseInt(n, 10), raw: tok };
  }
  if (tok.startsWith('^')) {
    const h = tok.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(h)) throw new Error(`Invalid hex literal '${tok}'`);
    return { type: 'hex', value: parseInt(h, 16), raw: tok };
  }
  if (/^R\d+$/i.test(tok)) {
    return { type: 'reg', num: parseInt(tok.slice(1), 10), raw: tok };
  }
  if (/^A\d+$/i.test(tok)) {
    return { type: 'addr', num: parseInt(tok.slice(1), 10), raw: tok };
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(tok)) {
    return { type: 'label', name: tok, raw: tok };
  }
  throw new Error(`Unrecognized argument '${tok}'`);
}

function resolveArgValue(seg, arg, ctx) {
  const { labels, instrAddr, mnemonic } = ctx;
  const parsed = typeof arg === 'string' ? parseArgToken(arg) : arg;

  if (seg.kind === 'literal') return seg.bits;

  if (seg.kind === 'reg') {
    if (parsed.type !== 'reg') {
      throw new Error(`'${mnemonic}' expects a Register prefix (R) for argument ${ctx.argIndex}, but found '${parsed.raw}'.`);
    }
    return packUnsigned(parsed.num, seg.width);
  }

  if (seg.kind === 'addr') {
    if (parsed.type === 'addr') return packUnsigned(parsed.num, seg.width);
    if (parsed.type === 'label') {
      if (seg.signed) {
        const target = labels[parsed.name];
        if (target === undefined) throw new Error(`Undefined label '${parsed.name}'`);
        const offset = target - (instrAddr + 1);
        return packSigned(offset, seg.width);
      }
      const target = labels[parsed.name];
      if (target === undefined) throw new Error(`Undefined label '${parsed.name}'`);
      return packUnsigned(target, seg.width);
    }
    throw new Error(`'${mnemonic}' expects an Address prefix (A) or label for argument ${ctx.argIndex}, but found '${parsed.raw}'.`);
  }

  if (seg.kind === 'imm') {
    let num;
    if (parsed.type === 'dec') num = parsed.value;
    else if (parsed.type === 'hex') num = parsed.value;
    else if (parsed.type === 'label') {
      const target = labels[parsed.name];
      if (target === undefined) throw new Error(`Undefined label '${parsed.name}'`);
      if (seg.signed) {
        num = target - (instrAddr + 1);
      } else {
        num = target;
      }
    } else {
      throw new Error(`'${mnemonic}' expects a numeric or label argument ${ctx.argIndex}, but found '${parsed.raw}'.`);
    }
    if (seg.signed) return packSigned(num, seg.width);
    const max = (1 << seg.width) - 1;
    if (num < 0 || num > max) {
      throw new Error(`Argument ${ctx.argIndex} (${parsed.raw}) exceeds the maximum value allowed for a ${seg.width}b field (max ${max}).`);
    }
    return packUnsigned(num, seg.width);
  }

  throw new Error(`Unknown segment kind for ${mnemonic}`);
}

function encodeInstruction(isa, entry, labels) {
  const def = isa.opcodes[entry.mnemonic];
  if (!def) throw new Error(`Unknown instruction '${entry.mnemonic}' at line ${entry.lineNo}`);

  const immSegs = def.segments.filter(s => s.kind !== 'literal');
  let argIdx = 0;
  const parts = [];

  for (const seg of def.segments) {
    if (seg.kind === 'literal') {
      parts.push(seg.bits);
      continue;
    }
    const arg = entry.args[argIdx];
    if (arg === undefined) {
      const val = seg.signed ? packSigned(0, seg.width) : packUnsigned(0, seg.width);
      parts.push(val);
    } else {
      try {
        parts.push(resolveArgValue(seg, arg, {
          labels,
          instrAddr: entry.addr,
          mnemonic: entry.mnemonic,
          argIndex: argIdx + 1,
        }));
      } catch (e) {
        const col = entry.text.indexOf(arg);
        throw new Error(formatAsmError(entry.text, col >= 0 ? col : 0, e.message));
      }
      argIdx++;
    }
  }

  if (argIdx < entry.args.length) {
    throw new Error(`Too many arguments for '${entry.mnemonic}' at line ${entry.lineNo}`);
  }

  const bits = parts.join('');
  if (bits.length !== isa.wordWidth) {
    throw new Error(`Instruction '${entry.mnemonic}' encodes to ${bits.length} bits but wordWidth is ${isa.wordWidth}`);
  }
  return bits;
}

function disassembleInstruction(isa, bitsStr) {
  const bits = String(bitsStr);
  for (const mn of isa.opcodeOrder || Object.keys(isa.opcodes)) {
    const def = isa.opcodes[mn];
    if (!def) continue;
    let pos = 0;
    const argTexts = [];
    let matched = true;

    for (const seg of def.segments) {
      if (seg.kind === 'literal') {
        if (bits.substr(pos, seg.bits.length) !== seg.bits) {
          matched = false;
          break;
        }
        pos += seg.bits.length;
        continue;
      }
      const field = bits.substr(pos, seg.width);
      if (field.length !== seg.width) {
        matched = false;
        break;
      }
      pos += seg.width;
      if (seg.kind === 'reg') {
        argTexts.push('R' + parseInt(field, 2));
      } else if (seg.kind === 'addr') {
        argTexts.push('A' + parseInt(field, 2));
      } else if (seg.kind === 'imm') {
        let num = parseInt(field, 2);
        if (seg.signed && field[0] === '1') {
          num -= (1 << seg.width);
        }
        argTexts.push(String(num));
      }
    }

    if (matched && pos === bits.length) {
      return argTexts.length ? `${mn} ${argTexts.join(' ')}` : mn;
    }
  }
  throw new Error('Cannot disassemble instruction — no matching opcode');
}

function assembleProgram(isa, programRaw, options = {}) {
  const entries = parseProgramLines(programRaw);
  const labels = pass1CollectLabels(entries);
  const words = [];

  for (const e of entries) {
    if (e.type !== 'instr') continue;
    words.push(encodeInstruction(isa, e, labels));
  }

  const blob = words.join('');
  const instructionCount = words.length;
  const wordWidth = isa.wordWidth;

  if (options.depth !== undefined && wordWidth !== options.depth) {
    throw new Error(`ISA encodes ${wordWidth} bits per instruction but mem depth is ${options.depth}`);
  }
  if (options.length !== undefined && instructionCount > options.length) {
    throw new Error(`Program has ${instructionCount} instructions but mem length is only ${options.length}`);
  }

  return { words, blob, wordWidth, instructionCount };
}

function formatInstanceDoc(alias, inst) {
  const lines = [];
  lines.push(`${alias} (inline [${inst.kind || inst.type || 'asm'}])`);
  lines.push('  decode:');
  lines.push('    disassembler only');
  lines.push('  valid contexts:');
  lines.push('    show()');
  lines.push('    doc()');
  lines.push(`  wordWidth: ${inst.wordWidth}`);
  lines.push('  opcodes:');
  for (const mn of inst.opcodeOrder || Object.keys(inst.opcodes)) {
    const def = inst.opcodes[mn];
    if (def && def.sourceLine) lines.push(`    ${mn}   : ${def.sourceLine.split(':').slice(1).join(':').trim().replace(/\+/g, ' + ')}`);
    else if (def) {
      const segs = def.segments.map(s => s.kind === 'literal' ? s.bits : (s.signed ? 'S' : '') + (s.kind === 'reg' ? 'R' : s.kind === 'addr' ? 'A' : '') + s.width + 'b').join(' + ');
      lines.push(`    ${mn}   : ${segs}`);
    }
  }
  return lines;
}

function formatAsmTypeDoc(typeName, templateIsa) {
  const lines = [];
  lines.push(`inline [${typeName}] .name:`);
  lines.push('  MNEMONIC : opcode + field + field + ...');
  lines.push('  :');
  if (templateIsa && templateIsa.opcodeOrder) {
    lines.push('');
    lines.push('  # example layout:');
    for (const mn of templateIsa.opcodeOrder.slice(0, 4)) {
      const def = templateIsa.opcodes[mn];
      if (def) lines.push(`  # ${mn} : ...`);
    }
  }
  return lines;
}

const asmAssemblerExports = {
  parseFieldToken,
  parseIsaBody,
  parseProgramLines,
  assembleProgram,
  disassembleInstruction,
  formatAsmError,
  formatInstanceDoc,
  formatAsmTypeDoc,
  packSigned,
  packUnsigned,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = asmAssemblerExports;
}

if (typeof globalThis !== 'undefined') {
  for (const [k, v] of Object.entries(asmAssemblerExports)) {
    globalThis[k] = v;
  }
}
