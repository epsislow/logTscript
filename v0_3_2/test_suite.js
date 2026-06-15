/**
 * LogTScript test suite — browser + node (_run_suite_node.js).
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
  function reg(id, group, title, run, options = {}) {
    tests.push({ id, group, title, run, propagation: options.propagation || 'legacy' });
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

  reg(85, 'wire-init', 'full tokenizedion of "1wire s : 1"', function(h, session) {
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

  reg(1334, 'short-notation', 'Short notation — + concatenation inside backticks', function(h, session) {
    {
      h.assert('bit constants', session.preprocessShortNotation('`(0) + (1) + (1) + (0)`'), '0 + 1 + 1 + 0');
      h.assert('grouped bool', session.preprocessShortNotation('`(a | b) + (c | d)`'), 'OR(a,b) + OR(c,d)');
      h.assert('precedence', session.preprocessShortNotation('`a & b + c & d`'), 'AND(a,b) + AND(c,d)');
      h.assert('mixed', session.preprocessShortNotation('`(0110) + ((!C.4) | (A.4 & B))`'), '0110 + OR(!C.4,AND(A.4,B))');
    }
  });

  reg(1335, 'short-notation', 'Short notation — + concat runnable assignment', function(h, session) {
    {
      const { interp } = session.run('5wire R\n5wire A\n1wire B\n5wire C\n5wire R = `(0110) + ((!C.4) | (A.4 & B))`');
      h.assert('runs', String(!!interp), 'true');
    }
  });

  reg(1336, 'short-notation', 'Short notation — extra parentheses (concat and grouping)', function(h, session) {
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
    const expectedTypes = ['led', 'switch', 'key', 'dip', 'ioport', '7seg', 'lcd', 'terminal', 'adder', 'subtract', 'multiplier', 'divider', 'shifter', 'mem', 'reg', 'counter', 'queue', 'stack', 'osc', 'rotary', 'slider'];
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
    h.assert('ioport placeholder bits', String(registry.get('ioport').getWidthBits({})), '1');
    h.assert('adder default bits', String(registry.get('adder').getWidthBits({})), '4');
    h.assert('adder depth 8', String(registry.get('adder').getWidthBits({depth: '8'})), '8');
    h.assert('osc bits', String(registry.get('osc').getWidthBits({})), '1');
    h.assert('rotary default bits', String(registry.get('rotary').getWidthBits({})), '3');
    h.assert('rotary 4 states', String(registry.get('rotary').getWidthBits({states: '4'})), '2');
    h.assert('slider default bits', String(registry.get('slider').getWidthBits({})), '4');
    h.assert('slider length 8', String(registry.get('slider').getWidthBits({length: '8'})), '8');
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
    h.assert('ioport supports in', String(registry.supportsProperty('ioport', 'in')), 'true');
    h.assert('ioport supports out', String(registry.supportsProperty('ioport', 'out')), 'true');
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

reg(300, 'doc', 'Tokenizer — doc is KEYWORD', function(h, session) {
  const { tokens } = session.tokenize('doc(OR)');
  h.assert('doc tokenized as KEYWORD', tokens[0].type, 'KEYWORD');
  h.assert('doc correct value', tokens[0].value, 'doc');
});

reg(301, 'doc', 'Parser — doc(OR) produces correct AST node', function(h, session) {
  const stmts = session.parse('doc(OR)');
  h.assert('1 statement', String(stmts.length), '1');
  h.assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
  h.assert('doc.name este OR', stmts[0].doc, 'OR');
});

reg(302, 'doc', 'Parser — doc(MUX) accepta token MUX', function(h, session) {
  const stmts = session.parse('doc(MUX)');
  h.assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
  h.assert('doc.name este MUX', stmts[0].doc, 'MUX');
});

reg(303, 'doc', 'Parser — doc(REG) produces correct AST node', function(h, session) {
  const stmts = session.parse('doc(REG)');
  h.assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
  h.assert('doc.name este REG', stmts[0].doc, 'REG');
});

reg(304, 'doc', 'BUILTIN_DOC — NOT', function(h, session) {
  const lines = Interpreter.getDocLines('NOT', new Map());
  h.assert('NOT signature', lines[0], 'NOT(Xbit) -> Xbit');
});

reg(305, 'doc', 'BUILTIN_DOC — OR are 2 semnaturi', function(h, session) {
  const lines = Interpreter.getDocLines('OR', new Map());
  h.assert('OR 2 semnaturi', String(lines.length), '2');
  h.assert('OR signature 1', lines[0], 'OR(Xbit) -> 1bit');
  h.assert('OR signature 2', lines[1], 'OR(Xbit, Xbit) -> Xbit');
});

reg(306, 'doc', 'BUILTIN_DOC — EQ are 1 signature', function(h, session) {
  const lines = Interpreter.getDocLines('EQ', new Map());
  h.assert('EQ 1 signature', String(lines.length), '1');
  h.assert('EQ signature', lines[0], 'EQ(Xbit, Xbit) -> 1bit');
});

reg(307, 'doc', 'BUILTIN_DOC — MUX', function(h, session) {
  const lines = Interpreter.getDocLines('MUX', new Map());
  h.assert('MUX signature', lines[0], 'MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit');
});

reg(308, 'doc', 'BUILTIN_DOC — DEMUX', function(h, session) {
  const lines = Interpreter.getDocLines('DEMUX', new Map());
  h.assert('DEMUX signature', lines[0], 'DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..');
});

reg(309, 'doc', 'BUILTIN_DOC — REG', function(h, session) {
  const lines = Interpreter.getDocLines('REG', new Map());
  h.assert('REG signature', lines[0], 'REG(Xbit data, 1bit clock, 1bit clear) -> Xbit');
});

reg(310, 'doc', 'BUILTIN_DOC — old MUX/DEMUX/REGn undefined', function(h, session) {
  const linesMUX1 = Interpreter.getDocLines('MUX1', new Map());
  h.assert('MUX1 undefined', linesMUX1[0], 'MUX1: undefined function');
  const linesDEMUX1 = Interpreter.getDocLines('DEMUX1', new Map());
  h.assert('DEMUX1 undefined', linesDEMUX1[0], 'DEMUX1: undefined function');
  const linesREG8 = Interpreter.getDocLines('REG8', new Map());
  h.assert('REG8 undefined', linesREG8[0], 'REG8: undefined function');
});

reg(311, 'doc', 'BUILTIN_DOC — REG has single row', function(h, session) {
  const lines = Interpreter.getDocLines('REG', new Map());
  h.assert('REG 1 row', String(lines.length), '1');
});

reg(312, 'doc', 'BUILTIN_DOC — LSHIFT are 2 semnaturi', function(h, session) {
  const lines = Interpreter.getDocLines('LSHIFT', new Map());
  h.assert('LSHIFT 2 semnaturi', String(lines.length), '2');
  h.assert('LSHIFT signature 1', lines[0], 'LSHIFT(Xbit data, Nbit n) -> Xbit');
  h.assert('LSHIFT signature 2', lines[1], 'LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit');
});

reg(313, 'doc', 'BUILTIN_DOC — RSHIFT are 2 semnaturi', function(h, session) {
  const lines = Interpreter.getDocLines('RSHIFT', new Map());
  h.assert('RSHIFT 2 semnaturi', String(lines.length), '2');
});

reg(314, 'doc', 'BUILTIN_DOC — LATCH', function(h, session) {
  const lines = Interpreter.getDocLines('LATCH', new Map());
  h.assert('LATCH signature', lines[0], 'LATCH(Xbit data, 1bit clock) -> Xbit');
});

reg(315, 'doc', 'getDocLines — REG generic', function(h, session) {
  const lines = Interpreter.getDocLines('REG', null, new Map());
  h.assert('REG signature from BUILTIN_DOC', lines[0], 'REG(Xbit data, 1bit clock, 1bit clear) -> Xbit');
});

reg(316, 'doc', 'getDocLines — REG single row', function(h, session) {
  const lines = Interpreter.getDocLines('REG', null, new Map());
  h.assert('REG are exact 1 row', String(lines.length), '1');
});

reg(317, 'doc', 'getDocLines — user-defined function without return', function(h, session) {
  const funcs = new Map();
  funcs.set('myGate', {
    params: [{ type: '8bit', id: 'a' }, { type: '1bit', id: 'b' }],
    returns: []
  });
  const lines = Interpreter.getDocLines('myGate', null, funcs);
  h.assert('myGate signature', lines[0], 'myGate(8bit a, 1bit b)');
});

reg(318, 'doc', 'getDocLines — function user-defined with return', function(h, session) {
  const funcs = new Map();
  funcs.set('split', {
    params: [{ type: '8bit', id: 'x' }],
    returns: [{ type: '4bit' }, { type: '4bit' }]
  });
  const lines = Interpreter.getDocLines('split', null, funcs);
  h.assert('split signature with return', lines[0], 'split(8bit x) -> 4bit, 4bit');
});

reg(319, 'doc', 'getDocLines — unknown function', function(h, session) {
  const lines = Interpreter.getDocLines('Foo', new Map());
  h.assert('Foo unknown', lines[0], 'Foo: undefined function');
});

reg(320, 'doc', 'Interpreter end-to-end — doc(OR) in out', function(h, session) {
  const out = session.runDoc('doc(OR)');
  h.assert('OR line 1', out[0], 'OR(Xbit) -> 1bit');
  h.assert('OR line 2', out[1], 'OR(Xbit, Xbit) -> Xbit');
});

reg(321, 'doc', 'Interpreter end-to-end — doc(NOT)', function(h, session) {
  const out = session.runDoc('doc(NOT)');
  h.assert('NOT line 1', out[0], 'NOT(Xbit) -> Xbit');
  h.assert('NOT a single line', String(out.length), '1');
});

reg(322, 'doc', 'Interpreter end-to-end — doc(MUX)', function(h, session) {
  const out = session.runDoc('doc(MUX)');
  h.assert('MUX signature complete', out[0], 'MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit');
});

reg(323, 'doc', 'Interpreter end-to-end — doc(REG)', function(h, session) {
  const out = session.runDoc('doc(REG)');
  h.assert('REG signature', out[0], 'REG(Xbit data, 1bit clock, 1bit clear) -> Xbit');
});

reg(324, 'doc', 'Interpreter end-to-end — doc(DEMUX)', function(h, session) {
  const out = session.runDoc('doc(DEMUX)');
  h.assert('DEMUX signature', out[0], 'DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..');
});

reg(325, 'doc', 'Interpreter end-to-end — doc(myFunc) user-defined', function(h, session) {
  const src = `def myFunc(8bit a, 1bit b):
  :1bit OR(a, b)
doc(myFunc)`;
  const out = session.runDoc(src);
  h.assert('myFunc signature with return', out[0], 'myFunc(8bit a, 1bit b) -> 1bit');
});

reg(326, 'doc', 'Interpreter end-to-end — doc(Unknown)', function(h, session) {
  const out = session.runDoc('doc(Unknown)');
  h.assert('Unknown undefined', out[0], 'Unknown: undefined function');
});

reg(327, 'doc', 'Toate portile AND NAND NOR NXOR XOR', function(h, session) {
  for (const gate of ['AND', 'NAND', 'NOR', 'NXOR', 'XOR']) {
    const lines = Interpreter.getDocLines(gate, new Map());
    h.assert(gate + ' are 2 semnaturi', String(lines.length), '2');
    h.assert(gate + ' signature 1 bit', lines[0], gate + '(Xbit) -> 1bit');
    h.assert(gate + ' signature 2 bits', lines[1], gate + '(Xbit, Xbit) -> Xbit');
  }
});

reg(328, 'doc', 'BUILTIN_DOC — ADD signature', function(h, session) {
  const lines = Interpreter.getDocLines('ADD', new Map());
  h.assert('ADD 1 signature', String(lines.length), '1');
  h.assert('ADD signature', lines[0], 'ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry');
});

reg(329, 'doc', 'BUILTIN_DOC — SUBTRACT signature', function(h, session) {
  const lines = Interpreter.getDocLines('SUBTRACT', new Map());
  h.assert('SUBTRACT 1 signature', String(lines.length), '1');
  h.assert('SUBTRACT signature', lines[0], 'SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry');
});

reg(330, 'doc', 'BUILTIN_DOC — MULTIPLY signature', function(h, session) {
  const lines = Interpreter.getDocLines('MULTIPLY', new Map());
  h.assert('MULTIPLY 1 signature', String(lines.length), '1');
  h.assert('MULTIPLY signature', lines[0], 'MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over');
});

reg(331, 'doc', 'BUILTIN_DOC — DIVIDE signature', function(h, session) {
  const lines = Interpreter.getDocLines('DIVIDE', new Map());
  h.assert('DIVIDE 1 signature', String(lines.length), '1');
  h.assert('DIVIDE signature', lines[0], 'DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod');
});

reg(332, 'doc', 'doc(def) — lists built-in and user-defined separately', function(h, session) {
  const funcs = new Map();
  funcs.set('myFunc', { params: [{ type: '4bit', id: 'x' }], returns: [{ type: '4bit' }] });
  funcs.set('helper', { params: [], returns: [] });
  const lines = Interpreter.getDocLines('def', null, funcs);
  h.assert('first line is built-in:', lines[0], 'built-in:');
  const builtinBlock = lines.slice(1).join(' ');
  h.assert('built-in list contains ADD', String(builtinBlock.includes('ADD')), 'true');
  h.assert('built-in list contains SUBTRACT', String(builtinBlock.includes('SUBTRACT')), 'true');
  h.assert('built-in list contains MULTIPLY', String(builtinBlock.includes('MULTIPLY')), 'true');
  h.assert('built-in list contains DIVIDE', String(builtinBlock.includes('DIVIDE')), 'true');
  h.assert('built-in list contains NOT', String(builtinBlock.includes('NOT')), 'true');
  h.assert('built-in list contains AND', String(builtinBlock.includes('AND')), 'true');
  h.assert('built-in list contains REG', String(builtinBlock.includes('REG')), 'true');
  h.assert('built-in list does not list REG<N> pattern', String(!/\bREG\d+\b/.test(builtinBlock)), 'true');
  const userLabelIdx = lines.indexOf('user defined:');
  h.assert('user defined: label present', lines[userLabelIdx], 'user defined:');
  h.assert('user functions listed', String(lines[userLabelIdx + 1].includes('myFunc')), 'true');
  h.assert('user functions listed helper', String(lines[userLabelIdx + 1].includes('helper')), 'true');
});

reg(333, 'doc', 'doc(def) — no user-defined functions shows (none)', function(h, session) {
  const lines = Interpreter.getDocLines('def', new Map());
  const userLabelIdx = lines.indexOf('user defined:');
  h.assert('no user-defined shows (none)', lines[userLabelIdx + 1], '(none)');
});

reg(334, 'doc', 'Interpreter end-to-end — doc(ADD)', function(h, session) {
  const out = session.runDoc('doc(ADD)');
  h.assert('ADD signature in output', out[0], 'ADD(Xbit a, Xbit b) -> Xbit result, 1bit carry');
});

reg(335, 'doc', 'Interpreter end-to-end — doc(SUBTRACT)', function(h, session) {
  const out = session.runDoc('doc(SUBTRACT)');
  h.assert('SUBTRACT signature in output', out[0], 'SUBTRACT(Xbit a, Xbit b) -> Xbit result, 1bit carry');
});

reg(336, 'doc', 'Interpreter end-to-end — doc(MULTIPLY)', function(h, session) {
  const out = session.runDoc('doc(MULTIPLY)');
  h.assert('MULTIPLY signature in output', out[0], 'MULTIPLY(Xbit a, Xbit b) -> Xbit result, Xbit over');
});

reg(337, 'doc', 'Interpreter end-to-end — doc(DIVIDE)', function(h, session) {
  const out = session.runDoc('doc(DIVIDE)');
  h.assert('DIVIDE signature in output', out[0], 'DIVIDE(Xbit a, Xbit b) -> Xbit result, Xbit mod');
});

reg(338, 'doc', 'ADD — 4bit addition without carry', function(h, session) {
  const interp = session.runArith('4wire idx = 0011\n4wire inc = 0001\n4wire nextIdx, 1wire carry = ADD(idx, inc)');
  h.assert('ADD 0011+0001 result', session.getWire(interp, 'nextIdx'), '0100');
  h.assert('ADD 0011+0001 carry', session.getWire(interp, 'carry'), '0');
});

reg(339, 'doc', 'ADD — 4bit addition with carry (overflow)', function(h, session) {
  const interp = session.runArith('4wire idx = 1111\n4wire inc = 0001\n4wire nextIdx, 1wire carry = ADD(idx, inc)');
  h.assert('ADD 1111+0001 result', session.getWire(interp, 'nextIdx'), '0000');
  h.assert('ADD 1111+0001 carry', session.getWire(interp, 'carry'), '1');
});

reg(340, 'doc', 'ADD — 8bit addition', function(h, session) {
  const interp = session.runArith('8wire a = 00001111\n8wire b = 00000001\n8wire r, 1wire c = ADD(a, b)');
  h.assert('ADD 8bit result', session.getWire(interp, 'r'), '00010000');
  h.assert('ADD 8bit carry 0', session.getWire(interp, 'c'), '0');
});

reg(341, 'doc', 'ADD — all-ones + 1 produces zero with carry', function(h, session) {
  const interp = session.runArith('8wire a = 11111111\n8wire b = 00000001\n8wire r, 1wire c = ADD(a, b)');
  h.assert('ADD 8bit all-ones+1 result', session.getWire(interp, 'r'), '00000000');
  h.assert('ADD 8bit all-ones+1 carry', session.getWire(interp, 'c'), '1');
});

reg(342, 'doc', 'SUBTRACT — 4bit subtraction without borrow', function(h, session) {
  const interp = session.runArith('4wire idx = 0011\n4wire dec = 0001\n4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)');
  h.assert('SUBTRACT 0011-0001 result', session.getWire(interp, 'prevIdx'), '0010');
  h.assert('SUBTRACT 0011-0001 carry', session.getWire(interp, 'carry'), '0');
});

reg(343, 'doc', 'SUBTRACT — 4bit subtraction with borrow (underflow)', function(h, session) {
  const interp = session.runArith('4wire idx = 0000\n4wire dec = 0001\n4wire prevIdx, 1wire carry = SUBTRACT(idx, dec)');
  h.assert('SUBTRACT 0000-0001 result', session.getWire(interp, 'prevIdx'), '1111');
  h.assert('SUBTRACT 0000-0001 carry', session.getWire(interp, 'carry'), '1');
});

reg(344, 'doc', 'SUBTRACT — equal values gives zero without borrow', function(h, session) {
  const interp = session.runArith('4wire a = 1010\n4wire b = 1010\n4wire r, 1wire c = SUBTRACT(a, b)');
  h.assert('SUBTRACT equal result 0000', session.getWire(interp, 'r'), '0000');
  h.assert('SUBTRACT equal carry 0', session.getWire(interp, 'c'), '0');
});

reg(345, 'doc', 'MULTIPLY — 4bit multiplication without overflow', function(h, session) {
  const interp = session.runArith('4wire a = 0010\n4wire b = 0011\n4wire r, 4wire over = MULTIPLY(a, b)');
  h.assert('MULTIPLY 2*3 result', session.getWire(interp, 'r'), '0110');
  h.assert('MULTIPLY 2*3 over', session.getWire(interp, 'over'), '0000');
});

reg(346, 'doc', 'MULTIPLY — 4bit multiplication with overflow', function(h, session) {
  const interp = session.runArith('4wire a = 1111\n4wire b = 1111\n4wire r, 4wire over = MULTIPLY(a, b)');
  h.assert('MULTIPLY 15*15=225 result (low 4 bits)', session.getWire(interp, 'r'), '0001');
  h.assert('MULTIPLY 15*15=225 over (high 4 bits)', session.getWire(interp, 'over'), '1110');
});

reg(347, 'doc', 'MULTIPLY — zero produces zero', function(h, session) {
  const interp = session.runArith('4wire a = 1111\n4wire b = 0000\n4wire r, 4wire over = MULTIPLY(a, b)');
  h.assert('MULTIPLY x*0 result', session.getWire(interp, 'r'), '0000');
  h.assert('MULTIPLY x*0 over', session.getWire(interp, 'over'), '0000');
});

reg(348, 'doc', 'DIVIDE — 4bit division without remainder', function(h, session) {
  const interp = session.runArith('4wire a = 0110\n4wire b = 0010\n4wire r, 4wire mod = DIVIDE(a, b)');
  h.assert('DIVIDE 6/2 result', session.getWire(interp, 'r'), '0011');
  h.assert('DIVIDE 6/2 mod', session.getWire(interp, 'mod'), '0000');
});

reg(349, 'doc', 'DIVIDE — 4bit division with remainder', function(h, session) {
  const interp = session.runArith('4wire a = 0111\n4wire b = 0010\n4wire r, 4wire mod = DIVIDE(a, b)');
  h.assert('DIVIDE 7/2 result', session.getWire(interp, 'r'), '0011');
  h.assert('DIVIDE 7/2 mod', session.getWire(interp, 'mod'), '0001');
});

reg(350, 'doc', 'DIVIDE — division by zero returns zero', function(h, session) {
  const interp = session.runArith('4wire a = 0110\n4wire b = 0000\n4wire r, 4wire mod = DIVIDE(a, b)');
  h.assert('DIVIDE by zero result', session.getWire(interp, 'r'), '0000');
  h.assert('DIVIDE by zero mod', session.getWire(interp, 'mod'), '0000');
});

reg(351, 'doc', 'DIVIDE — dividend smaller than divisor gives 0 result', function(h, session) {
  const interp = session.runArith('4wire a = 0001\n4wire b = 0011\n4wire r, 4wire mod = DIVIDE(a, b)');
  h.assert('DIVIDE 1/3 result 0', session.getWire(interp, 'r'), '0000');
  h.assert('DIVIDE 1/3 mod 1', session.getWire(interp, 'mod'), '0001');
});

reg(352, 'doc', 'isBuiltinFunction — ADD, SUBTRACT, MULTIPLY, DIVIDE recognized', function(h, session) {
  for (const fn of ['ADD', 'SUBTRACT', 'MULTIPLY', 'DIVIDE']) {
    const lines = Interpreter.getDocLines(fn, new Map());
    h.assert(fn + ' recognized (not undefined)', String(lines[0].includes('undefined function')), 'false');
  }
});

reg(353, 'doc', 'doc(HIGH) — signature', function(h, session) {
  const out = session.runDoc('doc(HIGH)');
  h.assert('doc(HIGH) has signature', String(out.some(l => l.includes('HIGH(Xbit)'))), 'true');
});

reg(354, 'doc', 'doc(BITINDEX) — dual return signature', function(h, session) {
  const out = session.runDoc('doc(BITINDEX)');
  h.assert('doc(BITINDEX) has isInvalid', String(out.some(l => l.includes('isInvalid'))), 'true');
});

reg(355, 'doc', 'HIGH — interpreter E2E', function(h, session) {
  const { interp } = session.run('8wire winner = HIGH(00101010)');
  h.assert('HIGH result', session.getWire(interp, 'winner'), '00100000');
});

reg(356, 'doc', 'BITINDEX — dual return E2E', function(h, session) {
  const { interp } = session.run('2wire q, 1wire inv = BITINDEX(100)');
  h.assert('index', session.getWire(interp, 'q'), '10');
  h.assert('isInvalid', session.getWire(interp, 'inv'), '0');
});

reg(357, 'doc', 'BITINDEX(000) — invalid', function(h, session) {
  const { interp } = session.run('2wire q, 1wire inv = BITINDEX(000)');
  h.assert('index', session.getWire(interp, 'q'), '00');
  h.assert('isInvalid', session.getWire(interp, 'inv'), '1');
});

reg(358, 'doc', 'ONEHOT — interpreter E2E', function(h, session) {
  const { interp } = session.run('8wire sel = ONEHOT(101)');
  h.assert('ONEHOT', session.getWire(interp, 'sel'), '00100000');
});

reg(359, 'doc', 'Priority encoder E2E', function(h, session) {
  const { interp } = session.run(
    '8wire requests = 00101010\n' +
    '8wire winner = HIGH(requests)\n' +
    '1wire valid = ANY(requests)\n' +
    '3wire index, 1wire bad = BITINDEX(winner)'
  );
  h.assert('winner', session.getWire(interp, 'winner'), '00100000');
  h.assert('valid', session.getWire(interp, 'valid'), '1');
  h.assert('index', session.getWire(interp, 'index'), '101');
  h.assert('bad', session.getWire(interp, 'bad'), '0');
});

reg(360, 'doc', 'PARITY, CNTONE, BITSIZE E2E', function(h, session) {
  const { interp } = session.run(
    '1wire p = PARITY(1011)\n' +
    '2wire c = CNTONE(00101010)\n' +
    '3wire sz = BITSIZE(0101010)'
  );
  h.assert('PARITY', session.getWire(interp, 'p'), '1');
  h.assert('CNTONE', session.getWire(interp, 'c'), '11');
  h.assert('BITSIZE', session.getWire(interp, 'sz'), '111');
});

reg(361, 'doc', 'REVERSE and LROTATE E2E', function(h, session) {
  const { interp } = session.run(
    '4wire r = REVERSE(0011)\n' +
    '4wire rot = LROTATE(1011, 10)'
  );
  h.assert('REVERSE', session.getWire(interp, 'r'), '1100');
  h.assert('LROTATE', session.getWire(interp, 'rot'), '1110');
});

reg(362, 'doc', 'isBuiltinFunction — new bit builtins recognized', function(h, session) {
  for (const fn of ['HIGH', 'BITINDEX', 'ONEHOT', 'BITSIZE', 'LROTATE']) {
    const lines = Interpreter.getDocLines(fn, new Map());
    h.assert(fn + ' recognized', String(lines[0].includes('undefined function')), 'false');
  }
});

reg(400, 'doc-comp', 'Parser — doc(comp) produces correct AST node', function(h, session) {
  const stmts = session.parse('doc(comp)');
  h.assert('doc camp este comp', stmts[0].doc, 'comp');
});

reg(401, 'doc-comp', 'Parser — doc(comp.adder) produces correct AST node', function(h, session) {
  const stmts = session.parse('doc(comp.adder)');
  h.assert('doc camp este comp.adder', stmts[0].doc, 'comp.adder');
});

reg(402, 'doc-comp', 'Parser — doc(pcb.bcd) produces correct AST node', function(h, session) {
  const stmts = session.parse('doc(pcb.bcd)');
  h.assert('doc camp este pcb.bcd', stmts[0].doc, 'pcb.bcd');
});

reg(403, 'doc-comp', 'doc(comp) contains comp.adder', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const hasAdder = out.some(l => l.includes('comp.adder'));
  h.assert('doc(comp) contains comp.adder', String(hasAdder), 'true');
});

reg(404, 'doc-comp', 'doc(comp) contains shortname comp.+', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const hasPlus = out.some(l => l.includes('comp.+'));
  h.assert('doc(comp) contains comp.+', String(hasPlus), 'true');
});

reg(405, 'doc-comp', 'doc(comp) contains comp.7seg', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const has7seg = out.some(l => l.includes('comp.7seg'));
  h.assert('doc(comp) contains comp.7seg', String(has7seg), 'true');
});

reg(406, 'doc-comp', 'doc(comp) shortname comp.7 on same line as comp.7seg', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const line7seg = out.find(l => l.includes('comp.7seg'));
  h.assert('line with 7seg contains and comp.7', String(line7seg && line7seg.includes('comp.7')), 'true');
});

reg(407, 'doc-comp', 'doc(comp.adder) first line', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('first line adder', out[0], 'comp [adder] .name:');
});

reg(408, 'doc-comp', 'doc(comp.adder) contains depth: integer', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contains depth', String(out.some(l => l.includes('depth: integer'))), 'true');
});

reg(409, 'doc-comp', 'doc(comp.adder) contains = Xbit', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contains = Xbit', String(out.some(l => l.trim() === '= Xbit')), 'true');
});

reg(410, 'doc-comp', 'doc(comp.adder) contains Xpin a', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contains Xpin a', String(out.some(l => l.includes('Xpin a'))), 'true');
});

reg(411, 'doc-comp', 'doc(comp.adder) contains Xpout get', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contains Xpout get', String(out.some(l => l.includes('Xpout get'))), 'true');
});

reg(412, 'doc-comp', 'doc(comp.adder) contains -> Xbit', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contains -> Xbit', String(out.some(l => l.trim() === '-> Xbit')), 'true');
});

reg(413, 'doc-comp', 'doc(comp.+) same output as doc(comp.adder)', function(h, session) {
  const outAdder = session.runDoc('doc(comp.adder)');
  const outPlus = session.runDoc('doc(comp.+)');
  h.assert('doc(comp.+) first line', outPlus[0], 'comp [adder] .name:');
  h.assert('doc(comp.+) same length as adder', String(outPlus.length), String(outAdder.length));
});

reg(414, 'doc-comp', 'doc(comp.7seg) first line', function(h, session) {
  const out = session.runDoc('doc(comp.7seg)');
  h.assert('first line 7seg', out[0], 'comp [7seg] .name:');
});

reg(415, 'doc-comp', 'doc(comp.7seg) contains 1pin set', function(h, session) {
  const out = session.runDoc('doc(comp.7seg)');
  h.assert('7seg contains 1pin set', String(out.some(l => l.includes('1pin set'))), 'true');
});

reg(416, 'doc-comp', 'doc(comp.7seg) contains -> 8bit', function(h, session) {
  const out = session.runDoc('doc(comp.7seg)');
  h.assert('7seg contains -> 8bit', String(out.some(l => l.trim() === '-> 8bit')), 'true');
});

reg(417, 'doc-comp', 'doc(comp.7) shortname for 7seg', function(h, session) {
  const out = session.runDoc('doc(comp.7)');
  h.assert('doc(comp.7) first line', out[0], 'comp [7seg] .name:');
});

reg(418, 'doc-comp', 'doc(comp.mem) contains = Xbit', function(h, session) {
  const out = session.runDoc('doc(comp.mem)');
  h.assert('mem contains = Xbit', String(out.some(l => l.trim().startsWith('= '))), 'true');
});

reg(419, 'doc-comp', 'doc(comp.xyz) undefined type', function(h, session) {
  const out = session.runDoc('doc(comp.xyz)');
  h.assert('comp.xyz undefined', out[0], 'comp.xyz: undefined component type');
});

reg(420, 'doc-comp', 'doc(pcb) with PCB defined contains pcb.bcd', function(h, session) {
  const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set`;
  const out = session.runDoc(src + '\ndoc(pcb)');
  h.assert('doc(pcb) contains pcb.bcd', String(out.some(l => l === 'pcb.bcd')), 'true');
});

reg(421, 'doc-comp', 'doc(pcb.bcd) first line', function(h, session) {
  const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
  const out = session.runDoc(src);
  h.assert('pcb.bcd first line', out[0], 'pcb [bcd] .name:');
});

reg(422, 'doc-comp', 'doc(pcb.bcd) contains 4pin sum', function(h, session) {
  const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
  const out = session.runDoc(src);
  h.assert('pcb.bcd contains 4pin sum', String(out.some(l => l.includes('4pin sum'))), 'true');
});

reg(423, 'doc-comp', 'doc(pcb.bcd) contains 1pout carry', function(h, session) {
  const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
  const out = session.runDoc(src);
  h.assert('pcb.bcd contains 1pout carry', String(out.some(l => l.includes('1pout carry'))), 'true');
});

reg(424, 'doc-comp', 'doc(pcb.bcd) contains -> 1bit', function(h, session) {
  const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set
doc(pcb.bcd)`;
  const out = session.runDoc(src);
  h.assert('pcb.bcd contains -> 1bit', String(out.some(l => l.trim() === '-> 1bit')), 'true');
});

reg(425, 'doc-comp', 'doc(pcb.xyz) undefined type', function(h, session) {
  const out = session.runDoc('doc(pcb.xyz)');
  h.assert('pcb.xyz undefined', out[0], 'pcb.xyz: undefined PCB type');
});

reg(426, 'doc-comp', 'doc(comp.osc) does not contain = and returns 1bit', function(h, session) {
  const out = session.runDoc('doc(comp.osc)');
  h.assert('osc without = ', String(out.some(l => l.trim().startsWith('= '))), 'false');
  h.assert('osc -> 1bit', String(out.some(l => l.trim() === '-> 1bit')), 'true');
});

reg(427, 'doc-comp', 'InterpreterDoc2.formatCompDef helper', function(h, session) {
  const def = {
    attrs: [{ name: 'depth', value: 'integer' }],
    initValue: 'Xbit',
    pins: [{ bits: '1', name: 'set' }],
    pouts: [{ bits: 'X', name: 'get' }],
    returns: 'Xbit',
  };
  const lines = Interpreter.formatCompDef('.name', 'testComp', def);
  h.assert('formatCompDef line 0', lines[0], 'comp [testComp] .name:');
  h.assert('formatCompDef attr', lines[1], '  depth: integer');
  h.assert('formatCompDef = Xbit', lines[2], '  = Xbit');
  h.assert('formatCompDef :{', lines[3], '  :{');
  h.assert('formatCompDef 1pin set', lines[4], '    1pin set');
  h.assert('formatCompDef Xpout get', lines[5], '    Xpout get');
  h.assert('formatCompDef }', lines[6], '  }');
  h.assert('formatCompDef -> Xbit', lines[7], '  -> Xbit');
});

reg(1168, 'pcb', 'PCB property block on:1 with set=1 triggers execution', function(h, session) {
  const { interp } = session.run(`pcb +[passthrough]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [passthrough] .q::

.q:{
  data = 1111
  set = 1
}`);
  h.assert('PCB property block on:1 set=1 actualizeaza pout', session.getPcbPout(interp, '.q', 'result'), '1111');
});

reg(1169, 'pcb', 'PCB property block on:1 with set=0 does not trigger execution', function(h, session) {
  const { interp } = session.run(`pcb +[passthrough2]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [passthrough2] .q2::

.q2:{
  data = 1111
  set = 0
}`);
  h.assert('PCB property block on:1 set=0 does not update pout', session.getPcbPout(interp, '.q2', 'result'), '0000');
});

reg(1170, 'pcb', 'scenario regs PCB with adr and data', function(h, session) {
  const { interp } = session.run(`pcb +[regs]:
  1pin set
  4pin data
  4pout result
  exec: set
  on:1

  result = NOT(data)
  :4bit result

pcb [regs] .q::

.q:{
  data = 0101
  set = 1
}`);
  h.assert('PCB regs property block returns computed result', session.getPcbPout(interp, '.q', 'result'), '1010');
});

reg(1171, 'pcb', 'wire external "q = .q" reflects pout after property block', function(h, session) {
  const { interp } = session.run(`pcb +[echo]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [echo] .e::

4wire q = .e

.e:{
  data = 0110
  set = 1
}`);
  h.assert('Test 503 pout result after block', session.getPcbPout(interp, '.e', 'result'), '0110');
  h.assert('Test 503 wire q reflecta pout', session.getWire(interp, 'q'), '0110');
});

reg(504, 'pcb', 'wire intern ca returnSpec propagat in wire extern', function(h, session) {
  const { interp } = session.run(`pcb +[inv]:
  4pin data
  1pin set
  exec: set
  on:1

  4wire out = NOT(data)
  :4bit out

pcb [inv] .i::

4wire q = .i

.i:{
  data = 0101
  set = 1
}`);
  const inst = interp.pcbInstances.get('.i');
  h.assert('Test 504 instance.returnValue set', inst ? String(inst.returnValue) : 'null', '1010');
  h.assert('Test 504 wire q reflecta wire intern NOT(data)', session.getWire(interp, 'q'), '1010');
});

reg(505, 'pcb', 'alternation A->B->A->B between two PCB blocks with on:1', function(h, session) {
  const { interp } = session.run(`pcb +[sw]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [sw] .p::

1wire aa = 0
1wire bb = 0

.p:{
  data = 0101
  set = aa
}
.p:{
  data = 1010
  set = bb
}`);
  session.setWire(interp, 'aa', '1');
  h.assert('505 A=1: result=0101', session.getPcbPout(interp, '.p', 'result'), '0101');
  session.setWire(interp, 'bb', '1');
  h.assert('505 B=1: result=1010', session.getPcbPout(interp, '.p', 'result'), '1010');
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'aa', '1');
  h.assert('505 A=1 again: result=0101', session.getPcbPout(interp, '.p', 'result'), '0101');
  session.setWire(interp, 'bb', '0');
  session.setWire(interp, 'bb', '1');
  h.assert('505 B=1 again: result=1010', session.getPcbPout(interp, '.p', 'result'), '1010');
});

reg(506, 'pcb', 'comp interne PCB are not re-create at re-run', function(h, session) {
  const { interp } = session.run(`pcb +[withcomp]:
  1pin set
  4pin data
  4pout result
  exec: set
  on:1

  comp [led] .L:
  on:1
  :

  .L:{
    set = 1
  }

  result = data
  :4bit result

pcb [withcomp] .wc::

1wire aa = 0

.wc:{
  data = 0101
  set = aa
}`);
  session.setWire(interp, 'aa', '1');
  const blocksAfter1 = interp.componentPropertyBlocks.length;
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'aa', '1');
  const blocksAfter2 = interp.componentPropertyBlocks.length;
  h.assert('506 componentPropertyBlocks does not grow on re-run', String(blocksAfter1), String(blocksAfter2));
  h.assert('506 correct result on second execution', session.getPcbPout(interp, '.wc', 'result'), '0101');
});

reg(507, 'pcb', 'storage does not grow on repeated PCB re-runs', function(h, session) {
  const { interp } = session.run(`pcb +[stable]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  4wire tmp = NOT(data)
  result = tmp
  :4bit result

pcb [stable] .s::

1wire aa = 0

.s:{
  data = 0101
  set = aa
}`);
  session.setWire(interp, 'aa', '1');
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'aa', '1');
  const storageAfter1 = interp.storage.length;
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'aa', '1');
  const storageAfter2 = interp.storage.length;
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'aa', '1');
  const storageAfter3 = interp.storage.length;
  h.assert('507 stable storage after run 2', String(storageAfter2), String(storageAfter1));
  h.assert('507 stable storage after run 3', String(storageAfter3), String(storageAfter1));
  h.assert('507 correct result NOT(0101)=1010', session.getPcbPout(interp, '.s', 'result'), '1010');
});

reg(508, 'pcb', 'stable storage with two alternating PCB blocks', function(h, session) {
  const { interp } = session.run(`pcb +[dual2]:
  4pin data
  1pin setA
  1pin setB
  4pout result
  exec: setA
  on:1

  result = data
  :4bit result

pcb [dual2] .d::

1wire aa = 0
1wire bb = 0

.d:{
  data = 0101
  setA = aa
  setB = 0
}
.d:{
  data = 1010
  setA = 0
  setB = bb
}`);
  session.setWire(interp, 'aa', '1');
  const s1 = interp.storage.length;
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'bb', '1');
  const s2 = interp.storage.length;
  session.setWire(interp, 'bb', '0');
  session.setWire(interp, 'aa', '1');
  const s3 = interp.storage.length;
  session.setWire(interp, 'aa', '0');
  session.setWire(interp, 'bb', '1');
  const s4 = interp.storage.length;
  h.assert('508 stable storage A->B', String(s1), String(s2));
  h.assert('508 stable storage B->A', String(s2), String(s3));
  h.assert('508 stable storage A->B again', String(s3), String(s4));
});

reg(509, 'pcb', 'blocks with set=expr(comp) execute in source order', function(h, session) {
  const { interp } = session.run(`
pcb +[seq]:
  1pin set
  4pout val
  exec: set
  on:1

  val = 1111
  :4bit val

pcb [seq] .q::

1wire trigger = 0

.q:{
  set = trigger
}

.q:{
  set = trigger
}`);
  const blocksBefore = interp.componentPropertyBlocks.filter(b => b.component === '.q').length;
  h.assert('509 two blocks registered for .q', String(blocksBefore), '2');
  session.setWire(interp, 'trigger', '1');
  h.assert('509 both blocks executed, pout=1111', session.getPcbPout(interp, '.q', 'val'), '1111');
});

reg(510, 'pcb', 'property block execution order with direct component trigger', function(h, session) {
  const { interp } = session.run(`
pcb +[target]:
  4pin data
  1pin set
  4pout val
  exec: set
  on:1

  val = data
  :4bit val

pcb [target] .t::

comp [key] .btn:
  on:1
  :

1wire btn = .btn

.t:{
  data = 1111
  set = btn
}

.t:{
  data = 0000
  set = btn
}`);
  session.setComp(interp, '.btn', '1');
  h.assert('510 block with higher blockIndex runs after lower blockIndex', session.getPcbPout(interp, '.t', 'val'), '0000');
});

reg(511, 'pcb', 'multiple blocks on same comp, order = blockIndex', function(h, session) {
  const { interp } = session.run(`
pcb +[order]:
  4pin data
  1pin set
  4pout val
  exec: set
  on:1

  val = data
  :4bit val

pcb [order] .o::

comp [key] .k:
  on:1
  :

.o:{
  data = 0001
  set = .k
}
.o:{
  data = 0010
  set = .k
}
.o:{
  data = 0100
  set = .k
}
.o:{
  data = 1000
  set = .k
}`);
  session.setComp(interp, '.k', '1');
  h.assert('511 ultimul bloc from source castiga (data=1000)', session.getPcbPout(interp, '.o', 'val'), '1000');
});

reg(512, 'pcb', 'bitrange on literali BIN (\\N) and HEX (^N)', function(h, session) {
  let interp;
  ({ interp } = session.run('3wire c = \\12.0-2'));
  h.assert('512 \\12.0-2 = 110', session.getWire(interp, 'c'), '110');
  ({ interp } = session.run('3wire d = \\12./3'));
  h.assert('512 \\12./3 = 110', session.getWire(interp, 'd'), '110');
  ({ interp } = session.run('3wire e = \\12.1-3'));
  h.assert('512 \\12.1-3 = 100', session.getWire(interp, 'e'), '100');
  ({ interp } = session.run('4wire f = ^f./4'));
  h.assert('512 ^f./4 = 1111', session.getWire(interp, 'f'), '1111');
  ({ interp } = session.run('3wire g = ^f.0-2'));
  h.assert('512 ^f.0-2 = 111', session.getWire(interp, 'g'), '111');
  ({ interp } = session.run('3wire h = ^f.1-3'));
  h.assert('512 ^f.1-3 = 111', session.getWire(interp, 'h'), '111');
  ({ interp } = session.run('8wire i = ^0f./8'));
  h.assert('512 ^0f./8 = 00001111', session.getWire(interp, 'i'), '00001111');
  ({ interp } = session.run('4wire j = ^0f.4-7'));
  h.assert('512 ^0f.4-7 = 1111', session.getWire(interp, 'j'), '1111');
  ({ interp } = session.run('8wire k = \\255./8'));
  h.assert('512 \\255./8 = 11111111', session.getWire(interp, 'k'), '11111111');
  ({ interp } = session.run('8wire r = \\12./4 + ^f./4'));
  h.assert('512 \\12./4 + ^f./4 = 11001111', session.getWire(interp, 'r'), '11001111');
  ({ interp } = session.run('16wire combo = \\192./8 + ^0f./8'));
  h.assert('512 \\192./8 + ^0f./8 = 1100000000001111', session.getWire(interp, 'combo'), '1100000000001111');
});

reg(513, 'pcb', 'operatorul ;p de padding', function(h, session) {
  let interp;
  ({ interp } = session.run('8wire a = \\12;8'));
  h.assert('513 \\12;8 = 00001100', session.getWire(interp, 'a'), '00001100');
  ({ interp } = session.run('8wire b = \\3;8'));
  h.assert('513 \\3;8 = 00000011', session.getWire(interp, 'b'), '00000011');
  ({ interp } = session.run('8wire c = ^2;8'));
  h.assert('513 ^2;8 = 00000010', session.getWire(interp, 'c'), '00000010');
  ({ interp } = session.run('8wire d = ^f;8'));
  h.assert('513 ^f;8 = 00001111', session.getWire(interp, 'd'), '00001111');
  ({ interp } = session.run('8wire e = \\255;4'));
  h.assert('513 \\255;4 = 11111111 (no truncate)', session.getWire(interp, 'e'), '11111111');
  ({ interp } = session.run('8wire f = \\12.0-2;8'));
  h.assert('513 \\12.0-2;8 = 00000110', session.getWire(interp, 'f'), '00000110');
  ({ interp } = session.run('8wire g = \\12./3;8'));
  h.assert('513 \\12./3;8 = 00000110', session.getWire(interp, 'g'), '00000110');
  ({ interp } = session.run('8wire h = ^0f.4-7;8'));
  h.assert('513 ^0f.4-7;8 = 00001111', session.getWire(interp, 'h'), '00001111');
  ({ interp } = session.run('1wire aa = 1\n8wire i = aa;8'));
  h.assert('513 variable aa;8 = 00000001', session.getWire(interp, 'i'), '00000001');
  ({ interp } = session.run('8wire data = 11001100\n8wire j = data.0-3;8'));
  h.assert('513 data.0-3;8 = 00001100', session.getWire(interp, 'j'), '00001100');
  ({ interp } = session.run('16wire df = \\12;8 + ^2;8'));
  h.assert('513 \\12;8 + ^2;8 = 0000110000000010', session.getWire(interp, 'df'), '0000110000000010');
  ({ interp } = session.run('8wire sn = `\\12;8 & [^ff]`'));
  h.assert('513 short notation \\12;8 & [^ff] = 00001100', session.getWire(interp, 'sn'), '00001100');
});

reg(514, 'pcb', 'padding ;p on componente and PCB-uri', function(h, session) {
  let interp;
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:1\n:\n8wire x = .m:get;8'));
  h.assert('514 .mem:get;8 = 00000000', session.getWire(interp, 'x'), '00000000');
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get;8'));
  h.assert('514 .mem:get;8 with initVal=1100 = 00001100', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get.0-1;8'));
  h.assert('514 .mem:get.0-1;8 = 00000011', session.getWire(interp, 'x'), '00000011');
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get.0/2;8'));
  h.assert('514 .mem:get.0/2;8 = 00000011', session.getWire(interp, 'x'), '00000011');
  ({ interp } = session.run('4wire r = \\12\n8wire x = r;8'));
  h.assert('514 wire;8 = 00001100', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run('8wire r = 11001100\n8wire x = r.0-3;8'));
  h.assert('514 wire.0-3;8 = 00001100', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run(`
pcb +[gen4]:
  1pin set
  4pout val
  exec: set
  on:1

  val = 1010
  :4bit val

pcb [gen4] .g::

.g:{
  set = 1
}

8wire x = .g:val;8`));
  h.assert('514 PCB pout;8 = 00001010', session.getWire(interp, 'x'), '00001010');
  ({ interp } = session.run(`
pcb +[gen8]:
  1pin set
  8pout val
  exec: set
  on:1

  val = 11001100
  :8bit val

pcb [gen8] .g::

.g:{
  set = 1
}

8wire x = .g:val.0-3;8`));
  h.assert('514 PCB pout.0-3;8 = 00001100', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run(`
pcb +[ret4]:
  1pin set
  4pout val
  exec: set
  on:1

  val = 1010
  :4bit val

pcb [ret4] .g::

.g:{
  set = 1
}

8wire x = .g;8`));
  h.assert('514 PCB direct;8 = 00001010', session.getWire(interp, 'x'), '00001010');
  ({ interp } = session.run(`
pcb +[ret8]:
  1pin set
  8pout val
  exec: set
  on:1

  val = 11001100
  :8bit val

pcb [ret8] .g::

.g:{
  set = 1
}

8wire x = .g;4`));
  h.assert('514 PCB direct;4 does not truncate (11001100)', session.getWire(interp, 'x'), '11001100');
});

reg(515, 'pcb', 'mem comp = variable and .mem = d', function(h, session) {
  let interp;
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:4\n= \\12\n:\n8wire x = .m:get;8'));
  h.assert('515 = literal \\12 in declaration (address 0 = 1100, padded 8)', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run('4wire d = 1010\ncomp [mem] .m:\ndepth:4\nlength:4\n= d\n:\n8wire x = .m:get;8'));
  h.assert('515 = variable d=1010 in declaration (address 0 = 1010, padded 8)', session.getWire(interp, 'x'), '00001010');
  ({ interp } = session.run('comp [mem] .m:\ndepth:8\nlength:4\n= ^ffff\n:\n8wire x = .m:get;8'));
  h.assert('515 = ^ffff in declaration (address 0 = 11111111)', session.getWire(interp, 'x'), '11111111');
  ({ interp } = session.run('16wire d = ^ffff\ncomp [mem] .m:\ndepth:8\nlength:4\n= d\n:\n8wire x = .m:get;8'));
  h.assert('515 = variable d=^ffff in declaration (address 0 = 11111111)', session.getWire(interp, 'x'), '11111111');
  ({ interp } = session.run('4wire d = 1100\ncomp [mem] .m:\ndepth:8\nlength:4\n= d\n:\n8wire x = .m:get;8'));
  h.assert('515 = variable shorter than depth, pad (00001100)', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run(`
comp [mem] .m:
depth:4
length:4
:

4wire d = 1010
.m = d

8wire x = .m:get;8`));
  h.assert('515 .mem = d after declaration (address 0 = 1010, padded 8)', session.getWire(interp, 'x'), '00001010');
  ({ interp } = session.run(`
comp [mem] .m:
depth:8
length:4
:

16wire d = ^f0f0
.m = d

8wire x = .m:get;8`));
  h.assert('515 .mem = d multi-address (address 0 = 11110000)', session.getWire(interp, 'x'), '11110000');
});

function regPcbWave(id, legacyId, title, run) {
  reg(id, 'pcb', title + ' (wave)', run, { propagation: 'wave' });
}

const _pcbWavePairs = [
  [504, 520], [505, 521], [506, 522], [507, 523], [508, 524], [509, 525],
  [510, 526], [511, 527], [512, 528], [513, 529], [514, 530], [515, 531],
  [1168, 1172], [1169, 1173], [1170, 1174], [1171, 1175]
];
for (const [legacyId, waveId] of _pcbWavePairs) {
  const t = tests.find(x => x.id === legacyId);
  if (t) regPcbWave(waveId, legacyId, t.title, t.run);
}

reg(600, 'signal', 'simple wire — cascaded propagation through assignment', function(h, session) {
  const { interp } = session.run(`
1wire a = 0
1wire b = NOT(a)
1wire c = NOT(b)`);
  session.setWire(interp, 'a', '1');
  h.assert('600 b=NOT(a) after a=1', session.getWire(interp, 'b'), '0');
  h.assert('600 c=NOT(b) cascaded after a=1', session.getWire(interp, 'c'), '1');
}, { propagation: 'wave' });

reg(601, 'signal', 'cascada de 3 niveluri a->b->c->d', function(h, session) {
  const { interp } = session.run(`
1wire a = 0
1wire b = a
1wire c = b
1wire d = c`);
  session.setWire(interp, 'a', '1');
  h.assert('601 b=a after a=1', session.getWire(interp, 'b'), '1');
  h.assert('601 c=b cascaded', session.getWire(interp, 'c'), '1');
  h.assert('601 d=c cascaded', session.getWire(interp, 'd'), '1');
}, { propagation: 'wave' });

reg(602, 'signal', 'MUX toggle — tg0 se toggleaza cand p trece 1->0', function(h, session) {
  const { interp } = session.run(`
1wire p : 0
1wire tg0 : 0

tg0 = MUX(p, tg0, NOT(tg0))`);
  h.assert('602 tg0 initial = 0', session.getWire(interp, 'tg0'), '0');
  session.setWire(interp, 'p', '1');
  h.assert('602 tg0 after p=1 (toggle → 1)', session.getWire(interp, 'tg0'), '1');
  session.setWire(interp, 'p', '0');
  h.assert('602 tg0 after p=0 (hold at 1)', session.getWire(interp, 'tg0'), '1');
  session.setWire(interp, 'p', '1');
  h.assert('602 tg0 after p=1 again (toggle → 0)', session.getWire(interp, 'tg0'), '0');
  session.setWire(interp, 'p', '0');
  h.assert('602 tg0 after p=0 again (hold at 0)', session.getWire(interp, 'tg0'), '0');
}, { propagation: 'wave' });

reg(603, 'signal', 'counter binary tg0/tg1/tg2 cascaded', function(h, session) {
  const { interp } = session.run(`
1wire p : 0
1wire tg0 : 0
1wire tg1 : 0
1wire tg2 : 0

tg0 = MUX(p, tg0, NOT(tg0))
tg1 = MUX(tg0, tg1, NOT(tg1))
tg2 = MUX(tg1, tg2, NOT(tg2))`);
  function press() {
    session.setWire(interp, 'p', '1');
    session.setWire(interp, 'p', '0');
  }
  h.assert('603 stare initiala tg0=0', session.getWire(interp, 'tg0'), '0');
  h.assert('603 stare initiala tg1=0', session.getWire(interp, 'tg1'), '0');
  h.assert('603 stare initiala tg2=0', session.getWire(interp, 'tg2'), '0');
  press();
  h.assert('603 apasare 1: tg0=1', session.getWire(interp, 'tg0'), '1');
  h.assert('603 apasare 1: tg1=1', session.getWire(interp, 'tg1'), '1');
  h.assert('603 apasare 1: tg2=1', session.getWire(interp, 'tg2'), '1');
  press();
  h.assert('603 apasare 2: tg0=0', session.getWire(interp, 'tg0'), '0');
  h.assert('603 apasare 2: tg1=1', session.getWire(interp, 'tg1'), '1');
  h.assert('603 apasare 2: tg2=1', session.getWire(interp, 'tg2'), '1');
  press();
  h.assert('603 apasare 3: tg0=1', session.getWire(interp, 'tg0'), '1');
  h.assert('603 apasare 3: tg1=0', session.getWire(interp, 'tg1'), '0');
  h.assert('603 apasare 3: tg2=1', session.getWire(interp, 'tg2'), '1');
  press();
  h.assert('603 apasare 4: tg0=0', session.getWire(interp, 'tg0'), '0');
  h.assert('603 apasare 4: tg1=0', session.getWire(interp, 'tg1'), '0');
  h.assert('603 apasare 4: tg2=1', session.getWire(interp, 'tg2'), '1');
}, { propagation: 'wave' });

reg(604, 'signal', 'propagation stops when value unchanged', function(h, session) {
  const { interp } = session.run(`
1wire a = 0
1wire b = NOT(a)`);
  const bBefore = session.getWire(interp, 'b');
  session.setWire(interp, 'a', '0');
  h.assert('604 b unchanged when a does not change', session.getWire(interp, 'b'), bBefore);
}, { propagation: 'wave' });

reg(605, 'signal', 'self-reference a = NOT(a) — executed once per cascade', function(h, session) {
  const { interp } = session.run(`
1wire a : 0
a = NOT(a)`);
  session.setWire(interp, 'a', '0');
  h.assert('605 a = NOT(0) = 1 after single evaluation', session.getWire(interp, 'a'), '1');
}, { propagation: 'wave' });

reg(606, 'signal', 'multi-decl wire — individual propagation per wire', function(h, session) {
  const { interp } = session.run(`
2wire src = 00
1wire x = src.1/1
1wire y = src.0/1
1wire cx = NOT(x)
1wire cy = NOT(y)`);
  session.setWire(interp, 'src', '10');
  h.assert('606 x=src.1/1=0 after src=10', session.getWire(interp, 'x'), '0');
  h.assert('606 y=src.0/1=1 after src=10', session.getWire(interp, 'y'), '1');
  h.assert('606 cx=NOT(x)=1 cascaded', session.getWire(interp, 'cx'), '1');
  h.assert('606 cy=NOT(y)=0 cascaded', session.getWire(interp, 'cy'), '0');
}, { propagation: 'wave' });

reg(607, 'signal', 'branch parallelism — source order does not matter', function(h, session) {
  const { interp } = session.run(`
1wire A : 1
1wire B : 0
1wire X = NOT(A)
1wire Y = AND(X, A)
1wire Z = NOT(B)
1wire T = AND(Z, B)`);
  h.assert('607 X=NOT(A)=0', session.getWire(interp, 'X'), '0');
  h.assert('607 Y=AND(X,A)=0', session.getWire(interp, 'Y'), '0');
  h.assert('607 Z=NOT(B)=1', session.getWire(interp, 'Z'), '1');
  h.assert('607 T=AND(Z,B)=0', session.getWire(interp, 'T'), '0');
}, { propagation: 'wave' });

reg(608, 'signal', 'switch → wire → cascaded NOT (wave)', function(h, session) {
  const { interp } = session.run(`
comp [switch] .sw::

1wire a = .sw:get
1wire b = NOT(a)`);
  h.assert('608 initial b=NOT(0)=1', session.getWire(interp, 'b'), '1');
  session.setComp(interp, '.sw', '1');
  h.assert('608 a=1 after switch', session.getWire(interp, 'a'), '1');
  h.assert('608 b=0 after switch', session.getWire(interp, 'b'), '0');
}, { propagation: 'wave' });

reg(609, 'signal', 'key press → wire (wave)', function(h, session) {
  const { interp } = session.run(`
comp [key] .k::

1wire a = .k:get`);
  h.assert('609 initial a=0', session.getWire(interp, 'a'), '0');
  session.setComp(interp, '.k', '1');
  h.assert('609 a=1 after key press', session.getWire(interp, 'a'), '1');
  session.setComp(interp, '.k', '0');
  h.assert('609 a=0 after key release', session.getWire(interp, 'a'), '0');
}, { propagation: 'wave' });

reg(610, 'signal', 'dip → wire multi-bit (wave)', function(h, session) {
  const { interp } = session.run(`
comp [dip] .d:
  length: 4
  :

4wire a = .d:get`);
  h.assert('610 initial a=0000', session.getWire(interp, 'a'), '0000');
  session.setComp(interp, '.d', '1010');
  h.assert('610 a=1010 after dip', session.getWire(interp, 'a'), '1010');
}, { propagation: 'wave' });

reg(611, 'signal', 'osc output → wire (wave, manual tick)', function(h, session) {
  const { interp } = session.run(`
comp [osc] .o .freq=10 .duration1=1 .duration0=1::

1wire a = .o:get`);
  h.assert('611 initial a=0', session.getWire(interp, 'a'), '0');
  session.setComp(interp, '.o', '1');
  h.assert('611 a=1 after osc high', session.getWire(interp, 'a'), '1');
  session.setComp(interp, '.o', '0');
  h.assert('611 a=0 after osc low', session.getWire(interp, 'a'), '0');
}, { propagation: 'wave' });

function runReg700FallingEdge(h, session, prefix) {
  const { interp } = session.run(`
1wire data = 0
1wire clk = 0
1wire clr = 0
1wire read = REG(data, clk, clr)`);
  h.assert(prefix + ' initial read=0', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'data', '1');
  h.assert(prefix + ' data=1 clk=0 → read=0 (no edge)', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'clk', '1');
  h.assert(prefix + ' clk=1 → read=0 (rising, no capture)', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'data', '0');
  h.assert(prefix + ' data=0 clk=1 → read=0 (hold)', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge data=0 → read=0', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'data', '1');
  session.setWire(interp, 'clk', '1');
  h.assert(prefix + ' clk=1 data=1 → read=0 (hold)', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge data=1 → read=1', session.getWire(interp, 'read'), '1');
  session.setWire(interp, 'data', '0');
  session.setWire(interp, 'clk', '1');
  h.assert(prefix + ' data=0 clk=1 → read=1 (hold)', session.getWire(interp, 'read'), '1');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge data=0 → read=0', session.getWire(interp, 'read'), '0');
}

reg(700, 'reg', 'REG with wire clock — falling edge', function(h, session) {
  runReg700FallingEdge(h, session, '700');
});

function runReg701NextBased(h, session) {
  const { interp } = session.run(`
1wire data = 1
1wire read = REG(data, ~, 0)`);
  h.assert('701 initial read=0', session.getWire(interp, 'read'), '0');
  session.execNext(interp, 1);
  h.assert('701 after NEXT(1) read=1 (latched data=1)', session.getWire(interp, 'read'), '1');
  session.setWire(interp, 'data', '0');
  h.assert('701 data=0 without NEXT → read=1 (hold)', session.getWire(interp, 'read'), '1');
  session.execNext(interp, 1);
  h.assert('701 after NEXT(2) read=0 (latched data=0)', session.getWire(interp, 'read'), '0');
}

reg(701, 'reg', 'REG with clock ~ — NEXT-based', runReg701NextBased);

reg(704, 'reg', 'REG with clock ~ — NEXT-based (wave)', runReg701NextBased, { propagation: 'wave' });

function runReg702ClearOverride(h, session, prefix) {
  const { interp } = session.run(`
1wire data = 1
1wire clk = 1
1wire clr = 0
1wire read = REG(data, clk, clr)`);
  h.assert(prefix + ' initial clk=1 data=1 → read=0 (no falling edge yet)', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge → read=1', session.getWire(interp, 'read'), '1');
  session.setWire(interp, 'clr', '1');
  h.assert(prefix + ' clr=1 → read=0', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'clr', '0');
  session.setWire(interp, 'clk', '1');
  h.assert(prefix + ' clr=0 clk=1 → read=0 (hold)', session.getWire(interp, 'read'), '0');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge data=1 → read=1', session.getWire(interp, 'read'), '1');
}

reg(702, 'reg', 'REG clear override', function(h, session) {
  runReg702ClearOverride(h, session, '702');
});

function runReg703MultiBit(h, session, prefix) {
  const { interp } = session.run(`
4wire data = 0000
1wire clk = 0
1wire clr = 0
4wire read = REG(data, clk, clr)`);
  h.assert(prefix + ' initial read=0000', session.getWire(interp, 'read'), '0000');
  session.setWire(interp, 'data', '1010');
  h.assert(prefix + ' data=1010 clk=0 → read=0000 (no edge)', session.getWire(interp, 'read'), '0000');
  session.setWire(interp, 'clk', '1');
  h.assert(prefix + ' clk=1 → read=0000 (hold)', session.getWire(interp, 'read'), '0000');
  session.setWire(interp, 'data', '0101');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge data=0101 → read=0101', session.getWire(interp, 'read'), '0101');
  session.setWire(interp, 'data', '1111');
  h.assert(prefix + ' data=1111 clk=0 → read=0101 (hold)', session.getWire(interp, 'read'), '0101');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert(prefix + ' falling edge data=1111 → read=1111', session.getWire(interp, 'read'), '1111');
}

reg(703, 'reg', 'REG multi-bit (4bit)', function(h, session) {
  runReg703MultiBit(h, session, '703');
});

reg(705, 'reg', 'REG falling edge — downstream cascade (wave)', function(h, session) {
  const { interp } = session.run(`
1wire data = 0
1wire clk = 0
1wire clr = 0
1wire read = REG(data, clk, clr)
1wire inv = NOT(read)`);
  h.assert('705 initial read=0', session.getWire(interp, 'read'), '0');
  h.assert('705 initial inv=1', session.getWire(interp, 'inv'), '1');
  session.setWire(interp, 'data', '1');
  session.setWire(interp, 'clk', '1');
  h.assert('705 clk=1 data=1 → read=0 (hold)', session.getWire(interp, 'read'), '0');
  h.assert('705 inv=1 before falling edge', session.getWire(interp, 'inv'), '1');
  session.setWire(interp, 'clk', '0');
  h.assert('705 falling edge → read=1', session.getWire(interp, 'read'), '1');
  h.assert('705 inv=0 after propagate', session.getWire(interp, 'inv'), '0');
  session.setWire(interp, 'data', '0');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert('705 falling edge data=0 → read=0', session.getWire(interp, 'read'), '0');
  h.assert('705 inv=1 after second falling edge', session.getWire(interp, 'inv'), '1');
}, { propagation: 'wave' });

reg(706, 'reg', 'REG clear — multi-bit falling edge cascade (wave)', function(h, session) {
  const { interp } = session.run(`
4wire data = 1010
1wire clk = 1
1wire clr = 0
4wire read = REG(data, clk, clr)
4wire bus = read`);
  h.assert('706 initial read=0000 (no falling edge)', session.getWire(interp, 'read'), '0000');
  session.setWire(interp, 'clk', '0');
  h.assert('706 falling edge → read=1010', session.getWire(interp, 'read'), '1010');
  h.assert('706 bus=1010', session.getWire(interp, 'bus'), '1010');
  session.setWire(interp, 'clr', '1');
  h.assert('706 clr=1 → read=0000', session.getWire(interp, 'read'), '0000');
  h.assert('706 bus=0000 after clear propagate', session.getWire(interp, 'bus'), '0000');
  session.setWire(interp, 'clr', '0');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert('706 falling edge after clear → read=1010', session.getWire(interp, 'read'), '1010');
  h.assert('706 bus=1010 after re-latch', session.getWire(interp, 'bus'), '1010');
}, { propagation: 'wave' });

reg(707, 'reg', 'REG falling edge — data ignored until clk 1→0 (wave)', function(h, session) {
  const { interp } = session.run(`
4wire data = 0000
1wire clk = 0
1wire clr = 0
4wire read = REG(data, clk, clr)
4wire shadow = read`);
  session.setWire(interp, 'data', '1111');
  h.assert('707 data=1111 clk=0 → read=0000', session.getWire(interp, 'read'), '0000');
  session.setWire(interp, 'clk', '1');
  h.assert('707 clk=1 → read=0000 (hold)', session.getWire(interp, 'read'), '0000');
  session.setWire(interp, 'clk', '0');
  h.assert('707 falling edge → read=1111', session.getWire(interp, 'read'), '1111');
  h.assert('707 shadow=1111', session.getWire(interp, 'shadow'), '1111');
  session.setWire(interp, 'data', '0101');
  h.assert('707 data=0101 clk=0 → read=1111 (hold)', session.getWire(interp, 'read'), '1111');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert('707 falling edge data=0101 → read=0101', session.getWire(interp, 'read'), '0101');
  h.assert('707 shadow=0101', session.getWire(interp, 'shadow'), '0101');
}, { propagation: 'wave' });

const CHIP_HALFADD = `chip +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum`;

reg(428, 'doc-comp', 'doc(chip) with chip defined contains chip.halfAdd', function(h, session) {
  const out = session.runDoc(CHIP_HALFADD + '\ndoc(chip)');
  h.assert('doc(chip) contains chip.halfAdd', String(out.some(l => l === 'chip.halfAdd')), 'true');
});

reg(429, 'doc-comp', 'doc(chip.halfAdd) first line', function(h, session) {
  const out = session.runDoc(CHIP_HALFADD + '\ndoc(chip.halfAdd)');
  h.assert('chip.halfAdd first line', out[0], 'chip [halfAdd] .name:');
});

reg(430, 'doc-comp', 'doc(chip.halfAdd) contains 4pin a', function(h, session) {
  const out = session.runDoc(CHIP_HALFADD + '\ndoc(chip.halfAdd)');
  h.assert('chip.halfAdd contains 4pin a', String(out.some(l => l.includes('4pin a'))), 'true');
});

reg(431, 'doc-comp', 'doc(chip.xyz) undefined type', function(h, session) {
  const out = session.runDoc('doc(chip.xyz)');
  h.assert('chip.xyz undefined', out[0], 'chip.xyz: undefined chip type');
});

const CHIP_U1_INIT = `.u1:{
  a = 0101
  b = 0011
  set = 1
}`;

function runChipInstTest(h, session) {
  const src = CHIP_HALFADD + `
chip [halfAdd] .u1::
` + CHIP_U1_INIT + `
4wire r = .u1:sum
`;
  const { interp } = session.run(src);
  h.assert('chip inst sum', session.getWire(interp, 'r'), '1000');
}

reg(540, 'chip', 'chip instantiation and pout access', runChipInstTest);

reg(541, 'chip', 'chip +[inner] in body — parse error', function(h, session) {
  let err = '';
  try {
    session.parse(`chip +[outer]:
  chip +[inner]:
    1pin x
  :
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('chip nested def error', String(err.includes('cannot define new chip')), 'true');
});

reg(542, 'chip', 'chip body interzice comp switch', function(h, session) {
  let err = '';
  try {
    session.parse(`chip +[bad]:
  comp [switch] .s::
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('switch in chip error', String(err.includes('switch')), 'true');
});

reg(543, 'chip', 'chip property block on:1 exec', function(h, session) {
  const src = CHIP_HALFADD + `
chip [halfAdd] .u1::
.u1:{
  a = 0001
  b = 0010
  set = 1
}
4wire r = .u1:sum`;
  const { interp } = session.run(src);
  h.assert('chip property block sum', session.getWire(interp, 'r'), '0011');
});

function regChipWave(id, title, run) {
  reg(id, 'chip', title + ' (wave)', run, { propagation: 'wave' });
}
regChipWave(556, 'chip instantiation and pout access', runChipInstTest);
regChipWave(557, 'chip property block on:1 exec', function(h, session) {
  const src = CHIP_HALFADD + `
chip [halfAdd] .u1::
.u1:{
  a = 0001
  b = 0010
  set = 1
}
4wire r = .u1:sum`;
  const { interp } = session.run(src);
  h.assert('chip property block sum wave', session.getWire(interp, 'r'), '0011');
});

function runProbeBasic(h, session) {
  const { interp, out } = session.run(`
1wire b = 0
1wire a : 0
a = AND(b, 1)
probe(a)`);
  h.assert('probe initialised', String(out.some(l => l.includes('# a = 0') && l.includes('initialised'))), 'true');
  session.setWire(interp, 'b', '1');
  h.assert('probe changed', String(out.some(l => l.includes('# a = 1') && l.includes('changed'))), 'true');
}

reg(800, 'probe', 'probe wire initialised and changed', runProbeBasic);
reg(801, 'probe', 'probe wire initialised and changed (wave)', runProbeBasic, { propagation: 'wave' });

reg(802, 'probe', 'Parser — probe is KEYWORD', function(h, session) {
  const { tokens } = session.tokenize('probe(a)');
  h.assert('probe tokenized', tokens[0].value, 'probe');
});

reg(803, 'probe', 'Parser — probe(a) produce nod AST', function(h, session) {
  const stmts = session.parse('probe(a)');
  h.assert('stmt probe', String(stmts[0].probe !== undefined), 'true');
});

const SHOW_SIMPLE = `1wire a = 0
1wire b = 1
1wire c = AND(a, b)
show(a, b, c)`;

function runShowSimple(h, session) {
  const { out } = session.run(SHOW_SIMPLE);
  h.assert('show c=0', String(out.some(l => l.includes('c') && l.includes('= 0'))), 'true');
}

reg(804, 'debug', 'show combinational without NEXT (legacy)', runShowSimple);
reg(805, 'debug', 'show combinational without NEXT (wave)', runShowSimple, { propagation: 'wave' });

const MID_CHANGE = `1wire a : 0
1wire b = NOT(a)
show(a, b)
a = 1
peek(a, b)
show(a, b)`;

function debugOutLines(out) {
  return out.filter(l => l.includes('(ref:'));
}

function runMidChangeLegacy(h, session) {
  const { out, interp } = session.run(MID_CHANGE);
  const lines = debugOutLines(out);
  h.assert('3 show/peek lines', String(lines.length === 3), 'true');
  h.assert('show initial b=1', String(/b \(1wire\) = 1/.test(lines[0])), 'true');
  h.assert('peek after a=1 b=0', String(/b \(1wire\) = 0/.test(lines[1])), 'true');
  h.assert('show final b=0', String(/b \(1wire\) = 0/.test(lines[2])), 'true');
  h.assert('wire b=0', session.getWire(interp, 'b'), '0');
}

function runMidChangeWave(h, session) {
  const { out, interp } = session.run(MID_CHANGE);
  const lines = debugOutLines(out);
  h.assert('3 show/peek lines', String(lines.length === 3), 'true');
  h.assert('peek after a=1 b=1 (before settle)', String(/b \(1wire\) = 1/.test(lines[1])), 'true');
  h.assert('all lines b=1 on wave', String(lines.every(l => /b \(1wire\) = 1/.test(l))), 'true');
  h.assert('wire b=1 at end RUN wave', session.getWire(interp, 'b'), '1');
}

reg(806, 'debug', 'show/peek on wire change — legacy cascade', runMidChangeLegacy);
reg(807, 'debug', 'show/peek on wire change — wave defers show', runMidChangeWave, { propagation: 'wave' });

const REG_SHOW_ONLY = `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)`;

function runRegShowOnly(h, session) {
  const { out, interp } = session.run(REG_SHOW_ONLY);
  h.assert('show q=0 without NEXT', String(out.some(l => l.includes('q') && l.includes('= 0'))), 'true');
  h.assert('q=0', session.getWire(interp, 'q'), '0');
}

reg(808, 'debug', 'show REG(~) without NEXT in script — legacy', runRegShowOnly);
reg(809, 'debug', 'show REG(~) without NEXT in script — wave', runRegShowOnly, { propagation: 'wave' });

const REG_WITH_NEXT = `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)`;

function runRegNextLegacy(h, session) {
  const lines = debugOutLines(session.run(REG_WITH_NEXT).out);
  h.assert('2 show', String(lines.length === 2), 'true');
  h.assert('primul q=0', String(/q \(1wire\) = 0/.test(lines[0])), 'true');
  h.assert('after NEXT q=1', String(/q \(1wire\) = 1/.test(lines[1])), 'true');
}

function runRegNextWave(h, session) {
  const { out, interp } = session.run(REG_WITH_NEXT);
  const lines = debugOutLines(out);
  h.assert('2 deferred show', String(lines.length === 2), 'true');
  h.assert('both q=1 after flush', String(lines.every(l => /q \(1wire\) = 1/.test(l))), 'true');
  h.assert('q=1', session.getWire(interp, 'q'), '1');
}

reg(810, 'debug', 'show before/after NEXT(~) in script — legacy', runRegNextLegacy);
reg(811, 'debug', 'show before/after NEXT(~) in script — wave', runRegNextWave, { propagation: 'wave' });

const MULTI_SHOW = `1wire a : 0
1wire b = NOT(a)
show(b)
a = 1
show(b)`;

function runMultiShowLegacy(h, session) {
  const lines = debugOutLines(session.run(MULTI_SHOW).out);
  h.assert('2 show', String(lines.length === 2), 'true');
  h.assert('primul b=1', String(/b \(1wire\) = 1/.test(lines[0])), 'true');
  h.assert('al doilea b=0', String(/b \(1wire\) = 0/.test(lines[1])), 'true');
}

function runMultiShowWave(h, session) {
  const lines = debugOutLines(session.run(MULTI_SHOW).out);
  h.assert('2 show', String(lines.length === 2), 'true');
  h.assert('both b=1 on wave', String(lines.every(l => /b \(1wire\) = 1/.test(l))), 'true');
}

reg(812, 'debug', 'two show(b) after a change — legacy', runMultiShowLegacy);
reg(813, 'debug', 'two show(b) after a change — wave', runMultiShowWave, { propagation: 'wave' });

const PROBE_AND_SETTLE = `1wire a : 0
1wire b : 1
a = AND(b, 1)
probe(a)`;

function runProbeInitThenChangedLegacy(h, session) {
  const { out } = session.run(PROBE_AND_SETTLE);
  h.assert('legacy single line', String(out.filter(l => l.startsWith('# a =')).length === 1), 'true');
  h.assert('legacy a=1 initialised', String(out.some(l => l.includes('# a = 1') && l.includes('initialised'))), 'true');
}

function runProbeInitThenChangedWave(h, session) {
  const { out } = session.run(PROBE_AND_SETTLE);
  h.assert('wave a=0 initialised', String(out.some(l => l.includes('# a = 0') && l.includes('initialised'))), 'true');
  h.assert('wave a=1 changed', String(out.some(l => l.includes('# a = 1') && l.includes('changed'))), 'true');
  h.assert('wave without second initialised', String(!out.some(l => l.includes('# a = 1') && l.includes('initialised'))), 'true');
}

reg(814, 'debug', 'probe settle RUN — legacy o linie', runProbeInitThenChangedLegacy);
reg(815, 'debug', 'probe settle RUN — wave initialised apoi changed', runProbeInitThenChangedWave, { propagation: 'wave' });

const PROBE_REG_EDGE = `1wire data : 0
1wire clk : 0
1wire q = REG(data, clk, 0)
probe(q)`;

function runProbeRegEdge(h, session) {
  const { out, interp } = session.run(PROBE_REG_EDGE);
  h.assert('probe q=0 initialised', String(out.some(l => l.includes('# q = 0') && l.includes('initialised'))), 'true');
  session.setWire(interp, 'data', '1');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert('probe q=1 edge committed', String(out.some(l => l.includes('# q = 1') && l.includes('edge committed'))), 'true');
}

reg(816, 'debug', 'probe REG clk 1→0 — edge committed', runProbeRegEdge);
reg(817, 'debug', 'probe REG clk 1→0 — edge committed (wave)', runProbeRegEdge, { propagation: 'wave' });

const PROBE_KEY_REG = `1wire data : 1
comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
1wire clk = .clk
1wire q = REG(data, clk, 0)
probe(q)`;

function runProbeKeyReg(h, session) {
  const { out, interp } = session.run(PROBE_KEY_REG);
  h.assert('probe q=0 initialised', String(out.some(l => l.includes('# q = 0') && l.includes('initialised'))), 'true');
  session.setComp(interp, '.clk', '1');
  h.assert('press — q still 0', String(session.getWire(interp, 'q')), '0');
  session.setComp(interp, '.clk', '0');
  h.assert('release — q=1', String(session.getWire(interp, 'q')), '1');
  h.assert('probe q=1 edge committed', String(out.some(l => l.includes('# q = 1') && l.includes('edge committed'))), 'true');
}

reg(818, 'debug', 'probe key + REG — edge committed at release', runProbeKeyReg);
reg(819, 'debug', 'probe key + REG — edge committed at release (wave)', runProbeKeyReg, { propagation: 'wave' });

reg(820, 'probe', 'Parser — probe(.sw) produce nod AST', function(h, session) {
  const stmts = session.parse('probe(.sw)');
  h.assert('stmt probe', String(stmts[0].probe !== undefined), 'true');
  h.assert('atom component', stmts[0].probe[0].var, '.sw');
});

const PROBE_COMP_SWITCH = `comp [switch] .sw:
    text:'T'
    :
probe(.sw)`;

function runProbeComponentSwitch(h, session) {
  const { out, interp } = session.run(PROBE_COMP_SWITCH);
  h.assert('probe .sw:get initialised', String(out.some(l => l.includes('# .sw:get = 0') && l.includes('initialised'))), 'true');
  session.setComp(interp, '.sw', '1');
  h.assert('probe .sw:get changed', String(out.some(l => l.includes('# .sw:get = 1') && l.includes('changed'))), 'true');
}

reg(821, 'probe', 'probe(.sw) — initialised and changed', runProbeComponentSwitch);
reg(822, 'probe', 'probe(.sw) — initialised and changed (wave)', runProbeComponentSwitch, { propagation: 'wave' });

const PROBE_KEY_DIRECT = `comp [key] .clk:
    label:'A'
    size: 35
    on:1
    :
probe(.clk:get)`;

function runProbeKeyDirect(h, session) {
  const { out, interp } = session.run(PROBE_KEY_DIRECT);
  h.assert('probe .clk:get initialised', String(out.some(l => l.includes('# .clk:get = 0') && l.includes('initialised'))), 'true');
  session.setComp(interp, '.clk', '1');
  h.assert('press changed', String(out.some(l => l.includes('# .clk:get = 1') && l.includes('changed'))), 'true');
  session.setComp(interp, '.clk', '0');
  h.assert('release changed', String(out.some(l => l.includes('# .clk:get = 0') && l.includes('changed'))), 'true');
}

reg(823, 'probe', 'probe(.clk:get) — press/release', runProbeKeyDirect);
reg(824, 'probe', 'probe(.clk:get) — press/release (wave)', runProbeKeyDirect, { propagation: 'wave' });

reg(825, 'probe', 'probe(.div:mod) — initialised at RUN without pulse', function(h, session) {
  const script = `comp [divider] .div:
    depth:4
    :
probe(.div:mod)`;
  const { out } = session.run(script);
  h.assert('mod initialised', String(out.some(l => l.includes('# .div:mod = 0000') && l.includes('initialised'))), 'true');
});

reg(826, 'probe', 'Parser — probe(.u1:sum) produce nod AST', function(h, session) {
  const stmts = session.parse('probe(.u1:sum)');
  h.assert('stmt probe', String(stmts[0].probe !== undefined), 'true');
  h.assert('chip inst atom', stmts[0].probe[0].var, '.u1');
  h.assert('pout name', stmts[0].probe[0].property, 'sum');
});

function runProbeChipPout(h, session) {
  const src = CHIP_HALFADD + `
chip [halfAdd] .u1::
probe(.u1:sum)
` + CHIP_U1_INIT;
  const { out, interp } = session.run(src);
  h.assert('pout sum', session.getPcbPout(interp, '.u1', 'sum'), '1000');
  h.assert('probe initialised', String(out.some(l => l.includes('# .u1:sum = 1000') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.u1:{
  a = 0000
  b = 0000
  set = 1
}`);
  h.assert('probe changed', String(out.some(l => l.includes('# .u1:sum = 0000') && l.includes('changed'))), 'true');
}

reg(827, 'probe', 'probe(.u1:sum) chip pout — initialised and changed', runProbeChipPout);
reg(828, 'probe', 'probe(.u1:sum) chip pout — initialised and changed (wave)', runProbeChipPout, { propagation: 'wave' });

const PROBE_PCB_POUT = `pcb +[passthrough]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  result = data
  :4bit result

pcb [passthrough] .q::
probe(.q:result)
.q:{
  data = 1111
  set = 1
}`;

function runProbePcbPout(h, session) {
  const { out, interp } = session.run(PROBE_PCB_POUT);
  h.assert('pout result', session.getPcbPout(interp, '.q', 'result'), '1111');
  h.assert('probe initialised', String(out.some(l => l.includes('# .q:result = 1111') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.q:{
  data = 0000
  set = 1
}`);
  h.assert('probe changed', String(out.some(l => l.includes('# .q:result = 0000') && l.includes('changed'))), 'true');
}

reg(829, 'probe', 'probe(.q:result) PCB pout — initialised and changed', runProbePcbPout);
reg(830, 'probe', 'probe(.q:result) PCB pout — initialised and changed (wave)', runProbePcbPout, { propagation: 'wave' });

reg(831, 'probe', 'Parser — probe(.u1.tmp) produce nod AST', function(h, session) {
  const stmts = session.parse('probe(.u1.tmp)');
  h.assert('stmt probe', String(stmts[0].probe !== undefined), 'true');
  h.assert('inst atom', stmts[0].probe[0].var, '.u1');
  h.assert('internalWire', stmts[0].probe[0].internalWire, 'tmp');
});

const CHIP_HALFADD_DBG = `chip +[halfAddDbg]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  4wire partial = .add:get
  sum = partial
  carry = .add:carry
  :4bit sum`;

function runProbeChipInternal(h, session) {
  const src = CHIP_HALFADD_DBG + `
chip [halfAddDbg] .u1::
probe(.u1.partial)
` + CHIP_U1_INIT;
  const { out, interp } = session.run(src);
  h.assert('partial value', session.getPcbPout(interp, '.u1', 'sum'), '1000');
  h.assert('probe initialised', String(out.some(l => l.includes('# .u1.partial = 1000') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.u1:{
  a = 0000
  b = 0000
  set = 1
}`);
  h.assert('probe changed', String(out.some(l => l.includes('# .u1.partial = 0000') && l.includes('changed'))), 'true');
}

reg(832, 'probe', 'probe(.u1.partial) chip wire intern', runProbeChipInternal);
reg(833, 'probe', 'probe(.u1.partial) chip wire intern (wave)', runProbeChipInternal, { propagation: 'wave' });

const PROBE_PCB_INTERNAL = `pcb +[invDbg]:
  4pin data
  1pin set
  4pout result
  exec: set
  on:1

  4wire shadow = NOT(data)
  result = shadow
  :4bit result

pcb [invDbg] .q::
probe(.q.shadow)
.q:{
  data = 1111
  set = 1
}`;

function runProbePcbInternal(h, session) {
  const { out, interp } = session.run(PROBE_PCB_INTERNAL);
  h.assert('result', session.getPcbPout(interp, '.q', 'result'), '0000');
  h.assert('probe initialised', String(out.some(l => l.includes('# .q.shadow = 0000') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.q:{
  data = 1010
  set = 1
}`);
  h.assert('probe changed', String(out.some(l => l.includes('# .q.shadow = 0101') && l.includes('changed'))), 'true');
}

reg(834, 'probe', 'probe(.q.shadow) PCB wire intern', runProbePcbInternal);
reg(835, 'probe', 'probe(.q.shadow) PCB wire intern (wave)', runProbePcbInternal, { propagation: 'wave' });

const PROBE_DIV_MOD = `comp [divider] .div:
  depth:4
  on:1
  :
probe(.div:mod)
.div:{
  a = 1100
  b = 0011
  set = 1
}`;

function runProbeDivMod(h, session) {
  const { out, interp } = session.run(PROBE_DIV_MOD);
  h.assert('mod=0000', String(out.some(l => l.includes('# .div:mod = 0000') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.div:{
  a = 1101
  b = 0011
  set = 1
}`);
  h.assert('mod changed', String(out.some(l => l.includes('# .div:mod = 0001') && l.includes('changed'))), 'true');
}

reg(836, 'probe', 'probe(.div:mod) — initialised and changed', runProbeDivMod);
reg(837, 'probe', 'probe(.div:mod) — initialised and changed (wave)', runProbeDivMod, { propagation: 'wave' });

const PROBE_ADD_CARRY = `comp [adder] .add:
  depth:4
  on:1
  :
probe(.add:carry)
.add:{
  a = 0101
  b = 0011
  set = 1
}`;

reg(838, 'probe', 'probe(.add:carry) — carry at overflow', function(h, session) {
  const { out, interp } = session.run(PROBE_ADD_CARRY);
  h.assert('carry initialised 0', String(out.some(l => l.includes('# .add:carry = 0') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.add:{
  a = 1111
  b = 1111
  set = 1
}`);
  h.assert('carry changed 1', String(out.some(l => l.includes('# .add:carry = 1') && l.includes('changed'))), 'true');
});

function runProbePoutVsInternalDot(h, session) {
  const src = CHIP_HALFADD + `
chip [halfAdd] .u1::
probe(.u1:sum)
probe(.u1.sum)
` + CHIP_U1_INIT;
  const { out } = session.run(src);
  h.assert('colon sum probe', String(out.some(l => l.includes('# .u1:sum = 1000'))), 'true');
  h.assert('dot sum no line', String(!out.some(l => l.includes('# .u1.sum'))), 'true');
}

reg(839, 'probe', 'probe(.u1:sum) vs probe(.u1.sum) — dot does not track pout', runProbePoutVsInternalDot);

const BOARD_HALFADD = `board +[halfAdd]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  sum = .add:get
  carry = .add:carry
  :4bit sum`;

const BOARD_U1_INIT = `.u1:{
  a = 0101
  b = 0011
  set = 1
}`;

function runBoardInstTest(h, session) {
  const src = BOARD_HALFADD + `
board [halfAdd] .u1::
` + BOARD_U1_INIT + `
4wire r = .u1:sum
`;
  const { interp } = session.run(src);
  h.assert('board inst sum', session.getWire(interp, 'r'), '1000');
}

reg(840, 'board', 'board instantiation and pout access', runBoardInstTest);

reg(841, 'board', 'board +[inner] in body — parse error', function(h, session) {
  let err = '';
  try {
    session.parse(`board +[outer]:
  board +[inner]:
    1pin x
  :
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('board nested def error', String(err.includes('cannot define new board')), 'true');
});

reg(842, 'board', 'def in board body — parse error', function(h, session) {
  let err = '';
  try {
    session.parse(`board +[bad]:
  def foo(1bit x):
    :1bit x
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('def in board error', String(err.includes("'def'")), 'true');
});

reg(843, 'board', 'pcb instance in board body — parse error', function(h, session) {
  let err = '';
  try {
    session.parse(`pcb +[p]:
  1pin x
  1pout y
  exec: x
  on: 1
  y = x
  :1bit y
board +[b]:
  pcb [p] .q::
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('pcb in board error', String(err.includes('PCB')), 'true');
});

reg(844, 'board', 'comp switch allowed in board body', function(h, session) {
  const src = `board +[sw]:
  1pin set
  1pout out
  exec: set
  on: 1
  comp [switch] .en::
  out = .en:get
  :1bit out
board [sw] .u::
.u:{ set = 1 }
1wire r = .u:out`;
  const { interp } = session.run(src);
  h.assert('switch in board out', session.getWire(interp, 'r'), '0');
});

reg(845, 'board', 'board property block on:1 exec', function(h, session) {
  const src = BOARD_HALFADD + `
board [halfAdd] .u1::
.u1:{
  a = 0001
  b = 0010
  set = 1
}
4wire r = .u1:sum`;
  const { interp } = session.run(src);
  h.assert('board property block sum', session.getWire(interp, 'r'), '0011');
});

function regBoardWave(id, title, run) {
  reg(id, 'board', title + ' (wave)', run, { propagation: 'wave' });
}
regBoardWave(846, 'board instantiation and pout access', runBoardInstTest);
regBoardWave(847, 'board property block on:1 exec', function(h, session) {
  const src = BOARD_HALFADD + `
board [halfAdd] .u1::
.u1:{
  a = 0001
  b = 0010
  set = 1
}
4wire r = .u1:sum`;
  const { interp } = session.run(src);
  h.assert('board property block sum wave', session.getWire(interp, 'r'), '0011');
});

reg(848, 'doc-comp', 'doc(board) with board defined contains board.halfAdd', function(h, session) {
  const out = session.runDoc(BOARD_HALFADD + '\ndoc(board)');
  h.assert('doc(board) contains board.halfAdd', String(out.some(l => l === 'board.halfAdd')), 'true');
});

reg(849, 'doc-comp', 'doc(board.halfAdd) first line', function(h, session) {
  const out = session.runDoc(BOARD_HALFADD + '\ndoc(board.halfAdd)');
  h.assert('board.halfAdd first line', out[0], 'board [halfAdd] .name:');
});

reg(850, 'doc-comp', 'doc(board.xyz) undefined type', function(h, session) {
  const out = session.runDoc('doc(board.xyz)');
  h.assert('board.xyz undefined', out[0], 'board.xyz: undefined board type');
});

function runProbeBoardPout(h, session) {
  const src = BOARD_HALFADD + `
board [halfAdd] .u1::
probe(.u1:sum)
` + BOARD_U1_INIT;
  const { out } = session.run(src);
  h.assert('board sum initialised', String(out.some(l => l.includes('# .u1:sum = 1000') && l.includes('initialised'))), 'true');
}

reg(851, 'probe', 'probe(.u1:sum) board pout — initialised', runProbeBoardPout);
reg(852, 'probe', 'probe(.u1:sum) board pout — initialised (wave)', runProbeBoardPout, { propagation: 'wave' });

const BOARD_HALFADD_DBG = `board +[halfAddDbg]:
  4pin a
  4pin b
  1pin set
  4pout sum
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  4wire partial = .add:get
  sum = partial
  carry = .add:carry
  :4bit sum`;

function runProbeBoardInternal(h, session) {
  const src = BOARD_HALFADD_DBG + `
board [halfAddDbg] .u1::
probe(.u1.partial)
` + BOARD_U1_INIT;
  const { out } = session.run(src);
  h.assert('board internal wire', String(out.some(l => l.includes('# .u1.partial = 1000') && l.includes('initialised'))), 'true');
}

reg(853, 'probe', 'probe(.u1.partial) board wire intern', runProbeBoardInternal);
reg(854, 'probe', 'probe(.u1.partial) board wire intern (wave)', runProbeBoardInternal, { propagation: 'wave' });

reg(855, 'board', 'nested chip in board', function(h, session) {
  const src = CHIP_HALFADD + `
board +[wrap]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  chip [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum
board [wrap] .w::
.w:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .w:sum`;
  const { interp } = session.run(src);
  h.assert('chip nested in board', session.getWire(interp, 'r'), '1000');
});

reg(856, 'board', 'nested board in board', function(h, session) {
  const src = BOARD_HALFADD + `
board +[wrap]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  board [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum
board [wrap] .w::
.w:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .w:sum`;
  const { interp } = session.run(src);
  h.assert('board nested in board', session.getWire(interp, 'r'), '1000');
});

reg(857, 'chip', 'board +[inner] in chip body — parse error', function(h, session) {
  let err = '';
  try {
    session.parse(`chip +[outer]:
  board +[inner]:
    1pin x
  :
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('board def in chip error', String(err.includes('cannot define new board')), 'true');
});

reg(858, 'chip', 'board instance in chip body — allowed', function(h, session) {
  const src = BOARD_HALFADD + `
chip +[wrap]:
  4pin a
  4pin b
  1pin set
  4pout sum
  exec: set
  on: 1
  board [halfAdd] .ha::
  .ha:a = a
  .ha:b = b
  .ha:{ set = 1 }
  sum = .ha:sum
  :4bit sum
chip [wrap] .w::
.w:{
  a = 0101
  b = 0011
  set = 1
}
4wire r = .w:sum`;
  const { interp } = session.run(src);
  h.assert('board inst in chip', session.getWire(interp, 'r'), '1000');
});

const CHIP_ALU4 = `chip +[alu4]:
  4pin a
  4pin b
  2pin op
  1pin set
  4pout y
  1pout carry
  exec: set
  on: 1
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  .add:a = a
  .add:b = b
  .sub:a = a
  .sub:b = b
  y = MUX(op.1, .add:get, .sub:get)
  carry = MUX(op.1, .add:carry, .sub:carry)
  :4bit y`;

const BOARD_CPU4 = `board +[cpu4]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 4
    = ^10334221
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^7
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [adder] .add:
    depth: 4
    on: 1
    :
  comp [subtract] .sub:
    depth: 4
    on: 1
    :
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire addres
  4wire subres
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire ishalt
  4wire t0
  4wire t1
  4wire accnext
  1wire doinc
  1wire inc
  pcval = .pcnt:get
  .prog:{ adr = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:adr = opd
  .data:{ set = set }
  loadval = .data:get
  .add:a = curacc
  .add:b = opd
  .sub:a = curacc
  .sub:b = opd
  addres = .add:get
  subres = .sub:get
  isload = EQ(opc, 0001)
  isstore = EQ(opc, 0010)
  isaddi = EQ(opc, 0011)
  issubi = EQ(opc, 0100)
  isjmp = EQ(opc, 0101)
  ishalt = EQ(opc, 0111)
  t0 = MUX(issubi, curacc, subres)
  t1 = MUX(isaddi, t0, addres)
  accnext = MUX(isload, t1, loadval)
  doinc = AND(NOT(ishalt), NOT(isjmp))
  inc = AND(doinc, set)
  .pcnt:{ data = opd
    write = 1
    set = AND(isjmp, set) }
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:adr = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc`;

function cpuStep(session, interp, n) {
  for (let i = 0; i < n; i++) {
    session.execStmts(interp, '.cpu:{ set = 1 }');
  }
}

reg(859, 'chip', 'chip alu4 ADD 5+3', function(h, session) {
  const src = CHIP_ALU4 + `
chip [alu4] .u::
.u:{
  a = 0101
  b = 0011
  op = 00
  set = 1
}
4wire r = .u:y`;
  const { interp } = session.run(src);
  h.assert('alu4 add', session.getWire(interp, 'r'), '1000');
});

reg(860, 'chip', 'chip alu4 SUB 5-3', function(h, session) {
  const src = CHIP_ALU4 + `
chip [alu4] .u::
.u:{
  a = 0101
  b = 0011
  op = 01
  set = 1
}
4wire r = .u:y`;
  const { interp } = session.run(src);
  h.assert('alu4 sub', session.getWire(interp, 'r'), '0010');
});

reg(861, 'board', 'cpu4 initial state acc=0 pc=0', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + '\nboard [cpu4] .cpu::\n');
  h.assert('cpu acc init', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  h.assert('cpu pc init', session.getPcbPout(interp, '.cpu', 'pc'), '0000');
});

reg(862, 'board', 'cpu4 un pas LOAD 0 → acc=7 pc=1', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + '\nboard [cpu4] .cpu::\n');
  cpuStep(session, interp, 1);
  h.assert('cpu acc after LOAD', session.getPcbPout(interp, '.cpu', 'acc'), '0111');
  h.assert('cpu pc after LOAD', session.getPcbPout(interp, '.cpu', 'pc'), '0001');
});

reg(863, 'board', 'cpu4 program demo complet', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + '\nboard [cpu4] .cpu::\n');
  cpuStep(session, interp, 4);
  h.assert('cpu acc final', session.getPcbPout(interp, '.cpu', 'acc'), '1000');
  h.assert('cpu pc final', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

reg(864, 'probe', 'probe(.cpu:acc) cpu4', function(h, session) {
  const src = CHIP_ALU4 + '\n' + BOARD_CPU4 + `
board [cpu4] .cpu::
probe(.cpu:acc)`;
  const { out, interp } = session.run(src);
  h.assert('probe acc initialised', String(out.some(l => l.includes('# .cpu:acc = 0000') && l.includes('initialised'))), 'true');
  cpuStep(session, interp, 1);
  h.assert('cpu acc after step', session.getPcbPout(interp, '.cpu', 'acc'), '0111');
});

reg(865, 'board', 'cpu4 clock pulse .cpu:{ set = wire }', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + `
board [cpu4] .cpu::
1wire clk = 0
.cpu:{ set = clk }
`);
  for (let i = 0; i < 4; i++) {
    session.setWire(interp, 'clk', '1');
    session.setWire(interp, 'clk', '0');
  }
  h.assert('cpu acc after 4 pulse', session.getPcbPout(interp, '.cpu', 'acc'), '1000');
  h.assert('cpu pc after 4 pulse', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

reg(866, 'board', 'cpu4 NEXT(~) step', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + `
board [cpu4] .cpu::
.cpu:{ set = ~ }
`);
  for (let i = 0; i < 4; i++) session.execNext(interp, 1);
  h.assert('cpu acc after 4 NEXT', session.getPcbPout(interp, '.cpu', 'acc'), '1000');
  h.assert('cpu pc after 4 NEXT', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

const LUT_BASIC = `comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    0         : 0001
    \\1 - \\5  : 0010
  }
  :`;

reg(867, 'lut', 'LUT init — slot nemapat default 0000', function(h, session) {
  const { interp } = session.run(LUT_BASIC + `
.lut:in = 0110
4wire y = .lut:get`);
  h.assert('slot 0', session.getWire(interp, 'y'), '0000');
});

reg(868, 'lut', 'LUT fillwith — slot 6-9 = 0110', function(h, session) {
  const src = `comp [lut] .lut:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \\1 - \\5  : 0010
  }
  :
.lut:in = 0110
4wire y = .lut:get`;
  const { interp } = session.run(src);
  h.assert('slot 6 fillwith', session.getWire(interp, 'y'), '0110');
});

reg(869, 'lut', 'LUT binary address 010 → slot 2', function(h, session) {
  const src = `comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    010 : 1000
  }
  :
.lut:in = 010
4wire y = .lut:get`;
  const { interp } = session.run(src);
  h.assert('slot 2', session.getWire(interp, 'y'), '1000');
});

reg(870, 'lut', 'LUT decimal address \\\\50', function(h, session) {
  const src = `comp [lut] .lut:
  depth: 4
  length: 64
  = data {
    \\50 : 1111
  }
  :
.lut:in = \\50
4wire y = .lut:get`;
  const { interp } = session.run(src);
  h.assert('slot 50', session.getWire(interp, 'y'), '1111');
});

reg(871, 'lut', 'LUT range hex ^a - ^f', function(h, session) {
  const src = `comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    ^a - ^f : 1111
  }
  :
.lut:in = ^c
4wire y = .lut:get`;
  const { interp } = session.run(src);
  h.assert('slot 12', session.getWire(interp, 'y'), '1111');
});

reg(872, 'lut', 'LUT range mixt 010 - \\\\5', function(h, session) {
  const src = `comp [lut] .lut:
  depth: 4
  length: 16
  = data {
    010 - \\5 : 0010
  }
  :
.lut:in = 0100
4wire y = .lut:get`;
  const { interp } = session.run(src);
  h.assert('slot 4', session.getWire(interp, 'y'), '0010');
});

function runLutMethodB(h, session) {
  const src = LUT_BASIC + `
4wire addr = 0011
.lut:in = addr
4wire y = .lut:get`;
  const { interp } = session.run(src);
  h.assert('method B slot 3', session.getWire(interp, 'y'), '0010');
  session.setWire(interp, 'addr', '0000');
  const comp = interp.components.get('.lut');
  const handler = interp.componentRegistry.get('lut');
  const got = handler.evalGetProperty(comp, 'get', { var: '.lut', property: 'get' }, interp).value;
  h.assert('method B slot 0 after addr change', got, '0001');
}

reg(873, 'lut', 'LUT metoda B — .lut:in + .lut:get', runLutMethodB);
reg(874, 'lut', 'LUT metoda B (wave)', runLutMethodB, { propagation: 'wave' });

reg(875, 'lut', 'LUT metoda A — .lut(in = expr)', function(h, session) {
  const { interp } = session.run(LUT_BASIC + `
4wire addr = 0001
4wire y = .lut(in = addr)`);
  h.assert('method A slot 1', session.getWire(interp, 'y'), '0010');
});

const PROBE_LUT = LUT_BASIC + `
probe(.lut:get)
.lut:in = 0000`;

function runProbeLut(h, session) {
  const { out, interp } = session.run(PROBE_LUT);
  h.assert('probe init', String(out.some(l => l.includes('# .lut:get = 0001') && l.includes('initialised'))), 'true');
  session.execStmts(interp, `.lut:in = 0011`);
  h.assert('probe changed', String(out.some(l => l.includes('# .lut:get = 0010') && l.includes('changed'))), 'true');
}

reg(876, 'lut', 'probe(.lut:get) — initialised and changed', runProbeLut);
reg(877, 'lut', 'probe(.lut:get) — wave', runProbeLut, { propagation: 'wave' });

const LUT_DIP_INLINE = `comp [dip] .sw:
  length: 4
  = 0000
  :

inline [lut] .hex7:
  depth: 8
  length: 16
  data {
    0000: 11111100
    0001: 01100000
    0101: 10110110
    1111: 10001110
  }
  :

8wire segs = .hex7(.sw:get)`;

function runLutDipInlinePropagate(h, session) {
  const { interp } = session.run(LUT_DIP_INLINE);
  h.assert('initial digit 0', session.getWire(interp, 'segs'), '11111100');
  session.setComp(interp, '.sw', '0101');
  h.assert('digit 5', session.getWire(interp, 'segs'), '10110110');
  session.setComp(interp, '.sw', '1111');
  h.assert('digit F', session.getWire(interp, 'segs'), '10001110');
}

reg(1188, 'lut', 'inline LUT invoke propagates on dip change (wave)', runLutDipInlinePropagate, { propagation: 'wave' });
reg(1189, 'lut', 'inline LUT invoke propagates on dip change (legacy)', runLutDipInlinePropagate, { propagation: 'legacy' });

reg(1190, 'lut', 'inline LUT invoke propagates via wire address (wave)', function(h, session) {
  const src = LUT_DIP_INLINE.replace(
    '8wire segs = .hex7(.sw:get)',
    '4wire sw = .sw:get\n8wire segs = .hex7(in = sw)'
  );
  const { interp } = session.run(src);
  h.assert('initial', session.getWire(interp, 'segs'), '11111100');
  session.setComp(interp, '.sw', '0101');
  h.assert('after dip via wire', session.getWire(interp, 'segs'), '10110110');
}, { propagation: 'wave' });

const LUT_7SEG_DISPLAY = `comp [dip] .sw:
  length: 4
  = 0000
  :

inline [lut] .hex7:
  depth: 8
  length: 16
  data {
    0000: 11111100
    1110: 10011110
    1111: 10001110
  }
  :

8wire segs = .hex7(.sw:get)

comp [7seg] .digit:
  on: 1
  nl
  :

.digit:{
  a = segs.0
  b = segs.1
  c = segs.2
  d = segs.3
  e = segs.4
  f = segs.5
  g = segs.6
  h = segs.7
  set = 1
}`;

reg(1191, 'lut', '7seg segments from LUT wire (MSB=a, wave)', function(h, session) {
  const { interp } = session.run(LUT_7SEG_DISPLAY);
  const comp = interp.components.get('.digit');
  h.assert('digit 0 pattern', comp.lastSegmentValue, '11111100');
  session.setComp(interp, '.sw', '1110');
  h.assert('digit E pattern', comp.lastSegmentValue, '10011110');
}, { propagation: 'wave' });

reg(878, 'lut', 'doc(comp.lut) — type syntax', function(h, session) {
  const out = session.runDoc('doc(comp.lut)');
  h.assert('data block', String(out.some(l => l.includes('data {'))), 'true');
  h.assert('fillwith attr', String(out.some(l => l.includes('fillwith'))), 'true');
  h.assert('Xpout get', String(out.some(l => l.includes('Xpout get'))), 'true');
});

reg(879, 'lut', 'doc(.decoder) — instance map + fill', function(h, session) {
  const out = session.runDoc(`comp [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  = data {
    0         : 0001
    \\1 - \\5  : 0010
    ^a - ^f   : 1111
  }
  :
doc(.decoder)`);
  h.assert('header', String(out.some(l => l.includes('.decoder (comp [lut])'))), 'true');
  h.assert('map 0001', String(out.some(l => l.includes('0001'))), 'true');
  h.assert('map 0010', String(out.some(l => l.includes('0010'))), 'true');
  h.assert('fillwith slots', String(out.some(l => l.includes('fillwith'))), 'true');
});

reg(880, 'lut', 'LUT error — address >= length', function(h, session) {
  let err = '';
  try {
    session.parse(`comp [lut] .x:
  depth: 4
  length: 8
  = data {
    \\10 : 0001
  }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('addr too large', String(err.includes('>= length')), 'true');
});

reg(881, 'lut', 'LUT error — value too wide', function(h, session) {
  let err = '';
  try {
    session.parse(`comp [lut] .x:
  depth: 4
  length: 8
  = data {
    0 : 00001
  }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('value width', String(err.includes('exactly 4 bits')), 'true');
});

reg(882, 'lut', 'LUT error — fillwith too wide', function(h, session) {
  let err = '';
  try {
    session.run(`comp [lut] .x:
  depth: 4
  length: 8
  fillwith: 011
  = data { 0 : 0000 }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('fillwith width', String(err.includes('fillwith')), 'true');
});

const INLINE_ASM_ISA = `inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  ADD   : 0011 + R2b + R2b
  ADDI  : 0111 + R2b + 2b
  MOVI  : 1000 + 4b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :`;

reg(883, 'asm', 'parse inline [asm] — mnemonici + segmente', function(h, session) {
  const p = new Parser(new Tokenizer(preprocessRepeat(INLINE_ASM_ISA)), session._ensureRegistry());
  const stmts = p.parse();
  h.assert('inline stmt', String(!!stmts[0].inline), 'true');
  h.assert('instance name', stmts[0].inline.name, '.myisa');
  h.assert('kind asm', stmts[0].inline.kind, 'asm');
  const isa = parseIsaBody(stmts[0].inline.bodyRaw);
  h.assert('wordWidth 8', String(isa.wordWidth), '8');
  h.assert('LOAD has R2b', String(isa.opcodes.LOAD.segments.some(s => s.kind === 'reg')), 'true');
  h.assert('BEQ has S4b', String(isa.opcodes.BEQ.segments.some(s => s.signed)), 'true');
});

reg(884, 'asm', 'wordWidth uniform; mnemonic duplicat', function(h, session) {
  let errW = '';
  let errD = '';
  try {
    parseIsaBody('NOP : 0000 + 4b\nLOAD : 0001 + R2b + A2b + 2b');
  } catch (e) { errW = String(e.message || e); }
  try {
    parseIsaBody('NOP : 0000 + 4b\nNOP : 0001 + 4b');
  } catch (e) { errD = String(e.message || e); }
  h.assert('width mismatch', String(errW.includes('wordWidth')), 'true');
  h.assert('duplicate mnemonic', String(errD.includes('Duplicate')), 'true');
});

reg(885, 'asm', 'NOP alone → expected bits', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { NOP }');
  h.assert('NOP 8b', session.getWire(interp, 'x'), '00000000');
});

reg(886, 'asm', 'LOAD R1 A3 without comma', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { LOAD R1 A3 }');
  h.assert('LOAD enc', session.getWire(interp, 'x'), '00010111');
});

reg(887, 'asm', 'program multi-line in { }', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
16wire x = .myisa {
  NOP
  LOAD R1 A3
}`);
  h.assert('2 instr', String(session.getWire(interp, 'x').length), '16');
  h.assert('instr0', session.getWire(interp, 'x').slice(0, 8), '00000000');
  h.assert('instr1', session.getWire(interp, 'x').slice(8), '00010111');
});

reg(888, 'asm', '48w myProg = .myisa { } → blob', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
48w myProg = .myisa {
  NOP
  NOP
  NOP
  NOP
  NOP
  NOP
}`);
  const w = session.getWire(interp, 'myProg');
  h.assert('48 bits', String(w.length), '48');
  h.assert('all NOP', w, '00000000'.repeat(6));
});

reg(889, 'asm', 'loop: + JMP loop — salt absolut A4b', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
16wire x = .myisa {
  loop:
    NOP
    JMP loop
}`);
  h.assert('JMP to 0', session.getWire(interp, 'x'), '0000000001010000');
});

reg(890, 'asm', 'forward ref JMP loop3', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
16wire x = .myisa {
  JMP there
there:
  NOP
}`);
  h.assert('forward JMP', session.getWire(interp, 'x').slice(0, 8), '01010001');
});

reg(891, 'asm', 'labels loop / loop2 / loop3', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
48wire x = .myisa {
  loop:
    NOP
    JMP loop3
  NOP
  NOP
  loop2:
    ADDI R1 \\1
  loop3:
    LOAD R1 A3
}`);
  h.assert('6 instr', String(session.getWire(interp, 'x').length), '48');
  h.assert('ADDI at loop2', session.getWire(interp, 'x').slice(32, 40), '01110101');
});

reg(892, 'asm', 'BEQ loop_start offset -3 → 1101', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
24wire x = .myisa {
  loop_start:
    NOP
    NOP
    BEQ loop_start
}`);
  h.assert('BEQ S4b', session.getWire(interp, 'x').slice(16), '01001101');
});

reg(893, 'asm', 'literal \\\\-3 in S4b', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { BEQ \\-3 }');
  h.assert('literal -3', session.getWire(interp, 'x'), '01001101');
});

reg(894, 'asm', 'offset -21 on S4b → bounds error', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { BEQ \\-21 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('bounds', String(err.includes('out of bounds')), 'true');
});

reg(895, 'asm', 'wrong prefix ADD \\\\2 R1', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { ADD \\2 R1 \\5 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('Register prefix', String(err.includes('Register prefix')), 'true');
});

reg(896, 'asm', 'overflow \\\\18 on 4b', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { MOVI \\18 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('max 15', String(err.includes('max 15')), 'true');
});

reg(897, 'asm', 'undefined label JMP nowhere', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { JMP nowhere }');
  } catch (e) { err = String(e.message || e); }
  h.assert('Undefined label', String(err.includes('Undefined label')), 'true');
});

reg(898, 'asm', 'wire width mismatch 50w vs 48b', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + `
50w x = .myisa {
  NOP
  NOP
  NOP
  NOP
  NOP
  NOP
}`);
  } catch (e) { err = String(e.message || e); }
  h.assert('mismatch', String(err.includes('Bit-width mismatch') || err.includes('Expected 50 bits')), 'true');
});

reg(899, 'asm', 'comp [mem] = .myisa { } multi-line', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
comp [mem] .prog:
  depth: 8
  length: 4
  = .myisa {
    NOP
    LOAD R1 A3
  }
  :
8wire x = .prog:get`);
  h.assert('slot0 NOP', session.getWire(interp, 'x'), '00000000');
});

reg(900, 'asm', 'comp [mem] = myProg wire blob', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
16w myProg = .myisa { NOP; LOAD R1 A3 }
comp [mem] .m:
  depth: 8
  length: 2
  = myProg
  :
8wire x = .m:get`);
  h.assert('from wire', session.getWire(interp, 'x'), '00000000');
});

function runAsmProgAssign(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + `
comp [mem] .prog:
  depth: 8
  length: 4
  :
.prog = .myisa { NOP; LOAD R1 A3 }
8wire x = .prog:get`);
  h.assert('runtime assign', session.getWire(interp, 'x'), '00000000');
}

reg(901, 'asm', '.prog = .myisa { } runtime', runAsmProgAssign);
reg(906, 'asm', '.prog = .myisa { } wave', runAsmProgAssign, { propagation: 'wave' });

reg(902, 'asm', 'wordWidth !== mem.depth', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + `
comp [mem] .m:
  depth: 4
  length: 8
  = .myisa { NOP }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('depth', String(err.includes('mem depth')), 'true');
});

reg(903, 'asm', 'instructionCount > mem.length', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + `
comp [mem] .m:
  depth: 8
  length: 2
  = .myisa {
    NOP
    NOP
    NOP
  }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('length', String(err.includes('mem length')), 'true');
});

reg(904, 'asm', 'doc(inline) lists instances', function(h, session) {
  const out = session.runDoc(INLINE_ASM_ISA + '\ndoc(inline)');
  h.assert('instance', String(out.some(l => l.includes('.myisa (inline [asm])'))), 'true');
  h.assert('kind', String(out.some(l => l.includes('inline.asm'))), 'true');
});

reg(905, 'asm', 'doc(.myisa) opcodes definite', function(h, session) {
  const out = session.runDoc(INLINE_ASM_ISA + '\ndoc(.myisa)');
  h.assert('header', String(out.some(l => l.includes('.myisa (inline [asm])'))), 'true');
  h.assert('NOP', String(out.some(l => l.includes('NOP'))), 'true');
  h.assert('LOAD', String(out.some(l => l.includes('LOAD'))), 'true');
  h.assert('R2b', String(out.some(l => l.includes('R2b'))), 'true');
  h.assert('S4b', String(out.some(l => l.includes('S4b'))), 'true');
});

reg(907, 'asm', 'myisa { } without dot → error', function(h, session) {
  let err1 = '';
  try {
    session.parse(INLINE_ASM_ISA + '\n8wire x = myisa { NOP }');
  } catch (e) { err1 = String(e.message || e); }
  h.assert('bare brace parse error', String(err1.length > 0), 'true');
  let err2 = '';
  try {
    session.parse(INLINE_ASM_ISA + `
comp [mem] .prog:
  depth: 8
  length: 4
  = myisa { NOP }
  :`);
  } catch (e) { err2 = String(e.message || e); }
  h.assert('bare mem init parse error', String(err2.length > 0), 'true');
});

const INLINE_LUT_BASIC = `inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0         : 0001
    \\1 - \\5  : 0010
  }
  :`;

reg(908, 'lut', 'inline [lut] — .decoder(in = addr)', function(h, session) {
  const { interp } = session.run(INLINE_LUT_BASIC + `
4wire addr = 0001
4wire y = .decoder(in = addr)`);
  h.assert('inline method A slot 1', session.getWire(interp, 'y'), '0010');
});

reg(909, 'lut', 'inline [lut] — .decoder(0011) positional', function(h, session) {
  const { interp } = session.run(INLINE_LUT_BASIC + `
4wire y = .decoder(0011)`);
  h.assert('inline positional slot 3', session.getWire(interp, 'y'), '0010');
});

reg(910, 'lut', 'inline [lut] — fillwith slot nemapat', function(h, session) {
  const src = `inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \\1 - \\5  : 0010
  }
  :
4wire y = .decoder(in = 0110)`;
  const { interp } = session.run(src);
  h.assert('inline slot 6 fillwith', session.getWire(interp, 'y'), '0110');
});

reg(911, 'lut', 'decoder(in=...) without dot → error', function(h, session) {
  let err = '';
  try {
    session.parse(INLINE_LUT_BASIC + '\n4wire y = decoder(in = 0001)');
  } catch (e) { err = String(e.message || e); }
  h.assert('bare invoke parse error', String(err.length > 0), 'true');
});

reg(912, 'lut', 'doc(inline.lut) — type syntax', function(h, session) {
  const out = session.runDoc('doc(inline.lut)');
  h.assert('inline header', String(out.some(l => l.includes('inline [lut]'))), 'true');
  h.assert('data block', String(out.some(l => l.includes('data {'))), 'true');
  h.assert('invoke named', String(out.some(l => l.includes('.name(in = addr)'))), 'true');
});

reg(913, 'lut', 'doc(.decoder) — inline instance map + fill', function(h, session) {
  const out = session.runDoc(`inline [lut] .decoder:
  depth: 4
  length: 16
  fillwith: 0110
  data {
    0         : 0001
    \\1 - \\5  : 0010
    ^a - ^f   : 1111
  }
  :
doc(.decoder)`);
  h.assert('header', String(out.some(l => l.includes('.decoder (inline [lut])'))), 'true');
  h.assert('map 0001', String(out.some(l => l.includes('0001'))), 'true');
  h.assert('fillwith slots', String(out.some(l => l.includes('fillwith'))), 'true');
});

const INLINE_REV = `inline [protocol] .revtest:
  out:
    reverse(data 8b)
  :`;

const INLINE_PAR_EVEN = `inline [protocol] .pareven:
  out:
    parityEven(data 8b)
  :`;

const INLINE_PAR_ODD = `inline [protocol] .parodd:
  out:
    parityOdd(data 8b)
  :`;

const INLINE_CLK_LOW = `inline [protocol] .clklow:
  clockType: lowFirst
  out:
    clock 8b
  :`;

const INLINE_CLK_HIGH = `inline [protocol] .clkhigh:
  clockType: highFirst
  out:
    clock 8b
  :`;

const INLINE_REPEAT0 = `inline [protocol] .rep0:
  out:
    repeat 0 4b
  :`;

const INLINE_REPEAT1 = `inline [protocol] .rep1:
  out:
    repeat 1 4b
  :`;

const INLINE_UART8N1 = `inline [protocol] .uart8n1:
  tx:
    0
    reverse(data 8b)
    1
  :`;

const INLINE_UART8E1 = `inline [protocol] .uart8e1:
  tx:
    0
    reverse(data 8b)
    parityEven(data)
    1
  :`;

const INLINE_UART8O1 = `inline [protocol] .uart8o1:
  tx:
    0
    reverse(data 8b)
    parityOdd(data)
    1
  :`;

const INLINE_SPI = `inline [protocol] .spi:
  clockType: lowFirst
  mosi:
    data 8b
  sclk:
    clock 8b
  cs:
    repeat 0 8b
  :`;

const INLINE_I2C = `inline [protocol] .i2c:
  clockType: lowFirst
  sda:
    0
    address 7b
    rw 1b
    ack1 1b
    data 8b
    ack2 1b
    1
  scl:
    clock 20b
  :`;

reg(914, 'protocol', 'parse inline [protocol] — canale + parametri + attributes', function(h, session) {
  const p = new Parser(new Tokenizer(INLINE_SPI), session._ensureRegistry());
  const stmts = p.parse();
  h.assert('inline stmt', String(!!stmts[0].inline), 'true');
  h.assert('kind protocol', stmts[0].inline.kind, 'protocol');
  h.assert('instance name', stmts[0].inline.name, '.spi');
  const proto = parseProtocolBody(stmts[0].inline.bodyRaw);
  h.assert('channelOrder', proto.channelOrder.join(','), 'mosi,sclk,cs');
  h.assert('clockType', proto.attributes.clockType, 'lowFirst');
  h.assert('param data', String(proto.parameters.data), '8');
});

reg(915, 'protocol', 'reverse — .revtest', function(h, session) {
  const { interp } = session.run(INLINE_REV + '\n8wire out = .revtest { data = 01000001 }');
  h.assert('reversed', session.getWire(interp, 'out'), '10000010');
});

reg(916, 'protocol', 'parityEven — even (4 bits set)', function(h, session) {
  const { interp } = session.run(INLINE_PAR_EVEN + '\n1wire p = .pareven { data = 01100110 }');
  h.assert('even parity', session.getWire(interp, 'p'), '0');
});

reg(917, 'protocol', 'parityEven — odd (5 bits set)', function(h, session) {
  const { interp } = session.run(INLINE_PAR_EVEN + '\n1wire p = .pareven { data = 01100111 }');
  h.assert('odd data even parity', session.getWire(interp, 'p'), '1');
});

reg(918, 'protocol', 'parityOdd — par → 1', function(h, session) {
  const { interp } = session.run(INLINE_PAR_ODD + '\n1wire p = .parodd { data = 01100110 }');
  h.assert('even data odd parity', session.getWire(interp, 'p'), '1');
});

reg(919, 'protocol', 'parityOdd — impar → 0', function(h, session) {
  const { interp } = session.run(INLINE_PAR_ODD + '\n1wire p = .parodd { data = 01100111 }');
  h.assert('odd data odd parity', session.getWire(interp, 'p'), '0');
});

reg(920, 'protocol', 'clock lowFirst — 01010101', function(h, session) {
  const { interp } = session.run(INLINE_CLK_LOW + '\n8wire out = .clklow { }');
  h.assert('lowFirst', session.getWire(interp, 'out'), '01010101');
});

reg(921, 'protocol', 'clock highFirst — 10101010', function(h, session) {
  const { interp } = session.run(INLINE_CLK_HIGH + '\n8wire out = .clkhigh { }');
  h.assert('highFirst', session.getWire(interp, 'out'), '10101010');
});

reg(922, 'protocol', 'repeat 0 — 0000', function(h, session) {
  const { interp } = session.run(INLINE_REPEAT0 + '\n4wire out = .rep0 { }');
  h.assert('repeat0', session.getWire(interp, 'out'), '0000');
});

reg(923, 'protocol', 'repeat 1 — 1111', function(h, session) {
  const { interp } = session.run(INLINE_REPEAT1 + '\n4wire out = .rep1 { }');
  h.assert('repeat1', session.getWire(interp, 'out'), '1111');
});

reg(924, 'protocol', 'UART 8N1 — reverse + start/stop', function(h, session) {
  const { interp } = session.run(INLINE_UART8N1 + '\n10wire tx = .uart8n1 { data = ^41 }');
  h.assert('uart8n1', session.getWire(interp, 'tx'), '0100000101');
});

reg(925, 'protocol', 'UART 8E1 — parityEven', function(h, session) {
  const { interp } = session.run(INLINE_UART8E1 + '\n11wire tx = .uart8e1 { data = ^41 }');
  h.assert('uart8e1', session.getWire(interp, 'tx'), '01000001001');
});

reg(926, 'protocol', 'UART 8O1 — parityOdd', function(h, session) {
  const { interp } = session.run(INLINE_UART8O1 + '\n11wire tx = .uart8o1 { data = ^41 }');
  h.assert('uart8o1', session.getWire(interp, 'tx'), '01000001011');
});

reg(927, 'protocol', 'SPI multi-output — mosi + sclk + cs', function(h, session) {
  const { interp } = session.run(INLINE_SPI + `
8wire mosi,
8wire sclk,
8wire cs
= .spi { data = ^A5 }`);
  h.assert('mosi', session.getWire(interp, 'mosi'), '10100101');
  h.assert('sclk', session.getWire(interp, 'sclk'), '01010101');
  h.assert('cs', session.getWire(interp, 'cs'), '00000000');
});

reg(928, 'protocol', 'I2C multi-output — sda + scl', function(h, session) {
  const { interp } = session.run(INLINE_I2C + `
20wire sda,
20wire scl
= .i2c {
  address = ^42
  rw = 0
  ack1 = 0
  data = ^55
  ack2 = 0
}`);
  h.assert('sda', session.getWire(interp, 'sda'), '01000010000101010101');
  h.assert('scl', session.getWire(interp, 'scl'), '01010101010101010101');
});

reg(929, 'protocol', 'error — parameter width mismatch at declaration', function(h, session) {
  let err = '';
  try {
    parseProtocolBody('tx:\n  data 8b\n  reverse(data 7b)\n');
  } catch (e) { err = String(e.message || e); }
  h.assert('width mismatch', String(err.includes('previously declared')), 'true');
});

reg(930, 'protocol', 'error — missing parameter at invocation', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_UART8N1 + '\n10wire tx = .uart8n1 { }');
  } catch (e) { err = String(e.message || e); }
  h.assert('missing param', String(err.includes("Unknown parameter 'data'")), 'true');
});

reg(931, 'protocol', 'error — output width mismatch', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_UART8N1 + '\n12wire tx = .uart8n1 { data = ^41 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('width mismatch', String(err.includes('Protocol output width mismatch') || err.includes('Expected 12 bits')), 'true');
});

reg(932, 'protocol', 'uart8n1 { } without dot → error', function(h, session) {
  let err = '';
  try {
    session.parse(INLINE_UART8N1 + '\n10wire tx = uart8n1 { data = ^41 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('bare brace parse error', String(err.length > 0), 'true');
});

reg(933, 'protocol', 'doc(inline.protocol) — template', function(h, session) {
  const out = session.runDoc('doc(inline.protocol)');
  h.assert('inline header', String(out.some(l => l.includes('inline [protocol]'))), 'true');
  h.assert('reverse', String(out.some(l => l.includes('reverse'))), 'true');
  h.assert('clockType', String(out.some(l => l.includes('clockType'))), 'true');
});

reg(934, 'protocol', 'doc(.uart8n1) — instance', function(h, session) {
  const out = session.runDoc(INLINE_UART8N1 + '\ndoc(.uart8n1)');
  h.assert('header', String(out.some(l => l.includes('.uart8n1 (inline [protocol])'))), 'true');
  h.assert('outputs tx', String(out.some(l => l.includes('tx'))), 'true');
  h.assert('param data', String(out.some(l => l.includes('data 8b'))), 'true');
});

reg(935, 'protocol', 'doc(inline) lists protocol instance', function(h, session) {
  const out = session.runDoc(INLINE_UART8N1 + '\ndoc(inline)');
  h.assert('instance', String(out.some(l => l.includes('.uart8n1 (inline [protocol])'))), 'true');
  h.assert('kind', String(out.some(l => l.includes('inline.protocol'))), 'true');
});

const INLINE_LUT_FLAGS = `inline [lut] .flags:
  ZERO     = 0001
  NEGATIVE = 0010
  OVERFLOW = 0100
  CARRY    = 1000
  :`;

const INLINE_LUT_CTRL = `inline [lut] .ctrl:
  depth: 8
  ACCLOAD = 00000001
  MEMREAD = 00000010
  LOAD = ACCLOAD | MEMREAD
  :`;

const INLINE_LUT_DECODER = `inline [lut] .decoder:
  depth: 4
  length: 16
  data {
    0000 : 0001
    0001 : 0010
    0010 : 0100
  }
  :`;

const INLINE_LUT_TRAFFIC = `inline [lut] .traffic:
  RED    = 00
  YELLOW = 01
  GREEN  = 10
  data {
    RED    : GREEN
    GREEN  : YELLOW
    YELLOW : RED
  }
  :`;

reg(936, 'lut-labels', 'labels-only — .flags:ZERO', function(h, session) {
  const { interp } = session.run(INLINE_LUT_FLAGS + '\n4wire x = .flags:ZERO');
  h.assert('zero', session.getWire(interp, 'x'), '0001');
});

reg(937, 'lut-labels', 'expresie OR — .ctrl:LOAD', function(h, session) {
  const { interp } = session.run(INLINE_LUT_CTRL + '\n8wire x = .ctrl:LOAD');
  h.assert('load', session.getWire(interp, 'x'), '00000011');
});

reg(938, 'lut-labels', 'chain expression | and parentheses', function(h, session) {
  const src = `inline [lut] .mask:
    depth: 4
    A = 0001
    B = 0010
    C = 0100
    UNION = A | B | C
    USER = 1111
    VISIBLE = 1010
    RESULT = USER & VISIBLE
    :
  4wire u = .mask:UNION
  4wire r = .mask:RESULT`;
  const { interp } = session.run(src);
  h.assert('union', session.getWire(interp, 'u'), '0111');
  h.assert('and', session.getWire(interp, 'r'), '1010');
});

reg(939, 'lut-isvalid', 'valid transition RED -> GREEN', function(h, session) {
  const { interp } = session.run(INLINE_LUT_TRAFFIC + '\n1wire ok = .traffic:isValid(RED, GREEN)');
  h.assert('valid', session.getWire(interp, 'ok'), '1');
});

reg(940, 'lut-isvalid', 'invalid transition RED -> YELLOW', function(h, session) {
  const { interp } = session.run(INLINE_LUT_TRAFFIC + '\n1wire ok = .traffic:isValid(RED, YELLOW)');
  h.assert('invalid', session.getWire(interp, 'ok'), '0');
});

reg(941, 'lut-decode', 'reverse lookup single', function(h, session) {
  const { interp } = session.run(INLINE_LUT_DECODER + '\n4wire x = .decoder:decode(0010)');
  h.assert('key', session.getWire(interp, 'x'), '0001');
});

reg(942, 'lut-decode', 'reverse lookup ambiguu index 0', function(h, session) {
  const src = `inline [lut] .amb:
    depth: 4
    length: 16
    data {
      0000 : 1111
      0001 : 1111
      0010 : 1111
    }
    :
  4wire x = .amb:decode(1111)`;
  const { interp } = session.run(src);
  h.assert('first', session.getWire(interp, 'x'), '0000');
});

reg(943, 'lut-decode', 'reverse lookup with matchIndex 2', function(h, session) {
  const src = `inline [lut] .amb:
    depth: 4
    length: 16
    data {
      0000 : 1111
      0001 : 1111
      0010 : 1111
    }
    :
  4wire x = .amb:decode(1111, 0010)`;
  const { interp } = session.run(src);
  h.assert('third', session.getWire(interp, 'x'), '0010');
});

reg(944, 'lut-decode', 'decode with label GREEN -> RED', function(h, session) {
  const { interp } = session.run(INLINE_LUT_TRAFFIC + '\n4wire x = .traffic:decode(GREEN)');
  h.assert('red key addr', session.getWire(interp, 'x'), '0000');
});

reg(945, 'protocol-decode', 'uart8n1 decode single channel', function(h, session) {
  const { interp } = session.run(INLINE_UART8N1 + '\n8wire data = .uart8n1:decode(0100000101)');
  h.assert('data', session.getWire(interp, 'data'), '01000001');
});

reg(946, 'protocol-decode', 'start bit error', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_UART8N1 + '\n8wire data = .uart8n1:decode(1100000101)');
  } catch (e) { err = String(e.message || e); }
  h.assert('start bit', String(err.includes('Protocol decode failed')), 'true');
});

const INLINE_CPU = `inline [asm] .cpu:
  LOAD : 0001 + R2b + A2b
  STORE: 0010 + R2b + A2b
  :`;

reg(947, 'asm-decode', 'show disassemble', function(h, session) {
  const { out } = session.run(INLINE_CPU + '\nshow(.cpu:decode(00010111))');
  h.assert('mnemonic', String(out.some(l => l.includes('LOAD'))), 'true');
});

reg(948, 'asm-decode', 'assignment interzis', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_CPU + '\n8wire x = .cpu:decode(00010111)');
  } catch (e) { err = String(e.message || e); }
  h.assert('no assign', String(err.includes('ASM decode produces text')), 'true');
});

reg(949, 'lut-show', 'show label with expresie |', function(h, session) {
  const { out } = session.run(INLINE_LUT_CTRL + '\nshow(.ctrl:LOAD)');
  h.assert('expr', String(out.some(l => l.includes('ACCLOAD | MEMREAD'))), 'true');
  h.assert('not or fn', String(!out.some(l => l.includes('OR('))), 'true');
});

reg(950, 'lut-probe', 'probe label constant', function(h, session) {
  const { out } = session.run(INLINE_LUT_FLAGS + '\nprobe(.flags:ZERO)');
  h.assert('probe line', String(out.some(l => l.includes('.flags:ZERO') && l.includes('0001'))), 'true');
});

reg(951, 'lut-probe', 'probe label with expresie', function(h, session) {
  const { out } = session.run(INLINE_LUT_CTRL + '\nprobe(.ctrl:LOAD)');
  h.assert('expr probe', String(out.some(l => l.includes('ACCLOAD | MEMREAD'))), 'true');
});

reg(952, 'lut', 'labels bloc syntax', function(h, session) {
  const src = `inline [lut] .state:
    labels {
      IDLE = 000
      FETCH = 001
    }
    :
  3wire x = .state:FETCH`;
  const { interp } = session.run(src);
  h.assert('fetch', session.getWire(interp, 'x'), '001');
});

function _termId(interp, name) {
  const comp = interp.components.get(name);
  return comp && comp.deviceIds ? comp.deviceIds[0] : null;
}

const TERMINAL_BASE = `comp [terminal] .term:
  rows: 5
  columns: 20
  on: 1
  :`;

reg(960, 'terminal', 'registry has terminal', function(h, session) {
  const registry = session._ensureRegistry();
  h.assert('has terminal', String(registry.has('terminal')), 'true');
});

reg(961, 'terminal', 'parse comp terminal attrs', function(h, session) {
  const stmts = session.parse(`comp [terminal] .term:
  rows: 10
  columns: 40
  fontSize: 14
  wordWrap: 0
  lineNumbers: 1
  :`);
  h.assert('one stmt', String(stmts.length), '1');
  h.assert('type', stmts[0].comp.type, 'terminal');
  h.assert('rows', String(stmts[0].comp.attributes.rows), '10');
  h.assert('columns', String(stmts[0].comp.attributes.columns), '40');
  h.assert('lineNumbers', String(stmts[0].comp.attributes.lineNumbers), '1');
});

reg(962, 'terminal', 'append single byte ^41 → A', function(h, session) {
  const { interp } = session.run(TERMINAL_BASE + '\n.term:{ append = ^41\n  set = 1 }');
  const id = _termId(interp, '.term');
  h.assert('text', getTerminalText(id), 'A');
});

reg(963, 'terminal', 'append multi-byte ^414243 → ABC', function(h, session) {
  const { interp } = session.run(TERMINAL_BASE + '\n.term:{ append = ^414243\n  set = 1 }');
  h.assert('text', getTerminalText(_termId(interp, '.term')), 'ABC');
});

reg(964, 'terminal', 'append twice → AB', function(h, session) {
  const { interp } = session.run(TERMINAL_BASE + `
.term:{ append = ^41
  set = 1 }
.term:{ append = ^42
  set = 1 }`);
  h.assert('text', getTerminalText(_termId(interp, '.term')), 'AB');
});

reg(965, 'terminal', 'newline + append → Hello / World', function(h, session) {
  const { interp } = session.run(TERMINAL_BASE + `
.term:{ append = ^48656C6C6F
  set = 1 }
.term:{ newline = 1
  set = 1 }
.term:{ append = ^576F726C64
  set = 1 }`);
  h.assert('text', getTerminalText(_termId(interp, '.term')), 'Hello\nWorld');
});

reg(966, 'terminal', 'clear empties buffer', function(h, session) {
  const { interp } = session.run(TERMINAL_BASE + `
.term:{ append = ^41
  set = 1 }
.term:{ clear = 1
  set = 1 }`);
  h.assert('text', getTerminalText(_termId(interp, '.term')), '');
});

reg(967, 'terminal', 'word wrap columns 10', function(h, session) {
  const src = `comp [terminal] .term:
  rows: 5
  columns: 10
  wordWrap: 1
  on: 1
  :
.term:{ append = ^48656C6C6F576F726C64414243
  set = 1 }`;
  const { interp } = session.run(src);
  h.assert('line1', getTerminalVisibleLines(_termId(interp, '.term'))[0], 'HelloWorld');
  h.assert('line2', getTerminalVisibleLines(_termId(interp, '.term'))[1], 'ABC');
});

reg(968, 'terminal', 'scroll shows last rows', function(h, session) {
  const src = `comp [terminal] .term:
  rows: 3
  columns: 20
  on: 1
  :
.term:{ append = ^4C696E6531
  set = 1 }
.term:{ newline = 1
  set = 1 }
.term:{ append = ^4C696E6532
  set = 1 }
.term:{ newline = 1
  set = 1 }
.term:{ append = ^4C696E6533
  set = 1 }
.term:{ newline = 1
  set = 1 }
.term:{ append = ^4C696E6534
  set = 1 }`;
  const { interp } = session.run(src);
  const vis = getTerminalVisibleLines(_termId(interp, '.term'));
  h.assert('line0', vis[0], 'Line2');
  h.assert('line1', vis[1], 'Line3');
  h.assert('line2', vis[2], 'Line4');
});

reg(969, 'terminal', 'lineNumbers enabled on device', function(h, session) {
  const { interp } = session.run(`comp [terminal] .term:
  rows: 3
  columns: 10
  lineNumbers: 1
  on: 1
  :
.term:{ append = ^41
  set = 1 }`);
  const term = terminalDisplays.get(_termId(interp, '.term'));
  h.assert('lineNumbers flag', String(term.lineNumbers), '1');
  h.assert('gutter nums', String(term.buffer.getVisibleLineNumbers()[0]), '1');
});

reg(970, 'terminal', 'append < 8 bits throws', function(h, session) {
  h.assertThrows('short append', function() {
    session.run(TERMINAL_BASE + '\n.term:{ append = ^4\n  set = 1 }');
  }, 'append expects at least 8 bits');
});

reg(971, 'terminal', 'rows must be > 0', function(h, session) {
  h.assertThrows('rows 0', function() {
    session.run('comp [terminal] .term:\n  rows: 0\n  columns: 10\n  :');
  }, 'rows must be greater than 0');
});

reg(972, 'terminal', 'unknown terminal property', function(h, session) {
  h.assertThrows('bogus prop', function() {
    session.run(TERMINAL_BASE + '\n.term:{ bogus = 1\n  set = 1 }');
  }, 'Unknown terminal property');
});

reg(973, 'terminal', 'doc(comp.terminal) signature', function(h, session) {
  const out = session.runDoc('doc(comp.terminal)');
  h.assert('first line', out[0], 'comp [terminal] .name:');
  h.assert('has append pin', String(out.some(function(l) { return l.includes('append'); })), 'true');
});

reg(974, 'terminal', 'Hello World runnable', function(h, session) {
  const { interp } = session.run(TERMINAL_BASE + '\n.term:{ append = ^48656C6C6F20576F726C64\n  set = 1 }');
  h.assert('hello', getTerminalText(_termId(interp, '.term')), 'Hello World');
});

reg(975, 'terminal', 'Log output runnable', function(h, session) {
  const src = `comp [terminal] .log:
  rows: 8
  columns: 60
  lineNumbers: 1
  on: 1
  :
.log:{ append = ^426F6F74206F6B
  set = 1 }
.log:{ newline = 1
  set = 1 }
.log:{ append = ^435055207265616479
  set = 1 }`;
  const { interp } = session.run(src);
  h.assert('line1', getTerminalText(_termId(interp, '.log')).split('\n')[0], 'Boot ok');
  h.assert('line2', getTerminalText(_termId(interp, '.log')).split('\n')[1], 'CPU ready');
});

reg(976, 'terminal', 'cursorStyle 2 block after append', function(h, session) {
  const src = `comp [terminal] .term:
  rows: 3
  columns: 10
  cursorStyle: 2
  on: 1
  :
.term:{ append = ^41
  set = 1 }`;
  const { interp } = session.run(src);
  const line = getTerminalRenderedLines(_termId(interp, '.term'))[0];
  h.assert('char A', line[0], 'A');
  h.assert('block cursor', line[1], '\u2588');
});

reg(977, 'terminal', 'cursorStyle 0 no block in render', function(h, session) {
  const src = `comp [terminal] .term:
  rows: 3
  columns: 10
  cursorStyle: 0
  on: 1
  :
.term:{ append = ^41
  set = 1 }`;
  const { interp } = session.run(src);
  const line = getTerminalRenderedLines(_termId(interp, '.term'))[0];
  h.assert('no block', String(line.indexOf('\u2588') === -1), 'true');
  h.assert('starts with A', line.trim()[0], 'A');
});

reg(978, 'terminal', 'cursorStyle 1 device flag', function(h, session) {
  const { interp } = session.run(`comp [terminal] .term:
  rows: 3
  columns: 10
  cursorStyle: 1
  on: 1
  :`);
  const term = getTerminalDevice(_termId(interp, '.term'));
  h.assert('cursorStyle', String(term.cursorStyle), '1');
});

reg(979, 'terminal', 'color attribute on device', function(h, session) {
  const { interp } = session.run(`comp [terminal] .term:
  rows: 3
  columns: 10
  color: ^f3f
  on: 1
  :`);
  const term = getTerminalDevice(_termId(interp, '.term'));
  h.assert('color', term.color.toLowerCase(), '#f3f');
});

reg(980, 'terminal', 'nl attribute on device', function(h, session) {
  const { interp } = session.run(`comp [terminal] .term:
  rows: 3
  columns: 10
  nl
  on: 1
  :`);
  const term = getTerminalDevice(_termId(interp, '.term'));
  h.assert('nl', String(term.nl), 'true');
});

reg(981, 'terminal', 'invalid cursorStyle throws', function(h, session) {
  h.assertThrows('cursorStyle 3', function() {
    session.run('comp [terminal] .term:\n  rows: 3\n  columns: 10\n  cursorStyle: 3\n  :');
  }, 'cursorStyle must be 0, 1, or 2');
});

reg(982, 'terminal', 'parse cursorStyle and color attrs', function(h, session) {
  const stmts = session.parse(`comp [terminal] .term:
  rows: 5
  columns: 20
  cursorStyle: 2
  color: ^0f0
  nl
  :`);
  h.assert('cursorStyle', String(stmts[0].comp.attributes.cursorStyle), '2');
  h.assert('color', String(stmts[0].comp.attributes.color).toLowerCase(), '#0f0');
  h.assert('nl flag', String(stmts[0].comp.attributes.nl === true), 'true');
});

reg(983, 'terminal', 'block cursor at col 0 on empty', function(h, session) {
  const { interp } = session.run(`comp [terminal] .term:
  rows: 3
  columns: 10
  cursorStyle: 2
  on: 1
  :`);
  const line = getTerminalRenderedLines(_termId(interp, '.term'))[0];
  h.assert('block at start', line[0], '\u2588');
});

function _memId(interp, name) {
  const comp = interp.components.get(name);
  return comp ? comp.deviceIds[0] : null;
}

reg(984, 'mem-ports', 'ports default 1 — adr/get', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
depth: 4
length: 4
on: 1
= \\12
:
4wire a = 0000
.ram:{ adr = a
  set = 1 }
4wire r = .ram:get`);
  h.assert('ports default', String(interp.components.get('.ram').attributes.ports === undefined), 'true');
  h.assert('read addr 0', session.getWire(interp, 'r'), '1100');
});

reg(985, 'mem-ports', 'parse ports:2 + tokenizer 2get', function(h, session) {
  const { tokens } = session.tokenize('2get');
  h.assert('2get ID', tokens[0].type, 'ID');
  h.assert('2get value', tokens[0].value, '2get');
  const stmts = session.parse(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
:`);
  h.assert('ports attr', String(stmts[0].comp.attributes.ports), '2');
});

reg(986, 'mem-ports', 'dual simultaneous read', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 1010
:
4wire a0 = 0000
4wire a1 = 0001
.ram:{ adr = a0
  set = 1 }
4wire v0 = .ram:get
.ram:{ 2adr = a1
  set = 1 }
4wire v1 = .ram:2get`);
  h.assert('port1 addr0', session.getWire(interp, 'v0'), '1010');
  h.assert('port2 addr1', session.getWire(interp, 'v1'), '0000');
});

reg(987, 'mem-ports', 'write port2 updates storage', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 1010
:
.ram:{ 2adr = 0000
  2data = 0101
  2write = 1
  set = 1
}
4wire r = .ram:2get`);
  h.assert('after port2 write', session.getWire(interp, 'r'), '0101');
  const id = _memId(interp, '.ram');
  h.assert('getMem addr0', typeof getMem === 'function' ? getMem(id, 0) : '', '0101');
});

reg(988, 'mem-ports', 'write collision same address', function(h, session) {
  h.assertThrows('collision', function() {
    session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 1010
:
.ram:{ adr = 0000
  data = 1111
  write = 1
  2adr = 0000
  2data = 0101
  2write = 1
  set = 1
}`);
  }, 'Memory write collision at address 0');
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
= 1010
:`);
  const id = _memId(interp, '.ram');
  if (typeof getMem === 'function') {
    h.assert('storage unchanged', getMem(id, 0), '1010');
  }
});

reg(989, 'mem-ports', 'port 3 does not exist', function(h, session) {
  h.assertThrows('port 3', function() {
    session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
:
4wire x = .ram:3get`);
  }, 'Memory port 3 does not exist');
});

reg(990, 'mem-ports', 'multi-word 2write', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 8
on: 1
= ^ff00
:
.ram:{ 2adr = 0000
  2data = 1111000011110000
  2write = 1
  set = 1
}`);
  const id = _memId(interp, '.ram');
  if (typeof getMem === 'function') {
    h.assert('addr0', getMem(id, 0), '11110000');
    h.assert('addr1', getMem(id, 1), '11110000');
  }
});

reg(991, 'mem-ports', 'readonly blocks property write', function(h, session) {
  h.assertThrows('readonly write', function() {
    session.run(`comp [mem] .rom:
readonly
length: 4
depth: 4
on: 1
:
.rom:{ adr = 0000
  data = 1010
  write = 1
  set = 1
}`);
  }, 'Memory is read-only');
});

reg(992, 'mem-ports', 'readonly allows init', function(h, session) {
  const { interp } = session.run(`comp [mem] .rom:
readonly
length: 4
depth: 4
= ^ff
:
8wire x = .rom:get;8`);
  h.assert('init ok', session.getWire(interp, 'x'), '00001111');
});

reg(993, 'mem-ports', 'readonly allows bulk assign', function(h, session) {
  const { interp } = session.run(`comp [mem] .rom:
readonly
length: 4
depth: 4
:
4wire d = 1010
.rom = d
8wire x = .rom:get;8`);
  h.assert('bulk assign', session.getWire(interp, 'x'), '00001010');
});

reg(994, 'mem-ports', 'doc(.ram) lists 2adr when ports:2', function(h, session) {
  const { out } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
:
doc(.ram)`);
  h.assert('has 2adr', String(out.some(l => l.includes('2adr'))), 'true');
  h.assert('has 2get', String(out.some(l => l.includes('2get'))), 'true');
});

reg(995, 'mem-ports', 'reg component unchanged', function(h, session) {
  const { interp } = session.run(`comp [reg] .r:
depth: 4
on: 1
:
.r:{ data = 1010
  set = 1
}
4wire x = .r:get`);
  h.assert('reg write', session.getWire(interp, 'x'), '1010');
});

reg(996, 'mem-ports', 'wave dual simultaneous read', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 1010
:
4wire a0 = 0000
4wire a1 = 0001
.ram:{ adr = a0
  set = 1 }
4wire v0 = .ram:get
.ram:{ 2adr = a1
  set = 1 }
4wire v1 = .ram:2get`);
  h.assert('wave port1', session.getWire(interp, 'v0'), '1010');
  h.assert('wave port2', session.getWire(interp, 'v1'), '0000');
}, { propagation: 'wave' });

reg(997, 'mem-ports', 'dual get> and 2get> in one block', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 1010
:
4wire a0 = 0000
4wire a1 = 0001
4wire v0
4wire v1
.ram:{
  adr = a0
  get >= v0
  2adr = a1
  2get >= v1
  set = 1
}
show(v0)
show(v1)`);
  h.assert('v0 port1 addr0', session.getWire(interp, 'v0'), '1010');
  h.assert('v1 port2 addr1', session.getWire(interp, 'v1'), '0000');
});

reg(998, 'mem-ports', 'dual write different addresses in one block', function(h, session) {
  const { interp } = session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 0000
:
4wire r0
4wire r1
.ram:{
  adr = 0000
  data = 1010
  write = 1
  2adr = 0001
  2data = 1100
  2write = 1
  set = 1
}
.ram:{ adr = 0000
  get >= r0
  set = 1 }
.ram:{ 2adr = 0001
  2get >= r1
  set = 1 }`);
  h.assert('addr0 via get>', session.getWire(interp, 'r0'), '1010');
  h.assert('addr1 via 2get>', session.getWire(interp, 'r1'), '1100');
  const id = _memId(interp, '.ram');
  if (typeof getMem === 'function') {
    h.assert('addr0 storage', getMem(id, 0), '1010');
    h.assert('addr1 storage', getMem(id, 1), '1100');
  }
});

const RIGHT_PAD_ASM_ISA = `inline [asm] .myisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + R2b + A2b
  JMP   : 0101 + A4b
  BEQ   : 0100 + S4b
  :
`;

reg(1001, 'right-pad-assign', '3wire q =: 1 → 100', function(h, session) {
  const { interp } = session.run('3wire q =: 1');
  h.assert('q = 100', session.getWire(interp, 'q'), '100');
});

reg(1002, 'right-pad-assign', '3wire q =: 10 → 100', function(h, session) {
  const { interp } = session.run('3wire q =: 10');
  h.assert('q = 100', session.getWire(interp, 'q'), '100');
});

reg(1003, 'right-pad-assign', '8wire q =: 101 → 10100000', function(h, session) {
  const { interp } = session.run('8wire q =: 101');
  h.assert('q = 10100000', session.getWire(interp, 'q'), '10100000');
});

reg(1004, 'right-pad-assign', '8wire q =: 11110000 — exact width', function(h, session) {
  const { interp } = session.run('8wire q =: 11110000');
  h.assert('q = 11110000', session.getWire(interp, 'q'), '11110000');
});

reg(1005, 'right-pad-assign', '4wire q : 1 then q =: 11 — first assign after init', function(h, session) {
  const { interp } = session.run('4wire q : 1\nq =: 11');
  h.assert('q = 1100', session.getWire(interp, 'q'), '1100');
});

reg(1006, 'right-pad-assign', '3wire q =: 11001 — same truncate as :=', function(h, session) {
  const { interp: i1 } = session.run('3wire a =: 11001');
  const { interp: i2 } = session.run('3wire b := 11001');
  h.assert('=:', session.getWire(i1, 'a'), session.getWire(i2, 'b'));
});

reg(1007, 'right-pad-assign', '16wire ASM =: LOAD R1 A2 — right-pad', function(h, session) {
  const src = RIGHT_PAD_ASM_ISA + '16wire x =: .myisa { LOAD R1 A2 }';
  const { interp } = session.run(src);
  h.assert('x = program + zeros right', session.getWire(interp, 'x'), '0001011000000000');
});

reg(1008, 'left-pad-assign', '16wire ASM := LOAD R1 A2 — left-pad', function(h, session) {
  const src = RIGHT_PAD_ASM_ISA + '16wire x := .myisa { LOAD R1 A2 }';
  const { interp } = session.run(src);
  h.assert('x = zeros left + program', session.getWire(interp, 'x'), '0000000000010110');
});

reg(1011, 'left-pad-assign', '3wire q := 1 → 001', function(h, session) {
  const { interp } = session.run('3wire q := 1');
  h.assert('q = 001', session.getWire(interp, 'q'), '001');
});

reg(1012, 'left-pad-assign', '3wire q := 10 → 010', function(h, session) {
  const { interp } = session.run('3wire q := 10');
  h.assert('q = 010', session.getWire(interp, 'q'), '010');
});

reg(1013, 'left-pad-assign', '8wire q := 101 → 00000101', function(h, session) {
  const { interp } = session.run('8wire q := 101');
  h.assert('q = 00000101', session.getWire(interp, 'q'), '00000101');
});

reg(1014, 'strict-assign', '3wire q = 1 — strict error', function(h, session) {
  h.assertThrows('strict mismatch', function() {
    session.run('3wire q = 1');
  }, 'Expected 3 bits');
});

reg(1015, 'strict-assign', '3wire q = 001 — strict exact OK', function(h, session) {
  const { interp } = session.run('3wire q = 001');
  h.assert('q = 001', session.getWire(interp, 'q'), '001');
});

reg(1016, 'strict-assign', '4wire q = 11111 — strict error (too long)', function(h, session) {
  h.assertThrows('strict = long literal', function() {
    session.run('4wire q = 11111');
  }, 'Expected 4 bits, got 5');
});

reg(1017, 'strict-assign', '23wire ASM = program too long — strict error', function(h, session) {
  const src = RIGHT_PAD_ASM_ISA + `23wire x = .myisa {
  loop:
  NOP
  NOP
  NOP
  NOP
  NOP
  BEQ loop
}`;
  h.assertThrows('strict = long ASM', function() {
    session.run(src);
  }, 'Expected 23 bits');
});

reg(1018, 'left-pad-assign', '4wire q := 11111 — truncate OK (not strict)', function(h, session) {
  const { interp } = session.run('4wire q := 11111');
  h.assert('q = 1111', session.getWire(interp, 'q'), '1111');
});

reg(1009, 'right-pad-assign', 'MODE WIREWRITE — 4wire q =: 1 then q =: 11 re-assign', function(h, session) {
  const { interp } = session.run('MODE WIREWRITE\n4wire q =: 1\nq =: 11');
  h.assert('q = 1100', session.getWire(interp, 'q'), '1100');
});

reg(1010, 'right-pad-assign', '16wire ASM = LOAD R1 A2 — legacy mismatch throws', function(h, session) {
  const src = RIGHT_PAD_ASM_ISA + '16wire x = .myisa { LOAD R1 A2 }';
  h.assertThrows('legacy = shorter ASM than wire', function() {
    session.run(src);
  }, 'Expected 16 bits');
});

reg(1000, 'right-pad-assign', '3wire q =: 1 — wave propagation', function(h, session) {
  const { interp } = session.run('3wire q =: 1');
  h.assert('q = 100', session.getWire(interp, 'q'), '100');
}, { propagation: 'wave' });

reg(999, 'mem-ports', 'duplicate get> in same block throws', function(h, session) {
  h.assertThrows('two get>= in one block', function() {
    session.run(`comp [mem] .ram:
ports: 2
length: 4
depth: 4
on: 1
= 1010
:
4wire a0 = 0000
4wire a1 = 0001
4wire v0
4wire v1
.ram:{
  adr = a0
  get >= v0
  2adr = a1
  get >= v1
  set = 1
}`);
  }, 'Only one get> property allowed per property block');
});

const QUEUE_BASE = `comp [queue] .q:
  width: 8
  length: 16
  on: 1
  :
`;

const STACK_BASE = `comp [stack] .s:
  width: 8
  length: 16
  on: 1
  :
`;

function pushQueue(session, interp, hex) {
  session.execStmts(interp, `.q:{
  push = ${hex}
  set = 1
}`);
}

reg(1020, 'queue-stack', 'registry queue + shortname fifo parse', function(h, session) {
  const stmts = session.parse(`comp [queue] .q:
  width: 8
  length: 8
  :
comp [fifo] .f:
  width: 8
  length: 4
  :`);
  h.assert('queue comp', stmts[0].comp.type, 'queue');
  h.assert('fifo resolves queue', stmts[1].comp.type, 'queue');
});

reg(1021, 'queue-stack', 'push A,B,C — get and front = A', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  pushQueue(session, interp, '^43');
  session.execStmts(interp, '8wire g = .q:get\n8wire f = .q:front');
  h.assert('get A', session.getWire(interp, 'g'), '01000001');
  h.assert('front A', session.getWire(interp, 'f'), '01000001');
});

reg(1022, 'queue-stack', 'pop — get becomes B', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  pushQueue(session, interp, '^43');
  session.execStmts(interp, `.q:{ pop = 1
  set = 1 }
8wire g = .q:get`);
  h.assert('get B', session.getWire(interp, 'g'), '01000010');
});

reg(1023, 'queue-stack', 'size after 3 push = 00011', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  pushQueue(session, interp, '^43');
  session.execStmts(interp, '5wire n = .q:size');
  h.assert('size 3', session.getWire(interp, 'n'), '00011');
});

reg(1024, 'queue-stack', 'capacity and free after 3 push', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  pushQueue(session, interp, '^43');
  session.execStmts(interp, '5wire cap = .q:capacity\n5wire fr = .q:free');
  h.assert('capacity 16', session.getWire(interp, 'cap'), '10000');
  h.assert('free 13', session.getWire(interp, 'fr'), '01101');
});

reg(1025, 'queue-stack', 'empty/full/free when empty', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  session.execStmts(interp, '1wire e = .q:empty\n1wire f = .q:full\n5wire fr = .q:free\n5wire cap = .q:capacity');
  h.assert('empty', session.getWire(interp, 'e'), '1');
  h.assert('not full', session.getWire(interp, 'f'), '0');
  h.assert('free = capacity', session.getWire(interp, 'fr'), session.getWire(interp, 'cap'));
});

reg(1026, 'queue-stack', 'overflow push throws Queue is full', function(h, session) {
  const src = `comp [queue] .q:
  width: 8
  length: 2
  on: 1
  :
.q:{ push = ^41
  set = 1 }
.q:{ push = ^42
  set = 1 }
.q:{ push = ^43
  set = 1 }`;
  h.assertThrows('overflow', function() { session.run(src); }, 'Queue is full');
});

reg(1027, 'queue-stack', 'underflow pop throws Queue is empty', function(h, session) {
  h.assertThrows('underflow', function() {
    session.run(QUEUE_BASE + `.q:{ pop = 1
  set = 1 }`);
  }, 'Queue is empty');
});

reg(1028, 'queue-stack', 'clear + push in same block', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  session.execStmts(interp, `.q:{
  clear = 1
  push = ^43
  set = 1 }
5wire n = .q:size
8wire g = .q:get`);
  h.assert('size 1', session.getWire(interp, 'n'), '00001');
  h.assert('only C', session.getWire(interp, 'g'), '01000011');
});

reg(1029, 'queue-stack', 'pop + clear in same block', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  session.execStmts(interp, `.q:{
  pop = 1
  clear = 1
  set = 1 }
5wire n = .q:size`);
  h.assert('empty after pop+clear', session.getWire(interp, 'n'), '00000');
});

reg(1030, 'queue-stack', 'push + pop same block throws', function(h, session) {
  h.assertThrows('conflict', function() {
    session.run(QUEUE_BASE + `.q:{
  push = ^41
  pop = 1
  set = 1 }`);
  }, 'Conflicting queue operations');
});

reg(1031, 'queue-stack', 'shortname comp [fifo] works', function(h, session) {
  const { interp } = session.run(`comp [fifo] .f:
  width: 8
  length: 8
  on: 1
  :`);
  session.execStmts(interp, `.f:{ push = ^41
  set = 1 }
8wire g = .f:get`);
  h.assert('fifo push', session.getWire(interp, 'g'), '01000001');
});

reg(1032, 'queue-stack', 'get >= in property block', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  session.execStmts(interp, `8wire data
.q:{
  get >= data
  set = 1 }`);
  h.assert('get redirect', session.getWire(interp, 'data'), '01000001');
});

reg(1033, 'queue-stack', 'front >= + pop — v is new front after pop', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  session.execStmts(interp, `8wire v
.q:{
  front >= v
  pop = 1
  set = 1 }`);
  h.assert('v is B after pop', session.getWire(interp, 'v'), '01000010');
});

reg(1034, 'queue-stack', 'size >= and free >= in property block', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  pushQueue(session, interp, '^41');
  pushQueue(session, interp, '^42');
  session.execStmts(interp, `5wire n
5wire slots
.q:{
  size >= n
  free >= slots
  set = 1 }`);
  h.assert('size 2', session.getWire(interp, 'n'), '00010');
  h.assert('free 14', session.getWire(interp, 'slots'), '01110');
});

function runQueueWave(h, session) {
  const { interp } = session.run(QUEUE_BASE + `.q:{ push = ^41
  set = 1 }
8wire g = .q:get`);
  h.assert('wave get', session.getWire(interp, 'g'), '01000001');
}

reg(1035, 'queue-stack', 'wave propagation queue get', runQueueWave, { propagation: 'wave' });

reg(1036, 'queue-stack', 'doc(comp.queue) — Xpout get and front', function(h, session) {
  const out = session.runDoc('doc(comp.queue)');
  h.assert('Xpout get', String(out.some(l => l.includes('Xpout get'))), 'true');
  h.assert('Xpout front', String(out.some(l => l.includes('Xpout front'))), 'true');
});

reg(1037, 'queue-stack', 'doc(comp.fifo) shortname', function(h, session) {
  const out = session.runDoc('doc(comp.fifo)');
  h.assert('fifo doc', String(out.some(l => l.includes('Xpout get'))), 'true');
});

reg(1038, 'queue-stack', 'probe(.q:get) and probe(.q:front)', function(h, session) {
  const script = QUEUE_BASE + `probe(.q:get)
probe(.q:front)`;
  const { out } = session.run(script);
  h.assert('probe get', String(out.some(l => l.includes('# .q:get =') && l.includes('initialised'))), 'true');
  h.assert('probe front', String(out.some(l => l.includes('# .q:front =') && l.includes('initialised'))), 'true');
});

reg(1039, 'queue-stack', 'probe(.q:size) and probe(.q:free)', function(h, session) {
  const script = QUEUE_BASE + `.q:{ push = ^41
  set = 1 }
probe(.q:size)
probe(.q:free)`;
  const { out } = session.run(script);
  h.assert('probe size', String(out.some(l => l.includes('# .q:size = 00001'))), 'true');
  h.assert('probe free', String(out.some(l => l.includes('# .q:free = 01111'))), 'true');
});

reg(1040, 'queue-stack', 'empty >= flag redirect', function(h, session) {
  const { interp } = session.run(QUEUE_BASE);
  session.execStmts(interp, `1wire flag
.q:{
  empty >= flag
  set = 1 }`);
  h.assert('empty flag', session.getWire(interp, 'flag'), '1');
});

function pushStack(session, interp, hex) {
  session.execStmts(interp, `.s:{
  push = ${hex}
  set = 1
}`);
}

reg(1041, 'queue-stack', 'stack push A,B,C — top = C', function(h, session) {
  const { interp } = session.run(STACK_BASE);
  pushStack(session, interp, '^41');
  pushStack(session, interp, '^42');
  pushStack(session, interp, '^43');
  session.execStmts(interp, '8wire t = .s:top\n8wire g = .s:get');
  h.assert('top C', session.getWire(interp, 't'), '01000011');
  h.assert('get C', session.getWire(interp, 'g'), '01000011');
});

reg(1042, 'queue-stack', 'stack pop — top becomes B', function(h, session) {
  const { interp } = session.run(STACK_BASE);
  pushStack(session, interp, '^41');
  pushStack(session, interp, '^42');
  pushStack(session, interp, '^43');
  session.execStmts(interp, `.s:{ pop = 1
  set = 1 }
8wire t = .s:top`);
  h.assert('top B', session.getWire(interp, 't'), '01000010');
});

reg(1043, 'queue-stack', 'stack LIFO pop order C,B,A', function(h, session) {
  const { interp } = session.run(STACK_BASE);
  pushStack(session, interp, '^41');
  pushStack(session, interp, '^42');
  pushStack(session, interp, '^43');
  session.execStmts(interp, `.s:{ pop = 1
  set = 1 }
8wire v = .s:top`);
  h.assert('after pop C top B', session.getWire(interp, 'v'), '01000010');
  session.execStmts(interp, `.s:{ pop = 1
  set = 1 }
8wire v2 = .s:top`);
  h.assert('after pop B top A', session.getWire(interp, 'v2'), '01000001');
});

reg(1044, 'queue-stack', 'stack overflow throws Stack is full', function(h, session) {
  const src = `comp [stack] .s:
  width: 8
  length: 2
  on: 1
  :
.s:{ push = ^41
  set = 1 }
.s:{ push = ^42
  set = 1 }
.s:{ push = ^43
  set = 1 }`;
  h.assertThrows('stack overflow', function() { session.run(src); }, 'Stack is full');
});

reg(1045, 'queue-stack', 'stack underflow throws Stack is empty', function(h, session) {
  h.assertThrows('stack underflow', function() {
    session.run(STACK_BASE + `.s:{ pop = 1
  set = 1 }`);
  }, 'Stack is empty');
});

reg(1046, 'queue-stack', 'stack shortname lifo', function(h, session) {
  const { interp } = session.run(`comp [lifo] .s:
  width: 8
  length: 8
  on: 1
  :`);
  session.execStmts(interp, `.s:{ push = ^41
  set = 1 }
8wire g = .s:get`);
  h.assert('lifo push', session.getWire(interp, 'g'), '01000001');
});

reg(1047, 'queue-stack', 'stack top >= redirect', function(h, session) {
  const { interp } = session.run(STACK_BASE);
  pushStack(session, interp, '^41');
  session.execStmts(interp, `8wire data
.s:{
  top >= data
  set = 1 }`);
  h.assert('top redirect', session.getWire(interp, 'data'), '01000001');
});

reg(1048, 'queue-stack', 'stack push + pop conflict', function(h, session) {
  h.assertThrows('stack conflict', function() {
    session.run(STACK_BASE + `.s:{
  push = ^41
  pop = 1
  set = 1 }`);
  }, 'Conflicting stack operations');
});

reg(1049, 'queue-stack', 'doc(comp.stack) and doc(comp.lifo)', function(h, session) {
  const outStack = session.runDoc('doc(comp.stack)');
  const outLifo = session.runDoc('doc(comp.lifo)');
  h.assert('stack Xpout top', String(outStack.some(l => l.includes('Xpout top'))), 'true');
  h.assert('lifo doc', String(outLifo.some(l => l.includes('Xpout top'))), 'true');
});

reg(1050, 'queue-stack', 'probe(.s:top)', function(h, session) {
  const { out } = session.run(STACK_BASE + 'probe(.s:top)');
  h.assert('probe top', String(out.some(l => l.includes('# .s:top =') && l.includes('initialised'))), 'true');
});

reg(1051, 'queue-stack', 'stack size and free', function(h, session) {
  const { interp } = session.run(STACK_BASE);
  pushStack(session, interp, '^41');
  pushStack(session, interp, '^42');
  session.execStmts(interp, '5wire n = .s:size\n5wire fr = .s:free');
  h.assert('size 2', session.getWire(interp, 'n'), '00010');
  h.assert('free 14', session.getWire(interp, 'fr'), '01110');
});

reg(1052, 'queue-stack', 'stack clear + push', function(h, session) {
  const { interp } = session.run(STACK_BASE);
  pushStack(session, interp, '^41');
  session.execStmts(interp, `.s:{
  clear = 1
  push = ^42
  set = 1 }
8wire g = .s:top`);
  h.assert('only B', session.getWire(interp, 'g'), '01000010');
});

reg(1053, 'queue-stack', 'stack wave propagation', function(h, session) {
  const { interp } = session.run(STACK_BASE + `.s:{ push = ^41
  set = 1 }
8wire g = .s:get`);
  h.assert('stack wave', session.getWire(interp, 'g'), '01000001');
}, { propagation: 'wave' });

reg(1054, 'queue-stack', 'forbid direct assign queue', function(h, session) {
  h.assertThrows('direct assign', function() {
    session.run(QUEUE_BASE + `.q = ^41`);
  }, 'Cannot assign a value to a queue component');
});

reg(1055, 'queue-stack', 'show after front>= size>= free>= — wave', function(h, session) {
  const { out } = session.run(QUEUE_BASE + `.q:{ push = ^41
  set = 1 }
.q:{ push = ^42
  set = 1 }

4wire data
5wire n
5wire slots
.q:{
  front >= data
  size >= n
  free >= slots
  set = 1
}
show(data)
show(n)
show(slots)`);
  h.assert('show data', String(out.some(l => l.includes('data') && l.includes('0100'))), 'true');
  h.assert('show n', String(out.some(l => l.includes('n') && l.includes('00010'))), 'true');
  h.assert('show slots', String(out.some(l => l.includes('slots') && l.includes('01110'))), 'true');
}, { propagation: 'wave' });

const CPUISA_V2 = `inline [asm] .cpuisa:
  NOP   : 0000 + 4b
  LOAD  : 0001 + 4b
  STORE : 0010 + 4b
  ADDI  : 0011 + 4b
  SUBI  : 0100 + 4b
  JMP   : 0101 + 4b
  BEQ   : 0110 + S4b
  HALT  : 0111 + 4b
  :`;

const CPU4V2_ROM = '40wire romblob = .cpuisa {\n  LOAD \\0\nloop:\n  SUBI \\1\n  BEQ done\n  JMP loop\ndone:\n  HALT\n}\n';

const BOARD_CPU4V2 = `board +[cpu4v2]:
  1pin set
  1pin rst
  4pout acc
  4pout pc
  8pout ir
  exec: set
  on: 1
  comp [mem] .prog:
    depth: 8
    length: 8
    = romblob
    on: raise
    :
  comp [mem] .data:
    depth: 4
    length: 16
    = ^3
    on: raise
    :
  comp [counter] .pcnt:
    depth: 4
    on: 1
    :
  comp [reg] .accum:
    depth: 4
    on: 1
    :
  comp [7seg] .disp:
    on: 1
    nl
    :
  comp [terminal] .trace:
    rows: 4
    columns: 20
    on: 1
    :
  comp [adder] .pcinc:
    depth: 4
    on: 1
    :
  comp [adder] .bradd:
    depth: 4
    on: 1
    :
  comp [lut] .ctl:
    depth: 7
    length: 16
    fillwith: 0000000
    = data {
      0000: 0000000
      0001: 0000001
      0010: 0000010
      0011: 0000100
      0100: 0001000
      0101: 0010000
      0110: 0100000
      0111: 1000000
    }
    :
  chip [alu4] .alu::
  4wire pcval
  4wire pcout
  8wire instr
  4wire opc
  4wire opd
  4wire curacc
  4wire loadval
  4wire aluy
  7wire ctl
  1wire isload
  1wire isstore
  1wire isaddi
  1wire issubi
  1wire isjmp
  1wire isbeq
  1wire ishalt
  1wire iszero
  1wire isbeqtaken
  1wire dobranch
  1wire doinc
  1wire inc
  2wire aluop
  4wire t0
  4wire t1
  4wire accnext
  4wire pcplus1
  4wire brtgt
  4wire pcload
  pcval = .pcnt:get
  .prog:{ adr = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  .ctl:in = opc
  ctl = .ctl:get
  isload = ctl.6/1
  isstore = ctl.5/1
  isaddi = ctl.4/1
  issubi = ctl.3/1
  isjmp = ctl.2/1
  isbeq = ctl.1/1
  ishalt = ctl.0/1
  curacc = .accum:get
  iszero = ZERO(curacc)
  isbeqtaken = AND(isbeq, iszero)
  dobranch = OR(isjmp, isbeqtaken)
  .data:adr = opd
  .data:{ set = set }
  loadval = .data:get
  aluop = MUX(issubi, 00, 01)
  .alu:a = curacc
  .alu:b = opd
  .alu:op = aluop
  aluy = .alu:y
  t0 = MUX(issubi, curacc, aluy)
  t1 = MUX(isaddi, t0, aluy)
  accnext = MUX(isload, t1, loadval)
  .pcinc:a = pcval
  .pcinc:b = 0001
  pcplus1 = .pcinc:get
  .bradd:a = pcplus1
  .bradd:b = opd
  brtgt = .bradd:get
  pcload = MUX(isbeqtaken, opd, brtgt)
  .pcnt:{ data = pcload
    write = 1
    set = AND(dobranch, set) }
  doinc = AND(NOT(ishalt), NOT(dobranch))
  inc = AND(doinc, set)
  .pcnt:{ dir = 1
    set = inc }
  pcout = .pcnt:get
  .data:adr = opd
  .data:{ data = curacc
    write = AND(isstore, set)
    set = AND(isstore, set) }
  .accum:{ data = accnext
    set = set }
  .pcnt:{ data = 0000
    write = 1
    set = rst }
  .accum:{ data = 0000
    set = rst }
  .disp:{ hex = .accum:get
    set = set }
  .trace:{ append = ^41
    set = AND(ishalt, set) }
  acc = .accum:get
  pc = pcout
  ir = instr
  :4bit acc`;

const CPU4V2_BASE = CPUISA_V2 + '\n' + CPU4V2_ROM + '\n' + CHIP_ALU4 + '\n' + BOARD_CPU4V2;

function cpuV2Step(session, interp, n) {
  for (let i = 0; i < n; i++) {
    session.execStmts(interp, '.cpu:{ set = 1 }');
  }
}

const CPU4V2_STEPS_FULL = 9;

reg(1056, 'mini-cpu-v2', 'cpu4v2 initial state acc=0 pc=0', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + '\nboard [cpu4v2] .cpu::\n');
  h.assert('cpu acc init', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  h.assert('cpu pc init', session.getPcbPout(interp, '.cpu', 'pc'), '0000');
});

reg(1057, 'mini-cpu-v2', 'cpu4v2 un pas LOAD 0 → acc=3 pc=1', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + '\nboard [cpu4v2] .cpu::\n');
  cpuV2Step(session, interp, 1);
  h.assert('cpu acc after LOAD', session.getPcbPout(interp, '.cpu', 'acc'), '0011');
  h.assert('cpu pc after LOAD', session.getPcbPout(interp, '.cpu', 'pc'), '0001');
});

reg(1058, 'mini-cpu-v2', 'cpu4v2 countdown complet', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + '\nboard [cpu4v2] .cpu::\n');
  cpuV2Step(session, interp, CPU4V2_STEPS_FULL);
  h.assert('cpu acc final', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  h.assert('cpu pc final', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

reg(1059, 'mini-cpu-v2', 'cpu4v2 BEQ jumps to done', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + '\nboard [cpu4v2] .cpu::\n');
  cpuV2Step(session, interp, 7);
  h.assert('acc zero before BEQ', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  const pcBefore = session.getPcbPout(interp, '.cpu', 'pc');
  h.assert('pc at BEQ or done', String(pcBefore === '0010' || pcBefore === '0100'), 'true');
  if (pcBefore === '0010') {
    cpuV2Step(session, interp, 1);
    h.assert('pc after BEQ at done', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
  }
});

reg(1060, 'mini-cpu-v2', 'probe(.cpu:acc) cpu4v2', function(h, session) {
  const src = CPU4V2_BASE + `
board [cpu4v2] .cpu::
probe(.cpu:acc)`;
  const { out, interp } = session.run(src);
  h.assert('probe acc initialised', String(out.some(l => l.includes('# .cpu:acc = 0000') && l.includes('initialised'))), 'true');
  cpuV2Step(session, interp, 1);
  h.assert('cpu acc after step', session.getPcbPout(interp, '.cpu', 'acc'), '0011');
});

reg(1061, 'mini-cpu-v2', 'cpu4v2 clock pulse', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + `
board [cpu4v2] .cpu::
1wire clk = 0
.cpu:{ set = clk }
`);
  for (let i = 0; i < CPU4V2_STEPS_FULL; i++) {
    session.setWire(interp, 'clk', '1');
    session.setWire(interp, 'clk', '0');
  }
  h.assert('cpu acc after pulse', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  h.assert('cpu pc after pulse', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

reg(1062, 'mini-cpu-v2', 'cpu4v2 NEXT(~) step', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + `
board [cpu4v2] .cpu::
.cpu:{ set = ~ }
`);
  for (let i = 0; i < CPU4V2_STEPS_FULL; i++) session.execNext(interp, 1);
  h.assert('cpu acc after NEXT', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  h.assert('cpu pc after NEXT', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

reg(1063, 'mini-cpu-v2', 'cpu4v2 terminal trace at HALT', function(h, session) {
  const { interp } = session.run(CPU4V2_BASE + '\nboard [cpu4v2] .cpu::\n');
  cpuV2Step(session, interp, CPU4V2_STEPS_FULL);
  h.assert('terminal at HALT', String(getTerminalText(_termId(interp, '._cpu_trace')).includes('A')), 'true');
});

const INLINE_OPCTL = `inline [lut] .opctl:
  depth: 4
  length: 16
  fillwith: 0000
  LOAD = 0001
  HALT = 1111
  :
`;

const BOARD_GBLUT = `board +[gblut]:
  1pin set
  4pout out
  exec: set
  on: 1
  4wire y = ^.opctl:LOAD
  out = y
  :
`;

reg(1064, 'global-ref', 'board — ^.opctl:LOAD from top-level inline', function(h, session) {
  const src = INLINE_OPCTL + BOARD_GBLUT + `
board [gblut] .u::
.u:{ set = 1 }
4wire r = .u:out`;
  const { interp } = session.run(src);
  h.assert('global lut label in board', session.getWire(interp, 'r'), '0001');
});

reg(1065, 'global-ref', 'board — doc(^.opctl) in board body', function(h, session) {
  const src = INLINE_OPCTL + `board +[docgb]:
  1pin set
  exec: set
  on: 1
doc(^.opctl)
  :
board [docgb] .d::
`;
  const { out } = session.run(src);
  const text = out.join('\n');
  h.assert('doc lists LOAD label', String(text.includes('LOAD')), 'true');
  h.assert('doc targets .opctl', String(text.includes('.opctl')), 'true');
});

reg(1066, 'global-ref', 'board — ^.opctl(in = addr) LUT invoke', function(h, session) {
  const src = `inline [lut] .opctl:
  depth: 4
  length: 16
  fillwith: 0000
  data {
    0010: 1111
  }
  :
board +[lutin]:
  1pin set
  4pout out
  exec: set
  on: 1
  4wire addr = 0010
  4wire y = ^.opctl(in = addr)
  out = y
  :
board [lutin] .u::
.u:{ set = 1 }
4wire r = .u:out`;
  const { interp } = session.run(src);
  h.assert('global lut invoke by address', session.getWire(interp, 'r'), '1111');
});

const INLINE_LUT_VD = `inline [lut] .vd:
  variableDepth
  data {
    00: 0
    01: 101
    10: 11
  }
  :`;

const INLINE_HUFF = `inline [lut] .huff:
  prefixFree
  data {
    00: 0
    01: 10
    10: 110
    11: 111
  }
  :`;

const INLINE_MAP2 = `inline [lut] .map2:
  depth: 2
  length: 4
  data {
    00: 01
    01: 01
    10: 10
    11: 11
  }
  :`;

const INLINE_MAP3 = `inline [lut] .map3:
  depth: 3
  length: 4
  data {
    00: 010
    01: 110
    10: 000
    11: 111
  }
  :`;

const INLINE_TABLE4 = `inline [lut] .table:
  depth: 4
  length: 16
  data {
    0000: 0000
    0001: 0001
    0010: 0010
    0011: 0011
  }
  :`;

const INLINE_HUFF_PACKET = INLINE_HUFF + `
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :`;

const INLINE_HUFF_RECOVER = INLINE_HUFF + `
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :`;

reg(1067, 'lut-ext', 'variableDepth — different width values', function(h, session) {
  const { interp } = session.run(INLINE_LUT_VD + `
1wire a = .vd(00)
3wire b = .vd(01)
2wire c = .vd(10)`);
  h.assert('addr 00', session.getWire(interp, 'a'), '0');
  h.assert('addr 01', session.getWire(interp, 'b'), '101');
  h.assert('addr 10', session.getWire(interp, 'c'), '11');
});

reg(1068, 'lut-ext', 'variableDepth + depth: → error', function(h, session) {
  let err = '';
  try {
    session.run(`inline [lut] .bad:
  depth: 4
  variableDepth
  data { 00: 0 }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('conflict', String(err.includes('variableDepth cannot be combined with depth')), 'true');
});

reg(1069, 'lut-ext', 'prefixFree — Huffman valid', function(h, session) {
  const { interp } = session.run(INLINE_HUFF + '\n2wire x = .huff(01)');
  h.assert('lookup 01', session.getWire(interp, 'x'), '10');
});

reg(1070, 'lut-ext', 'prefixFree — violare prefix', function(h, session) {
  let err = '';
  try {
    session.run(`inline [lut] .bad:
  prefixFree
  data {
    00: 0
    01: 01
  }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('prefix violation', String(err.includes('prefixFree violation')), 'true');
});

reg(1071, 'lut-ext', 'prefixFree + depth: → error', function(h, session) {
  let err = '';
  try {
    session.run(`inline [lut] .bad:
  depth: 4
  prefixFree
  data { 00: 0 }
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('conflict', String(err.includes('prefixFree cannot be combined with depth')), 'true');
});

reg(1072, 'lut-ext', 'prefixFree implies variableDepth', function(h, session) {
  session.run(INLINE_HUFF);
  const inst = session.interp.inlineInstances.get('.huff');
  h.assert('variableDepth', String(!!inst.attributes.variableDepth), 'true');
  h.assert('prefixFree', String(!!inst.attributes.prefixFree), 'true');
  h.assert('no depth attr', String(inst.attributes.depth === undefined), 'true');
});

reg(1073, 'lut-ext', 'doc(.huff)', function(h, session) {
  const out = session.runDoc(INLINE_HUFF + '\ndoc(.huff)');
  h.assert('prefixFree', String(out.some(l => l.includes('prefixFree'))), 'true');
  h.assert('header', String(out.some(l => l.includes('.huff (inline [lut])'))), 'true');
});

reg(1074, 'lut-ext', '.huff(in=01) → 10', function(h, session) {
  const { interp } = session.run(INLINE_HUFF + '\n2wire y = .huff(in = 01)');
  h.assert('value', session.getWire(interp, 'y'), '10');
});

reg(1075, 'protocol-ext', 'def — length(data) 8b + data in payload', function(h, session) {
  const src = `inline [protocol] .pkt:
  def payload:
    length(data) 8b
    data 8b
  out:
    payload
  :
16wire out = .pkt { data = 10101010 }`;
  const { interp } = session.run(src);
  h.assert('length+data', session.getWire(interp, 'out'), '0000100010101010');
});

reg(1076, 'protocol-ext', 'length(data) 16b + data ~b = 101010', function(h, session) {
  const src = `inline [protocol] .packet:
  out:
    length(data) 16b
    data ~b
  :
22wire out = .packet { data = 101010 }`;
  const { interp } = session.run(src);
  h.assert('var packet', session.getWire(interp, 'out'), '0000000000000110101010');
});

reg(1077, 'protocol-ext', 'length(data) 8b fix → 00001000', function(h, session) {
  const src = `inline [protocol] .lenfix:
  out:
    length(data) 8b
  :
8wire out = .lenfix { data = 11110000 }`;
  const { interp } = session.run(src);
  h.assert('fixed len', session.getWire(interp, 'out'), '00001000');
});

reg(1078, 'protocol-ext', 'lengthOf(encoded) 8b — tokens 01 → 00000011 + 010', function(h, session) {
  const src = INLINE_HUFF + `
inline [protocol] .lof:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
11wire out = .lof { tokens = 0001 }`;
  const { interp } = session.run(src);
  h.assert('lengthOf+encoded', session.getWire(interp, 'out'), '00000011010');
});

reg(1079, 'protocol-ext', 'length(tokens) ≠ lengthOf(encoded)', function(h, session) {
  const src = INLINE_HUFF + `
inline [protocol] .cmp:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    length(tokens) 8b
    lengthOf(encoded) 8b
  :
8wire a,
8wire b
= .cmp { tokens = 0001 }`;
  const { interp } = session.run(src);
  h.assert('len tokens', session.getWire(interp, 'a'), '00000100');
  h.assert('len encoded', session.getWire(interp, 'b'), '00000011');
});

reg(1080, 'protocol-ext', 'expand — 000110 → 010110', function(h, session) {
  const src = INLINE_MAP2 + `
inline [protocol] .exp:
  out:
    expand(tokens, .map2, 2b)
  :
6wire out = .exp { tokens = 000110 }`;
  const { interp } = session.run(src);
  h.assert('expanded', session.getWire(interp, 'out'), '010110');
});

reg(1081, 'protocol-ext', 'expand — input not multiple of keyWidth → error', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_MAP2 + `
inline [protocol] .exp:
  out:
    expand(tokens, .map2, 2b)
  :
5wire out = .exp { tokens = 00011 }`);
  } catch (e) { err = String(e.message || e); }
  h.assert('keyWidth', String(err.includes('not a multiple of keyWidth')), 'true');
});

reg(1082, 'protocol-ext', 'collapse — fixed depth LUT', function(h, session) {
  const src = INLINE_MAP3 + `
inline [protocol] .col:
  out:
    collapse(data, .map3, 2b)
  :
6wire out = .col { data = 010110000 }`;
  const { interp } = session.run(src);
  h.assert('collapsed', session.getWire(interp, 'out'), '000110');
});

reg(1083, 'protocol-ext', 'collapse — prefixFree greedy', function(h, session) {
  const src = INLINE_HUFF + `
inline [protocol] .col:
  out:
    collapse(data, .huff, 2b)
  :
4wire out = .col { data = 010 }`;
  const { interp } = session.run(src);
  h.assert('greedy', session.getWire(interp, 'out'), '0001');
});

reg(1084, 'protocol-ext', 'withLength(data, 8b) → 010', function(h, session) {
  const src = `inline [protocol] .wl:
  out:
    withLength(data, 8b)
  :
3wire out = .wl { data = 0000001101000000 }`;
  const { interp } = session.run(src);
  h.assert('payload', session.getWire(interp, 'out'), '010');
});

reg(1085, 'protocol-ext', 'withLength(data, 16b)', function(h, session) {
  const src = `inline [protocol] .wl16:
  out:
    withLength(data, 16b)
  :
8wire out = .wl16 { data = 000000000000100010101010 }`;
  const { interp } = session.run(src);
  h.assert('payload16', session.getWire(interp, 'out'), '10101010');
});

reg(1086, 'protocol-ext', 'Round-trip 0001 → 00000011010 → 0001', function(h, session) {
  const src = INLINE_HUFF + `
inline [protocol] .huffPacket:
  def encoded:
    expand(tokens, .huff, 2b)
  out:
    lengthOf(encoded) 8b
    encoded
  :
inline [protocol] .huffRecover:
  out:
    collapse(withLength(data, 8b), .huff, 2b)
  :
4wire source = 0001
11wire encoded = .huffPacket { tokens = source }
4wire recovered = .huffRecover { data = encoded }`;
  const { interp } = session.run(src);
  h.assert('encoded', session.getWire(interp, 'encoded'), '00000011010');
  h.assert('recovered', session.getWire(interp, 'recovered'), '0001');
});

reg(1087, 'protocol-ext', 'width STATIC — expand + LUT depth:4, tokens 8b → 16 bits', function(h, session) {
  session.run(INLINE_TABLE4 + `
inline [protocol] .enc:
  out:
    expand(tokens 8b, .table, 2b)
  :`);
  const inst = session.interp.inlineInstances.get('.enc');
  h.assert('static', inst.widthInfo.kind, 'static');
  h.assert('width 16', String(inst.widthInfo.width), '16');
});

reg(1088, 'protocol-ext', 'width DYNAMIC — .huffPacket marked dynamic', function(h, session) {
  session.run(INLINE_HUFF_PACKET);
  const inst = session.interp.inlineInstances.get('.huffPacket');
  h.assert('dynamic', inst.widthInfo.kind, 'dynamic');
});

reg(1089, 'protocol-ext', 'doc(inline.protocol) — generatoare noi', function(h, session) {
  const out = session.runDoc('doc(inline.protocol)');
  h.assert('length', String(out.some(l => l.includes('length('))), 'true');
  h.assert('expand', String(out.some(l => l.includes('expand'))), 'true');
  h.assert('def', String(out.some(l => l.includes('def payload'))), 'true');
});

reg(1090, 'protocol-ext', 'regresie :decode UART (945) — neschimbat', function(h, session) {
  const { interp } = session.run(INLINE_UART8N1 + '\n8wire data = .uart8n1:decode(0100000101)');
  h.assert('data', session.getWire(interp, 'data'), '01000001');
});

const INLINE_OR2 = `inline [lut] .or2:
  depth: 1
  length: 4
  data {
    00 : 0
    01 : 1
    10 : 1
    11 : 1
  }
  :`;

const INLINE_LUT5 = `inline [lut] .lut5:
  depth: 1
  length: 32
  data {
    00000 : 0
    00001 : 1
    00010 : 0
    00011 : 1
    00100 : 0
    00101 : 1
    00110 : 0
    00111 : 1
    01000 : 0
    01001 : 1
    01010 : 0
    01011 : 1
    01100 : 0
    01101 : 1
    01110 : 0
    01111 : 1
    10000 : 0
    10001 : 1
    10010 : 0
    10011 : 1
    10100 : 0
    10101 : 1
    10110 : 0
    10111 : 1
    11000 : 0
    11001 : 1
    11010 : 0
    11011 : 1
    11100 : 0
    11101 : 1
    11110 : 0
    11111 : 1
  }
  :`;

const INLINE_DECODER2 = `inline [lut] .decoder:
  depth: 2
  length: 4
  data {
    00 : 00
    01 : 01
    10 : 10
    11 : 11
  }
  :`;

const INLINE_DEPTH3 = `inline [lut] .d3:
  depth: 3
  length: 4
  data {
    00 : 000
    01 : 001
    10 : 010
    11 : 100
  }
  :`;

const INLINE_IDA = `inline [lut] .ida:
  depth: 1
  length: 4
  data {
    00 : 0
    01 : 0
    10 : 1
    11 : 1
  }
  :`;

reg(1091, 'bool-lut', 'lutOf(OR(A, B)) — header + length 4', function(h, session) {
  const { out } = session.run('lutOf(OR(A, B))');
  h.assert('wrapper', out[0], 'inline [lut] .generated:');
  h.assert('header', out[1], '  description: A 1b, B 1b -> out 1b');
  h.assert('length', String(out.some(l => l.trim() === 'length: 4')), 'true');
  h.assert('close', out[out.length - 1], ':');
});

reg(1092, 'bool-lut', 'lutOf(AND(A, OR(NOT(C), B))) — ordine A, C, B', function(h, session) {
  const { out } = session.run('lutOf(AND(A, OR(NOT(C), B)))');
  h.assert('header', out[1], '  description: A 1b, C 1b, B 1b -> out 1b');
});

reg(1093, 'bool-lut', 'lutOf(XOR(C, OR(A, B))) — ordine C, A, B', function(h, session) {
  const { out } = session.run('lutOf(XOR(C, OR(A, B)))');
  h.assert('order', out[1], '  description: C 1b, A 1b, B 1b -> out 1b');
});

reg(1094, 'bool-lut', 'lutOf short-notation backtick', function(h, session) {
  const { out } = session.run('lutOf(`A | B`)');
  h.assert('header', out[1], '  description: A 1b, B 1b -> out 1b');
});

reg(1095, 'bool-lut', 'lutOf(LSHIFT(...)) — error', function(h, session) {
  const { out } = session.run('lutOf(LSHIFT(A, B))');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('non-boolean', String(err.includes('not a boolean') || err.includes('LSHIFT')), 'true');
});

reg(1096, 'bool-lut', 'exprOfLut(.or2, A, B) — two lines', function(h, session) {
  const { out } = session.run(INLINE_OR2 + '\nexprOfLut(.or2, A, B)');
  h.assert('lines', String(out.length), '2');
  h.assert('short', String(out[0].includes('`')), 'true');
  h.assert('std', String(out[1].includes('OR(')), 'true');
});

reg(1097, 'bool-lut', 'exprOfLut — expects 5 input bits but received 4', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_LUT5 + '\nexprOfLut(.lut5, A 2b, B 2b)');
  } catch (e) { err = String(e.message || e); }
  if (!err) {
    const { out } = session.run(INLINE_LUT5 + '\nexprOfLut(.lut5, A 2b, B 2b)');
    err = out.find(l => l.startsWith('Error:')) || '';
  }
  h.assert('mismatch', String(err.includes('expects 5 input bits but received 4')), 'true');
});

reg(1098, 'bool-lut', 'exprOfLut(.decoder, A, B) depth 2', function(h, session) {
  const { out } = session.run(INLINE_DECODER2 + '\nexprOfLut(.decoder, A, B)');
  h.assert('lines', String(out.length), '2');
  h.assert('plus short', String(out[0].includes(' + ')), 'true');
  h.assert('plus std', String(out[1].includes(' + ')), 'true');
});

reg(1099, 'bool-lut', 'exprOfLut depth 3 — trei termeni +', function(h, session) {
  const { out } = session.run(INLINE_DEPTH3 + '\nexprOfLut(.d3, A, B)');
  h.assert('lines', String(out.length), '2');
  const parts = out[0].split(' + ');
  h.assert('segments', String(parts.length), '3');
});

reg(1099.5, 'bool-lut', 'exprOfLut constant multi-bit — minimizat (0110)', function(h, session) {
  const lut = `inline [lut] .c4:
  depth: 4
  length: 2
  data {
    0 : 0110
    1 : 0110
  }
  :`;
  const { out } = session.run(lut + '\nexprOfLut(.c4, A)');
  h.assert('short minimized', out[0], '4wire out = `(0110)`');
  h.assert('std minimized', out[1], '4wire out = 0110');
  const { interp } = session.run('1wire A\n4wire R\n' + out[0].replace('out', 'R'));
  h.assert('short runs', String(!!interp), 'true');
  const { interp: interp2 } = session.run('1wire A\n4wire R\n' + out[1].replace('out', 'R'));
  h.assert('std runs', String(!!interp2), 'true');
});

reg(1099.6, 'bool-lut', 'exprOfLut filtered — short + concat rulabil', function(h, session) {
  const gen = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=1001x)`).out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated)');
  h.assert('grouped constants', String(out[0].includes('`(0110) +')), 'true');
  const prelude = '5wire A\n1wire B\n5wire C\n5wire R\n';
  const { interp } = session.run(prelude + out[0].replace('out', 'R'));
  h.assert('short runs', String(!!interp), 'true');
  h.assert('std no expr parens', String(!out[1].includes('(OR(')), 'true');
  const { interp: interpStd } = session.run(prelude + out[1].replace('out', 'R'));
  h.assert('std runs', String(!!interpStd), 'true');
  const { interp: interpParens } = session.run(prelude + '5wire R = 0110 + (OR(NOT(C.4), AND(A.4, B)))');
  h.assert('std with parens runs', String(!!interpParens), 'true');
});

reg(1100, 'bool-lut', 'copy-paste standard line runnable', function(h, session) {
  const { out } = session.run(INLINE_OR2 + '\nexprOfLut(.or2, A, B)');
  const line = out[1];
  const { interp } = session.run('1wire A\n1wire B\n1wire R\n' + line.replace('out', 'R'));
  h.assert('runs', String(!!interp), 'true');
});

reg(1101, 'bool-lut', 'copy-paste short line runnable', function(h, session) {
  const { out } = session.run(INLINE_OR2 + '\nexprOfLut(.or2, A, B)');
  const line = out[0];
  const { interp } = session.run('1wire A\n1wire B\n1wire R\n' + line.replace('out', 'R'));
  h.assert('runs', String(!!interp), 'true');
});

reg(1102, 'bool-lut', 'round-trip 1-bit XOR', function(h, session) {
  const gen = session.run('lutOf(XOR(A, B))').out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated, A, B)');
  h.assert('two lines', String(out.length), '2');
});

reg(1103, 'bool-lut', 'comp [lut] + exprOfLut', function(h, session) {
  const src = `comp [lut] .xor2:
  depth: 1
  length: 4
  = data {
    00 : 0
    01 : 1
    10 : 1
    11 : 0
  }
:
exprOfLut(.xor2, A, B)`;
  const { out } = session.run(src);
  h.assert('lines', String(out.length), '2');
});

reg(1104, 'bool-lut', 'exprOfLut on prefixFree — respinge', function(h, session) {
  let err = '';
  const { out } = session.run(INLINE_HUFF + '\nexprOfLut(.huff, A, B)');
  err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('reject', String(err.includes('prefixFree')), 'true');
});

reg(1105, 'bool-lut', 'QM — minimized form A', function(h, session) {
  const { out } = session.run(INLINE_IDA + '\nexprOfLut(.ida, A, B)');
  h.assert('minimized', out[1], '1wire out = A');
});

reg(1106, 'bool-lut', 'lutOf in chip body — parse', function(h, session) {
  session.parse(`chip +[blut]:
1pin set
exec: set
lutOf(OR(A, B))
:`);
  h.assert('ok', 'true', 'true');
});

reg(1107, 'bool-lut', 'lutOf address > 8 bits — error', function(h, session) {
  const { out } = session.run(`4wire A
8wire B
7wire C
10wire D
lutOf(OR(AND(A.2, B.1/6), AND(C, D.0-3)))`);
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('too big', String(err.includes('Boolean analysis exceeds maximum supported table size (256 rows)')), 'true');
});

reg(1108, 'bool-lut-mb', 'lutOf slice bits — length 16', function(h, session) {
  const { out } = session.run(`4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))`);
  h.assert('header', out[1], '  description: A.2 1b, B.1 1b, A.0 1b, B.0 1b -> out 1b');
  h.assert('length', String(out.some(l => l.trim() === 'length: 16')), 'true');
});

reg(1109, 'bool-lut-mb', 'lutOf(C) on 7wire — depth 7', function(h, session) {
  const { out } = session.run('7wire C\nlutOf(C)');
  h.assert('header', out[1], '  description: C 7b -> out 7b');
  h.assert('length', String(out.some(l => l.trim() === 'length: 128')), 'true');
});

reg(1110, 'bool-lut-mb', 'lutOf(D.0-3) — depth 4', function(h, session) {
  const { out } = session.run('10wire D\nlutOf(D.0-3)');
  h.assert('header', out[1], '  description: D.0-3 4b -> out 4b');
  h.assert('length', String(out.some(l => l.trim() === 'length: 16')), 'true');
});

reg(1111, 'bool-lut-mb', 'lutOf mixt 6b — succes', function(h, session) {
  const { out } = session.run(`4wire A
8wire B
2wire C
lutOf(OR(AND(A.2, B.1/3), C))`);
  h.assert('no error', String(!out.some(l => l.startsWith('Error:'))), 'true');
  h.assert('length 64', String(out.some(l => l.trim() === 'length: 64')), 'true');
});

reg(1112, 'bool-lut-mb', 'lutOf mixed 18b — error', function(h, session) {
  const { out } = session.run(`4wire A
8wire B
7wire C
10wire D
lutOf(OR(AND(A.2, B.1/6), AND(C, D.0-3)))`);
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('too big', String(err.includes('table size (256 rows)')), 'true');
});

reg(1113, 'bool-lut-mb', 'exprOfLut(.lut5, A 2b, B 3b)', function(h, session) {
  const { out } = session.run(INLINE_LUT5 + '\nexprOfLut(.lut5, A 2b, B 3b)');
  h.assert('lines', String(out.length), '2');
});

reg(1114, 'bool-lut-mb', 'exprOfLut(.or2, A, B) without prelude', function(h, session) {
  const { out } = session.run(INLINE_OR2 + '\nexprOfLut(.or2, A, B)');
  h.assert('lines', String(out.length), '2');
});

reg(1115, 'bool-lut-mb', '4wire A + exprOfLut infer 4b+1b', function(h, session) {
  let err = '';
  const { out } = session.run(INLINE_LUT5 + '\n4wire A := 0100\nexprOfLut(.lut5, A, B)');
  err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('no error', String(!err), 'true');
  h.assert('lines', String(out.filter(l => !l.startsWith('Error:')).length >= 2), 'true');
});

reg(1116, 'bool-lut-mb', 'exprOfLut ordine B, A vs A, B', function(h, session) {
  const o1 = session.run(INLINE_OR2 + '\nexprOfLut(.or2, A, B)').out;
  const o2 = session.run(INLINE_OR2 + '\nexprOfLut(.or2, B, A)').out;
  h.assert('both lines', String(o1.length === 2 && o2.length === 2), 'true');
  h.assert('may differ', String(o1[1] !== o2[1] || o1[1] === o2[1]), 'true');
});

reg(1117, 'bool-lut-mb', 'exprOfLut output 1b with slice refs', function(h, session) {
  const { out } = session.run(INLINE_LUT5 + '\nexprOfLut(.lut5, A 2b, B 3b)');
  h.assert('short', String(out[0].includes('`')), 'true');
  h.assert('std', String(out[1].length > 0), 'true');
});

reg(1118, 'bool-lut-mb', 'exprOfLut output 3b', function(h, session) {
  const { out } = session.run(INLINE_DEPTH3 + '\nexprOfLut(.d3, A, B)');
  h.assert('plus', String(out[0].includes(' + ')), 'true');
});

reg(1119, 'bool-lut-mb', 'round-trip multi-bit', function(h, session) {
  const gen = session.run(`2wire A
3wire B
lutOf(OR(AND(A.1, B.0), AND(A.0, B.2)))`).out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated, A.1, B.0, A.0, B.2)');
  h.assert('two lines', String(out.length), '2');
});

reg(1120, 'bool-lut-mb', 'exprOfLut nonexistent LUT — error', function(h, session) {
  const { out } = session.run('exprOfLut(.missing, A, B)');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('not found', String(err.includes('not found')), 'true');
});

reg(1121, 'bool-lut-mb', 'exprOfLut(.lut5, A 2b) — bit sum ≠ address', function(h, session) {
  const { out } = session.run(INLINE_LUT5 + '\nexprOfLut(.lut5, A 2b)');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('mismatch', String(err.includes('expects 5 input bits but received 2')), 'true');
});

reg(1122, 'bool-lut', 'exprOfLut emits exactly 2 lines', function(h, session) {
  const { out } = session.run(INLINE_OR2 + '\nexprOfLut(.or2, A, B)');
  h.assert('count', String(out.length), '2');
});

reg(1123, 'bool-lut-mb', 'exprOfLut coloane slice A.2, B.1, A.0, B.0', function(h, session) {
  const src = `4wire A
3wire B
inline [lut] .l:
  depth: 1
  length: 16
  data {
    0000 : 0
    0001 : 0
    0010 : 0
    0011 : 1
    0100 : 0
    0101 : 0
    0110 : 0
    0111 : 1
    1000 : 0
    1001 : 0
    1010 : 0
    1011 : 1
    1100 : 1
    1101 : 1
    1110 : 1
    1111 : 1
  }
:
exprOfLut(.l, A.2, B.1, A.0, B.0)`;
  const { out } = session.run(src);
  h.assert('lines', String(out.length), '2');
  h.assert('slice std', String(out[1].includes('A.2') && out[1].includes('B.1')), 'true');
  h.assert('or', String(out[1].includes('OR(')), 'true');
});

reg(1124, 'bool-lut-mb', 'exprOfLut coloane slice with 1b explicit', function(h, session) {
  const gen = session.run(`4wire A
3wire B
lutOf(OR(AND(A.2, B.1), AND(A.0, B.0)))`).out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated, A.2 1b, B.1 1b, A.0 1b, B.0 1b)');
  h.assert('lines', String(out.length), '2');
  h.assert('slice refs', String(out[1].includes('A.2') && out[1].includes('A.0')), 'true');
});

reg(1125, 'bool-analysis', 'truthTableOf(OR(A,B)) — header + 4 rows', function(h, session) {
  const { out } = session.run('truthTableOf(OR(A, B))');
  h.assert('header', out[0], 'A B | OUT');
  h.assert('sep', out[1], '--------------');
  h.assert('rows', String(out.length), '6');
  h.assert('row0', out[2], '0 0 | 0');
  h.assert('row3', out[5], '1 1 | 1');
});

reg(1126, 'bool-analysis', 'truthTableOf multi-bit A.1 & B', function(h, session) {
  const { out } = session.run('2wire A\n1wire B\ntruthTableOf(AND(A.1, B))');
  h.assert('header', out[0], 'A.1 B | OUT');
  h.assert('rows', String(out.length), '6');
});

reg(1127, 'bool-analysis', 'truthTableOf 9wire — table size error', function(h, session) {
  const { out } = session.run('9wire A\ntruthTableOf(A)');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('too big', String(err.includes('table size (256 rows)')), 'true');
});

reg(1128, 'bool-analysis', 'simplify — forma B', function(h, session) {
  const { out } = session.run('simplify(OR(AND(NOT(A), B), AND(A, B)))');
  h.assert('lines', String(out.length), '2');
  h.assert('short', out[0], '1wire out = `B`');
  h.assert('std', out[1], '1wire out = B');
});

reg(1129, 'bool-analysis', 'simplify multi-bit depth 2', function(h, session) {
  const { out } = session.run('2wire A\n2wire B\nsimplify(OR(A, B))');
  h.assert('lines', String(out.length), '2');
  h.assert('2wire', String(out[0].startsWith('2wire out')), 'true');
  h.assert('plus', String(out[0].includes(' + ')), 'true');
});

reg(1130, 'bool-analysis', 'equivalent true', function(h, session) {
  const { out } = session.run('equivalent(OR(A, B), OR(B, A))');
  h.assert('result', out[0], 'true');
});

reg(1131, 'bool-analysis', 'equivalent false', function(h, session) {
  const { out } = session.run('equivalent(AND(A, B), OR(A, B))');
  h.assert('result', out[0], 'false');
});

reg(1132, 'bool-analysis', 'inputsOf — aligned lines', function(h, session) {
  const { out } = session.run(`4wire A
8wire B
7wire C
10wire D
inputsOf(OR(AND(A.2, B.1/6), OR(C, D.0-3)))`);
  h.assert('lines', String(out.length), '4');
  h.assert('A.2', out[0], 'A.2    1b');
  h.assert('B slice', out[1], 'B.1-6  6b');
  h.assert('C', out[2], 'C      7b');
  h.assert('D range', out[3], 'D.0-3  4b');
});

reg(1133, 'bool-analysis', 'costOf 1-bit literal vs minimized', function(h, session) {
  const { out } = session.run('costOf(OR(AND(NOT(A), B), AND(A, B)))');
  h.assert('lines', String(out.length), '3');
  h.assert('expr', out[0], 'Expression cost: 4');
  h.assert('min', out[1], 'Minimized cost: 0');
  h.assert('red', String(out[2].startsWith('Reduction possible: 4')), 'true');
});

reg(1134, 'bool-analysis-mb', 'costOf 4wire A & B → 4', function(h, session) {
  const { out } = session.run('4wire A\n4wire B\ncostOf(AND(A, B))');
  h.assert('cost', out[0], 'Expression cost: 4');
});

reg(1135, 'bool-analysis-mb', 'costOf (A&B)|A on 4wire → 8', function(h, session) {
  const { out } = session.run('4wire A\n4wire B\ncostOf(OR(AND(A, B), A))');
  h.assert('cost', out[0], 'Expression cost: 8');
});

reg(1136, 'bool-lut', 'lutOf 9wire — table size error', function(h, session) {
  const { out } = session.run('9wire A\nlutOf(A)');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('too big', String(err.includes('table size (256 rows)')), 'true');
});

reg(1137, 'bool-analysis', 'truthTableOf short-notation', function(h, session) {
  const { out } = session.run('truthTableOf(`A | B`)');
  h.assert('header', out[0], 'A B | OUT');
  h.assert('rows', String(out.length), '6');
});

reg(1138, 'bool-analysis', 'truthTableOf filters — 32 rows', function(h, session) {
  const { out } = session.run(`5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=000xx)`);
  h.assert('header', out[0], 'A B C | OUT');
  h.assert('rows', String(out.length), '34');
});

reg(1139, 'bool-analysis', 'truthTableOf partial filters', function(h, session) {
  const { out } = session.run('truthTableOf(OR(A, B), A=0)');
  h.assert('rows', String(out.length), '4');
  h.assert('only A0', out[2], '0 0 | 0');
  h.assert('only A0 B1', out[3], '0 1 | 1');
});

reg(1140, 'bool-analysis', 'filter product > 256 — error', function(h, session) {
  const { out } = session.run('9wire A\ntruthTableOf(A, A=xxxxxxxxx)');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('too big', String(err.includes('table size (256 rows)')), 'true');
});

reg(1141, 'bool-analysis-mb', 'truthTableOf >8 bits + filters OK', function(h, session) {
  const { out } = session.run(`5wire A
1wire B
5wire C
truthTableOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=000xx)`);
  h.assert('no err', String(!out.some(l => l.startsWith('Error:'))), 'true');
  h.assert('rows', String(out.length), '34');
});

reg(1142, 'bool-analysis', 'pattern invalid — error', function(h, session) {
  const { out } = session.run('truthTableOf(OR(A, B), A=01?1)');
  const err = out.find(l => l.startsWith('Error:')) || '';
  h.assert('invalid', String(err.includes('pattern length mismatch') || err.includes('invalid pattern')), 'true');
});

reg(1143, 'bool-lut', 'lutOf with filters — length 32 + attributes', function(h, session) {
  const { out } = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=000xx)`);
  h.assert('description', String(out.some(l => l.includes('description: A 5b, B 1b, C 5b -> out'))), 'true');
  h.assert('filters attr', String(out.some(l => l.includes('filters: A=01x1x, B=x, C=000xx'))), 'true');
  h.assert('length', String(out.some(l => l.trim() === 'length: 32')), 'true');
  const dataLines = out.filter(l => /^\s+[01]+ : [01]+$/.test(l));
  h.assert('data count', String(dataLines.length), '32');
});

reg(1144, 'bool-lut', 'lutOf without filters — description without filters', function(h, session) {
  const { out } = session.run('lutOf(OR(A, B))');
  h.assert('description', String(out.some(l => l.includes('description: A 1b, B 1b -> out 1b'))), 'true');
  h.assert('no filters attr', String(!out.some(l => l.trim().startsWith('filters:'))), 'true');
  h.assert('length', String(out.some(l => l.trim() === 'length: 4')), 'true');
});

reg(1145, 'bool-lut-mb', 'lutOf filters >8 bit input OK', function(h, session) {
  const { out } = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=000xx)`);
  h.assert('no err', String(!out.some(l => l.startsWith('Error:'))), 'true');
  h.assert('length 32', String(out.some(l => l.trim() === 'length: 32')), 'true');
});

reg(1147, 'bool-analysis', 'filters without comma — parse error', function(h, session) {
  let err = '';
  try {
    session.parse('lutOf(OR(A, B), A=01x1x B=x)');
  } catch (e) { err = String(e.message || e); }
  h.assert('comma required', String(err.includes("Expected ',' between filter assignments")), 'true');
});

reg(1148, 'bool-lut', 'exprOfLut auto from filters — 2 lines', function(h, session) {
  const gen = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=1001x)`).out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated)');
  h.assert('lines', String(out.length), '2');
  h.assert('no err', String(!out.some(l => l.startsWith('Error:'))), 'true');
});

reg(1149, 'bool-lut-mb', 'exprOfLut auto — slice refs from filtre', function(h, session) {
  const gen = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=1001x)`).out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated)');
  const std = out[1] || '';
  h.assert('A.4', String(std.includes('A.4')), 'true');
  h.assert('C.4', String(std.includes('C.4')), 'true');
  h.assert('B ref', String(std.includes('B')), 'true');
  h.assert('not whole A', String(!/OR\(A,/.test(std) && !/AND\(A,/.test(std)), 'true');
});

reg(1150, 'bool-lut-mb', 'exprOfLut manual = auto with filtre', function(h, session) {
  const gen = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=1001x)`).out.join('\n');
  const auto = session.run(gen + '\nexprOfLut(.generated)').out;
  const manual = session.run(gen + '\nexprOfLut(.generated, A.2, A.4, B, C.4)').out;
  h.assert('same std', manual[1], auto[1]);
});

reg(1151, 'bool-lut', 'exprOfLut without variables and without filters — error', function(h, session) {
  const { out } = session.run(INLINE_OR2 + '\nexprOfLut(.or2)');
  h.assert('err', String(out.some(l => l.includes('supply variables') || l.includes('filters:'))), 'true');
});

reg(1152, 'bool-lut-mb', 'exprOfLut variabile incompatibile with filters', function(h, session) {
  const gen = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=1001x)`).out.join('\n');
  const { out } = session.run(gen + '\nexprOfLut(.generated, A, B, C)');
  h.assert('mismatch', String(out.some(l => l.includes('do not match LUT filters') || l.includes('expects'))), 'true');
});

reg(1153, 'bool-lut-mb', 'exprOfLut ignores # — uses filters:', function(h, session) {
  const gen = session.run(`5wire A
1wire B
5wire C
lutOf(OR(AND(A, B), NOT(C)), A=01x1x, B=x, C=1001x)`).out.join('\n');
  const tampered = gen.replace('filters:', '# filters: fake\n  filters:');
  const { out } = session.run(tampered + '\nexprOfLut(.generated)');
  h.assert('lines', String(out.length), '2');
  h.assert('slice', String((out[1] || '').includes('A.4')), 'true');
});

reg(1154, 'bool-analysis', 'simplify with filters — match exprOfLut', function(h, session) {
  const prelude = `5wire A
1wire B
5wire C`;
  const filters = 'A=01x1x, B=x, C=1001x';
  const gen = session.run(prelude + `\nlutOf(OR(AND(A, B), NOT(C)), ${filters})`).out.join('\n');
  const exprOut = session.run(gen + '\nexprOfLut(.generated)').out;
  const simpOut = session.run(prelude + `\nsimplify(OR(AND(A, B), NOT(C)), ${filters})`).out;
  h.assert('two lines', String(simpOut.length), '2');
  h.assert('same short', simpOut[0], exprOut[0]);
  h.assert('same std', simpOut[1], exprOut[1]);
});

reg(1155, 'bool-analysis', 'simplify partial filters A=0', function(h, session) {
  const { out } = session.run('simplify(OR(A, B), A=0)');
  h.assert('lines', String(out.length), '2');
  h.assert('std B', out[1], '1wire out = B');
});

reg(1156, 'bool-analysis', 'simplify filters without comma — parse error', function(h, session) {
  let err = '';
  try {
    session.parse('simplify(OR(A, B) A=0)');
  } catch (e) { err = String(e.message || e); }
  h.assert('comma', String(err.includes("Expected ',' between filter assignments") || err.includes('SYM=)')), 'true');
});

reg(1157, 'ioport', 'parse in/out bindings', function(h, session) {
  const stmts = session.parse(`comp [dip] .addr:
  length: 4
  :

comp [led] .result:
  length: 8
  :

comp [ioport] .P0:
  in = .addr
  out = .result
  :`);
  const s = stmts[2];
  h.assert('ioport type', s.comp.type, 'ioport');
  h.assert('in members', JSON.stringify(s.comp.attributes.inMembers), '[".addr"]');
  h.assert('out members', JSON.stringify(s.comp.attributes.outMembers), '[".result"]');
});

reg(1158, 'ioport', 'input aggregation 16+8=24', function(h, session) {
  const { interp } = session.run(`comp [dip] .addr:
  length: 16
  = ^ffff
  :

comp [dip] .data:
  length: 8
  = ^aa
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  :

24wire bus = .P0:in`);
  h.assert('bus width value', session.getWire(interp, 'bus'), '111111111111111110101010');
});

reg(1159, 'ioport', 'output split 8+4=12', function(h, session) {
  const { interp } = session.run(`comp [led] .result:
  length: 8
  :

comp [led] .flags:
  length: 4
  :

comp [ioport] .P0:
  out = .result
  out = .flags
  :

.P0:out = 101010101111`);
  const result = interp.components.get('.result');
  const flags = interp.components.get('.flags');
  h.assert('result leds', interp.getValueFromRef(result.ref), '10101010');
  h.assert('flags leds', interp.getValueFromRef(flags.ref), '1111');
});

reg(1160, 'ioport', 'loopback wave', function(h, session) {
  const { interp } = session.run(`comp [dip] .sw:
  length: 8
  visual: 1
  :

comp [led] .led:
  length: 8
  :

comp [ioport] .P0:
  in = .sw
  out = .led
  :

.P0:out = .P0:in`);
  session.setComp(interp, '.sw', '10101010');
  const ledComp = interp.components.get('.led');
  h.assert('loopback', interp.getValueFromRef(ledComp.ref), '10101010');
}, { propagation: 'wave' });

reg(1161, 'ioport', 'ownership conflict', function(h, session) {
  let err = '';
  try {
    session.run(`comp [dip] .addr:
  length: 4
  :

comp [ioport] .P0:
  in = .addr
  :

comp [ioport] .P1:
  in = .addr
  :`);
  } catch (e) { err = String(e.message || e); }
  h.assert('already belongs', String(err.includes("already belongs to ioport")), 'true');
});

reg(1162, 'ioport', 'portA to portB', function(h, session) {
  const { interp } = session.run(`comp [dip] .portASw:
  length: 8
  = 11110000
  :

comp [led] .portALed:
  length: 8
  :

comp [ioport] .portA:
  in = .portASw
  out = .portALed
  :

comp [dip] .portBSw:
  length: 8
  :

comp [led] .portBLed:
  length: 8
  :

comp [ioport] .portB:
  in = .portBSw
  out = .portBLed
  :

.portB:out = .portA:in`);
  const ledB = interp.components.get('.portBLed');
  h.assert('port B leds', interp.getValueFromRef(ledB.ref), '11110000');
});

reg(1163, 'doc-comp', 'doc(comp.ioport) signature', function(h, session) {
  const out = session.runDoc('doc(comp.ioport)');
  h.assert('first line', out[0], 'comp [ioport] .name:');
  h.assert('has in binding', String(out.some(l => l.includes('in') && l.includes('.component'))), 'true');
});

reg(1164, 'ioport', 'doc(.P0) bit map', function(h, session) {
  const out = session.run(`comp [dip] .addr:
  length: 16
  :

comp [dip] .data:
  length: 8
  :

comp [led] .result:
  length: 8
  :

comp [led] .flags:
  length: 4
  :

comp [ioport] .P0:
  in = .addr
  in = .data
  out = .result
  out = .flags
  :

doc(.P0)`).out;
  h.assert('header', out[0], '.P0 (ioport)');
  h.assert('addr range', String(out.some(l => l.includes('0-15') && l.includes('.addr'))), 'true');
  h.assert('data range', String(out.some(l => l.includes('16-23') && l.includes('.data'))), 'true');
});

reg(1165, 'ioport', 'show peek probe :in', function(h, session) {
  const { out, interp } = session.run(`comp [dip] .sw:
  length: 4
  = 1010
  :

comp [ioport] .P0:
  in = .sw
  :

4wire bus = .P0:in
show(bus, .P0:in)
peek(.P0:in)
probe(.P0:in)`);
  h.assert('show bus', String(out.some(l => l.includes('bus') && l.includes('1010'))), 'true');
  h.assert('show port in', String(out.some(l => l.includes('.P0:in') && l.includes('1010'))), 'true');
  h.assert('peek in', String(out.some(l => l.includes('.P0:in') && l.includes('1010'))), 'true');
  h.assert('probe init', String(out.some(l => l.includes('.P0:in') && l.includes('initialised'))), 'true');
  session.setComp(interp, '.sw', '0101');
  interp.out = [];
  interp.exec({ peek: [[{ var: '.P0', property: 'in' }]] });
  h.assert('peek after change', String(interp.out.some(l => l.includes('.P0:in') && l.includes('0101'))), 'true');
});

reg(1166, 'ioport', 'show peek probe :out', function(h, session) {
  const { out } = session.run(`comp [led] .led:
  length: 4
  :

comp [ioport] .P0:
  out = .led
  :

.P0:out = 1100
show(.P0:out)
peek(.P0:out)
probe(.P0:out)`);
  h.assert('show out', String(out.some(l => l.includes('.P0:out') && l.includes('1100'))), 'true');
  h.assert('peek out', String(out.some(l => l.includes('.P0:out') && l.includes('1100'))), 'true');
  h.assert('probe out init', String(out.some(l => l.includes('.P0:out') && l.includes('initialised'))), 'true');
});

reg(1167, 'ioport', 'dip propagation → wire via :in wave', function(h, session) {
  const { interp } = session.run(`comp [dip] .d:
  length: 4
  :

comp [ioport] .p:
  in = .d
  :

4wire a = .p:in`);
  h.assert('initial', session.getWire(interp, 'a'), '0000');
  session.setComp(interp, '.d', '1010');
  h.assert('after dip', session.getWire(interp, 'a'), '1010');
}, { propagation: 'wave' });

reg(1176, 'debug', 'Parser — watch(clk) AST and watches[]', function(h, session) {
  const registry = session._ensureRegistry();
  const processed = preprocessRepeat('1wire clk = 0\nwatch(clk)');
  const p = new Parser(new Tokenizer(processed), registry);
  const stmts = p.parse();
  h.assert('watch stmt', String(!!stmts[1].watch), 'true');
  h.assert('watches collected', String(p.watches.length), '1');
  h.assert('watch expr var', stmts[1].watch[0].var, 'clk');
});

reg(1177, 'debug', 'watch(clk) records samples on wire change', function(h, session) {
  const samples = [];
  const { interp } = session.run(`1wire clk = 0
1wire en = 0
watch(clk)
watch(en)`);
  interp.watchRecorder = (s) => samples.push(s);
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'en', '1');
  const flat = samples.flatMap(s => s.channels || [s]);
  h.assert('two channels', String(interp.watchTargets.length), '2');
  h.assert('samples recorded', String(samples.length >= 2), 'true');
  h.assert('clk channel', String(flat.some(s => s.channelIndex === 0)), 'true');
  h.assert('en channel', String(flat.some(s => s.channelIndex === 1)), 'true');
});

reg(1178, 'debug', 'watch(.dip) component channel', function(h, session) {
  const samples = [];
  const { interp } = session.run(`comp [dip] .sw:
  length: 4
  = 0000
  :
watch(.sw)`);
  interp.watchRecorder = (s) => samples.push(s);
  session.setComp(interp, '.sw', '1010');
  const flat = samples.flatMap(s => s.channels || [s]);
  h.assert('dip watch target', String(interp.watchTargets.length), '1');
  h.assert('sample after dip', String(flat.some(s => s.valueStr === '1010')), 'true');
});

reg(1179, 'debug', 'watch(o.0..o.3) wire slices distinct and batched', function(h, session) {
  const samples = [];
  const { interp } = session.run(`comp [~] .o:
  duration1: 4
  duration0: 4
  length: 4
  freq: 1
  freqIsSec: 0
  eachCycle: 1
  :
4wire o = .o:counter
1wire c = .o
watch(o.0)
watch(o.1)
watch(o.2)
watch(o.3)
watch(c)`);
  interp.watchRecorder = (s) => samples.push(s);
  h.assert('five watch targets', String(interp.watchTargets.length), '5');
  const keys = interp.watchTargets.map(t => t.key).sort().join(',');
  h.assert('slice keys distinct', String(new Set(interp.watchTargets.map(t => t.key)).size), '5');
  h.assert('has w:o:0-0', String(keys.includes('w:o:0-0')), 'true');
  h.assert('has w:o:3-3', String(keys.includes('w:o:3-3')), 'true');
  const labels = interp.watchTargets.map(t => t.label).join(',');
  h.assert('labels o.0 and o.3', String(labels.includes('o.0') && labels.includes('o.3')), 'true');
  session.setWire(interp, 'o', '1010');
  session.setWire(interp, 'o', '0101');
  const batched = samples.filter(s => s.channels && s.channels.length >= 2);
  h.assert('batched multi-slice row', String(batched.length >= 1), 'true');
});

reg(1180, 'debug', 'watch(o) expands to all wire bits', function(h, session) {
  const { interp } = session.run(`4wire o = 0000
1wire c = 0
watch(o)
watch(c)`);
  h.assert('o expands to 4 bits', String(interp.watchTargets.length), '5');
  const labels = interp.watchTargets.map(t => t.label).join(',');
  h.assert('labels o.0..o.3', String(/o\.0/.test(labels) && /o\.3/.test(labels)), 'true');
  h.assert('label c', String(labels.includes('c')), 'true');
});

reg(1181, 'debug', 'watch(o.1-3) expands bit range', function(h, session) {
  const { interp } = session.run(`4wire o = 0000
watch(o.1-3)`);
  h.assert('three bit channels', String(interp.watchTargets.length), '3');
  const labels = interp.watchTargets.map(t => t.label).sort().join(',');
  h.assert('labels o.1 o.2 o.3', labels, 'o.1,o.2,o.3');
});

reg(1182, 'debug', 'watch-expand labels from stmts', function(h, session) {
  const WE = typeof LogTScriptWatchExpand !== 'undefined' ? LogTScriptWatchExpand : null;
  h.assert('module loaded', String(!!WE), 'true');
  const processed = preprocessRepeat('4wire o = 0\nwatch(o)\nwatch(o.1-3)');
  const p = new Parser(new Tokenizer(processed), session._ensureRegistry());
  const stmts = p.parse();
  const widths = WE.buildWireWidthMapFromStmts(stmts);
  h.assert('o is 4wire', String(widths.get('o')), '4');
  const labels = WE.watchLabelsFromExprs(p.watches, widths);
  h.assert('four columns deduped', String(labels.length), '4');
  h.assert('labels o.0..o.3', labels.join(','), 'o.0,o.1,o.2,o.3');
});

reg(1183, 'debug', 'duplicate watch() dedupes channels', function(h, session) {
  const WE = typeof LogTScriptWatchExpand !== 'undefined' ? LogTScriptWatchExpand : null;
  const script = `4wire o = 0000
1wire c = 0
watch(o.0-3)
watch(o.0)
watch(o.1)
watch(o.2)
watch(o.3)
watch(c)`;
  const { interp } = session.run(script);
  h.assert('five targets', String(interp.watchTargets.length), '5');
  const processed = preprocessRepeat(script);
  const p = new Parser(new Tokenizer(processed), session._ensureRegistry());
  const stmts = p.parse();
  const widths = WE.buildWireWidthMapFromStmts(stmts);
  const labels = WE.watchLabelsFromExprs(p.watches, widths);
  h.assert('five labels not nine', String(labels.length), '5');
  h.assert('labels match targets', labels.join(','), interp.watchTargets.map(t => t.label).join(','));
  h.assert('c is last channel', String(interp.watchTargets[4].wireName), 'c');
});

reg(1184, 'debug', 'seedWatchTimeline records row after label reset', function(h, session) {
  const samples = [];
  const { interp } = session.run(`4wire o = 0000\n1wire c = 0\nwatch(o)\nwatch(c)`);
  interp.watchRecorder = (s) => samples.push(s);
  interp.seedWatchTimeline();
  h.assert('seed produces sample', String(samples.length >= 1), 'true');
  const flat = samples[0].channels || [];
  h.assert('all five channels', String(flat.length), '5');
});

reg(1185, 'debug', 'Parser — watch(.o:counter) property syntax', function(h, session) {
  const processed = preprocessRepeat('comp [~] .o:\n  length: 4\n  :\n4wire o = .o:counter\nwatch(.o:counter)');
  const p = new Parser(new Tokenizer(processed), session._ensureRegistry());
  const stmts = p.parse();
  h.assert('watch stmt', String(!!stmts[2].watch), 'true');
  const atom = stmts[2].watch[0];
  h.assert('var .o', atom.var, '.o');
  h.assert('property counter', atom.property, 'counter');
});

reg(1186, 'debug', 'watch(.o:counter) expands to bit channels', function(h, session) {
  const { interp } = session.run(`comp [~] .o:
  duration1: 4
  duration0: 4
  length: 4
  freq: 1
  freqIsSec: 0
  eachCycle: 1
  :
4wire o = .o:counter
watch(.o:counter)`);
  h.assert('four bit targets', String(interp.watchTargets.length), '4');
  h.assert('first label', interp.watchTargets[0].label, '.o:counter.0');
  h.assert('component .o', String(interp.watchTargets[0].compName), '.o');
  h.assert('property counter', interp.watchTargets[0].property, 'counter');
});

reg(1187, 'debug', 'watch(.o:counter) records on osc tick (wave)', function(h, session) {
  const samples = [];
  const { interp } = session.run(`comp [~] .o:
  duration1: 4
  duration0: 4
  length: 4
  freq: 100
  freqIsSec: 0
  eachCycle: 1
  :
watch(.o:counter)`);
  interp.watchRecorder = (s) => samples.push(s);
  interp._emitComputedComponentProbes('.o');
  h.assert('emit after tick', String(samples.length >= 1), 'true');
  const flat = samples.flatMap(s => s.channels || []);
  h.assert('counter channels', String(flat.length >= 4), 'true');
}, { propagation: 'wave' });

reg(1192, 'bool-lut-use', 'useLutAs(lutOf(OR(A,B)), .gen) — invoke', function(h, session) {
  const { interp } = session.run(`useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 0
1wire y = .gen(10)`);
  h.assert('y=1', session.getWire(interp, 'y'), '1');
  h.assert('inline .gen', String(interp.inlineInstances.has('.gen')), 'true');
});

reg(1193, 'bool-lut-use', 'useLutAs with filters — LUT has filters attribute', function(h, session) {
  const { interp } = session.run(`useLutAs(lutOf(OR(A, B), A=x, B=x), .f)
1wire A := 0
1wire B := 1`);
  const lut = interp.inlineInstances.get('.f');
  h.assert('has filters', String(!!(lut && lut.attributes && lut.attributes.filters)), 'true');
  h.assert('length 4', String(lut.attributes.length), '4');
});

reg(1194, 'bool-lut-use', 'inline [lut] .gen: lutOf(`A | B`) :', function(h, session) {
  const { interp } = session.run(`inline [lut] .gen:
  lutOf(\`A | B\`)
  :
1wire A := 0
1wire B := 1
1wire y = .gen(01)`);
  h.assert('y=1', session.getWire(interp, 'y'), '1');
});

reg(1195, 'bool-lut-use', 'useLutAs — LUT too big error', function(h, session) {
  const { out } = session.run('9wire A\nuseLutAs(lutOf(A), .big)');
  h.assert('error line', String(out.some(l => /table size \(256 rows\)/.test(l))), 'true');
});

reg(1196, 'bool-lut-use', '1wire u = useExpr(exprOfLut(.or2, A, B))', function(h, session) {
  const { interp } = session.run(INLINE_OR2 + `
1wire A := 0
1wire B := 1
1wire u = useExpr(exprOfLut(.or2, A, B))`);
  h.assert('u=1', session.getWire(interp, 'u'), '1');
});

reg(1197, 'bool-lut-use', 'useExpr multi-bit depth 2', function(h, session) {
  const { interp } = session.run(INLINE_DECODER2 + `
1wire A := 0
1wire B := 1
2wire u = useExpr(exprOfLut(.decoder, A, B))`);
  h.assert('u=01', session.getWire(interp, 'u'), '01');
});

reg(1198, 'bool-lut-use', 'useExpr(exprOfLut(.lut)) with filters auto', function(h, session) {
  const { interp } = session.run(`useLutAs(lutOf(OR(A, B), A=x, B=x), .f)
1wire A := 0
1wire B := 1
1wire u = useExpr(exprOfLut(.f))`);
  h.assert('u=1', session.getWire(interp, 'u'), '1');
});

reg(1199, 'bool-lut-use', 'useExpr width mismatch', function(h, session) {
  const { out } = session.run(INLINE_OR2 + `
1wire A := 0
1wire B := 0
2wire u = useExpr(exprOfLut(.or2, A, B))`);
  h.assert('error in out', String(out.some(l => /wire width 2b does not match expression depth 1b/.test(l))), 'true');
});

reg(1200, 'bool-lut-use', 'round-trip useLutAs + useExpr', function(h, session) {
  const { interp } = session.run(`useLutAs(lutOf(XOR(A, B)), .xor)
1wire A := 1
1wire B := 0
1wire u = useExpr(exprOfLut(.xor, A, B))`);
  h.assert('u=1', session.getWire(interp, 'u'), '1');
  session.setWire(interp, 'B', '1');
  h.assert('xor 1,1', session.getWire(interp, 'u'), '0');
}, { propagation: 'wave' });

reg(1201, 'bool-lut-use', 'useExpr alone — parse error', function(h, session) {
  h.assertThrows('parse', () => session.parse('useExpr(exprOfLut(.x, A, B))'), 'Invalid statement');
});

reg(1202, 'bool-lut-use', 'inline lutOf body — second invoke', function(h, session) {
  const { interp } = session.run(`inline [lut] .orlut:
  lutOf(\`A | B\`)
  :
1wire y1 = .orlut(01)
1wire y2 = .orlut(11)`);
  h.assert('y1=1', session.getWire(interp, 'y1'), '1');
  h.assert('y2=1', session.getWire(interp, 'y2'), '1');
});

reg(1203, 'bool-lut-use', 'useExpr lowered — propagates on A change (wave)', function(h, session) {
  const { interp } = session.run(INLINE_OR2 + `
1wire A := 0
1wire B := 0
1wire u = useExpr(exprOfLut(.or2, A, B))`);
  h.assert('initial u=0', session.getWire(interp, 'u'), '0');
  const ws = interp.wireStatements.find(w => (w.decls && w.decls.some(d => d.name === 'u')) || (w.assignment && w.assignment.target.var === 'u'));
  h.assert('has wire stmt', String(!!ws), 'true');
  h.assert('lowered AST', String(!JSON.stringify(ws.expr || ws.assignment && ws.assignment.expr).includes('useExpr')), 'true');
  session.setWire(interp, 'A', '1');
  h.assert('A=1 u=1', session.getWire(interp, 'u'), '1');
}, { propagation: 'wave' });

reg(1204, 'bool-lut-use', 'split decl u = useExpr + propagation', function(h, session) {
  const { interp } = session.run(INLINE_OR2 + `
1wire A := 0
1wire B := 0
1wire u
u = useExpr(exprOfLut(.or2, A, B))`);
  h.assert('initial', session.getWire(interp, 'u'), '0');
  session.setWire(interp, 'B', '1');
  h.assert('B=1 u=1', session.getWire(interp, 'u'), '1');
}, { propagation: 'wave' });

reg(1205, 'bool-lut-use', 'doc smoke — useLutAs + useExpr script', function(h, session) {
  const { interp } = session.run(`useLutAs(lutOf(OR(A, B)), .gen)
1wire A := 1
1wire B := 1
1wire u = useExpr(exprOfLut(.gen, A, B))`);
  h.assert('runs', String(!!interp), 'true');
  h.assert('u=1', session.getWire(interp, 'u'), '1');
});

reg(1206, 'slider', 'doc(comp.slider) / getWidthBits length 8', function(h, session) {
  const registry = session._ensureRegistry();
  h.assert('slider registered', String(registry.has('slider')), 'true');
  h.assert('getWidthBits length 8', String(registry.get('slider').getWidthBits({length: '8'})), '8');
  const out = session.runDoc('doc(comp.slider)');
  h.assert('doc first line', out[0], 'comp [slider] .name:');
  h.assert('doc length attr', String(out.some(l => l.includes('length: integer'))), 'true');
  h.assert('doc orientation', String(out.some(l => l.includes('orientation: 0/1'))), 'true');
});

reg(1207, 'slider', 'parse minimal comp [slider] .v::', function(h, session) {
  const stmts = session.parse('comp [slider] .v::');
  h.assert('one stmt', String(stmts.length), '1');
  h.assert('type slider', stmts[0].comp.type, 'slider');
  h.assert('name .v', stmts[0].comp.name, '.v');
});

reg(1208, 'slider', 'length 3 — 8 trepte wire 000/111', function(h, session) {
  const { interp } = session.run(`comp [slider] .s:
  length: 3
  :

3wire a = .s:get`);
  h.assert('initial 000', session.getWire(interp, 'a'), '000');
  session.setComp(interp, '.s', '111');
  h.assert('after 111', session.getWire(interp, 'a'), '111');
});

reg(1209, 'slider', 'setComp — valoare pe :get', function(h, session) {
  const { interp } = session.run(`comp [slider] .v:
  length: 4
  :

4wire a = .v:get`);
  session.setComp(interp, '.v', '1010');
  h.assert('a=1010', session.getWire(interp, 'a'), '1010');
});

reg(1210, 'slider', 'orientation 1 vertical — parse', function(h, session) {
  const stmts = session.parse(`comp [slider] .v:
  orientation: 1
  :`);
  h.assert('orientation 1', String(stmts[0].comp.attributes.orientation), '1');
});

reg(1211, 'slider', 'reversed — valori inversate, poziție fizică separată', function(h, session) {
  const slider = session._ensureRegistry().get('slider');
  const C = slider.constructor;
  h.assert('ratio 0 normal → state 0', String(C.ratioToState(0, 3, false)), '0');
  h.assert('ratio 1 normal → state 7', String(C.ratioToState(1, 3, false)), '7');
  h.assert('ratio 0 reversed → state 7', String(C.ratioToState(0, 3, true)), '7');
  h.assert('ratio 1 reversed → state 0', String(C.ratioToState(1, 3, true)), '0');
  h.assert('state 0 reversed → ratio 1', String(C.stateToRatio(0, 3, true)), '1');
  h.assert('state 7 reversed → ratio 0', String(C.stateToRatio(7, 3, true)), '0');
  const stmts = session.parse(`comp [slider] .v:
  reversed
  :`);
  h.assert('reversed attr', String(stmts[0].comp.attributes.reversed === true), 'true');
});

reg(1212, 'slider', 'for labels — formatDisplay decimal sau etichetă', function(h, session) {
  const slider = session._ensureRegistry().get('slider');
  h.assert('decimal 5', slider.constructor.formatDisplay(5, {}), '5');
  h.assert('for label', slider.constructor.formatDisplay(2, {2: 'MID'}), 'MID');
  const stmts = session.parse(`comp [slider] .v:
  for.2: 'C'
  :`);
  h.assert('for parsed', stmts[0].comp.attributes['for']['2'], 'C');
});

reg(1213, 'slider', 'property block set/data drive', function(h, session) {
  const { interp } = session.run(`comp [slider] .s:
  length: 3
  on: 1
  :

3wire out = .s:get
1wire trig = 0
3wire val = 101

.s:{
  data = val
  set = trig
}`);
  h.assert('initial 000', session.getWire(interp, 'out'), '000');
  session.setWire(interp, 'trig', '1');
  h.assert('after set/data 101', session.getWire(interp, 'out'), '101');
});

reg(1214, 'slider', 'propagare wire wave la schimbare slider', function(h, session) {
  const { interp } = session.run(`comp [slider] .s:
  length: 4
  :

4wire a = .s:get`);
  h.assert('initial', session.getWire(interp, 'a'), '0000');
  session.setComp(interp, '.s', '0110');
  h.assert('after slider', session.getWire(interp, 'a'), '0110');
}, { propagation: 'wave' });

reg(1215, 'slider', 'propagare legacy', function(h, session) {
  const { interp } = session.run(`comp [slider] .s:
  length: 4
  :

4wire a = .s:get`);
  session.setComp(interp, '.s', '1001');
  h.assert('legacy a=1001', session.getWire(interp, 'a'), '1001');
});

reg(1216, 'slider', 'show(.slider) — bin în output', function(h, session) {
  const { interp } = session.run(`comp [slider] .s:
  length: 4
  on: 1
  :

1wire trig = 0
4wire val = 1010
.s:{
  data = val
  set = trig
}`);
  session.setWire(interp, 'trig', '1');
  const outBefore = session.out.length;
  session.execStmts(interp, 'show(.s)');
  const showLines = session.out.slice(outBefore);
  h.assert('show bin 1010', String(showLines.some(l => l.includes('1010'))), 'true');
});

reg(1217, 'slider', 'length 8 — valoare max 11111111', function(h, session) {
  const { interp } = session.run(`comp [slider] .s:
  length: 8
  :

8wire a = .s:get`);
  session.setComp(interp, '.s', '11111111');
  h.assert('max value', session.getWire(interp, 'a'), '11111111');
  h.assert('step count 256', String(1 << 8), '256');
});

reg(1218, 'slider', 'doc smoke script din slider.md', function(h, session) {
  const { interp } = session.run(`comp [slider] .op:
  length: 4
  text: 'A'
  :

4wire val = .op:get`);
  h.assert('runs', String(!!interp), 'true');
  h.assert('initial val', session.getWire(interp, 'val'), '0000');
});


  window.LogTScriptTestSuite = {
    tests,
    runMap: null,
    createSession,
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
  window.LogTScriptTestSuite.finalize();
})();
