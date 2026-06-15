/**
 * LogTScript browser test suite (from test_repeat.js).
 * Preprocessor/parser/registry tests (6–223). Interpreter tests in test_suite_ported.js.
 * Manifest: node _gen_manifest.js
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

  function ceilLog2Bits(n) {
    if (n <= 1) return 1;
    return Math.ceil(Math.log2(n + 1));
  }

  function countOnesBin(s) {
    let c = 0;
    for (let i = 0; i < s.length; i++) if (s[i] === '1') c++;
    return c;
  }

  function highBit(s) {
    const len = s.length;
    for (let i = 0; i < len; i++) {
      if (s[i] === '1') return '0'.repeat(i) + '1' + '0'.repeat(len - i - 1);
    }
    return '0'.repeat(len);
  }

  function lowBit(s) {
    const len = s.length;
    for (let i = len - 1; i >= 0; i--) {
      if (s[i] === '1') return '0'.repeat(i) + '1' + '0'.repeat(len - i - 1);
    }
    return '0'.repeat(len);
  }

  function anyBit(s) {
    return s.includes('1') ? '1' : '0';
  }

  function zeroBit(s) {
    return s.includes('1') ? '0' : '1';
  }

  function bitIndexWidth(len) {
    return len <= 1 ? 1 : 32 - Math.clz32(len - 1);
  }

  function bitIndexPair(s) {
    const len = s.length;
    const idxWidth = bitIndexWidth(len);
    let count = 0;
    let pos = 0;
    for (let i = 0; i < len; i++) {
      if (s[i] === '1') { count++; pos = len - 1 - i; }
    }
    const isInvalid = count !== 1 ? '1' : '0';
    const index = count === 1 ? pos.toString(2).padStart(idxWidth, '0') : '0'.repeat(idxWidth);
    return { index, isInvalid };
  }

  function oneHot(indexStr) {
    const idxWidth = indexStr.length;
    const outWidth = 1 << idxWidth;
    const idx = parseInt(indexStr, 2);
    if (isNaN(idx) || idx < 0 || idx >= outWidth) return '0'.repeat(outWidth);
    return '0'.repeat(outWidth - idx - 1) + '1' + '0'.repeat(idx);
  }

  function parityBit(s) {
    const bits = s.split('');
    let acc = bits[0] === '1';
    for (let i = 1; i < bits.length; i++) acc = acc !== (bits[i] === '1');
    return acc ? '1' : '0';
  }

  function cntOne(s) {
    return countOnesBin(s).toString(2);
  }

  function cntZero(s) {
    return (s.length - countOnesBin(s)).toString(2);
  }

  function bitSize(s) {
    const w = bitIndexWidth(s.length);
    return s.length.toString(2).padStart(w, '0');
  }

  function reverseBits(s) {
    return s.split('').reverse().join('');
  }

  function lrotate(data, count) {
    const len = data.length;
    if (len === 0) return '';
    const n = parseInt(count, 2) % len;
    return data.slice(n) + data.slice(0, n);
  }

  function rrotate(data, count) {
    const len = data.length;
    if (len === 0) return '';
    const n = parseInt(count, 2) % len;
    return data.slice(len - n) + data.slice(0, len - n);
  }

  function createSession(opts) {
    const session = LogTScriptSession.createSession(opts || {});
    session.preprocessRepeat = preprocessRepeat;
    session.preprocessShortNotation = preprocessShortNotation;
    session.gateReduce = gateReduce;
    session.gateExpand = gateExpand;
    session.gate = gate;
    session.lshift = lshift;
    session.rshift = rshift;
    session.highBit = highBit;
    session.lowBit = lowBit;
    session.anyBit = anyBit;
    session.zeroBit = zeroBit;
    session.bitIndexPair = bitIndexPair;
    session.oneHot = oneHot;
    session.parityBit = parityBit;
    session.cntOne = cntOne;
    session.cntZero = cntZero;
    session.bitSize = bitSize;
    session.reverseBits = reverseBits;
    session.lrotate = lrotate;
    session.rrotate = rrotate;
    return session;
  }

  const tests = [];
  function reg(id, group, title, run) {
    tests.push({ id, group, title, run });
  }

  reg(6, 'repeat', 'Max 256 iterations (EXCEEDED)', function(h, session) {
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

  reg(7, 'repeat', 'Separate repeat groups (independent limits)', function(h, session) {
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

  reg(8, 'repeat', 'No repeat – passthrough', function(h, session) {
    {
      const src = `4wire a = ^FF
    4wire b = ^00`;
      const result = preprocessRepeat(src);
      h.assert('no repeat passthrough', result, src);
    }
  });

  reg(9, 'repeat', 'Repeat inside comment is ignored', function(h, session) {
    {
      const src = `# repeat 1..5[
    4wire a = ^FF`;
      const result = preprocessRepeat(src);
      h.assert('repeat in comment ignored', result, src);
    }
  });

  reg(10, 'repeat', 'Tokenizer accepts preprocessed output', function(h, session) {
    {
      const src = `repeat 1..3[
    4wire w?
    ]`;
      const { processed, tokens } = session.tokenize(src);
      const typeTokens = tokens.filter(t => t.type === 'TYPE');
      h.assert('tokenizer: 3 TYPE tokens from repeat', String(typeTokens.length), '3');
    }
  });

  reg(13, 'repeat', 'Nested 3 levels', function(h, session) {
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

  reg(14, 'repeat', 'Unmatched bracket error', function(h, session) {
    {
      h.assertThrows('unmatched bracket',
        () => preprocessRepeat(`repeat 1..3[
    4wire a?
    `),
        'unmatched'
      );
    }
  });

  reg(15, 'repeat', 'Decimal literal \\\\N tokenized as BIN', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire c = \\15');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\15 produces BIN token', String(binTokens.length >= 1), 'true');
      h.assert('\\15 value is 1111', binTokens[binTokens.length - 1].value, '1111');
    }
  });

  reg(16, 'repeat', 'Decimal literal \\\\0', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire c = \\0');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\0 produces BIN with value 0', binTokens[binTokens.length - 1].value, '0');
    }
  });

  reg(17, 'repeat', 'Decimal literal \\\\255', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire c = \\255');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\255 value is 11111111', binTokens[binTokens.length - 1].value, '11111111');
    }
  });

  reg(19, 'repeat', 'Decimal \\\\2 produces binary 10 (padding is interpreter-level)', function(h, session) {
    {
      const { tokens } = session.tokenize('8wire q2 = \\2');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\2 tokenized as BIN 10', binTokens[binTokens.length - 1].value, '10');
    }
  });

  reg(20, 'repeat', 'HEX ^F produces 4-bit binary', function(h, session) {
    {
      const { tokens } = session.tokenize('8wire q3 = ^F');
      const hexTokens = tokens.filter(t => t.type === 'HEX');
      h.assert('^F tokenized as HEX F', hexTokens[0].value, 'F');
    }
  });

  reg(21, 'repeat', 'Large decimal \\\\1024', function(h, session) {
    {
      const { tokens } = session.tokenize('16wire q = \\1024');
      const binTokens = tokens.filter(t => t.type === 'BIN');
      h.assert('\\1024 value is 10000000000', binTokens[binTokens.length - 1].value, '10000000000');
    }
  });

  reg(22, 'gates-reduce', 'AND reduce - bitwise 11011 AND 11100 = 11000 → OR-reduce = 1', function(h, session) {
    h.assert('AND(11011, 11100)', session.gateReduce('AND', '11011', '11100'), '1');
  });

  reg(23, 'gates-reduce', 'AND reduce - no overlap → 0', function(h, session) {
    h.assert('AND(1010, 0101)', session.gateReduce('AND', '1010', '0101'), '0');
  });

  reg(24, 'gates-reduce', 'OR reduce', function(h, session) {
    h.assert('OR(0000, 0000)', session.gateReduce('OR', '0000', '0000'), '0');
    h.assert('OR(0000, 0001)', session.gateReduce('OR', '0000', '0001'), '1');
  });

  reg(25, 'gates-reduce', 'NOR reduce - NOR(1111, 0011) = 0000 → reduce = 0', function(h, session) {
    h.assert('NOR(1111, 0011)', session.gateReduce('NOR', '1111', '0011'), '0');
  });

  reg(26, 'gates-reduce', 'NOR reduce - NOR(0000, 0000) = 1111 → reduce = 1', function(h, session) {
    h.assert('NOR(0000, 0000)', session.gateReduce('NOR', '0000', '0000'), '1');
  });

  reg(27, 'gates-reduce', 'NOT reduce - NOT(1010) → 0101, reduce=1', function(h, session) {
    h.assert('NOT(1010)', session.gateReduce('NOT', '1010'), '1');
  });

  reg(28, 'gates-reduce', 'NOT reduce - NOT(1111) → 0000, reduce=0', function(h, session) {
    h.assert('NOT(1111)', session.gateReduce('NOT', '1111'), '0');
  });

  reg(29, 'gates-reduce', 'XOR reduce', function(h, session) {
    h.assert('XOR(1010, 1010)', session.gateReduce('XOR', '1010', '1010'), '0');
    h.assert('XOR(1010, 0101)', session.gateReduce('XOR', '1010', '0101'), '1');
  });

  reg(30, 'gates-reduce', 'NAND reduce', function(h, session) {
    h.assert('NAND(1111, 1111) → 0000 → 0', session.gateReduce('NAND', '1111', '1111'), '0');
    h.assert('NAND(1010, 0101) → 1111 → 1', session.gateReduce('NAND', '1010', '0101'), '1');
  });

  reg(31, 'gates-reduce', 'ANDe - bitwise AND returns N bits', function(h, session) {
    h.assert('ANDe(011, 101)', session.gateExpand('ANDe', '011', '101'), '001');
    h.assert('ANDe(1100, 1011)', session.gateExpand('ANDe', '1100', '1011'), '1000');
  });

  reg(32, 'gates-reduce', 'ORe - bitwise OR returns N bits', function(h, session) {
    h.assert('ORe(1100, 1011)', session.gateExpand('ORe', '1100', '1011'), '1111');
    h.assert('ORe(0000, 0000)', session.gateExpand('ORe', '0000', '0000'), '0000');
  });

  reg(33, 'gates-reduce', 'NOTe - bitwise NOT returns N bits', function(h, session) {
    h.assert('NOTe(1010)', session.gateExpand('NOTe', '1010'), '0101');
    h.assert('NOTe(0000)', session.gateExpand('NOTe', '0000'), '1111');
  });

  reg(34, 'gates-reduce', 'XORe', function(h, session) {
    h.assert('XORe(1010, 1100)', session.gateExpand('XORe', '1010', '1100'), '0110');
  });

  reg(35, 'gates-reduce', 'NANDe', function(h, session) {
    h.assert('NANDe(1111, 1111)', session.gateExpand('NANDe', '1111', '1111'), '0000');
    h.assert('NANDe(1010, 0101)', session.gateExpand('NANDe', '1010', '0101'), '1111');
  });

  reg(36, 'gates-reduce', 'NORe', function(h, session) {
    h.assert('NORe(0000, 0000)', session.gateExpand('NORe', '0000', '0000'), '1111');
    h.assert('NORe(1010, 0101)', session.gateExpand('NORe', '1010', '0101'), '0000');
  });

  reg(37, 'gates-reduce', 'Gate on different widths (padStart shorter)', function(h, session) {
    h.assert('ANDe(11, 1100) pads 11→0011', session.gateExpand('ANDe', '11', '1100'), '0000');
    h.assert('ORe(11, 1100)', session.gateExpand('ORe', '11', '1100'), '1111');
  });

  reg(38, 'other', 'NOTe tokenized as ID', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire x = NOTe(1010)');
      const idTokens = tokens.filter(t => t.type === 'ID' && t.value === 'NOTe');
      h.assert('NOTe recognized as ID token', String(idTokens.length), '1');
    }
  });

  reg(39, 'other', 'ANDe tokenized as ID', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire x = ANDe(1010, 0101)');
      const idTokens = tokens.filter(t => t.type === 'ID' && t.value === 'ANDe');
      h.assert('ANDe recognized as ID token', String(idTokens.length), '1');
    }
  });

  reg(40, 'bit-transform', 'LSHIFT basic', function(h, session) {
    h.assert('LSHIFT(1, 1, 0)', session.lshift('1', 1, '0'), '10');
    h.assert('LSHIFT(1, 1, 1)', session.lshift('1', 1, '1'), '11');
    h.assert('LSHIFT(10, 1, 0)', session.lshift('10', 1, '0'), '100');
    h.assert('LSHIFT(10, 1, 1)', session.lshift('10', 1, '1'), '101');
  });

  reg(41, 'bit-transform', 'LSHIFT default fill=0', function(h, session) {
    h.assert('LSHIFT(1, 1) default fill', session.lshift('1', 1), '10');
    h.assert('LSHIFT(10, 1) default fill', session.lshift('10', 1), '100');
  });

  reg(42, 'bit-transform', 'LSHIFT n=0', function(h, session) {
    h.assert('LSHIFT(101, 0, 0)', session.lshift('101', 0, '0'), '101');
  });

  reg(43, 'bit-transform', 'LSHIFT n > data.length', function(h, session) {
    h.assert('LSHIFT(1, 3, 0)', session.lshift('1', 3, '0'), '1000');
    h.assert('LSHIFT(1, 3, 1)', session.lshift('1', 3, '1'), '1111');
  });

  reg(44, 'bit-transform', 'RSHIFT basic', function(h, session) {
    h.assert('RSHIFT(10, 1, 0)', session.rshift('10', 1, '0'), '01');
    h.assert('RSHIFT(10, 1, 1)', session.rshift('10', 1, '1'), '11');
    h.assert('RSHIFT(1, 1, 0)', session.rshift('1', 1, '0'), '0');
    h.assert('RSHIFT(1, 1, 1)', session.rshift('1', 1, '1'), '1');
  });

  reg(45, 'bit-transform', 'RSHIFT default fill=0', function(h, session) {
    h.assert('RSHIFT(10, 1) default fill', session.rshift('10', 1), '01');
    h.assert('RSHIFT(1010, 2) default fill', session.rshift('1010', 2), '0010');
  });

  reg(46, 'bit-transform', 'RSHIFT n=0', function(h, session) {
    h.assert('RSHIFT(101, 0, 0)', session.rshift('101', 0, '0'), '101');
  });

  reg(47, 'bit-transform', 'RSHIFT n >= data.length', function(h, session) {
    h.assert('RSHIFT(10, 2, 0)', session.rshift('10', 2, '0'), '00');
    h.assert('RSHIFT(10, 5, 1)', session.rshift('10', 5, '1'), '11');
  });

  reg(48, 'bit-transform', 'RSHIFT keeps same width', function(h, session) {
    h.assert('RSHIFT(1010, 1, 0) = 0101', session.rshift('1010', 1, '0'), '0101');
    h.assert('RSHIFT(1010, 1, 1) = 1101', session.rshift('1010', 1, '1'), '1101');
  });

  reg(49, 'bit-transform', 'Tokenizer - < emits SYM when not LOAD', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire x = 10 < 1');
      const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
      h.assert('< is SYM token in shift context', String(symLt.length), '1');
    }
  });

  reg(492, 'bit-transform', 'Tokenizer - < after variable name is SYM (not LOAD)', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire result = test < sel');
      const symLt = tokens.filter(t => t.type === 'SYM' && t.value === '<');
      const loadTok = tokens.filter(t => t.type === 'LOAD');
      h.assert('< after variable is SYM not LOAD', String(symLt.length), '1');
      h.assert('no LOAD token when < is mid-line', String(loadTok.length), '0');
    }
  });

  reg(50, 'bit-transform', 'Tokenizer - <path remains LOAD', function(h, session) {
    {
      const { tokens } = session.tokenize('<myfile');
      const loadTok = tokens.filter(t => t.type === 'LOAD');
      h.assert('<myfile produces LOAD token', String(loadTok.length), '1');
      h.assert('LOAD token value is myfile', loadTok[0].value, 'myfile');
    }
  });

  reg(51, 'bit-transform', 'Tokenizer - > emits SYM', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire x = 10 > 1');
      const symGt = tokens.filter(t => t.type === 'SYM' && t.value === '>');
      h.assert('> is SYM token', String(symGt.length), '1');
    }
  });

  reg(52, 'bit-transform', 'LSHIFT w1 fill via operator - preprocessed text', function(h, session) {
    {
      const src = '4wire x = 10 < 1 w1';
      const result = preprocessRepeat(src);
      h.assert('< w1 operator passes through preprocessor', result, src);
    }
  });

  reg(493, 'bit-transform', 'REVERSE basic', function(h, session) {
    h.assert('REVERSE(0011)', session.reverseBits('0011'), '1100');
    h.assert('REVERSE(001)', session.reverseBits('001'), '100');
  });

  reg(494, 'bit-transform', 'LROTATE basic', function(h, session) {
    h.assert('LROTATE(1011, 1)', session.lrotate('1011', '1'), '0111');
    h.assert('LROTATE(1011, 01)', session.lrotate('1011', '01'), '0111');
    h.assert('LROTATE(1011, 10)', session.lrotate('1011', '10'), '1110');
    h.assert('LROTATE(1011, 010)', session.lrotate('1011', '010'), '1110');
  });

  reg(495, 'bit-transform', 'RROTATE basic', function(h, session) {
    h.assert('RROTATE(1011, 1)', session.rrotate('1011', '1'), '1101');
    h.assert('RROTATE(1011, 10)', session.rrotate('1011', '10'), '1110');
  });

  reg(496, 'bit-transform', 'LROTATE count modulo width', function(h, session) {
    h.assert('LROTATE(1011, 100) mod 4', session.lrotate('1011', '100'), '1011');
  });

  reg(53, 'bitrange', 'Tokenizer - ( after . emits SYM (', function(h, session) {
    {
      const { tokens } = session.tokenize('a.(start)');
      const types = tokens.map(t => t.type + ':' + t.value).join(' ');
      const hasDot = tokens.some(t => t.type === 'SYM' && t.value === '.');
      const hasLParen = tokens.some(t => t.type === 'SYM' && t.value === '(');
      const hasRParen = tokens.some(t => t.type === 'SYM' && t.value === ')');
      h.assert('a.(start) has SYM dot', String(hasDot), 'true');
      h.assert('a.(start) has SYM (', String(hasLParen), 'true');
      h.assert('a.(start) has SYM )', String(hasRParen), 'true');
    }
  });

  reg(54, 'bitrange', 'Tokenizer - a.(start)/(l) tokenizes correctly', function(h, session) {
    {
      const { tokens } = session.tokenize('a.(start)/(l)');
      const slash = tokens.filter(t => t.type === 'SYM' && t.value === '/');
      h.assert('a.(start)/(l) has / token', String(slash.length >= 1), 'true');
    }
  });

  reg(55, 'bitrange', 'Tokenizer - a.(start)-(end) tokenizes correctly', function(h, session) {
    {
      const { tokens } = session.tokenize('a.(s)-(e)');
      const minus = tokens.filter(t => t.type === 'SYM' && t.value === '-');
      h.assert('a.(s)-(e) has - token', String(minus.length >= 1), 'true');
    }
  });

  reg(56, 'bitrange', 'Tokenizer - preprocessor passes through dynamic bit range syntax', function(h, session) {
    {
      const src = '4bit sub = data.(start)/(l)';
      const result = preprocessRepeat(src);
      h.assert('dynamic bit range passes through preprocessor', result, src);
    }
  });

  reg(57, 'bitrange', 'resolveBitRange - static range {start:1, end:4}', function(h, session) {
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

  reg(58, 'bitrange', 'resolveBitRange - static single bit {start:3, end:3}', function(h, session) {
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

  reg(59, 'bitrange', 'resolveBitRange - static range missing end uses start', function(h, session) {
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

  reg(60, 'bitrange', 'resolveBitRange - dynamic range with evalExpr simulation', function(h, session) {
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

  reg(61, 'bit-ops', 'NOT returns same number of bits (N bits)', function(h, session) {
    h.assert('NOT(1) = 0',    session.gate('NOT', '1'),    '0');
    h.assert('NOT(0) = 1',    session.gate('NOT', '0'),    '1');
    h.assert('NOT(111) = 000', session.gate('NOT', '111'), '000');
    h.assert('NOT(101) = 010', session.gate('NOT', '101'), '010');
    h.assert('NOT(0000) = 1111', session.gate('NOT', '0000'), '1111');
    h.assert('NOT(1010) = 0101', session.gate('NOT', '1010'), '0101');
    
    // --- AND ---
  });

  reg(62, 'bit-ops', 'AND 2-arg: 1-bit operands → 1 bit', function(h, session) {
    h.assert('AND(1,1) = 1', session.gate('AND', '1', '1'), '1');
    h.assert('AND(0,0) = 0', session.gate('AND', '0', '0'), '0');
    h.assert('AND(1,0) = 0', session.gate('AND', '1', '0'), '0');
  });

  reg(63, 'bit-ops', 'AND 1-arg fold → 1 bit', function(h, session) {
    h.assert('AND(110) = 0',  session.gate('AND', '110'),  '0');
    h.assert('AND(111) = 1',  session.gate('AND', '111'),  '1');
    h.assert('AND(1111) = 1', session.gate('AND', '1111'), '1');
    h.assert('AND(1110) = 0', session.gate('AND', '1110'), '0');
  });

  reg(64, 'bit-ops', 'AND 2-arg bitwise → N bits', function(h, session) {
    h.assert('AND(111,101) = 101',               session.gate('AND', '111', '101'),        '101');
    h.assert('AND(00100101,01001111) = 00000101', session.gate('AND', '00100101','01001111'),'00000101');
    h.assert('AND(11,10) = 10',                  session.gate('AND', '11', '10'),           '10');
    
    // --- OR ---
  });

  reg(65, 'bit-ops', 'OR 2-arg: 1-bit operands → 1 bit', function(h, session) {
    h.assert('OR(1,1) = 1', session.gate('OR', '1', '1'), '1');
    h.assert('OR(0,0) = 0', session.gate('OR', '0', '0'), '0');
    h.assert('OR(1,0) = 1', session.gate('OR', '1', '0'), '1');
  });

  reg(66, 'bit-ops', 'OR 1-arg fold → 1 bit', function(h, session) {
    h.assert('OR(110) = 1',  session.gate('OR', '110'),  '1');
    h.assert('OR(111) = 1',  session.gate('OR', '111'),  '1');
    h.assert('OR(000) = 0',  session.gate('OR', '000'),  '0');
    h.assert('OR(001) = 1',  session.gate('OR', '001'),  '1');
  });

  reg(67, 'bit-ops', 'OR 2-arg bitwise → N bits', function(h, session) {
    h.assert('OR(111,101) = 111',               session.gate('OR', '111', '101'),         '111');
    h.assert('OR(00100101,01001111) = 01101111', session.gate('OR', '00100101','01001111'), '01101111');
    h.assert('OR(11,10) = 11',                  session.gate('OR', '11', '10'),            '11');
    
    // --- NOR ---
  });

  reg(68, 'bit-ops', 'NOR 2-arg: 1-bit operands → 1 bit', function(h, session) {
    h.assert('NOR(1,1) = 0', session.gate('NOR', '1', '1'), '0');
    h.assert('NOR(0,0) = 1', session.gate('NOR', '0', '0'), '1');
    h.assert('NOR(1,0) = 0', session.gate('NOR', '1', '0'), '0');
  });

  reg(69, 'bit-ops', 'NOR 1-arg fold → 1 bit', function(h, session) {
    h.assert('NOR(110) = 1',  session.gate('NOR', '110'), '1');
    h.assert('NOR(111) = 0',  session.gate('NOR', '111'), '0');
    h.assert('NOR(000) = 0',  session.gate('NOR', '000'), '0');
    h.assert('NOR(001) = 0',  session.gate('NOR', '001'), '0');
  });

  reg(70, 'bit-ops', 'NOR 2-arg bitwise → N bits', function(h, session) {
    h.assert('NOR(111,101) = 000',               session.gate('NOR', '111', '101'),         '000');
    h.assert('NOR(00100101,01001111) = 10010000', session.gate('NOR', '00100101','01001111'), '10010000');
    h.assert('NOR(11,10) = 00',                  session.gate('NOR', '11', '10'),            '00');
    
    // --- XOR ---
  });

  reg(71, 'bit-ops', 'XOR 2-arg: 1-bit operands → 1 bit', function(h, session) {
    h.assert('XOR(1,1) = 0', session.gate('XOR', '1', '1'), '0');
    h.assert('XOR(0,0) = 0', session.gate('XOR', '0', '0'), '0');
    h.assert('XOR(1,0) = 1', session.gate('XOR', '1', '0'), '1');
  });

  reg(72, 'bit-ops', 'XOR 1-arg fold → 1 bit', function(h, session) {
    h.assert('XOR(110) = 0',  session.gate('XOR', '110'), '0');
    h.assert('XOR(111) = 1',  session.gate('XOR', '111'), '1');
    h.assert('XOR(1010) = 0', session.gate('XOR', '1010'), '0');
    h.assert('XOR(1011) = 1', session.gate('XOR', '1011'), '1');
  });

  reg(73, 'bit-ops', 'XOR 2-arg bitwise → N bits', function(h, session) {
    h.assert('XOR(111,101) = 010',               session.gate('XOR', '111', '101'),         '010');
    h.assert('XOR(00100101,01001111) = 01101010', session.gate('XOR', '00100101','01001111'), '01101010');
    h.assert('XOR(11,10) = 01',                  session.gate('XOR', '11', '10'),            '01');
    
    // --- NAND ---
  });

  reg(74, 'bit-ops', 'NAND 2-arg: 1-bit operands → 1 bit', function(h, session) {
    h.assert('NAND(1,1) = 0', session.gate('NAND', '1', '1'), '0');
    h.assert('NAND(0,0) = 1', session.gate('NAND', '0', '0'), '1');
    h.assert('NAND(1,0) = 1', session.gate('NAND', '1', '0'), '1');
  });

  reg(75, 'bit-ops', 'NAND 1-arg fold → 1 bit', function(h, session) {
    h.assert('NAND(110) = 1',  session.gate('NAND', '110'), '1');
    h.assert('NAND(111) = 1',  session.gate('NAND', '111'), '1');
    h.assert('NAND(1111) = 0', session.gate('NAND', '1111'), '0');
    h.assert('NAND(000) = 1',  session.gate('NAND', '000'), '1');
  });

  reg(76, 'bit-ops', 'NAND 2-arg bitwise → N bits', function(h, session) {
    h.assert('NAND(111,101) = 010',               session.gate('NAND', '111', '101'),         '010');
    h.assert('NAND(00100101,01001111) = 11111010', session.gate('NAND', '00100101','01001111'), '11111010');
    h.assert('NAND(11,10) = 01',                  session.gate('NAND', '11', '10'),            '01');
    
    // --- NXOR (XNOR) ---
  });

  reg(77, 'bit-ops', 'NXOR 2-arg: 1-bit operands → 1 bit', function(h, session) {
    h.assert('NXOR(1,1) = 1', session.gate('NXOR', '1', '1'), '1');
    h.assert('NXOR(0,0) = 1', session.gate('NXOR', '0', '0'), '1');
    h.assert('NXOR(1,0) = 0', session.gate('NXOR', '1', '0'), '0');
    h.assert('NXOR(0,1) = 0', session.gate('NXOR', '0', '1'), '0');
  });

  reg(78, 'bit-ops', 'NXOR 1-arg fold → 1 bit', function(h, session) {
    h.assert('NXOR(110) = 0',  session.gate('NXOR', '110'), '0');
    h.assert('NXOR(111) = 1',  session.gate('NXOR', '111'), '1');
    h.assert('NXOR(1010) = 1', session.gate('NXOR', '1010'), '1');
    h.assert('NXOR(11) = 1',   session.gate('NXOR', '11'),   '1');
  });

  reg(79, 'bit-ops', 'NXOR 2-arg bitwise → N bits', function(h, session) {
    h.assert('NXOR(111,101) = 101',  session.gate('NXOR', '111', '101'), '101');
    h.assert('NXOR(11,10) = 10',     session.gate('NXOR', '11',  '10'),  '10');
    h.assert('NXOR(1010,0101) = 0000', session.gate('NXOR', '1010', '0101'), '0000');
    h.assert('NXOR(1010,1010) = 1111', session.gate('NXOR', '1010', '1010'), '1111');
    
    // --- Edge cases ---
  });

  reg(80, 'bit-ops', 'Single-bit input for all operators', function(h, session) {
    h.assert('NOT single 1', session.gate('NOT', '1'), '0');
    h.assert('NOT single 0', session.gate('NOT', '0'), '1');
    h.assert('AND fold single bit 1', session.gate('AND', '1'), '1');
    h.assert('AND fold single bit 0', session.gate('AND', '0'), '0');
    h.assert('OR  fold single bit 1', session.gate('OR',  '1'), '1');
    h.assert('NOR fold single bit 1', session.gate('NOR', '1'), '1');
    h.assert('NOR fold single bit 0', session.gate('NOR', '0'), '0');
    h.assert('XOR fold single bit 1', session.gate('XOR', '1'), '1');
    h.assert('NAND fold single bit 0', session.gate('NAND', '0'), '0');
    h.assert('NXOR fold single bit 1', session.gate('NXOR', '1'), '1');
  });

  reg(81, 'bit-ops', 'Different-width args get padded', function(h, session) {
    h.assert('AND(11,1100) pads 11→0011 → 0000', session.gate('AND',  '11', '1100'), '0000');
    h.assert('OR(11,1100)  pads 11→0011 → 1111', session.gate('OR',   '11', '1100'), '1111');
    h.assert('XOR(11,1100) pads → 1111',          session.gate('XOR',  '11', '1100'), '1111');
    h.assert('NOR(11,1100) → bitwise NOR(0011,1100)=0000', session.gate('NOR', '11', '1100'), '0000');
  });

  reg(224, 'bit-selection', 'HIGH — highest set bit', function(h, session) {
    h.assert('HIGH(00101010)', session.highBit('00101010'), '00100000');
    h.assert('HIGH(00010000)', session.highBit('00010000'), '00010000');
    h.assert('HIGH(00000000)', session.highBit('00000000'), '00000000');
  });

  reg(225, 'bit-selection', 'LOW — lowest set bit', function(h, session) {
    h.assert('LOW(00101010)', session.lowBit('00101010'), '00000010');
    h.assert('LOW(00010000)', session.lowBit('00010000'), '00010000');
    h.assert('LOW(00000000)', session.lowBit('00000000'), '00000000');
  });

  reg(226, 'bit-selection', 'ANY and ZERO', function(h, session) {
    h.assert('ANY(00000000)', session.anyBit('00000000'), '0');
    h.assert('ANY(00010000)', session.anyBit('00010000'), '1');
    h.assert('ZERO(00000000)', session.zeroBit('00000000'), '1');
    h.assert('ZERO(00101010)', session.zeroBit('00101010'), '0');
  });

  reg(227, 'bit-selection', 'BITINDEX — one-hot valid', function(h, session) {
    const r1 = session.bitIndexPair('00000001');
    h.assert('BITINDEX(00000001) index', r1.index, '000');
    h.assert('BITINDEX(00000001) isInvalid', r1.isInvalid, '0');
    const r2 = session.bitIndexPair('00000100');
    h.assert('BITINDEX(00000100) index', r2.index, '010');
    const r3 = session.bitIndexPair('00100000');
    h.assert('BITINDEX(00100000) index', r3.index, '101');
  });

  reg(228, 'bit-selection', 'BITINDEX — invalid (zero or multiple bits)', function(h, session) {
    const r0 = session.bitIndexPair('000');
    h.assert('BITINDEX(000) index', r0.index, '00');
    h.assert('BITINDEX(000) isInvalid', r0.isInvalid, '1');
    const r2 = session.bitIndexPair('00101010');
    h.assert('BITINDEX(multi) isInvalid', r2.isInvalid, '1');
    const r3 = session.bitIndexPair('100');
    h.assert('BITINDEX(100) one-hot index', r3.index, '10');
    h.assert('BITINDEX(100) isInvalid', r3.isInvalid, '0');
  });

  reg(229, 'bit-selection', 'ONEHOT basic', function(h, session) {
    h.assert('ONEHOT(000)', session.oneHot('000'), '00000001');
    h.assert('ONEHOT(001)', session.oneHot('001'), '00000010');
    h.assert('ONEHOT(010)', session.oneHot('010'), '00000100');
    h.assert('ONEHOT(101)', session.oneHot('101'), '00100000');
    h.assert('ONEHOT(111)', session.oneHot('111'), '10000000');
  });

  reg(230, 'bit-selection', 'BITINDEX(ONEHOT(x)) inverse', function(h, session) {
    const x = '101';
    const hot = session.oneHot(x);
    const r = session.bitIndexPair(hot);
    h.assert('BITINDEX(ONEHOT(101)) index', r.index, x);
    h.assert('BITINDEX(ONEHOT(101)) isInvalid', r.isInvalid, '0');
  });

  reg(231, 'bit-selection', 'Priority encoder pattern', function(h, session) {
    const requests = '00101010';
    const winner = session.highBit(requests);
    h.assert('winner', winner, '00100000');
    h.assert('valid', session.anyBit(requests), '1');
    const r = session.bitIndexPair(winner);
    h.assert('index', r.index, '101');
    h.assert('bad', r.isInvalid, '0');
  });

  reg(232, 'bit-analysis', 'PARITY', function(h, session) {
    h.assert('PARITY(1011)', session.parityBit('1011'), '1');
    h.assert('PARITY(1110)', session.parityBit('1110'), '1');
    h.assert('PARITY(1010)', session.parityBit('1010'), '0');
  });

  reg(233, 'bit-analysis', 'CNTONE and CNTZERO', function(h, session) {
    h.assert('CNTONE(00101010)', session.cntOne('00101010'), '11');
    h.assert('CNTZERO(0101010)', session.cntZero('0101010'), '100');
  });

  reg(234, 'bit-analysis', 'BITSIZE', function(h, session) {
    h.assert('BITSIZE(0101010)', session.bitSize('0101010'), '111');
  });

  reg(235, 'right-pad-assign', '=: produces a single SYM token', function(h, session) {
    const { tokens } = session.tokenize('3wire q =: 1');
    const rightPad = tokens.filter(t => t.type === 'SYM' && t.value === '=:');
    h.assert('=: is a single SYM(=:) token', String(rightPad.length), '1');
  });

  reg(236, 'right-pad-assign', '3wire q =: 1 — no stray : after =', function(h, session) {
    const { tokens } = session.tokenize('3wire q =: 1');
    const eqColon = tokens.filter(t => t.type === 'SYM' && t.value === '=:');
    h.assert('=: present', String(eqColon.length), '1');
    const loneColon = tokens.filter(t => t.type === 'SYM' && t.value === ':');
    h.assert('no standalone : after =:', String(loneColon.length), '0');
  });

  reg(237, 'right-pad-assign', ': init and =: coexist in one script', function(h, session) {
    const src = '1wire a : 1\n3wire q =: 1';
    const { tokens } = session.tokenize(src);
    const eqColon = tokens.filter(t => t.type === 'SYM' && t.value === '=:');
    h.assert('one =: token', String(eqColon.length), '1');
    const initColon = tokens.filter((t, i, arr) => t.type === 'SYM' && t.value === ':' && arr[i - 1] && arr[i - 1].type === 'ID' && arr[i - 1].value === 'a');
    h.assert('init : after wire name', String(initColon.length >= 1), 'true');
  });

  reg(238, 'right-pad-assign', 'Parser — 3wire q =: 1 → expr + assignPad right', function(h, session) {
    const stmts = session.parse('3wire q =: 1');
    const s = stmts[0];
    h.assert('expr present', String(s.expr !== null && s.expr !== undefined), 'true');
    h.assert('assignPad is right', s.assignPad, 'right');
    h.assert('no initExpr', String(s.initExpr === undefined), 'true');
  });

  reg(239, 'right-pad-assign', 'Parser — q =: 1 → assignment.assignPad right', function(h, session) {
    const stmts = session.parse('1wire q\nq =: 1');
    const assign = stmts.find(st => st.assignment);
    h.assert('assignment found', String(assign !== undefined), 'true');
    h.assert('assignPad is right', assign.assignment.assignPad, 'right');
  });

  reg(240, 'right-pad-assign', 'Parser — 3wire q = 1 has assignPad strict', function(h, session) {
    const stmts = session.parse('3wire q = 1');
    h.assert('assignPad strict on = decl', stmts[0].assignPad, 'strict');
  });

  reg(241, 'right-pad-assign', 'padWireBits — right-pad short literal', function(h) {
    h.assert('3wire + 1', padWireBits('1', 3, 'right'), '100');
    h.assert('3wire + 10', padWireBits('10', 3, 'right'), '100');
  });

  reg(242, 'right-pad-assign', 'padWireBits — left-pad short literal', function(h) {
    h.assert('3wire + 1 left', padWireBits('1', 3, 'left'), '001');
    h.assert('8wire + 101 left', padWireBits('101', 8, 'left'), '00000101');
  });

  reg(243, 'right-pad-assign', 'padWireBits — exact width unchanged', function(h) {
    h.assert('8wire exact', padWireBits('11110000', 8, 'right'), '11110000');
  });

  reg(244, 'right-pad-assign', 'padWireBits — empty becomes zeros', function(h) {
    h.assert('empty right', padWireBits('', 4, 'right'), '0000');
    h.assert('empty left', padWireBits('', 4, 'left'), '0000');
  });

  reg(245, 'right-pad-assign', 'padWireBits — longer value passed through', function(h) {
    h.assert('no truncate in helper', padWireBits('11001', 3, 'right'), '11001');
  });

  reg(82, 'wire-init', ': init produces SYM(:) after wire name', function(h, session) {
    {
      const { tokens } = session.tokenize('1wire s : 1');
      const colonOnly = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert(': SYM present for init', String(colonOnly.length >= 1), 'true');
    }
  });

  reg(246, 'left-pad-assign', ':= produces SYM(:=) for left-pad', function(h, session) {
    {
      const { tokens } = session.tokenize('3wire q := 1');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert(':= is a single SYM(:=) token', String(colonEq.length), '1');
    }
  });

  reg(247, 'left-pad-assign', 'Parser — 3wire q := 1 → expr + assignPad left', function(h, session) {
    const stmts = session.parse('3wire q := 1');
    const s = stmts[0];
    h.assert('expr present', String(s.expr !== null && s.expr !== undefined), 'true');
    h.assert('assignPad is left', s.assignPad, 'left');
    h.assert('no initExpr', String(s.initExpr === undefined), 'true');
  });

  reg(248, 'left-pad-assign', 'Parser — q := 1 → assignment.assignPad left', function(h, session) {
    const stmts = session.parse('1wire q\nq := 1');
    const assign = stmts.find(st => st.assignment);
    h.assert('assignment found', String(assign !== undefined), 'true');
    h.assert('assignPad is left', assign.assignment.assignPad, 'left');
  });

  reg(249, 'strict-assign', 'Parser — 3wire q = 1 throws on run (strict)', function(h, session) {
    h.assertThrows('strict = short literal', function() {
      session.run('3wire q = 1');
    }, 'Expected 3 bits');
  });

  reg(250, 'strict-assign', 'fitWireAssignBits — strict rejects too long', function(h) {
    h.assertThrows('strict long', function() {
      fitWireAssignBits('11111', 4, 'strict', 'msb');
    }, 'Expected 4 bits, got 5');
    h.assert('strict exact', fitWireAssignBits('1111', 4, 'strict', 'msb'), '1111');
    h.assert('left trunc msb', fitWireAssignBits('11111', 4, 'left', 'msb'), '1111');
  });

  reg(83, 'wire-init', 'standalone : still produces SYM(:)', function(h, session) {
    {
      const { tokens } = session.tokenize('on: 1');
      const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert('standalone : gives SYM(:)', String(colonTok.length), '1');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert('no := when only : present', String(colonEq.length), '0');
    }
  });

  reg(84, 'wire-init', ':: still produces two SYM(:) tokens', function(h, session) {
    {
      const { tokens } = session.tokenize('comp [switch] .s ::');
      const colonToks = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert(':: gives two SYM(:)', String(colonToks.length), '2');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert(':: gives no SYM(:=)', String(colonEq.length), '0');
    }
  });

  reg(85, 'wire-init', 'full tokenization of "1wire s : 1"', function(h, session) {
    {
      const { tokens } = session.tokenize('1wire s : 1');
      const types = tokens.map(t => t.type);
      h.assert('TYPE token present',  String(types.includes('TYPE')),  'true');
      h.assert('ID token present',    String(types.includes('ID')),    'true');
      h.assert(': SYM present',      String(tokens.some(t => t.type === 'SYM' && t.value === ':')), 'true');
      h.assert('BIN token present',   String(types.includes('BIN')),   'true');
    }
  });

  reg(86, 'wire-init', ': init with hex literal "4wire s : ^FF"', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire s : ^FF');
      const hexTok = tokens.filter(t => t.type === 'HEX');
      h.assert('^FF hex token present after :', String(hexTok.length), '1');
      h.assert('^FF value is FF', hexTok[0].value, 'FF');
    }
  });

  reg(87, 'wire-init', ': init with decimal \\\\N (tokenized as BIN)', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire s : \\5');
      const binTok = tokens.filter(t => t.type === 'BIN');
      h.assert('\\5 after : gives BIN', String(binTok.length >= 1), 'true');
      h.assert('\\5 BIN value is 101', binTok[binTok.length - 1].value, '101');
    }
  });

  reg(88, 'wire-init', ': init with NOT prefix "1wire s : !1"', function(h, session) {
    {
      const { tokens } = session.tokenize('1wire s : !1');
      const notTok = tokens.filter(t => t.type === 'SYM' && t.value === '!');
      h.assert('! token present after :', String(notTok.length), '1');
      const binTok = tokens.filter(t => t.type === 'BIN');
      h.assert('BIN follows !', String(binTok.length >= 1), 'true');
    }
  });

  reg(89, 'wire-init', ':= does not interfere with .var:get syntax', function(h, session) {
    {
      const { tokens } = session.tokenize('1wire s = .sw:get');
      const colonEq = tokens.filter(t => t.type === 'SYM' && t.value === ':=');
      h.assert(':= not produced for :get syntax', String(colonEq.length), '0');
      const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      h.assert(': produced for :get syntax', String(colonTok.length), '1');
    }
  });

  reg(102, 'short-notation', 'Short notation — prefix AND', function(h, session) {
    {
      const result = session.preprocessShortNotation('`& a`');
      h.assert('`& a` → AND(a)', result, 'AND(a)');
    }
  });

  reg(103, 'short-notation', 'Short notation — prefix OR', function(h, session) {
    {
      const result = session.preprocessShortNotation('`| a`');
      h.assert('`| a` → OR(a)', result, 'OR(a)');
    }
  });

  reg(104, 'short-notation', 'Short notation — prefix XOR', function(h, session) {
    {
      const result = session.preprocessShortNotation('`^ a`');
      h.assert('`^ a` → XOR(a)', result, 'XOR(a)');
    }
  });

  reg(105, 'short-notation', 'Short notation — prefix NOR', function(h, session) {
    {
      const result = session.preprocessShortNotation('`-| a`');
      h.assert('`-| a` → NOR(a)', result, 'NOR(a)');
    }
  });

  reg(106, 'short-notation', 'Short notation — prefix NAND, NXOR', function(h, session) {
    {
      h.assert('`-& a` → NAND(a)', session.preprocessShortNotation('`-& a`'), 'NAND(a)');
      h.assert('`-^ a` → NXOR(a)', session.preprocessShortNotation('`-^ a`'), 'NXOR(a)');
    }
  });

  reg(107, 'short-notation', 'Short notation — infix AND', function(h, session) {
    {
      const result = session.preprocessShortNotation('`a & b`');
      h.assert('`a & b` → AND(a,b)', result, 'AND(a,b)');
    }
  });

  reg(108, 'short-notation', 'Short notation — infix OR, XOR, EQ', function(h, session) {
    {
      h.assert('`a | b` → OR(a,b)', session.preprocessShortNotation('`a | b`'), 'OR(a,b)');
      h.assert('`a ^ b` → XOR(a,b)', session.preprocessShortNotation('`a ^ b`'), 'XOR(a,b)');
      h.assert('`a = b` → EQ(a,b)', session.preprocessShortNotation('`a = b`'), 'EQ(a,b)');
    }
  });

  reg(109, 'short-notation', 'Short notation — infix NAND, NOR, NXOR', function(h, session) {
    {
      h.assert('`a -& b` → NAND(a,b)', session.preprocessShortNotation('`a -& b`'), 'NAND(a,b)');
      h.assert('`a -| b` → NOR(a,b)', session.preprocessShortNotation('`a -| b`'), 'NOR(a,b)');
      h.assert('`a -^ b` → NXOR(a,b)', session.preprocessShortNotation('`a -^ b`'), 'NXOR(a,b)');
    }
  });

  reg(110, 'short-notation', 'Short notation — parentheses grouping', function(h, session) {
    {
      const result = session.preprocessShortNotation('`(a | b) & c`');
      h.assert('`(a | b) & c` → AND(OR(a,b),c)', result, 'AND(OR(a,b),c)');
    }
  });

  reg(111, 'short-notation', 'Short notation — nested parentheses', function(h, session) {
    {
      const result = session.preprocessShortNotation('`(a | b) & (c | d)`');
      h.assert('`(a | b) & (c | d)`', result, 'AND(OR(a,b),OR(c,d))');
    }
  });

  reg(112, 'short-notation', 'Short notation — left-to-right chaining', function(h, session) {
    {
      const result = session.preprocessShortNotation('`a | b | c`');
      h.assert('`a | b | c` → OR(OR(a,b),c)', result, 'OR(OR(a,b),c)');
    }
  });

  reg(113, 'short-notation', 'Short notation — mixed prefix + infix', function(h, session) {
    {
      const result = session.preprocessShortNotation('`& a -| b`');
      h.assert('`& a -| b` → NOR(AND(a),b)', result, 'NOR(AND(a),b)');
    }
  });

  reg(114, 'short-notation', 'Short notation — bit ranges', function(h, session) {
    {
      h.assert('`a.0/4 | b.0/4`', session.preprocessShortNotation('`a.0/4 | b.0/4`'), 'OR(a.0/4,b.0/4)');
      h.assert('`& a.1-2/3`', session.preprocessShortNotation('`& a.1-2/3`'), 'AND(a.1-2/3)');
    }
  });

  reg(115, 'short-notation', 'Short notation — NOT prefix', function(h, session) {
    {
      h.assert('`!a & b` → AND(!a,b)', session.preprocessShortNotation('`!a & b`'), 'AND(!a,b)');
      h.assert('`!(a | b)` → !OR(a,b)', session.preprocessShortNotation('`!(a | b)`'), '!OR(a,b)');
    }
  });

  reg(116, 'short-notation', 'Short notation — complex expression from spec', function(h, session) {
    {
      const result = session.preprocessShortNotation('`(a.0/4 | b.0/4) & (a.4/4 | b.4/4)`');
      h.assert('complex bit range expr', result, 'AND(OR(a.0/4,b.0/4),OR(a.4/4,b.4/4))');
    }
  });

  reg(117, 'short-notation', 'Short notation — context with assignment', function(h, session) {
    {
      const result = session.preprocessShortNotation('8wire c = `& (a | b)`');
      h.assert('8wire c = `& (a | b)`', result, '8wire c = AND(OR(a,b))');
    }
  });

  reg(118, 'short-notation', 'Short notation — context with def return', function(h, session) {
    {
      const result = session.preprocessShortNotation('   :4bit `(a | b)`');
      h.assert(':4bit `(a | b)`', result, '   :4bit OR(a,b)');
    }
  });

  reg(119, 'short-notation', 'Short notation — binary literal operand', function(h, session) {
    {
      h.assert('`^ 111` → XOR(111)', session.preprocessShortNotation('`^ 111`'), 'XOR(111)');
      h.assert('`a & 1010`', session.preprocessShortNotation('`a & 1010`'), 'AND(a,1010)');
    }
  });

  reg(120, 'short-notation', 'Short notation — hex literal with []', function(h, session) {
    {
      h.assert('`^ [^F]` → XOR(^F)', session.preprocessShortNotation('`^ [^F]`'), 'XOR(^F)');
      h.assert('`a | [^FF]`', session.preprocessShortNotation('`a | [^FF]`'), 'OR(a,^FF)');
    }
  });

  reg(121, 'short-notation', 'Short notation — decimal literal with []', function(h, session) {
    {
      h.assert('`a | [\\31]`', session.preprocessShortNotation('`a | [\\31]`'), 'OR(a,\\31)');
    }
  });

  reg(122, 'short-notation', 'Short notation — mixed literals', function(h, session) {
    {
      const result = session.preprocessShortNotation('`a | [^FF] | 111`');
      h.assert('`a | [^FF] | 111`', result, 'OR(OR(a,^FF),111)');
    }
  });

  reg(123, 'short-notation', 'Short notation — decimal literal without []', function(h, session) {
    {
      const result = session.preprocessShortNotation('`a | \\31`');
      h.assert('`a | \\31`', result, 'OR(a,\\31)');
    }
  });

  reg(124, 'short-notation', 'Short notation — passthrough without backticks', function(h, session) {
    {
      const src = '8wire c = AND(a,b)';
      const result = session.preprocessShortNotation(src);
      h.assert('no backticks passthrough', result, src);
    }
  });

  reg(125, 'short-notation', 'Short notation — backtick in comment ignored', function(h, session) {
    {
      const src = '# `a | b`\n8wire c = 1';
      const result = session.preprocessShortNotation(src);
      h.assert('backtick in line comment ignored', result, src);
    }
  });

  reg(126, 'short-notation', 'Short notation — backtick in block comment ignored', function(h, session) {
    {
      const src = '#> `a | b` #<\n8wire c = 1';
      const result = session.preprocessShortNotation(src);
      h.assert('backtick in block comment ignored', result, src);
    }
  });

  reg(127, 'short-notation', 'Short notation — multiple backtick regions', function(h, session) {
    {
      const result = session.preprocessShortNotation('`a & b` + `c | d`');
      h.assert('two backtick regions', result, 'AND(a,b) + OR(c,d)');
    }
  });

  reg(128, 'short-notation', 'Short notation — unmatched backtick throws', function(h, session) {
    {
      h.assertThrows('unmatched backtick',
        () => session.preprocessShortNotation('`a | b'),
        'Unmatched backtick'
      );
    }
  });

  reg(129, 'short-notation', 'Short notation — via preprocessRepeat pipeline', function(h, session) {
    {
      const result = preprocessRepeat('8wire c = `& (a | b)`');
      h.assert('preprocessRepeat expands short notation', result, '8wire c = AND(OR(a,b))');
    }
  });

  reg(130, 'short-notation', 'Short notation — with repeat', function(h, session) {
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

  reg(131, 'short-notation', 'Short notation — special vars', function(h, session) {
    {
      h.assert('`~ & a` → AND(~,a)', session.preprocessShortNotation('`~ & a`'), 'AND(~,a)');
      h.assert('`a | %` → OR(a,%)', session.preprocessShortNotation('`a | %`'), 'OR(a,%)');
    }
  });

  reg(132, 'short-notation', 'Short notation — single operand passthrough', function(h, session) {
    {
      h.assert('`a` → a', session.preprocessShortNotation('`a`'), 'a');
    }
  });

  reg(133, 'short-notation', 'Short notation — & (a | b) as return line', function(h, session) {
    {
      const result = session.preprocessShortNotation('   :1bit `& (a | b)`');
      h.assert(':1bit `& (a | b)`', result, '   :1bit AND(OR(a,b))');
    }
  });

  reg(134, 'short-notation', 'Short notation — + concatenation inside backticks', function(h, session) {
    {
      h.assert('bit constants', session.preprocessShortNotation('`(0) + (1) + (1) + (0)`'), '0 + 1 + 1 + 0');
      h.assert('grouped bool', session.preprocessShortNotation('`(a | b) + (c | d)`'), 'OR(a,b) + OR(c,d)');
      h.assert('precedence', session.preprocessShortNotation('`a & b + c & d`'), 'AND(a,b) + AND(c,d)');
      h.assert('mixed', session.preprocessShortNotation('`(0110) + ((!C.4) | (A.4 & B))`'), '0110 + OR(!C.4,AND(A.4,B))');
    }
  });

  reg(135, 'short-notation', 'Short notation — + concat runnable assignment', function(h, session) {
    {
      const { interp } = session.run('5wire R\n5wire A\n1wire B\n5wire C\n5wire R = `(0110) + ((!C.4) | (A.4 & B))`');
      h.assert('runs', String(!!interp), 'true');
    }
  });

  reg(136, 'short-notation', 'Short notation — paranteze extra (concat și grupare)', function(h, session) {
    {
      h.assert('outer wrap concat', session.preprocessShortNotation('`((0110) + ((!C.4) | (A.4 & B)))`'), '0110 + OR(!C.4,AND(A.4,B))');
      h.assert('double const parens', session.preprocessShortNotation('`((0110))`'), '0110');
      h.assert('extra segment parens', session.preprocessShortNotation('`(0110) + (((!C.4) | (A.4 & B)))`'), '0110 + OR(!C.4,AND(A.4,B))');
      h.assert('redundant bool parens', session.preprocessShortNotation('`((a | b) & c)`'), 'AND(OR(a,b),c)');
      const { interp } = session.run('5wire R\n5wire A\n1wire B\n5wire C\n5wire R = `((0110) + ((!C.4) | (A.4 & B)))`');
      h.assert('outer wrap runs', String(!!interp), 'true');
    }
  });

  reg(143, 'osc', 'Tokenizer — ~ inside [~] is SPECIAL token', function(h, session) {
    {
      const { tokens } = session.tokenize('comp [~] .osc1::');
      const specialTilde = tokens.filter(t => t.type === 'SPECIAL' && t.value === '~');
      h.assert('~ inside [] is SPECIAL', String(specialTilde.length), '1');
    }
  });

  reg(144, 'osc', 'Tokenizer — osc as ID token', function(h, session) {
    {
      const { tokens } = session.tokenize('comp [osc] .osc1::');
      const oscId = tokens.filter(t => t.type === 'ID' && t.value === 'osc');
      h.assert('osc is ID token', String(oscId.length), '1');
    }
  });

  reg(145, 'osc', 'Tokenizer — :counter after component name', function(h, session) {
    {
      const { tokens } = session.tokenize('4wire cnt = .osc1:counter');
      const colonTok = tokens.filter(t => t.type === 'SYM' && t.value === ':');
      const counterTok = tokens.filter(t => t.type === 'ID' && t.value === 'counter');
      h.assert(':counter has colon SYM', String(colonTok.length >= 1), 'true');
      h.assert(':counter has counter ID', String(counterTok.length), '1');
    }
  });

  reg(146, 'osc', 'Tokenizer — :get after osc component', function(h, session) {
    {
      const { tokens } = session.tokenize('1wire v = .osc1:get');
      const getTok = tokens.filter(t => t.type === 'ID' && t.value === 'get');
      h.assert(':get has get ID token', String(getTok.length), '1');
    }
  });

  reg(147, 'osc', 'Tokenizer — comp [~] with all attributes', function(h, session) {
    {
      const src = `comp [~] .osc1:
      duration1: 1
      duration0: 7
      length: 4
      freq: 10
      eachCycle: 1
      :`;
      const { tokens } = session.tokenize(src);
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

  reg(153, 'osc', 'Tokenizer — freqIsSec tokenized as ID', function(h, session) {
    {
      const src = `comp [~] .osc1:
      freq: 5
      freqIsSec: 1
      :`;
      const { tokens } = session.tokenize(src);
      const freqIsSecTok = tokens.filter(t => t.type === 'ID' && t.value === 'freqIsSec');
      h.assert('freqIsSec is ID token', String(freqIsSecTok.length), '1');
    }
  });

  reg(497, 'wire-init', 'Tokenizer — underscore in wire name is ID', function(h, session) {
    const { tokens } = session.tokenize('4wire isbeq_taken = 0000');
    const idTok = tokens.filter(t => t.type === 'ID' && t.value === 'isbeq_taken');
    h.assert('isbeq_taken is ID token', String(idTok.length), '1');
  });

  reg(498, 'wire-init', 'Tokenizer — lone _ stays SPECIAL wildcard', function(h, session) {
    const { tokens } = session.tokenize('1wire _, 2wire c = MUX(sel, a, b)');
    const wild = tokens.filter(t => t.type === 'SPECIAL' && t.value === '_');
    const idUnderscore = tokens.filter(t => t.type === 'ID' && t.value === '_');
    h.assert('lone _ is SPECIAL', String(wild.length), '1');
    h.assert('no ID named _', String(idUnderscore.length), '0');
  });

  reg(499, 'wire-init', 'Parser — wire name with underscore', function(h, session) {
    const stmts = session.parse('4wire isbeq_taken = 0000');
    h.assert('decl name', stmts[0].decls[0].name, 'isbeq_taken');
  });

  reg(500, 'global-ref', 'Tokenizer — ^.ctl is GREF token', function(h, session) {
    const { tokens } = session.tokenize('4wire y = ^.ctl:LOAD');
    const gref = tokens.filter(t => t.type === 'GREF' && t.value === '.ctl');
    h.assert('GREF .ctl', String(gref.length), '1');
  });

  reg(501, 'global-ref', 'Tokenizer — ^FF remains HEX literal', function(h, session) {
    const { tokens } = session.tokenize('4wire y = ^FF');
    const hex = tokens.filter(t => t.type === 'HEX' && t.value === 'FF');
    h.assert('^FF is HEX', String(hex.length), '1');
  });

  reg(502, 'global-ref', 'Parser — ^.ctl:LOAD sets globalRef', function(h, session) {
    const stmts = session.parse('4wire y = ^.ctl:LOAD');
    const atom = stmts[0].expr[0];
    h.assert('var is .ctl', atom.var, '.ctl');
    h.assert('property LOAD', atom.property, 'LOAD');
    h.assert('globalRef true', String(atom.globalRef === true), 'true');
  });

  reg(503, 'global-ref', 'Parser — doc(^.ctl) AST', function(h, session) {
    const stmts = session.parse('doc(^.ctl)');
    h.assert('doc stmt', String(!!stmts[0].doc), 'true');
    h.assert('doc name', stmts[0].doc, '.ctl');
  });

  reg(90, 'wire-init', 'Parser — 1wire s : 1 produces initExpr {bin}', function(h, session) {
    const stmts = session.parse('1wire s : 1');
    const s = stmts[0];
    h.assert('stmt has decls', String(Array.isArray(s.decls)), 'true');
    h.assert('decls[0].name is s', s.decls[0].name, 's');
    h.assert('decls[0].type is 1wire', s.decls[0].type, '1wire');
    h.assert('expr is null', String(s.expr), 'null');
    h.assert('initExpr exists', String(s.initExpr !== undefined && s.initExpr !== null), 'true');
    h.assert('initExpr.bin is 1', s.initExpr.bin, '1');
  });

  reg(91, 'wire-init', 'Parser — 4wire s : 1101 produces initExpr {bin:1101}', function(h, session) {
    const stmts = session.parse('4wire s : 1101');
    const s = stmts[0];
    h.assert('4wire initExpr.bin is 1101', s.initExpr.bin, '1101');
    h.assert('4wire expr is null', String(s.expr), 'null');
  });

  reg(92, 'wire-init', 'Parser — 4wire s : ^FF produces initExpr {hex:FF}', function(h, session) {
    const stmts = session.parse('4wire s : ^FF');
    const s = stmts[0];
    h.assert('^FF initExpr.hex is FF', s.initExpr.hex, 'FF');
  });

  reg(93, 'wire-init', 'Parser — 1wire s : \\5 produces initExpr {bin:101}', function(h, session) {
    const stmts = session.parse('1wire s : \\5');
    const s = stmts[0];
    h.assert('\\5 initExpr.bin is 101', s.initExpr.bin, '101');
  });

  reg(94, 'wire-init', 'Parser — 1wire s : !1 produces initExpr {bin:1, not:true}', function(h, session) {
    const stmts = session.parse('1wire s : !1');
    const s = stmts[0];
    h.assert('!1 initExpr.bin is 1', s.initExpr.bin, '1');
    h.assert('!1 initExpr.not is true', String(s.initExpr.not), 'true');
  });

  reg(95, 'wire-init', 'Parser — 1wire s : !0 produces initExpr {bin:0, not:true}', function(h, session) {
    const stmts = session.parse('1wire s : !0');
    const s = stmts[0];
    h.assert('!0 initExpr.bin is 0', s.initExpr.bin, '0');
    h.assert('!0 initExpr.not is true', String(s.initExpr.not), 'true');
  });

  reg(96, 'wire-init', 'Parser — : init without not has no not field', function(h, session) {
    const stmts = session.parse('1wire s : 1');
    const s = stmts[0];
    h.assert('no not field when no !', String(!!s.initExpr.not), 'false');
  });

  reg(97, 'wire-init', 'Parser — 1wire s = expr has NO initExpr (normal assignment)', function(h, session) {
    const stmts = session.parse('1wire s = 1');
    const s = stmts[0];
    h.assert('normal = has expr not null', String(s.expr !== null), 'true');
    h.assert('normal = has no initExpr', String(s.initExpr === undefined || s.initExpr === null), 'true');
  });

  reg(98, 'wire-init', 'Parser — 1wire s (no assignment) has no initExpr and no expr', function(h, session) {
    const stmts = session.parse('1wire s');
    const s = stmts[0];
    h.assert('bare decl has no initExpr', String(s.initExpr === undefined || s.initExpr === null), 'true');
    h.assert('bare decl has no expr', String(s.expr), 'null');
  });

  reg(99, 'wire-init', 'Parser — : init with non-literal throws error', function(h, session) {
    h.assertThrows(
      '1wire s : AND(x,y) throws',
      () => session.parse('1wire s : AND(x,y)'),
      'Expected a literal'
    );
  });

  reg(100, 'wire-init', 'Parser — multiple wires with : init (8wire q : ^A5)', function(h, session) {
    const stmts = session.parse('8wire q : ^A5');
    const s = stmts[0];
    h.assert('8wire ^A5 type is 8wire', s.decls[0].type, '8wire');
    h.assert('8wire ^A5 name is q', s.decls[0].name, 'q');
    h.assert('8wire ^A5 initExpr.hex is A5', s.initExpr.hex, 'A5');
  });

  reg(101, 'wire-init', 'Parser — multiple : init statements in same script', function(h, session) {
    const stmts = session.parse(`1wire s : 1
1wire r : 0
1wire q : 1
1wire nq : 0`);
    h.assert('4 decl statements', String(stmts.length), '4');
    h.assert('s initExpr.bin = 1',  stmts[0].initExpr.bin, '1');
    h.assert('r initExpr.bin = 0',  stmts[1].initExpr.bin, '0');
    h.assert('q initExpr.bin = 1',  stmts[2].initExpr.bin, '1');
    h.assert('nq initExpr.bin = 0', stmts[3].initExpr.bin, '0');
  });

  reg(134, 'osc', 'Parser — comp [osc] .o1: with attributes', function(h, session) {
    const stmts = session.parse(`comp [osc] .o1:
  duration1: 2
  duration0: 6
  length: 4
  freq: 10
  eachCycle: 1
  :`);
    const s = stmts[0];
    h.assert('osc stmt has comp', String(s.comp !== undefined), 'true');
    h.assert('osc comp type is osc', s.comp.type, 'osc');
    h.assert('osc comp name is .o1', s.comp.name, '.o1');
    h.assert('osc duration1 is 2', String(s.comp.attributes.duration1), '2');
    h.assert('osc duration0 is 6', String(s.comp.attributes.duration0), '6');
    h.assert('osc length is 4', String(s.comp.attributes.length), '4');
    h.assert('osc freq is 10', String(s.comp.attributes.freq), '10');
    h.assert('osc eachCycle is 1', String(s.comp.attributes.eachCycle), '1');
  });

  reg(135, 'osc', 'Parser — comp [~] .o2: shortname syntax', function(h, session) {
    const stmts = session.parse(`comp [~] .o2:
  duration1: 1
  duration0: 7
  freq: 5
  :`);
    const s = stmts[0];
    h.assert('~ shortname has comp', String(s.comp !== undefined), 'true');
    h.assert('~ shortname type is osc', s.comp.type, 'osc');
    h.assert('~ shortname name is .o2', s.comp.name, '.o2');
    h.assert('~ shortname duration1 is 1', String(s.comp.attributes.duration1), '1');
    h.assert('~ shortname duration0 is 7', String(s.comp.attributes.duration0), '7');
    h.assert('~ shortname freq is 5', String(s.comp.attributes.freq), '5');
  });

  reg(136, 'osc', 'Parser — comp [osc] .o3:: minimal (no attributes)', function(h, session) {
    const stmts = session.parse('comp [osc] .o3::');
    const s = stmts[0];
    h.assert('minimal osc has comp', String(s.comp !== undefined), 'true');
    h.assert('minimal osc type is osc', s.comp.type, 'osc');
    h.assert('minimal osc name is .o3', s.comp.name, '.o3');
  });

  reg(137, 'osc', 'Parser — comp [~] .o4:: minimal shortname', function(h, session) {
    const stmts = session.parse('comp [~] .o4::');
    const s = stmts[0];
    h.assert('minimal ~ has comp', String(s.comp !== undefined), 'true');
    h.assert('minimal ~ type is osc', s.comp.type, 'osc');
    h.assert('minimal ~ name is .o4', s.comp.name, '.o4');
  });

  reg(138, 'osc', 'Parser — comp [osc] with eachCycle: 0 (each state)', function(h, session) {
    const stmts = session.parse(`comp [osc] .o5:
  eachCycle: 0
  :`);
    const s = stmts[0];
    h.assert('osc eachCycle: 0', String(s.comp.attributes.eachCycle), '0');
  });

  reg(139, 'osc', 'Parser — comp [osc] with wire assignments', function(h, session) {
    const stmts = session.parse(`comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  :
1wire osc1 = .osc1`);
    h.assert('osc + wire: 2 statements', String(stmts.length), '2');
    h.assert('first stmt is comp', String(stmts[0].comp !== undefined), 'true');
    h.assert('second stmt has decls', String(Array.isArray(stmts[1].decls)), 'true');
    h.assert('wire name is osc1', stmts[1].decls[0].name, 'osc1');
  });

  reg(140, 'osc', 'Parser — comp [osc] with :get wire', function(h, session) {
    const stmts = session.parse(`comp [osc] .osc1:
  freq: 2
  :
1wire v = .osc1:get`);
    h.assert('osc + :get wire: 2 statements', String(stmts.length), '2');
    const wireStmt = stmts[1];
    h.assert(':get wire has expr', String(wireStmt.expr !== null), 'true');
  });

  reg(141, 'osc', 'Parser — comp [osc] with :counter wire', function(h, session) {
    const stmts = session.parse(`comp [osc] .osc1:
  length: 4
  freq: 2
  :
4wire cnt = .osc1:counter`);
    h.assert('osc + :counter wire: 2 statements', String(stmts.length), '2');
    const wireStmt = stmts[1];
    h.assert(':counter wire has expr', String(wireStmt.expr !== null), 'true');
  });

  reg(142, 'osc', 'Parser — comp [osc] full program with all outputs', function(h, session) {
    const stmts = session.parse(`comp [~] .osc1:
  duration1: 1
  duration0: 7
  length: 4
  freq: 10
  eachCycle: 1
  :
1wire osc1 = .osc1
1wire osc1b = .osc1:get
4wire counter1 = .osc1:counter`);
    h.assert('full osc program: 4 statements', String(stmts.length), '4');
    h.assert('stmt 0 is comp osc', stmts[0].comp.type, 'osc');
    h.assert('stmt 1 wire osc1', stmts[1].decls[0].name, 'osc1');
    h.assert('stmt 2 wire osc1b', stmts[2].decls[0].name, 'osc1b');
    h.assert('stmt 3 wire counter1', stmts[3].decls[0].name, 'counter1');
  });

  reg(148, 'osc', 'Parser — comp [osc] with freqIsSec: 0 (Hz mode, default)', function(h, session) {
    const stmts = session.parse(`comp [osc] .o1:
  freq: 10
  freqIsSec: 0
  :`);
    const s = stmts[0];
    h.assert('freqIsSec: 0 parsed', String(s.comp.attributes.freqIsSec), '0');
    h.assert('freq: 10 parsed', String(s.comp.attributes.freq), '10');
  });

  reg(149, 'osc', 'Parser — comp [osc] with freqIsSec: 1 (seconds mode)', function(h, session) {
    const stmts = session.parse(`comp [osc] .o2:
  freq: 5
  freqIsSec: 1
  :`);
    const s = stmts[0];
    h.assert('freqIsSec: 1 parsed', String(s.comp.attributes.freqIsSec), '1');
    h.assert('freq: 5 parsed', String(s.comp.attributes.freq), '5');
  });

  reg(150, 'osc', 'Parser — comp [~] freqIsSec: 1 with large period', function(h, session) {
    const stmts = session.parse(`comp [~] .slow:
  freq: 30
  freqIsSec: 1
  duration1: 1
  duration0: 1
  :`);
    const s = stmts[0];
    h.assert('slow osc freqIsSec: 1', String(s.comp.attributes.freqIsSec), '1');
    h.assert('slow osc freq: 30', String(s.comp.attributes.freq), '30');
    h.assert('slow osc duration1: 1', String(s.comp.attributes.duration1), '1');
    h.assert('slow osc duration0: 1', String(s.comp.attributes.duration0), '1');
  });

  reg(151, 'osc', 'Parser — comp [osc] without freqIsSec (default omitted)', function(h, session) {
    const stmts = session.parse(`comp [osc] .o3:
  freq: 2
  :`);
    const s = stmts[0];
    h.assert('freqIsSec absent from attributes', String(s.comp.attributes.freqIsSec), 'undefined');
    h.assert('freq: 2 still parsed', String(s.comp.attributes.freq), '2');
  });

  reg(152, 'osc', 'Parser — comp [osc] full program with freqIsSec: 1', function(h, session) {
    const stmts = session.parse(`comp [~] .osc1:
  duration1: 4
  duration0: 4
  length: 8
  freq: 10
  freqIsSec: 1
  eachCycle: 1
  :
1wire v = .osc1
8wire cnt = .osc1:counter`);
    h.assert('full freqIsSec program: 3 statements', String(stmts.length), '3');
    h.assert('comp type osc', stmts[0].comp.type, 'osc');
    h.assert('freqIsSec: 1', String(stmts[0].comp.attributes.freqIsSec), '1');
    h.assert('freq: 10', String(stmts[0].comp.attributes.freq), '10');
    h.assert('length: 8', String(stmts[0].comp.attributes.length), '8');
  });

  reg(200, 'registry', 'Component Registry — all types registered', function(h, session) {
    const registry = session._ensureRegistry();
    const expectedTypes = ['led', 'switch', 'key', 'dip', '7seg', 'lcd', 'terminal', 'adder', 'subtract', 'multiplier', 'divider', 'shifter', 'mem', 'reg', 'counter', 'queue', 'stack', 'osc', 'rotary'];
    for (const t of expectedTypes) {
      h.assert('registry has ' + t, String(registry.has(t)), 'true');
    }
  });

  reg(201, 'registry', 'Component Registry — getWidthBits', function(h, session) {
    const registry = session._ensureRegistry();
    h.assert('led bits', String(registry.get('led').getWidthBits({})), '1');
    h.assert('switch bits', String(registry.get('switch').getWidthBits({})), '1');
    h.assert('7seg bits', String(registry.get('7seg').getWidthBits({})), '8');
    h.assert('lcd bits', String(registry.get('lcd').getWidthBits({})), '8');
    h.assert('terminal bits', String(registry.get('terminal').getWidthBits({})), '1');
    h.assert('dip default bits', String(registry.get('dip').getWidthBits({})), '4');
    h.assert('dip with length 8', String(registry.get('dip').getWidthBits({length: '8'})), '8');
    h.assert('adder default bits', String(registry.get('adder').getWidthBits({})), '4');
    h.assert('adder depth 8', String(registry.get('adder').getWidthBits({depth: '8'})), '8');
    h.assert('osc bits', String(registry.get('osc').getWidthBits({})), '1');
    h.assert('rotary default bits', String(registry.get('rotary').getWidthBits({})), '3');
    h.assert('rotary 4 states', String(registry.get('rotary').getWidthBits({states: '4'})), '2');
  });

  reg(202, 'registry', 'Component Registry — shortnames', function(h, session) {
    const registry = session._ensureRegistry();
    const shortnames = registry.getShortnames();
    h.assert('shortname 7', shortnames['7'], '7seg');
    h.assert('shortname +', shortnames['+'], 'adder');
    h.assert('shortname -', shortnames['-'], 'subtract');
    h.assert('shortname *', shortnames['*'], 'multiplier');
    h.assert('shortname /', shortnames['/'], 'divider');
    h.assert('shortname >', shortnames['>'], 'shifter');
    h.assert('shortname =', shortnames['='], 'counter');
    h.assert('shortname fifo', shortnames['fifo'], 'queue');
    h.assert('shortname lifo', shortnames['lifo'], 'stack');
    h.assert('shortname ~', shortnames['~'], 'osc');
  });

  reg(203, 'registry', 'Component Registry — supportsProperty', function(h, session) {
    const registry = session._ensureRegistry();
    h.assert('led supports get', String(registry.supportsProperty('led', 'get')), 'true');
    h.assert('adder supports get', String(registry.supportsProperty('adder', 'get')), 'true');
    h.assert('adder supports carry', String(registry.supportsProperty('adder', 'carry')), 'true');
    h.assert('divider supports mod', String(registry.supportsProperty('divider', 'mod')), 'true');
    h.assert('multiplier supports over', String(registry.supportsProperty('multiplier', 'over')), 'true');
    h.assert('shifter supports out', String(registry.supportsProperty('shifter', 'out')), 'true');
    h.assert('osc supports counter', String(registry.supportsProperty('osc', 'counter')), 'true');
    h.assert('queue supports front', String(registry.supportsProperty('queue', 'front')), 'true');
    h.assert('stack supports top', String(registry.supportsProperty('stack', 'top')), 'true');
    h.assert('queue supports free', String(registry.supportsProperty('queue', 'free')), 'true');
  });

  reg(204, 'registry', 'Component Registry — supportsRedirect', function(h, session) {
    const registry = session._ensureRegistry();
    h.assert('adder redirect carry', String(registry.supportsRedirect('adder', 'carry')), 'true');
    h.assert('divider redirect mod', String(registry.supportsRedirect('divider', 'mod')), 'true');
    h.assert('multiplier redirect over', String(registry.supportsRedirect('multiplier', 'over')), 'true');
    h.assert('shifter redirect out', String(registry.supportsRedirect('shifter', 'out')), 'true');
    h.assert('queue redirect front', String(registry.supportsRedirect('queue', 'front')), 'true');
    h.assert('queue redirect size', String(registry.supportsRedirect('queue', 'size')), 'true');
    h.assert('stack redirect top', String(registry.supportsRedirect('stack', 'top')), 'true');
    h.assert('led no carry', String(registry.supportsRedirect('led', 'carry')), 'false');
  });

  reg(205, 'registry', 'Component Registry — reservedNames', function(h, session) {
    const registry = session._ensureRegistry();
    const reserved = registry.getReservedNames();
    h.assert('led is reserved', String(reserved.includes('led')), 'true');
    h.assert('switch is reserved', String(reserved.includes('switch')), 'true');
    h.assert('key is NOT reserved', String(reserved.includes('key')), 'false');
    h.assert('osc is NOT reserved', String(reserved.includes('osc')), 'false');
    h.assert('reg is NOT reserved', String(reserved.includes('reg')), 'false');
  });

  reg(206, 'registry', 'Component Registry — specialParseAttributes', function(h, session) {
    const registry = session._ensureRegistry();
    const sevenSegAttrs = registry.get('7seg').getSpecialParseAttributes();
    h.assert('7seg has segAttributes', String(sevenSegAttrs !== null), 'true');
    h.assert('7seg segAttributes length', String(sevenSegAttrs.segAttributes.length), '8');
    h.assert('led has no special attrs', String(registry.get('led').getSpecialParseAttributes()), 'null');
  });

  reg(207, 'registry', 'Parser with registry — parseComp led', function(h, session) {
    const stmts = session.parse('comp [led] .myled::');
    h.assert('comp type is led', stmts[0].comp.type, 'led');
    h.assert('comp name is .myled', stmts[0].comp.name, '.myled');
  });

  reg(208, 'registry', 'Parser with registry — parseComp 7seg shortname', function(h, session) {
    const stmts = session.parse('comp [7] .display::');
    h.assert('comp type is 7seg', stmts[0].comp.type, '7seg');
  });

  reg(209, 'registry', 'Parser with registry — parseComp adder shortname', function(h, session) {
    const stmts = session.parse('comp [+] .add1: depth:8 :');
    h.assert('comp type is adder', stmts[0].comp.type, 'adder');
    h.assert('adder depth is 8', String(stmts[0].comp.attributes.depth), '8');
  });

  reg(210, 'registry', 'Parser with registry — parseComp osc', function(h, session) {
    const stmts = session.parse('comp [~] .osc1::');
    h.assert('comp type is osc', stmts[0].comp.type, 'osc');
  });

  reg(211, 'registry', 'getForbidDirectAssign / handleDirectAssign', function(h, session) {
    const registry = session._ensureRegistry();
    h.assert('mem allows direct assign (handleDirectAssign)', String(registry.get('mem').getForbidDirectAssign()), 'null');
    h.assert('counter forbids', String(registry.get('counter').getForbidDirectAssign() !== null), 'true');
    h.assert('osc forbids', String(registry.get('osc').getForbidDirectAssign() !== null), 'true');
    h.assert('led allows', String(registry.get('led').getForbidDirectAssign()), 'null');
    h.assert('adder allows', String(registry.get('adder').getForbidDirectAssign()), 'null');
  });

  reg(212, 'registry', 'hexTo7Seg static method', function(h, session) {
    const registry = session._ensureRegistry();
    const SevenSegComp = registry.get('7seg');
    h.assert('hex 0 -> 1111110', SevenSegComp.constructor.hexTo7Seg('0000'), '1111110');
    h.assert('hex 1 -> 0110000', SevenSegComp.constructor.hexTo7Seg('0001'), '0110000');
    h.assert('hex F -> 1000111', SevenSegComp.constructor.hexTo7Seg('1111'), '1000111');
  });

  reg(213, 'registry', 'osc supports reset property', function(h, session) {
    const registry = session._ensureRegistry();
    h.assert('osc supports reset', String(registry.supportsProperty('osc', 'reset')), 'true');
  });

  reg(214, 'registry', 'osc getSupportedProperties includes reset', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const props = oscHandler.getSupportedProperties();
    h.assert('reset in supported props', String(props.includes('reset')), 'true');
    h.assert('get still in supported props', String(props.includes('get')), 'true');
    h.assert('counter still in supported props', String(props.includes('counter')), 'true');
  });

  reg(215, 'registry', 'osc applyProperties resets counter when reset=1', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '101010', length: 6 } };
    oscHandler.applyProperties(comp, '.osc1', { reset: { expr: null, value: '1' } }, 'immediate', false, {});
    h.assert('counter reset to 000000', comp.oscState.counterValue, '000000');
  });

  reg(216, 'registry', 'osc applyProperties does NOT reset when reset=0', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '101010', length: 6 } };
    oscHandler.applyProperties(comp, '.osc1', { reset: { expr: null, value: '0' } }, 'immediate', false, {});
    h.assert('counter unchanged at 101010', comp.oscState.counterValue, '101010');
  });

  reg(217, 'registry', 'osc applyProperties skips when when!=immediate', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '111111', length: 6 } };
    oscHandler.applyProperties(comp, '.osc1', { reset: { expr: null, value: '1' } }, 'next', false, {});
    h.assert('counter unchanged on when=next', comp.oscState.counterValue, '111111');
  });

  reg(218, 'registry', 'osc applyProperties skips when no pending', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '001100', length: 6 } };
    oscHandler.applyProperties(comp, '.osc1', null, 'immediate', false, {});
    h.assert('counter unchanged on null pending', comp.oscState.counterValue, '001100');
  });

  reg(219, 'registry', 'osc applyProperties skips when no reset in pending', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '110011', length: 6 } };
    oscHandler.applyProperties(comp, '.osc1', {}, 'immediate', false, {});
    h.assert('counter unchanged without reset key', comp.oscState.counterValue, '110011');
  });

  reg(220, 'registry', 'osc applyProperties resets with multi-bit value ending in 1', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '1010', length: 4 } };
    oscHandler.applyProperties(comp, '.osc1', { reset: { expr: null, value: '01' } }, 'immediate', false, {});
    h.assert('counter reset with value 01 (last bit 1)', comp.oscState.counterValue, '0000');
  });

  reg(221, 'registry', 'osc applyProperties does NOT reset with multi-bit value ending in 0', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '1010', length: 4 } };
    oscHandler.applyProperties(comp, '.osc1', { reset: { expr: null, value: '10' } }, 'immediate', false, {});
    h.assert('counter unchanged with value 10 (last bit 0)', comp.oscState.counterValue, '1010');
  });

  reg(222, 'registry', 'osc applyProperties with reEvaluate re-evaluates expression', function(h, session) {
    const oscHandler = session._ensureRegistry().get('osc');
    const comp = { oscState: { counterValue: '111000', length: 6 } };
    const mockCtx = {
      evalExpr: function() { return [{ value: '1' }]; },
      getValueFromRef: function() { return null; }
    };
    oscHandler.applyProperties(comp, '.osc1', { reset: { expr: [{ bin: '1' }], value: '0' } }, 'immediate', true, mockCtx);
    h.assert('counter reset after reEval to 1', comp.oscState.counterValue, '000000');
  });

  reg(223, 'registry', 'Parser — osc property block with reset and set', function(h, session) {
    const stmts = session.parse(`comp [~] .osc1:
  length: 6
  freq: 2
  :
6wire cnt = .osc1:counter
.osc1:{
  reset = 1
  set = EQ(cnt, 001010)
}`);
    h.assert('3 statements parsed', String(stmts.length), '3');
    h.assert('stmt 0 is comp osc', stmts[0].comp.type, 'osc');
    h.assert('stmt 2 is property block', String(stmts[2].componentPropertyBlock !== undefined), 'true');
    const block = stmts[2].componentPropertyBlock;
    h.assert('block component is .osc1', block.component, '.osc1');
    h.assert('block has 2 properties', String(block.properties.length), '2');
    h.assert('block prop 0 is reset', block.properties[0].property, 'reset');
    h.assert('block prop 1 is set', block.properties[1].property, 'set');
  });

  reg(251, 'queue-storage', 'FIFO push/pop order A,B,C', function(h) {
    addQueueStorage({ id: 'q1', width: 8, length: 8, mode: 'fifo' });
    queuePush('q1', '01000001');
    queuePush('q1', '01000010');
    queuePush('q1', '01000011');
    h.assert('peek front A', queuePeek('q1'), '01000001');
    h.assert('pop A', queuePop('q1'), '01000001');
    h.assert('pop B', queuePop('q1'), '01000010');
    h.assert('pop C', queuePop('q1'), '01000011');
  });

  reg(252, 'queue-storage', 'LIFO push/pop order C,B,A', function(h) {
    addQueueStorage({ id: 's1', width: 8, length: 8, mode: 'lifo' });
    queuePush('s1', '01000001');
    queuePush('s1', '01000010');
    queuePush('s1', '01000011');
    h.assert('peek top C', queuePeek('s1'), '01000011');
    h.assert('pop C', queuePop('s1'), '01000011');
    h.assert('pop B', queuePop('s1'), '01000010');
    h.assert('pop A', queuePop('s1'), '01000001');
  });

  reg(253, 'queue-storage', 'overflow throws, state unchanged', function(h) {
    addQueueStorage({ id: 'qf', width: 4, length: 2, mode: 'fifo' });
    queuePush('qf', '0001');
    queuePush('qf', '0010');
    h.assertThrows('third push', function() { queuePush('qf', '0011'); }, 'Queue is full');
    h.assert('size still 2', String(queueGetSize('qf')), '2');
  });

  reg(254, 'queue-storage', 'underflow throws, state unchanged', function(h) {
    addQueueStorage({ id: 'qe', width: 4, length: 4, mode: 'fifo' });
    queuePush('qe', '0001');
    queuePop('qe');
    h.assertThrows('pop empty', function() { queuePop('qe'); }, 'Queue is empty');
    h.assert('size still 0', String(queueGetSize('qe')), '0');
  });

  reg(255, 'queue-storage', 'bitIndexWidth(17) === 5', function(h) {
    h.assert('width bits', String(bitIndexWidth(17)), '5');
  });

  reg(256, 'queue-storage', 'push width mismatch throws', function(h) {
    addQueueStorage({ id: 'qm', width: 8, length: 4, mode: 'fifo' });
    h.assertThrows('short value', function() { queuePush('qm', '01'); }, 'push value width mismatch');
  });

  reg(257, 'queue-storage', 'empty/full flags', function(h) {
    addQueueStorage({ id: 'qq', width: 4, length: 2, mode: 'fifo' });
    h.assert('empty', queueIsEmpty('qq'), '1');
    h.assert('not full', queueIsFull('qq'), '0');
    queuePush('qq', '0001');
    h.assert('not empty', queueIsEmpty('qq'), '0');
    queuePush('qq', '0010');
    h.assert('full', queueIsFull('qq'), '1');
  });

  reg(258, 'queue-storage', 'clear resets storage', function(h) {
    addQueueStorage({ id: 'qc', width: 4, length: 4, mode: 'fifo' });
    queuePush('qc', '0001');
    queueClear('qc');
    h.assert('size 0', String(queueGetSize('qc')), '0');
    h.assert('empty', queueIsEmpty('qc'), '1');
  });

  function registerTest(id, group, title, run, options = {}) {
    tests.push({
      id,
      group,
      title,
      run,
      propagation: options.propagation || 'legacy'
    });
  }

  window.LogTScriptTestSuite = {
    tests,
    runMap: null,
    createSession,
    registerTest,
    getTest(id) {
      return this.tests.find(t => t.id === id) || null;
    },
    getRun(id) {
      return this.runMap ? this.runMap.get(id) || null : null;
    },
    finalize() {
      tests.sort((a, b) => a.id - b.id);
      this.runMap = new Map();
      for (const t of tests) this.runMap.set(t.id, t.run);
    }
  };
})();
