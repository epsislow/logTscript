/**
 * LogTScript browser test suite (subset from test_repeat.js).
 * Regenerate: node _gen_test_suite.js
 *
 * Not yet ported: parser (90-101), osc parser (134-142, 148-152), registry (200+),
 * doc, PCB, signal propagation, REG tests — add when ready.
 */
(function () {
  'use strict';

  function gateReduce(name, a, bv) {
    const len = Math.max(a.length, bv !== undefined ? bv.length : 0);
    const ap = a.padStart(len, '0');
    const bp = bv !== undefined ? bv.padStart(len, '0') : '';
    if (name === 'NOT') {
      const notBits = a.split('').map(c => c === '1' ? '0' : '1');
      return notBits.includes('1') ? '1' : '0';
    }
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      const ai = ap[i] === '1', bi = bp[i] === '1';
      let r;
      switch (name) {
        case 'AND':  r = ai && bi; break;
        case 'OR':   r = ai || bi; break;
        case 'XOR':  r = ai !== bi; break;
        case 'NAND': r = !(ai && bi); break;
        case 'NOR':  r = !(ai || bi); break;
      }
      resultBits.push(r ? '1' : '0');
    }
    return resultBits.includes('1') ? '1' : '0';
  }

  function gateExpand(name, a, bv) {
    const len = Math.max(a.length, bv !== undefined ? bv.length : 0);
    const ap = a.padStart(len, '0');
    const bp = bv !== undefined ? bv.padStart(len, '0') : '';
    if (name === 'NOTe') {
      return a.split('').map(c => c === '1' ? '0' : '1').join('');
    }
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      const ai = ap[i] === '1', bi = bp[i] === '1';
      let r;
      switch (name) {
        case 'ANDe':  r = ai && bi; break;
        case 'ORe':   r = ai || bi; break;
        case 'XORe':  r = ai !== bi; break;
        case 'NANDe': r = !(ai && bi); break;
        case 'NORe':  r = !(ai || bi); break;
      }
      resultBits.push(r ? '1' : '0');
    }
    return resultBits.join('');
  }

  function gate(name, a, bv) {
    const applyOp = (ai, bi) => {
      switch (name) {
        case 'AND':  return ai && bi;
        case 'OR':   return ai || bi;
        case 'XOR':  return ai !== bi;
        case 'NXOR': return ai === bi;
        case 'NAND': return !(ai && bi);
        case 'NOR':  return !(ai || bi);
        case 'EQ':   return ai === bi;
      }
    };
    if (name === 'NOT') {
      return a.split('').map(c => c === '1' ? '0' : '1').join('');
    }
    if (bv === undefined) {
      const bits = a.split('');
      let acc = bits[0] === '1';
      for (let i = 1; i < bits.length; i++) {
        acc = applyOp(acc, bits[i] === '1');
      }
      return acc ? '1' : '0';
    }
    const len = Math.max(a.length, bv.length);
    const ap = a.padStart(len, '0');
    const bp = bv.padStart(len, '0');
    const resultBits = [];
    for (let i = 0; i < len; i++) {
      resultBits.push(applyOp(ap[i] === '1', bp[i] === '1') ? '1' : '0');
    }
    return resultBits.join('');
  }

  function lshift(data, n, fill) {
    if (fill === undefined) fill = '0';
    return data + fill.repeat(n);
  }

  function rshift(data, n, fill) {
    if (fill === undefined) fill = '0';
    const len = data.length;
    if (n >= len) return fill.repeat(len);
    return fill.repeat(n) + data.slice(0, len - n);
  }

  function createContext() {
    return {
      preprocessRepeat,
      preprocessShortNotation,
      tokenize(source) {
        const processed = preprocessRepeat(source);
        const t = new Tokenizer(processed);
        const tokens = [];
        let tok;
        while ((tok = t.get()).type !== 'EOF') tokens.push(tok);
        return { processed, tokens };
      },
      gateReduce, gateExpand, gate, lshift, rshift
    };
  }

  const tests = [];
  function reg(id, group, title, run) {
    tests.push({ id, group, title, run });
  }

  reg(6, 'repeat', 'Max 256 iterations (EXCEEDED)', function(h, ctx) {
    {
      h.assertThrows('16x17 = 272 throws error',
        () => preprocessRepeat(`repeat 1..16[
    repeat 1..17[
    4wire x?0?1
    ]
    ]`),
        'maximum of 256'
      );
    }
  });

  reg(7, 'repeat', 'Separate repeat groups (independent limits)', function(h, ctx) {
    {
      const src = `repeat 1..16[
    repeat 1..16[
    4wire x?0?1
    ]
    ]
    
    repeat 1..2[
    4wire y?
    ]`;
      const result = preprocessRepeat(src);
        const lines = result.trim().split('\n').filter(l => l.trim() !== '');
        h.assert('separate groups: total lines', String(lines.length), '258');
    }
  });

  reg(8, 'repeat', 'No repeat – passthrough', function(h, ctx) {
    {
      const src = `4wire a = ^FF
    4wire b = ^00`;
      const result = preprocessRepeat(src);
      h.assert('no repeat passthrough', result, src);
    }
  });

  reg(9, 'repeat', 'Repeat inside comment is ignored', function(h, ctx) {
    {
      const src = `# repeat 1..5[
    4wire a = ^FF`;
      const result = preprocessRepeat(src);
      h.assert('repeat in comment ignored', result, src);
    }
  });

  reg(10, 'repeat', 'Tokenizer accepts preprocessed output', function(h, ctx) {
    {
      const src = `repeat 1..3[
    4wire w?
    ]`;
      const { processed, tokens } = ctx.tokenize(src);
      const typeTokens = tokens.filter(t => t.type === 'TYPE');
      h.assert('tokenizer: 3 TYPE tokens from repeat', String(typeTokens.length), '3');
    }
  });

  reg(13, 'repeat', 'Nested 3 levels', function(h, ctx) {
    {
      const src = `repeat 1..2[
    repeat 1..2[
    repeat 1..2[
    4wire x?0?1?2
    ]
    ]
    ]`;
      const result = preprocessRepeat(src);
      const lines = result.trim().split('\n').filter(l => l.trim() !== '');
      h.assert('3-level nesting: 8 lines', String(lines.length), '8');
      h.assert('3-level first line', lines[0].trim(), '4wire x111');
      h.assert('3-level last line', lines[lines.length - 1].trim(), '4wire x222');
    }
  });

  reg(14, 'repeat', 'Unmatched bracket error', function(h, ctx) {
    {
      h.assertThrows('unmatched bracket',
        () => preprocessRepeat(`repeat 1..3[
    4wire a?
    `),
        'unmatched'
      );
    }
  });

  reg(15, 'repeat', 'Decimal literal \\\\N tokenized as BIN', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire c = \\15');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\15 produces BIN token', String(binTokens.length >= 1), 'true');
      h.assert('\\15 value is 1111', binTokens[binTokens.length - 1].value, '1111');
    }
  });

  reg(16, 'repeat', 'Decimal literal \\\\0', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire c = \\0');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\0 produces BIN with value 0', binTokens[binTokens.length - 1].value, '0');
    }
  });

  reg(17, 'repeat', 'Decimal literal \\\\255', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire c = \\255');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\255 value is 11111111', binTokens[binTokens.length - 1].value, '11111111');
    }
  });

  reg(19, 'repeat', 'Decimal \\\\2 produces binary 10 (padding is interpreter-level)', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('8wire q2 = \\2');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\2 tokenized as BIN 10', binTokens[binTokens.length - 1].value, '10');
    }
  });

  reg(20, 'repeat', 'HEX ^F produces 4-bit binary', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('8wire q3 = ^F');
      const hexTokens = tokens.filter(t => t.type === 'HEX');
      h.assert('^F tokenized as HEX F', hexTokens[0].value, 'F');
    }
  });

  reg(21, 'repeat', 'Large decimal \\\\1024', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('16wire q = \\1024');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\1024 value is 10000000000', binTokens[binTokens.length - 1].value, '10000000000');
    }
  });

  reg(22, 'gates-reduce', 'AND reduce - bitwise 11011 AND 11100 = 11000 → OR-reduce = 1', function(h, ctx) {
    h.assert('AND(11011, 11100)', ctx.gateReduce('AND', '11011', '11100'), '1');
  });

  reg(23, 'gates-reduce', 'AND reduce - no overlap → 0', function(h, ctx) {
    h.assert('AND(1010, 0101)', ctx.gateReduce('AND', '1010', '0101'), '0');
  });

  reg(24, 'gates-reduce', 'OR reduce', function(h, ctx) {
    h.assert('OR(0000, 0000)', ctx.gateReduce('OR', '0000', '0000'), '0');
    h.assert('OR(0000, 0001)', ctx.gateReduce('OR', '0000', '0001'), '1');
  });

  reg(25, 'gates-reduce', 'NOR reduce - NOR(1111, 0011) = 0000 → reduce = 0', function(h, ctx) {
    h.assert('NOR(1111, 0011)', ctx.gateReduce('NOR', '1111', '0011'), '0');
  });

  reg(26, 'gates-reduce', 'NOR reduce - NOR(0000, 0000) = 1111 → reduce = 1', function(h, ctx) {
    h.assert('NOR(0000, 0000)', ctx.gateReduce('NOR', '0000', '0000'), '1');
  });

  reg(27, 'gates-reduce', 'NOT reduce - NOT(1010) → 0101, reduce=1', function(h, ctx) {
    h.assert('NOT(1010)', ctx.gateReduce('NOT', '1010'), '1');
  });

  reg(28, 'gates-reduce', 'NOT reduce - NOT(1111) → 0000, reduce=0', function(h, ctx) {
    h.assert('NOT(1111)', ctx.gateReduce('NOT', '1111'), '0');
  });

  reg(29, 'gates-reduce', 'XOR reduce', function(h, ctx) {
    h.assert('XOR(1010, 1010)', ctx.gateReduce('XOR', '1010', '1010'), '0');
    h.assert('XOR(1010, 0101)', ctx.gateReduce('XOR', '1010', '0101'), '1');
  });

  reg(30, 'gates-reduce', 'NAND reduce', function(h, ctx) {
    h.assert('NAND(1111, 1111) → 0000 → 0', ctx.gateReduce('NAND', '1111', '1111'), '0');
    h.assert('NAND(1010, 0101) → 1111 → 1', ctx.gateReduce('NAND', '1010', '0101'), '1');
  });

  reg(31, 'gates-reduce', 'ANDe - bitwise AND returns N bits', function(h, ctx) {
    h.assert('ANDe(011, 101)', ctx.gateExpand('ANDe', '011', '101'), '001');
    h.assert('ANDe(1100, 1011)', ctx.gateExpand('ANDe', '1100', '1011'), '1000');
  });

  reg(32, 'gates-reduce', 'ORe - bitwise OR returns N bits', function(h, ctx) {
    h.assert('ORe(1100, 1011)', ctx.gateExpand('ORe', '1100', '1011'), '1111');
    h.assert('ORe(0000, 0000)', ctx.gateExpand('ORe', '0000', '0000'), '0000');
  });

  reg(33, 'gates-reduce', 'NOTe - bitwise NOT returns N bits', function(h, ctx) {
    h.assert('NOTe(1010)', ctx.gateExpand('NOTe', '1010'), '0101');
    h.assert('NOTe(0000)', ctx.gateExpand('NOTe', '0000'), '1111');
  });

  reg(34, 'gates-reduce', 'XORe', function(h, ctx) {
    h.assert('XORe(1010, 1100)', ctx.gateExpand('XORe', '1010', '1100'), '0110');
  });

  reg(35, 'gates-reduce', 'NANDe', function(h, ctx) {
    h.assert('NANDe(1111, 1111)', ctx.gateExpand('NANDe', '1111', '1111'), '0000');
    h.assert('NANDe(1010, 0101)', ctx.gateExpand('NANDe', '1010', '0101'), '1111');
  });

  reg(36, 'gates-reduce', 'NORe', function(h, ctx) {
    h.assert('NORe(0000, 0000)', ctx.gateExpand('NORe', '0000', '0000'), '1111');
    h.assert('NORe(1010, 0101)', ctx.gateExpand('NORe', '1010', '0101'), '0000');
  });

  reg(37, 'gates-reduce', 'Gate on different widths (padStart shorter)', function(h, ctx) {
    h.assert('ANDe(11, 1100) pads 11→0011', ctx.gateExpand('ANDe', '11', '1100'), '0000');
    h.assert('ORe(11, 1100)', ctx.gateExpand('ORe', '11', '1100'), '1111');
  });

  reg(38, 'other', 'NOTe tokenized as ID', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire x = NOTe(1010)');
      const idTokens = tokens.filter(t => t.type === 'ID' && t.value === 'NOTe');
      h.assert('NOTe recognized as ID token', String(idTokens.length), '1');
    }
  });

  reg(39, 'other', 'ANDe tokenized as ID', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire x = ANDe(1010, 0101)');
      const idTokens = tokens.filter(t => t.type === 'ID' && t.value === 'ANDe');
      h.assert('ANDe recognized as ID token', String(idTokens.length), '1');
    }
  });

  reg(40, 'shifts', 'LSHIFT basic', function(h, ctx) {
    h.assert('LSHIFT(1, 1, 0)', ctx.lshift('1', 1, '0'), '10');
    h.assert('LSHIFT(1, 1, 1)', ctx.lshift('1', 1, '1'), '11');
    h.assert('LSHIFT(10, 1, 0)', ctx.lshift('10', 1, '0'), '100');
    h.assert('LSHIFT(10, 1, 1)', ctx.lshift('10', 1, '1'), '101');
  });

  reg(41, 'shifts', 'LSHIFT default fill=0', function(h, ctx) {
    h.assert('LSHIFT(1, 1) default fill', ctx.lshift('1', 1), '10');
    h.assert('LSHIFT(10, 1) default fill', ctx.lshift('10', 1), '100');
  });

  reg(42, 'shifts', 'LSHIFT n=0', function(h, ctx) {
    h.assert('LSHIFT(101, 0, 0)', ctx.lshift('101', 0, '0'), '101');
  });

  reg(43, 'shifts', 'LSHIFT n > data.length', function(h, ctx) {
    h.assert('LSHIFT(1, 3, 0)', ctx.lshift('1', 3, '0'), '1000');
    h.assert('LSHIFT(1, 3, 1)', ctx.lshift('1', 3, '1'), '1111');
  });

  reg(44, 'shifts', 'RSHIFT basic', function(h, ctx) {
    h.assert('RSHIFT(10, 1, 0)', ctx.rshift('10', 1, '0'), '01');
    h.assert('RSHIFT(10, 1, 1)', ctx.rshift('10', 1, '1'), '11');
    h.assert('RSHIFT(1, 1, 0)', ctx.rshift('1', 1, '0'), '0');
    h.assert('RSHIFT(1, 1, 1)', ctx.rshift('1', 1, '1'), '1');
  });

  reg(45, 'shifts', 'RSHIFT default fill=0', function(h, ctx) {
    h.assert('RSHIFT(10, 1) default fill', ctx.rshift('10', 1), '01');
    h.assert('RSHIFT(1010, 2) default fill', ctx.rshift('1010', 2), '0010');
  });

  reg(46, 'shifts', 'RSHIFT n=0', function(h, ctx) {
    h.assert('RSHIFT(101, 0, 0)', ctx.rshift('101', 0, '0'), '101');
  });

  reg(47, 'shifts', 'RSHIFT n >= data.length', function(h, ctx) {
    h.assert('RSHIFT(10, 2, 0)', ctx.rshift('10', 2, '0'), '00');
    h.assert('RSHIFT(10, 5, 1)', ctx.rshift('10', 5, '1'), '11');
  });

  reg(48, 'shifts', 'RSHIFT keeps same width', function(h, ctx) {
    h.assert('RSHIFT(1010, 1, 0) = 0101', ctx.rshift('1010', 1, '0'), '0101');
    h.assert('RSHIFT(1010, 1, 1) = 1101', ctx.rshift('1010', 1, '1'), '1101');
  });

  reg(49, 'shifts', 'Tokenizer - < emits SYM when not LOAD', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire x = 10 < 1');
      const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
      h.assert('< is SYM token in shift context', String(symLt.length), '1');
    }
  });

  reg(492, 'shifts', 'Tokenizer - < after variable name is SYM (not LOAD)', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire result = test < sel');
      const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
      const loadTok = tokens.filter(t => t.type === 'LOAD');
      h.assert('< after variable is SYM not LOAD', String(symLt.length), '1');
      h.assert('no LOAD token when < is mid-line', String(loadTok.length), '0');
    }
  });

  reg(50, 'shifts', 'Tokenizer - <path remains LOAD', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('<myfile');
      const loadTok = tokens.filter(t => t.type === 'LOAD');
      h.assert('<myfile produces LOAD token', String(loadTok.length), '1');
      h.assert('LOAD token value is myfile', loadTok[0].value, 'myfile');
    }
  });

  reg(51, 'shifts', 'Tokenizer - > emits SYM', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire x = 10 > 1');
      const symGt = tokens.filter(t => t.type === 'SYM' && t.value === '>');
      h.assert('> is SYM token', String(symGt.length), '1');
    }
  });

  reg(52, 'shifts', 'LSHIFT w1 fill via operator - preprocessed text', function(h, ctx) {
    {
      const src = '4wire x = 10 < 1 w1';
      const result = preprocessRepeat(src);
      h.assert('< w1 operator passes through preprocessor', result, src);
    }
  });

  reg(53, 'bitrange', 'Tokenizer - ( after . emits SYM (', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('a.(start)');
      const types = tokens.map(t => t.type + ':' + t.value).join(' ');
      const hasDot = tokens.some(t => t.type === 'SYM' && t.value === '.');
      const hasLParen = tokens.some(t => t.type === 'SYM' && t.value === '(');
      const hasRParen = tokens.some(t => t.type === 'SYM' && t.value === ')');
      h.assert('a.(start) has SYM dot', String(hasDot), 'true');
      h.assert('a.(start) has SYM (', String(hasLParen), 'true');
      h.assert('a.(start) has SYM )', String(hasRParen), 'true');
    }
  });

  reg(54, 'bitrange', 'Tokenizer - a.(start)/(l) tokenizes correctly', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('a.(start)/(l)');
      const slash = tokens.filter(t => t.type === 'SYM' && t.value === '/');
      h.assert('a.(start)/(l) has / token', String(slash.length >= 1), 'true');
    }
  });

  reg(55, 'bitrange', 'Tokenizer - a.(start)-(end) tokenizes correctly', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('a.(s)-(e)');
      const minus = tokens.filter(t => t.type === 'SYM' && t.value === '-');
      h.assert('a.(s)-(e) has - token', String(minus.length >= 1), 'true');
    }
  });

  reg(56, 'bitrange', 'Tokenizer - preprocessor passes through dynamic bit range syntax', function(h, ctx) {
    {
      const src = '4bit sub = data.(start)/(l)';
      const result = preprocessRepeat(src);
      h.assert('dynamic bit range passes through preprocessor', result, src);
    }
  });

  reg(57, 'bitrange', 'resolveBitRange - static range {start:1, end:4}', function(h, ctx) {
    {
      function resolveBitRange(bitRange) {
        if (!bitRange.isDynamic) {
          const end = (bitRange.end !== undefined && bitRange.end !== null)
            ? bitRange.end : bitRange.start;
          return { start: bitRange.start, end };
        }
        return null;
      }
      const r = resolveBitRange({ start: 1, end: 4 });
      h.assert('static range start=1', String(r.start), '1');
      h.assert('static range end=4', String(r.end), '4');
    }
  });

  reg(58, 'bitrange', 'resolveBitRange - static single bit {start:3, end:3}', function(h, ctx) {
    {
      function resolveBitRange(bitRange) {
        if (!bitRange.isDynamic) {
          const end = (bitRange.end !== undefined && bitRange.end !== null)
            ? bitRange.end : bitRange.start;
          return { start: bitRange.start, end };
        }
        return null;
      }
      const r = resolveBitRange({ start: 3, end: 3 });
      h.assert('single bit start=3', String(r.start), '3');
      h.assert('single bit end=3', String(r.end), '3');
    }
  });

  reg(59, 'bitrange', 'resolveBitRange - static range missing end uses start', function(h, ctx) {
    {
      function resolveBitRange(bitRange) {
        if (!bitRange.isDynamic) {
          const end = (bitRange.end !== undefined && bitRange.end !== null)
            ? bitRange.end : bitRange.start;
          return { start: bitRange.start, end };
        }
        return null;
      }
      const r = resolveBitRange({ start: 2 });
      h.assert('missing end: end==start', String(r.end), '2');
    }
  });

  reg(60, 'bitrange', 'resolveBitRange - dynamic range with evalExpr simulation', function(h, ctx) {
    {
      function evalBinStr(s) { return parseInt(s, 2); }
      function mockResolve(bitRange, startVal, lenVal) {
        let start = bitRange.start !== undefined ? bitRange.start : null;
        let end   = bitRange.end   !== undefined ? bitRange.end   : null;
        if (bitRange.startExpr) start = evalBinStr(startVal);
        if (bitRange.endExpr) end = evalBinStr(lenVal);
        else if (bitRange.lenExpr) end = start + evalBinStr(lenVal) - 1;
        else if (end === null) end = start;
        return { start, end };
      }
    
      const r1 = mockResolve(
        { startExpr: true, lenExpr: true, isDynamic: true, isLength: true },
        '1',
        '100'
      );
      h.assert('dynamic start=1', String(r1.start), '1');
      h.assert('dynamic end=4 (1+4-1)', String(r1.end), '4');
    
      const r2 = mockResolve(
        { startExpr: true, endExpr: true, isDynamic: true },
        '1',
        '101'
      );
      h.assert('dynamic range start=1', String(r2.start), '1');
      h.assert('dynamic range end=5', String(r2.end), '5');
    
      const r3 = mockResolve(
        { start: 1, lenExpr: true, isDynamic: true, isLength: true },
        null,
        '100'
      );
      h.assert('mixed static start=1', String(r3.start), '1');
      h.assert('mixed dynamic len => end=4', String(r3.end), '4');
    
      function mockResolveDynStartStaticLen(bitRange, startVal) {
        let start = bitRange.start !== undefined ? bitRange.start : null;
        let end   = bitRange.end   !== undefined ? bitRange.end   : null;
        if (bitRange.startExpr) start = evalBinStr(startVal);
        if (bitRange.endExpr) {  }
        else if (bitRange.lenExpr) {  }
        else if (bitRange.len !== undefined && bitRange.len !== null) {
          end = start + bitRange.len - 1;
        } else if (end === null) { end = start; }
        return { start, end };
      }
      const r4 = mockResolveDynStartStaticLen(
        { startExpr: true, len: 4, isDynamic: true, isLength: true },
        '10'
      );
      h.assert('dynamic start=2, static len=4: start=2', String(r4.start), '2');
      h.assert('dynamic start=2, static len=4: end=5 (2+4-1)', String(r4.end), '5');
    }
  });

  reg(61, 'bit-ops', 'NOT returns same number of bits (N bits)', function(h, ctx) {
    h.assert('NOT(1) = 0',    ctx.gate('NOT', '1'),    '0');
    h.assert('NOT(0) = 1',    ctx.gate('NOT', '0'),    '1');
    h.assert('NOT(111) = 000', ctx.gate('NOT', '111'), '000');
    h.assert('NOT(101) = 010', ctx.gate('NOT', '101'), '010');
    h.assert('NOT(0000) = 1111', ctx.gate('NOT', '0000'), '1111');
    h.assert('NOT(1010) = 0101', ctx.gate('NOT', '1010'), '0101');
    
    // --- AND ---
  });

  reg(62, 'bit-ops', 'AND 2-arg: 1-bit operands → 1 bit', function(h, ctx) {
    h.assert('AND(1,1) = 1', ctx.gate('AND', '1', '1'), '1');
    h.assert('AND(0,0) = 0', ctx.gate('AND', '0', '0'), '0');
    h.assert('AND(1,0) = 0', ctx.gate('AND', '1', '0'), '0');
  });

  reg(63, 'bit-ops', 'AND 1-arg fold → 1 bit', function(h, ctx) {
    h.assert('AND(110) = 0',  ctx.gate('AND', '110'),  '0');
    h.assert('AND(111) = 1',  ctx.gate('AND', '111'),  '1');
    h.assert('AND(1111) = 1', ctx.gate('AND', '1111'), '1');
    h.assert('AND(1110) = 0', ctx.gate('AND', '1110'), '0');
  });

  reg(64, 'bit-ops', 'AND 2-arg bitwise → N bits', function(h, ctx) {
    h.assert('AND(111,101) = 101',               ctx.gate('AND', '111', '101'),        '101');
    h.assert('AND(00100101,01001111) = 00000101', ctx.gate('AND', '00100101','01001111'),'00000101');
    h.assert('AND(11,10) = 10',                  ctx.gate('AND', '11', '10'),           '10');
    
    // --- OR ---
  });

  reg(65, 'bit-ops', 'OR 2-arg: 1-bit operands → 1 bit', function(h, ctx) {
    h.assert('OR(1,1) = 1', ctx.gate('OR', '1', '1'), '1');
    h.assert('OR(0,0) = 0', ctx.gate('OR', '0', '0'), '0');
    h.assert('OR(1,0) = 1', ctx.gate('OR', '1', '0'), '1');
  });

  reg(66, 'bit-ops', 'OR 1-arg fold → 1 bit', function(h, ctx) {
    h.assert('OR(110) = 1',  ctx.gate('OR', '110'),  '1');
    h.assert('OR(111) = 1',  ctx.gate('OR', '111'),  '1');
    h.assert('OR(000) = 0',  ctx.gate('OR', '000'),  '0');
    h.assert('OR(001) = 1',  ctx.gate('OR', '001'),  '1');
  });

  reg(67, 'bit-ops', 'OR 2-arg bitwise → N bits', function(h, ctx) {
    h.assert('OR(111,101) = 111',               ctx.gate('OR', '111', '101'),         '111');
    h.assert('OR(00100101,01001111) = 01101111', ctx.gate('OR', '00100101','01001111'), '01101111');
    h.assert('OR(11,10) = 11',                  ctx.gate('OR', '11', '10'),            '11');
    
    // --- NOR ---
  });

  reg(68, 'bit-ops', 'NOR 2-arg: 1-bit operands → 1 bit', function(h, ctx) {
    h.assert('NOR(1,1) = 0', ctx.gate('NOR', '1', '1'), '0');
    h.assert('NOR(0,0) = 1', ctx.gate('NOR', '0', '0'), '1');
    h.assert('NOR(1,0) = 0', ctx.gate('NOR', '1', '0'), '0');
  });

  reg(69, 'bit-ops', 'NOR 1-arg fold → 1 bit', function(h, ctx) {
    h.assert('NOR(110) = 1',  ctx.gate('NOR', '110'), '1');
    h.assert('NOR(111) = 0',  ctx.gate('NOR', '111'), '0');
    h.assert('NOR(000) = 0',  ctx.gate('NOR', '000'), '0');
    h.assert('NOR(001) = 0',  ctx.gate('NOR', '001'), '0');
  });

  reg(70, 'bit-ops', 'NOR 2-arg bitwise → N bits', function(h, ctx) {
    h.assert('NOR(111,101) = 000',               ctx.gate('NOR', '111', '101'),         '000');
    h.assert('NOR(00100101,01001111) = 10010000', ctx.gate('NOR', '00100101','01001111'), '10010000');
    h.assert('NOR(11,10) = 00',                  ctx.gate('NOR', '11', '10'),            '00');
    
    // --- XOR ---
  });

  reg(71, 'bit-ops', 'XOR 2-arg: 1-bit operands → 1 bit', function(h, ctx) {
    h.assert('XOR(1,1) = 0', ctx.gate('XOR', '1', '1'), '0');
    h.assert('XOR(0,0) = 0', ctx.gate('XOR', '0', '0'), '0');
    h.assert('XOR(1,0) = 1', ctx.gate('XOR', '1', '0'), '1');
  });

  reg(72, 'bit-ops', 'XOR 1-arg fold → 1 bit', function(h, ctx) {
    h.assert('XOR(110) = 0',  ctx.gate('XOR', '110'), '0');
    h.assert('XOR(111) = 1',  ctx.gate('XOR', '111'), '1');
    h.assert('XOR(1010) = 0', ctx.gate('XOR', '1010'), '0');
    h.assert('XOR(1011) = 1', ctx.gate('XOR', '1011'), '1');
  });

  reg(73, 'bit-ops', 'XOR 2-arg bitwise → N bits', function(h, ctx) {
    h.assert('XOR(111,101) = 010',               ctx.gate('XOR', '111', '101'),         '010');
    h.assert('XOR(00100101,01001111) = 01101010', ctx.gate('XOR', '00100101','01001111'), '01101010');
    h.assert('XOR(11,10) = 01',                  ctx.gate('XOR', '11', '10'),            '01');
    
    // --- NAND ---
  });

  reg(74, 'bit-ops', 'NAND 2-arg: 1-bit operands → 1 bit', function(h, ctx) {
    h.assert('NAND(1,1) = 0', ctx.gate('NAND', '1', '1'), '0');
    h.assert('NAND(0,0) = 1', ctx.gate('NAND', '0', '0'), '1');
    h.assert('NAND(1,0) = 1', ctx.gate('NAND', '1', '0'), '1');
  });

  reg(75, 'bit-ops', 'NAND 1-arg fold → 1 bit', function(h, ctx) {
    h.assert('NAND(110) = 1',  ctx.gate('NAND', '110'), '1');
    h.assert('NAND(111) = 1',  ctx.gate('NAND', '111'), '1');
    h.assert('NAND(1111) = 0', ctx.gate('NAND', '1111'), '0');
    h.assert('NAND(000) = 1',  ctx.gate('NAND', '000'), '1');
  });

  reg(76, 'bit-ops', 'NAND 2-arg bitwise → N bits', function(h, ctx) {
    h.assert('NAND(111,101) = 010',               ctx.gate('NAND', '111', '101'),         '010');
    h.assert('NAND(00100101,01001111) = 11111010', ctx.gate('NAND', '00100101','01001111'), '11111010');
    h.assert('NAND(11,10) = 01',                  ctx.gate('NAND', '11', '10'),            '01');
    
    // --- NXOR (XNOR) ---
  });

  reg(77, 'bit-ops', 'NXOR 2-arg: 1-bit operands → 1 bit', function(h, ctx) {
    h.assert('NXOR(1,1) = 1', ctx.gate('NXOR', '1', '1'), '1');
    h.assert('NXOR(0,0) = 1', ctx.gate('NXOR', '0', '0'), '1');
    h.assert('NXOR(1,0) = 0', ctx.gate('NXOR', '1', '0'), '0');
    h.assert('NXOR(0,1) = 0', ctx.gate('NXOR', '0', '1'), '0');
  });

  reg(78, 'bit-ops', 'NXOR 1-arg fold → 1 bit', function(h, ctx) {
    h.assert('NXOR(110) = 0',  ctx.gate('NXOR', '110'), '0');
    h.assert('NXOR(111) = 1',  ctx.gate('NXOR', '111'), '1');
    h.assert('NXOR(1010) = 1', ctx.gate('NXOR', '1010'), '1');
    h.assert('NXOR(11) = 1',   ctx.gate('NXOR', '11'),   '1');
  });

  reg(79, 'bit-ops', 'NXOR 2-arg bitwise → N bits', function(h, ctx) {
    h.assert('NXOR(111,101) = 101',  ctx.gate('NXOR', '111', '101'), '101');
    h.assert('NXOR(11,10) = 10',     ctx.gate('NXOR', '11',  '10'),  '10');
    h.assert('NXOR(1010,0101) = 0000', ctx.gate('NXOR', '1010', '0101'), '0000');
    h.assert('NXOR(1010,1010) = 1111', ctx.gate('NXOR', '1010', '1010'), '1111');
    
    // --- Edge cases ---
  });

  reg(80, 'bit-ops', 'Single-bit input for all operators', function(h, ctx) {
    h.assert('NOT single 1', ctx.gate('NOT', '1'), '0');
    h.assert('NOT single 0', ctx.gate('NOT', '0'), '1');
    h.assert('AND fold single bit 1', ctx.gate('AND', '1'), '1');
    h.assert('AND fold single bit 0', ctx.gate('AND', '0'), '0');
    h.assert('OR  fold single bit 1', ctx.gate('OR',  '1'), '1');
    h.assert('NOR fold single bit 1', ctx.gate('NOR', '1'), '1');
    h.assert('NOR fold single bit 0', ctx.gate('NOR', '0'), '0');
    h.assert('XOR fold single bit 1', ctx.gate('XOR', '1'), '1');
    h.assert('NAND fold single bit 0', ctx.gate('NAND', '0'), '0');
    h.assert('NXOR fold single bit 1', ctx.gate('NXOR', '1'), '1');
  });

  reg(81, 'bit-ops', 'Different-width args get padded', function(h, ctx) {
    h.assert('AND(11,1100) pads 11→0011 → 0000', ctx.gate('AND',  '11', '1100'), '0000');
    h.assert('OR(11,1100)  pads 11→0011 → 1111', ctx.gate('OR',   '11', '1100'), '1111');
    h.assert('XOR(11,1100) pads → 1111',          ctx.gate('XOR',  '11', '1100'), '1111');
    h.assert('NOR(11,1100) → bitwise NOR(0011,1100)=0000', ctx.gate('NOR', '11', '1100'), '0000');
  });

  reg(82, 'wire-init', ':= produces a single SYM token', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('1wire s := 1');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert(':= is a single SYM(:=) token', String(colonEq.length), '1');
      const colonOnly = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert('no stray SYM(:) when := present', String(colonOnly.length), '0');
    }
  });

  reg(83, 'wire-init', 'standalone : still produces SYM(:)', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('on: 1');
      const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert('standalone : gives SYM(:)', String(colonTok.length), '1');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert('no := when only : present', String(colonEq.length), '0');
    }
  });

  reg(84, 'wire-init', ':: still produces two SYM(:) tokens', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('comp [switch] .s ::');
      const colonToks = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert(':: gives two SYM(:)', String(colonToks.length), '2');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert(':: gives no SYM(:=)', String(colonEq.length), '0');
    }
  });

  reg(85, 'wire-init', 'full tokenization of "1wire s := 1"', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('1wire s := 1');
      const types = tokens.map(t => t.type);
      h.assert('TYPE token present',  String(types.includes('TYPE')),  'true');
      h.assert('ID token present',    String(types.includes('ID')),    'true');
      h.assert(':= SYM present',      String(tokens.some(t => t.type === 'SYM' && t.value === ':=')), 'true');
      h.assert('BIN token present',   String(types.includes('BIN')),   'true');
    }
  });

  reg(86, 'wire-init', ':= with hex literal "4wire s := ^FF"', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire s := ^FF');
      const hexTok = tokens.filter(t => t.type === 'HEX');
      h.assert('^FF hex token present after :=', String(hexTok.length), '1');
      h.assert('^FF value is FF', hexTok[0].value, 'FF');
    }
  });

  reg(87, 'wire-init', ':= with decimal \\\\N (tokenized as BIN)', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire s := \\5');
      const binTok = tokens.filter(t => t.type === 'BIN');
      h.assert('\\5 after := gives BIN', String(binTok.length >= 1), 'true');
      h.assert('\\5 BIN value is 101', binTok[binTok.length - 1].value, '101');
    }
  });

  reg(88, 'wire-init', ':= with NOT prefix "1wire s := !1"', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('1wire s := !1');
      const notTok = tokens.filter(t => t.type === 'SYM' && t.value === '!');
      h.assert('! token present after :=', String(notTok.length), '1');
      const binTok = tokens.filter(t => t.type === 'BIN');
      h.assert('BIN follows !', String(binTok.length >= 1), 'true');
    }
  });

  reg(89, 'wire-init', ':= does not interfere with .var:get syntax', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('1wire s = .sw:get');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert(':= not produced for :get syntax', String(colonEq.length), '0');
      const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert(': produced for :get syntax', String(colonTok.length), '1');
    }
  });

  reg(102, 'short-notation', 'Short notation — prefix AND', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`& a`');
      h.assert('`& a` → AND(a)', result, 'AND(a)');
    }
  });

  reg(103, 'short-notation', 'Short notation — prefix OR', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`| a`');
      h.assert('`| a` → OR(a)', result, 'OR(a)');
    }
  });

  reg(104, 'short-notation', 'Short notation — prefix XOR', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`^ a`');
      h.assert('`^ a` → XOR(a)', result, 'XOR(a)');
    }
  });

  reg(105, 'short-notation', 'Short notation — prefix NOR', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`-| a`');
      h.assert('`-| a` → NOR(a)', result, 'NOR(a)');
    }
  });

  reg(106, 'short-notation', 'Short notation — prefix NAND, NXOR', function(h, ctx) {
    {
      h.assert('`-& a` → NAND(a)', ctx.preprocessShortNotation('`-& a`'), 'NAND(a)');
      h.assert('`-^ a` → NXOR(a)', ctx.preprocessShortNotation('`-^ a`'), 'NXOR(a)');
    }
  });

  reg(107, 'short-notation', 'Short notation — infix AND', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`a & b`');
      h.assert('`a & b` → AND(a,b)', result, 'AND(a,b)');
    }
  });

  reg(108, 'short-notation', 'Short notation — infix OR, XOR, EQ', function(h, ctx) {
    {
      h.assert('`a | b` → OR(a,b)', ctx.preprocessShortNotation('`a | b`'), 'OR(a,b)');
      h.assert('`a ^ b` → XOR(a,b)', ctx.preprocessShortNotation('`a ^ b`'), 'XOR(a,b)');
      h.assert('`a = b` → EQ(a,b)', ctx.preprocessShortNotation('`a = b`'), 'EQ(a,b)');
    }
  });

  reg(109, 'short-notation', 'Short notation — infix NAND, NOR, NXOR', function(h, ctx) {
    {
      h.assert('`a -& b` → NAND(a,b)', ctx.preprocessShortNotation('`a -& b`'), 'NAND(a,b)');
      h.assert('`a -| b` → NOR(a,b)', ctx.preprocessShortNotation('`a -| b`'), 'NOR(a,b)');
      h.assert('`a -^ b` → NXOR(a,b)', ctx.preprocessShortNotation('`a -^ b`'), 'NXOR(a,b)');
    }
  });

  reg(110, 'short-notation', 'Short notation — parentheses grouping', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`(a | b) & c`');
      h.assert('`(a | b) & c` → AND(OR(a,b),c)', result, 'AND(OR(a,b),c)');
    }
  });

  reg(111, 'short-notation', 'Short notation — nested parentheses', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`(a | b) & (c | d)`');
      h.assert('`(a | b) & (c | d)`', result, 'AND(OR(a,b),OR(c,d))');
    }
  });

  reg(112, 'short-notation', 'Short notation — left-to-right chaining', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`a | b | c`');
      h.assert('`a | b | c` → OR(OR(a,b),c)', result, 'OR(OR(a,b),c)');
    }
  });

  reg(113, 'short-notation', 'Short notation — mixed prefix + infix', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`& a -| b`');
      h.assert('`& a -| b` → NOR(AND(a),b)', result, 'NOR(AND(a),b)');
    }
  });

  reg(114, 'short-notation', 'Short notation — bit ranges', function(h, ctx) {
    {
      h.assert('`a.0/4 | b.0/4`', ctx.preprocessShortNotation('`a.0/4 | b.0/4`'), 'OR(a.0/4,b.0/4)');
      h.assert('`& a.1-2/3`', ctx.preprocessShortNotation('`& a.1-2/3`'), 'AND(a.1-2/3)');
    }
  });

  reg(115, 'short-notation', 'Short notation — NOT prefix', function(h, ctx) {
    {
      h.assert('`!a & b` → AND(!a,b)', ctx.preprocessShortNotation('`!a & b`'), 'AND(!a,b)');
      h.assert('`!(a | b)` → !OR(a,b)', ctx.preprocessShortNotation('`!(a | b)`'), '!OR(a,b)');
    }
  });

  reg(116, 'short-notation', 'Short notation — complex expression from spec', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`');
      h.assert('complex bit range expr', result, 'AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))');
    }
  });

  reg(117, 'short-notation', 'Short notation — context with assignment', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('8wire c = `& (a | b)`');
      h.assert('8wire c = `& (a | b)`', result, '8wire c = AND(OR(a,b))');
    }
  });

  reg(118, 'short-notation', 'Short notation — context with def return', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('   :4bit `(a | b)`');
      h.assert(':4bit `(a | b)`', result, '   :4bit OR(a,b)');
    }
  });

  reg(119, 'short-notation', 'Short notation — binary literal operand', function(h, ctx) {
    {
      h.assert('`^ 111` → XOR(111)', ctx.preprocessShortNotation('`^ 111`'), 'XOR(111)');
      h.assert('`a & 1010`', ctx.preprocessShortNotation('`a & 1010`'), 'AND(a,1010)');
    }
  });

  reg(120, 'short-notation', 'Short notation — hex literal with []', function(h, ctx) {
    {
      h.assert('`^ [^F]` → XOR(^F)', ctx.preprocessShortNotation('`^ [^F]`'), 'XOR(^F)');
      h.assert('`a | [^FF]`', ctx.preprocessShortNotation('`a | [^FF]`'), 'OR(a,^FF)');
    }
  });

  reg(121, 'short-notation', 'Short notation — decimal literal with []', function(h, ctx) {
    {
      h.assert('`a | [\\31]`', ctx.preprocessShortNotation('`a | [\\31]`'), 'OR(a,\\31)');
    }
  });

  reg(122, 'short-notation', 'Short notation — mixed literals', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`a | [^FF] | 111`');
      h.assert('`a | [^FF] | 111`', result, 'OR(OR(a,^FF),111)');
    }
  });

  reg(123, 'short-notation', 'Short notation — decimal literal without []', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`a | \\31`');
      h.assert('`a | \\31`', result, 'OR(a,\\31)');
    }
  });

  reg(124, 'short-notation', 'Short notation — passthrough without backticks', function(h, ctx) {
    {
      const src = '8wire c = AND(a,b)';
      const result = ctx.preprocessShortNotation(src);
      h.assert('no backticks passthrough', result, src);
    }
  });

  reg(125, 'short-notation', 'Short notation — backtick in comment ignored', function(h, ctx) {
    {
      const src = '# `a | b`\n8wire c = 1';
      const result = ctx.preprocessShortNotation(src);
      h.assert('backtick in line comment ignored', result, src);
    }
  });

  reg(126, 'short-notation', 'Short notation — backtick in block comment ignored', function(h, ctx) {
    {
      const src = '#> `a | b` #<\n8wire c = 1';
      const result = ctx.preprocessShortNotation(src);
      h.assert('backtick in block comment ignored', result, src);
    }
  });

  reg(127, 'short-notation', 'Short notation — multiple backtick regions', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('`a & b` + `c | d`');
      h.assert('two backtick regions', result, 'AND(a,b) + OR(c,d)');
    }
  });

  reg(128, 'short-notation', 'Short notation — unmatched backtick throws', function(h, ctx) {
    {
      h.assertThrows('unmatched backtick',
        () => ctx.preprocessShortNotation('`a | b'),
        'Unmatched backtick'
      );
    }
  });

  reg(129, 'short-notation', 'Short notation — via preprocessRepeat pipeline', function(h, ctx) {
    {
      const result = preprocessRepeat('8wire c = `& (a | b)`');
      h.assert('preprocessRepeat expands short notation', result, '8wire c = AND(OR(a,b))');
    }
  });

  reg(130, 'short-notation', 'Short notation — with repeat', function(h, ctx) {
    {
      const src = 'repeat 1..3[\n:1bit `a.? | b.?`\n]';
      const result = preprocessRepeat(src);
      const lines = result.trim().split('\n').filter(l => l.trim() !== '');
      h.assert('repeat + short notation line count', String(lines.length), '3');
      h.assert('repeat + short line 1', lines[0].trim(), ':1bit OR(a.1,b.1)');
      h.assert('repeat + short line 2', lines[1].trim(), ':1bit OR(a.2,b.2)');
      h.assert('repeat + short line 3', lines[2].trim(), ':1bit OR(a.3,b.3)');
    }
  });

  reg(131, 'short-notation', 'Short notation — special vars', function(h, ctx) {
    {
      h.assert('`~ & a` → AND(~,a)', ctx.preprocessShortNotation('`~ & a`'), 'AND(~,a)');
      h.assert('`a | %` → OR(a,%)', ctx.preprocessShortNotation('`a | %`'), 'OR(a,%)');
    }
  });

  reg(132, 'short-notation', 'Short notation — single operand passthrough', function(h, ctx) {
    {
      h.assert('`a` → a', ctx.preprocessShortNotation('`a`'), 'a');
    }
  });

  reg(133, 'short-notation', 'Short notation — & (a | b) as return line', function(h, ctx) {
    {
      const result = ctx.preprocessShortNotation('   :1bit `& (a | b)`');
      h.assert(':1bit `& (a | b)`', result, '   :1bit AND(OR(a,b))');
    }
  });

  reg(143, 'osc', 'Tokenizer — ~ inside [~] is SPECIAL token', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('comp [~] .osc1::');
      const specialTilde = tokens.filter(t => t.type === 'SPECIAL' && t.value === '~');
      h.assert('~ inside [] is SPECIAL', String(specialTilde.length), '1');
    }
  });

  reg(144, 'osc', 'Tokenizer — osc as ID token', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('comp [osc] .osc1::');
      const oscId = tokens.filter(t => t.type === 'ID' && t.value === 'osc');
      h.assert('osc is ID token', String(oscId.length), '1');
    }
  });

  reg(145, 'osc', 'Tokenizer — :counter after component name', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('4wire cnt = .osc1:counter');
      const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      const counterTok = tokens.filter(t => t.type === 'ID' && t.value === 'counter');
      h.assert(':counter has colon SYM', String(colonTok.length >= 1), 'true');
      h.assert(':counter has counter ID', String(counterTok.length), '1');
    }
  });

  reg(146, 'osc', 'Tokenizer — :get after osc component', function(h, ctx) {
    {
      const { tokens } = ctx.tokenize('1wire v = .osc1:get');
      const getTok = tokens.filter(t => t.type === 'ID' && t.value === 'get');
      h.assert(':get has get ID token', String(getTok.length), '1');
    }
  });

  reg(147, 'osc', 'Tokenizer — comp [~] with all attributes', function(h, ctx) {
    {
      const src = `comp [~] .osc1:
      duration1: 1
      duration0: 7
      length: 4
      freq: 10
      eachCycle: 1
      :`;
      const { tokens } = ctx.tokenize(src);
      const duration1Tok = tokens.filter(t => t.type === 'ID' && t.value === 'duration1');
      const duration0Tok = tokens.filter(t => t.type === 'ID' && t.value === 'duration0');
      const freqTok = tokens.filter(t => t.type === 'ID' && t.value === 'freq');
      const eachCycleTok = tokens.filter(t => t.type === 'ID' && t.value === 'eachCycle');
      h.assert('duration1 tokenized', String(duration1Tok.length), '1');
      h.assert('duration0 tokenized', String(duration0Tok.length), '1');
      h.assert('freq tokenized', String(freqTok.length), '1');
      h.assert('eachCycle tokenized', String(eachCycleTok.length), '1');
    }
  });

  reg(153, 'osc', 'Tokenizer — freqIsSec tokenized as ID', function(h, ctx) {
    {
      const src = `comp [~] .osc1:
      freq: 5
      freqIsSec: 1
      :`;
      const { tokens } = ctx.tokenize(src);
      const freqIsSecTok = tokens.filter(t => t.type === 'ID' && t.value === 'freqIsSec');
      h.assert('freqIsSec is ID token', String(freqIsSecTok.length), '1');
    }
  });
  tests.sort((a, b) => a.id - b.id);

  window.LogTScriptTestSuite = {
    groups: [
    { id: 'repeat', label: 'Repeat preprocessor', rangeLabel: '6–21', testIds: [6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 19, 20, 21] },
    { id: 'gates-reduce', label: 'Logic gate reduce / expand', rangeLabel: '22–37', testIds: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37] },
    { id: 'shifts', label: 'LSHIFT / RSHIFT', rangeLabel: '40–52', testIds: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 492, 50, 51, 52] },
    { id: 'bitrange', label: 'Dynamic bit range', rangeLabel: '53–60', testIds: [53, 54, 55, 56, 57, 58, 59, 60] },
    { id: 'bit-ops', label: 'Bit operations', rangeLabel: '61–81', testIds: [61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81] },
    { id: 'wire-init', label: ':= wire initialization (tokenizer)', rangeLabel: '82–89', testIds: [82, 83, 84, 85, 86, 87, 88, 89] },
    { id: 'short-notation', label: 'Short notation preprocessor', rangeLabel: '102–133', testIds: [102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133] },
    { id: 'osc', label: 'Oscillator tokenizer', rangeLabel: '143–153', testIds: [143, 144, 145, 146, 147, 153] }
    ],
    tests,
    createContext
  };
})();
