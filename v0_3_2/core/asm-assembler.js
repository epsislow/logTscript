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
  const spanLen = Math.max(1, (lineText && col >= 0)
    ? inferSpanLength(message, lineText, col + 1)
    : 3);
  const pointer = buildCaretLine(col + 1, spanLen);
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

function skipWsComments(src, pos) {
  let p = pos;
  while (p < src.length) {
    if (/\s/.test(src[p])) { p++; continue; }
    if (src[p] === '#') {
      while (p < src.length && src[p] !== '\n') p++;
      continue;
    }
    if (src[p] === ';') { p++; continue; }
    break;
  }
  return p;
}

function parseBraceBlock(src, openBracePos) {
  if (src[openBracePos] !== '{') throw new Error('Expected "{"');
  let depth = 0;
  let p = openBracePos;
  const start = openBracePos + 1;
  while (p < src.length) {
    const c = src[p];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const body = src.substring(start, p);
        return { body, pos: p + 1 };
      }
    }
    p++;
  }
  throw new Error('Unclosed "{" in asm program block');
}

function parseProgramBodyRaw(raw) {
  const entries = [];
  let pos = skipWsComments(raw, 0);
  while (pos < raw.length) {
    pos = skipWsComments(raw, pos);
    if (pos >= raw.length) break;

    const rest = raw.slice(pos);

    const repeatM = /^repeat\s+(\d+)\s*\{/i.exec(rest);
    if (repeatM) {
      const block = parseBraceBlock(raw, pos + repeatM[0].length - 1);
      entries.push({
        type: 'repeat',
        count: parseInt(repeatM[1], 10),
        bodyRaw: block.body,
        lineNo: 0,
      });
      pos = skipWsComments(raw, block.pos);
      continue;
    }

    const alignM = /^align\s+(\d+)\s*\{/i.exec(rest);
    if (alignM) {
      const block = parseBraceBlock(raw, pos + alignM[0].length - 1);
      entries.push({
        type: 'align',
        alignment: parseInt(alignM[1], 10),
        bodyRaw: block.body,
        lineNo: 0,
      });
      pos = skipWsComments(raw, block.pos);
      continue;
    }

    const baseM = /^base\s*:\s*(.+)$/i.exec(rest.split(/[\n;#]/)[0].trim());
    if (baseM) {
      const valueRaw = baseM[1].trim();
      if (/[+\-*/|&]/.test(valueRaw.replace(/^\\-/, ''))) {
        throw new Error('base: expressions are not allowed');
      }
      entries.push({ type: 'base', valueRaw, lineNo: 0 });
      pos += rest.split(/[\n;#]/)[0].length;
      pos = skipWsComments(raw, pos);
      continue;
    }

    const useColonM = /^use\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*$/i.exec(rest.split('\n')[0].trim());
    if (useColonM) {
      const wireName = useColonM[1];
      let afterUse = pos + useColonM[0].length;
      afterUse = skipWsComments(raw, afterUse);
      const useRest = raw.slice(afterUse);
      const innerBaseM = /^base\s*:\s*(.+?)(?:\s|;|#|$)/i.exec(useRest);
      if (!innerBaseM) throw new Error(`use ${wireName}: block requires base: value`);
      const baseOverride = innerBaseM[1].trim();
      if (/[+\-*/|&]/.test(baseOverride.replace(/^\\-/, ''))) {
        throw new Error('base: expressions are not allowed');
      }
      entries.push({ type: 'use', wireName, baseOverride, lineNo: 0 });
      pos = afterUse + innerBaseM[0].length;
      pos = skipWsComments(raw, pos);
      continue;
    }

    const useM = /^use\s+([A-Za-z_][A-Za-z0-9_]*)\s*$/i.exec(rest.split(/[\n;#]/)[0].trim());
    if (useM) {
      entries.push({ type: 'use', wireName: useM[1], baseOverride: null, lineNo: 0 });
      pos += rest.split(/[\n;#]/)[0].length;
      pos = skipWsComments(raw, pos);
      continue;
    }

    const lineEnd = rest.search(/[\n;#]/);
    const lineText = (lineEnd >= 0 ? rest.slice(0, lineEnd) : rest).trim();
    if (!lineText) {
      pos += lineEnd >= 0 ? lineEnd + 1 : rest.length;
      continue;
    }
    entries.push(...parseProgramEntry(lineText, 0));
    pos += lineEnd >= 0 ? lineEnd : rest.length;
    pos = skipWsComments(raw, pos);
  }
  return entries;
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
  return parseProgramBodyRaw(raw);
}

function countInstrEntries(entries) {
  let n = 0;
  for (const e of entries) {
    if (e.type === 'instr') n++;
  }
  return n;
}

function expandProgramEntries(entries, ctx) {
  const out = [];
  let pc = ctx.startAddr || 0;
  let startAddr = ctx.startAddr || 0;

  function expandList(list) {
    const result = [];
    let localPc = pc;
    for (const e of list) {
      if (e.type === 'base') {
        const resolved = ctx.resolveBase(e.valueRaw);
        startAddr = resolved;
        localPc = resolved;
        pc = resolved;
        continue;
      }
      if (e.type === 'repeat') {
        const body = expandList(parseProgramBodyRaw(e.bodyRaw));
        for (let i = 0; i < e.count; i++) {
          result.push(...body);
          localPc += countInstrEntries(body);
        }
        pc = localPc;
        continue;
      }
      if (e.type === 'align') {
        const body = expandList(parseProgramBodyRaw(e.bodyRaw));
        const blockLen = countInstrEntries(body);
        if (blockLen < 1) {
          throw new Error('align block must contain at least one instruction');
        }
        const gap = (e.alignment - (localPc % e.alignment)) % e.alignment;
        if (gap > 0) {
          if (gap % blockLen !== 0) {
            throw new Error(
              `align ${e.alignment} cannot be satisfied using a padding block of ${blockLen} instructions`
            );
          }
          const reps = gap / blockLen;
          for (let r = 0; r < reps; r++) {
            result.push(...body);
          }
          localPc += gap;
        }
        pc = localPc;
        continue;
      }
      if (e.type === 'use') {
        if (!ctx.getWireEntries) {
          throw new Error(`use ${e.wireName} requires composition context`);
        }
        let subEntries = ctx.getWireEntries(e.wireName);
        if (e.baseOverride != null) {
          const baseVal = ctx.resolveBase(e.baseOverride);
          subEntries = relabelEntriesForBase(subEntries, baseVal);
        } else if (ctx.ignoreUseBase !== false) {
          subEntries = stripBaseDirectives(subEntries);
        }
        const expanded = expandList(subEntries);
        result.push(...expanded);
        localPc += countInstrEntries(expanded);
        pc = localPc;
        continue;
      }
      if (e.type === 'label' || e.type === 'instr') {
        result.push(e);
        if (e.type === 'instr') localPc++;
        pc = localPc;
      }
    }
    return result;
  }

  const flat = expandList(entries);
  ctx.startAddr = startAddr;
  return flat;
}

function stripBaseDirectives(entries) {
  return entries.filter(e => e.type !== 'base');
}

function relabelEntriesForBase(entries, baseVal) {
  const withoutBase = stripBaseDirectives(entries);
  return [{ type: 'base', valueRaw: String(baseVal), lineNo: 0 }, ...withoutBase];
}

function pass1CollectLabels(entries, startAddr = 0) {
  const labels = {};
  let addr = startAddr;
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
  if (/^[A-Za-z_][A-Za-z0-9_]*>$/.test(tok)) {
    return { type: 'extLabel', name: tok.slice(0, -1), raw: tok };
  }
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
    if (parsed.type === 'extLabel') {
      if (!ctx.deferExternal) {
        const target = labels[parsed.name];
        if (target === undefined) throw new Error(`Unresolved external label '${parsed.name}'`);
        if (seg.signed) return packSigned(target - (instrAddr + 1), seg.width);
        return packUnsigned(target, seg.width);
      }
      ctx.pendingExternals.push({
        name: parsed.name,
        instrAddr,
        mnemonic,
        argIndex: ctx.argIndex,
        seg,
        argRaw: parsed.raw,
        isa: ctx.isa,
      });
      return seg.signed ? packSigned(0, seg.width) : packUnsigned(0, seg.width);
    }
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
    else if (parsed.type === 'extLabel') {
      if (!ctx.deferExternal) {
        const target = labels[parsed.name];
        if (target === undefined) throw new Error(`Unresolved external label '${parsed.name}'`);
        num = seg.signed ? target - (instrAddr + 1) : target;
      } else {
        ctx.pendingExternals.push({
          name: parsed.name,
          instrAddr,
          mnemonic,
          argIndex: ctx.argIndex,
          seg,
          argRaw: parsed.raw,
          isa: ctx.isa,
        });
        num = 0;
      }
    } else if (parsed.type === 'label') {
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

function encodeInstruction(isa, entry, labels, encodeCtx) {
  const def = isa.opcodes[entry.mnemonic];
  if (!def) throw new Error(`Unknown instruction '${entry.mnemonic}' at line ${entry.lineNo}`);

  let argIdx = 0;
  const parts = [];
  const ctx = {
    labels,
    instrAddr: entry.addr,
    mnemonic: entry.mnemonic,
    pendingExternals: encodeCtx.pendingExternals,
    deferExternal: encodeCtx.deferExternal,
    isa,
  };

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
          ...ctx,
          argIndex: argIdx + 1,
          isa,
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

function patchExternalLabels(words, instrEntries, labels, isa, pendingExternals) {
  const instrList = instrEntries.filter(e => e.type === 'instr');
  const addrToIndex = new Map();
  instrList.forEach((e, idx) => addrToIndex.set(e.addr, idx));

  for (const ref of pendingExternals) {
    const target = labels[ref.name];
    if (target === undefined) {
      throw new Error(`Unresolved external label '${ref.name}'`);
    }
    const wordIdx = addrToIndex.get(ref.instrAddr);
    if (wordIdx === undefined) continue;
    const entry = instrList[wordIdx];
    const patchedArgs = entry.args.slice();
    let repl;
    if (ref.seg.signed) {
      const off = target - (ref.instrAddr + 1);
      repl = off < 0 ? `\\${off}` : String(off);
    } else {
      repl = `A${target}`;
    }
    patchedArgs[ref.argIndex - 1] = repl;
    const patchedEntry = { ...entry, args: patchedArgs };
    const encodeCtx = { pendingExternals: [], deferExternal: false };
    const patchIsa = ref.isa || isa;
    words[wordIdx] = encodeInstruction(patchIsa, patchedEntry, labels, encodeCtx);
  }
}

function buildSegmentsFromParsed(parsed, defaultIsa, defaultIsaRef, ctx) {
  const segments = [];
  let current = { isa: defaultIsa, isaRef: defaultIsaRef, directiveEntries: [], entries: [] };

  function flush() {
    const combined = [...current.directiveEntries, ...current.entries];
    if (!combined.length) return;
    const initialStart = ctx.startAddr || 0;
    const expandCtx = {
      ...ctx,
      startAddr: initialStart,
      getWireEntries: (name) => {
        const mod = ctx.getWireModule(name);
        return mod.expandedEntries ? mod.expandedEntries.slice() : [];
      },
    };
    const flat = expandProgramEntries(combined, expandCtx);
    segments.push({
      isa: current.isa,
      isaRef: current.isaRef,
      flatEntries: flat,
      logicalStart: expandCtx.startAddr !== initialStart ? expandCtx.startAddr : null,
    });
    current = { isa: defaultIsa, isaRef: defaultIsaRef, directiveEntries: [], entries: [] };
  }

  for (const e of parsed) {
    if (e.type === 'use') {
      flush();
      const wireMod = ctx.getWireModule(e.wireName);
      let subEntries = wireMod.expandedEntries ? wireMod.expandedEntries.slice() : [];
      if (e.baseOverride != null) {
        const baseVal = ctx.resolveBase(e.baseOverride);
        subEntries = relabelEntriesForBase(subEntries, baseVal);
      } else {
        subEntries = stripBaseDirectives(subEntries);
      }
      const subIsa = wireMod.isa || defaultIsa;
      const subIsaRef = wireMod.isaRef || defaultIsaRef;
      const initialStart = 0;
      const expandCtx = {
        ...ctx,
        startAddr: initialStart,
        getWireEntries: null,
        ignoreUseBase: true,
      };
      const flat = expandProgramEntries(subEntries, expandCtx);
      segments.push({
        isa: subIsa,
        isaRef: subIsaRef,
        flatEntries: flat,
        logicalStart: e.baseOverride != null ? expandCtx.startAddr : null,
      });
      continue;
    }
    if (e.type === 'base' || e.type === 'repeat' || e.type === 'align') {
      current.directiveEntries.push(e);
      continue;
    }
    current.entries.push(e);
  }
  flush();
  return segments;
}

function segmentAsmStartAddr(seg, globalAddr) {
  return seg.logicalStart != null ? seg.logicalStart : globalAddr;
}

function assembleProgramModule(isa, isaRef, programRaw, ctx) {
  const parsed = parseProgramBodyRaw(programRaw);
  const hasUse = parsed.some(e => e.type === 'use');
  const startAddr = ctx.startAddr || 0;

  if (hasUse) {
    if (!ctx.getWireModule) {
      throw new Error('use requires wire modules from interpreter');
    }
    const segments = buildSegmentsFromParsed(parsed, isa, isaRef, ctx);
    const allWords = [];
    const allInstructions = [];
    const allExpanded = [];
    const allPending = [];
    const segmentMeta = [];
    let globalAddr = startAddr;
    let blobOffset = 0;

    for (const seg of segments) {
      const pending = [];
      const mod = assembleFromEntries(seg.isa, seg.isaRef, seg.flatEntries, {
        startAddr: segmentAsmStartAddr(seg, globalAddr),
        deferExternal: true,
        pendingExternalsOut: pending,
      });
      segmentMeta.push({
        isaRef: seg.isaRef,
        instrCount: mod.instructionCount,
        blobOffset,
      });
      blobOffset += mod.blob.length;
      allWords.push(...mod.words);
      for (const ins of mod.instructions) {
        allInstructions.push({ ...ins, index: allInstructions.length, isa: seg.isa });
      }
      allExpanded.push(...seg.flatEntries);
      allPending.push(...pending);
      globalAddr += mod.instructionCount;
    }

    const globalLabels = pass1CollectLabels(allExpanded, startAddr);
    if (allPending.length) {
      patchExternalLabels(allWords, allExpanded, globalLabels, isa, allPending);
      allInstructions.forEach((ins, i) => {
        if (allWords[i] != null) ins.word = allWords[i];
      });
    }

    return {
      blob: allWords.join(''),
      words: allWords,
      wordWidth: isa.wordWidth,
      instructionCount: allWords.length,
      labels: globalLabels,
      instructions: allInstructions,
      expandedEntries: allExpanded.filter(e => e.type === 'label' || e.type === 'instr'),
      segments: segmentMeta,
      basePreferred: startAddr,
      externRefs: allPending.map(r => ({ name: r.name, fromIndex: r.instrAddr })),
      isa,
      isaRef,
    };
  }

  const expandCtx = {
    ...ctx,
    startAddr,
    getWireEntries: ctx.getWireEntries || null,
  };
  const flat = expandProgramEntries(parsed, expandCtx);
  const effectiveStart = expandCtx.startAddr != null ? expandCtx.startAddr : startAddr;
  const pending = [];
  const module = assembleFromEntries(isa, isaRef, flat, {
    startAddr: effectiveStart,
    deferExternal: true,
    pendingExternalsOut: pending,
  });

  const unresolved = pending.filter(r => module.labels[r.name] === undefined);
  if (unresolved.length && !ctx.allowUnresolvedExternal) {
    throw new Error(`Unresolved external label '${unresolved[0].name}'`);
  }

  module.isa = isa;
  module.isaRef = isaRef;
  return module;
}

function buildInstructionIndex(words, instrEntries, isa, isaRef) {
  const instructions = [];
  let wi = 0;
  for (const e of instrEntries) {
    if (e.type !== 'instr') continue;
    const argsText = e.args.join(' ');
    instructions.push({
      index: wi,
      isaRef: isaRef || null,
      mnemonic: e.mnemonic,
      args: argsText,
      argsList: e.args.slice(),
      sourceLine: e.text,
      word: words[wi],
    });
    wi++;
  }
  return instructions;
}

function assembleFromEntries(isa, isaRef, flatEntries, options = {}) {
  const startAddr = options.startAddr || 0;
  const labels = pass1CollectLabels(flatEntries, startAddr);
  const pendingExternals = options.pendingExternalsOut || [];
  const encodeCtx = {
    pendingExternals,
    deferExternal: options.deferExternal !== false,
  };
  const words = [];

  for (const e of flatEntries) {
    if (e.type !== 'instr') continue;
    words.push(encodeInstruction(isa, e, labels, encodeCtx));
  }

  if (pendingExternals.length && options.resolveExternals) {
    patchExternalLabels(words, flatEntries, labels, isa, pendingExternals);
  }

  const blob = words.join('');
  const instructions = buildInstructionIndex(words, flatEntries, isa, isaRef);

  return {
    blob,
    words,
    wordWidth: isa.wordWidth,
    instructionCount: words.length,
    labels,
    instructions,
    expandedEntries: flatEntries.filter(e => e.type === 'label' || e.type === 'instr'),
    segments: [{ isaRef: isaRef || null, instrCount: words.length, blobOffset: 0 }],
    basePreferred: startAddr,
    externRefs: pendingExternals.map(r => ({ name: r.name, fromIndex: r.instrAddr })),
  };
}

function assembleProgram(isa, programRaw, options = {}) {
  const ctx = options.asmCtx || {
    resolveBase: (raw) => {
      const t = String(raw).trim();
      if (t.startsWith('\\')) return parseInt(t.slice(1), 10);
      if (/^\d+$/.test(t)) return parseInt(t, 10);
      throw new Error(`Cannot resolve base '${raw}' without asmCtx`);
    },
    startAddr: 0,
    allowUnresolvedExternal: false,
  };
  const module = assembleProgramModule(isa, options.isaRef || null, programRaw, ctx);
  return {
    words: module.words,
    blob: module.blob,
    wordWidth: module.wordWidth,
    instructionCount: module.instructionCount,
    module,
  };
}

function formatModuleDecode(module) {
  if (!module || !module.instructions || !module.instructions.length) {
    return '';
  }
  const isa = module.isa;
  if (isa) {
    return module.instructions.map(ins => {
      const segIsa = ins.isa || isa;
      if (ins.word) {
        try {
          return disassembleInstruction(segIsa, ins.word);
        } catch (_) { /* fall through */ }
      }
      const args = ins.args || (ins.argsList && ins.argsList.join(' ')) || '';
      return args ? `${ins.mnemonic} ${args}` : ins.mnemonic;
    }).join('\n');
  }
  return module.instructions.map(ins => {
    const args = ins.args || (ins.argsList && ins.argsList.join(' ')) || '';
    return args ? `${ins.mnemonic} ${args}` : ins.mnemonic;
  }).join('\n');
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
        let num = parseInt(field, 2);
        if (seg.signed && field[0] === '1') {
          num -= (1 << seg.width);
          argTexts.push(String(num));
        } else {
          argTexts.push('A' + num);
        }
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

function disassembleProgram(isa, bitsStr) {
  const bits = String(bitsStr);
  const w = isa.wordWidth;
  if (!w || w < 1) throw new Error('Invalid ISA wordWidth');
  if (bits.length % w !== 0) {
    throw new Error(
      `Cannot disassemble program — ${bits.length} bits is not a multiple of wordWidth ${w}`
    );
  }
  if (bits.length === w) {
    return disassembleInstruction(isa, bits);
  }
  const lines = [];
  for (let i = 0; i < bits.length; i += w) {
    lines.push(disassembleInstruction(isa, bits.substr(i, w)));
  }
  return lines.join('\n');
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
  parseProgramBodyRaw,
  assembleProgram,
  assembleProgramModule,
  formatModuleDecode,
  disassembleInstruction,
  disassembleProgram,
  formatAsmError,
  formatInstanceDoc,
  formatAsmTypeDoc,
  packSigned,
  packUnsigned,
  expandProgramEntries,
  pass1CollectLabels,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = asmAssemblerExports;
}

if (typeof globalThis !== 'undefined') {
  for (const [k, v] of Object.entries(asmAssemblerExports)) {
    globalThis[k] = v;
  }
}
