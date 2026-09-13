'use strict';

const pa = require('../../core/parser-assembler.js');
const ab = require('../../core/ast-builder.js');
const ie = require('../../core/interp-engine.js');
const ia = require('../../core/interp-assembler.js');

if (typeof globalThis.compileParserTokenRegex !== 'function') {
  globalThis.compileParserTokenRegex = pa.compileParserTokenRegex;
}

const SCHEMAS = `
<byte>:
    value: 8
:

<symbol>+:
    bytes: bound <byte>[1-]
:

<CallNumber>:
    value: 8
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<CallMul>:
    left:  bound <expr>
    right: bound <expr>
:

<CallVariable>:
    name: bound <symbol>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallAdd?:      bound <CallAdd>
    CallMul?:      bound <CallMul>
    CallVariable?: bound <CallVariable>
:

<CallAssign>:
    name:  bound <symbol>
    value: bound <expr>
:

<CallStatement>+:
    CallAssign?: bound <CallAssign>
:

<program>+:
    statements: bound <CallStatement>[1-]
:
`;

const PARSER = `
inline [parser] .calcLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = expression "+" term -> CallAdd | term;
    rule term = term "*" factor -> CallMul | factor;
    rule factor = "(" expression ")" | INT -> CallNumber | $name:ID -> CallVariable;
:
`;

const INTERP = `
inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallMul(left/s16, right/s16) { return left * right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    CallVariable(name/ascii) { return env[name]; }
}
`;

const INTERP_MULTI = `
inline [interp] .calcMulti {
    doSumDiff(a, b) {
        if (a > b) {
            return a + b, a - b;
        }
        return a + b, 0;
    }
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        sum, diff = doSumDiff(left, right);
        return sum;
    }
    CallMul(left/s16, right/s16) { return left * right; }
}
`;

const CORE = SCHEMAS + PARSER + INTERP;

const F3H_BYTE = [
  '<byte>:',
  '    value: 8',
  ':',
].join('\n');

const F3H_VEC = [
  F3H_BYTE,
  '<F3hCallSum>:',
  '    values: 16[1-8]',
  ':',
  '<F3hFlags>:',
  '    flags: 32',
  ':',
  '<F3hBytes>:',
  '    bytes: bound <byte>[1-]',
  ':',
  `inline [interp] .vecInterp {
    F3hCallSum(values[]/u16) {
        total = 0;
        i = 0;
        while (i < vectorLen(values)) {
            total = total + values[i];
            i = i + 1;
        }
        return total;
    }
    F3hFlags(flags[]/u1) {
        n = 0;
        i = 0;
        while (i < vectorLen(flags)) {
            n = n + flags[i];
            i = i + 1;
        }
        return n;
    }
    F3hBytes(bytes[]/ascii) {
        return vectorLen(bytes);
    }
}`,
].join('\n');

function f3hVecInst(interp) {
  return interp.inlineInstances.get('.vecInterp');
}

function f3hPackBoundByte(ch) {
  const payload = ch.charCodeAt(0).toString(2).padStart(8, '0');
  return '0000000000001000' + payload;
}

function grammar(interp) {
  const inst = interp.inlineInstances.get('.calcLang');
  if (!inst) return null;
  return { tokens: inst.tokens, rules: inst.rules };
}

function packExpr(interp, src) {
  const g = grammar(interp);
  if (!g) return null;
  return ab.buildAstFromParse(g, src, 'expr', interp.schemaRegistry, { startRule: 'expression' });
}

function evalAst(interp, bits, schemaName) {
  const inst = interp.inlineInstances.get('.calcInterp');
  if (!inst) return null;
  return ie.evalInterpWire(bits, schemaName, interp.schemaRegistry, inst, {});
}

function evalMultiAst(interp, bits, schemaName) {
  const inst = interp.inlineInstances.get('.calcMulti');
  if (!inst) return null;
  return ie.evalInterpWire(bits, schemaName, interp.schemaRegistry, inst, {});
}

/** Extra checks for doc/inline-interp.md */
module.exports = {
  cases: [
    {
      name: 'brace form stores interp methods',
      src: `inline [interp] .mini {
    CallNumber(value/u8) { return value; }
}`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.mini');
        return inst && inst.kind === 'interp' && inst.methods.CallNumber.params[0].typeName === 'u8';
      },
    },
    {
      name: 'doc inline.interp template',
      src: 'doc(inline.interp)',
      expect: ['inline [interp]', 'eval(astWire', '/type'],
    },
    {
      name: 'eval CallNumber 42',
      src: CORE,
      check: (interp) => {
        const packed = packExpr(interp, '42');
        if (!packed || !packed.ok) return false;
        return evalAst(interp, packed.bits, 'expr') === 42;
      },
    },
    {
      name: 'eval precedence 1+2*3',
      src: CORE,
      check: (interp) => {
        const packed = packExpr(interp, '1+2*3');
        if (!packed || !packed.ok) return false;
        return evalAst(interp, packed.bits, 'expr') === 7;
      },
    },
    {
      name: 'eval program two statements',
      src: CORE,
      check: (interp) => {
        const g = grammar(interp);
        const packed = ab.buildAstFromParse(g, 'a=1;b=2;', 'program', interp.schemaRegistry, { startRule: 'program' });
        if (!packed || !packed.ok) return false;
        return evalAst(interp, packed.bits, 'program') === 2;
      },
    },
    {
      name: 'eval undefined variable aborts',
      src: CORE,
      check: (interp) => {
        const g = grammar(interp);
        const packed = ab.buildAstFromParse(g, 'a=1;b=0+y;', 'program', interp.schemaRegistry, { startRule: 'program' });
        if (!packed || !packed.ok) return false;
        try {
          evalAst(interp, packed.bits, 'program');
          return false;
        } catch (e) {
          return String(e.message).indexOf('undefined variable') >= 0;
        }
      },
    },
    {
      name: 'vector var-array u16 sum',
      src: F3H_VEC,
      check: (interp) => {
        const inst = f3hVecInst(interp);
        if (!inst) return false;
        const bits = [1, 2, 3, 4].map((v) => v.toString(2).padStart(16, '0')).join('');
        return ie.evalInterpWire(bits, 'F3hCallSum', interp.schemaRegistry, inst, { declaredWidth: 64 }) === 10;
      },
    },
    {
      name: 'vector leaf u1 count',
      src: F3H_VEC,
      check: (interp) => {
        const inst = f3hVecInst(interp);
        if (!inst) return false;
        const bits = '10100000000000000000000000000000';
        return ie.evalInterpWire(bits, 'F3hFlags', interp.schemaRegistry, inst, { declaredWidth: 32 }) === 2;
      },
    },
    {
      name: 'vector bva ascii length',
      src: F3H_VEC,
      check: (interp) => {
        const inst = f3hVecInst(interp);
        if (!inst) return false;
        const bits = f3hPackBoundByte('a') + f3hPackBoundByte('b') + f3hPackBoundByte('c');
        return ie.evalInterpWire(bits, 'F3hBytes', interp.schemaRegistry, inst, { declaredWidth: bits.length }) === 3;
      },
    },
    {
      name: 'vector corrupt remainder aborts',
      src: F3H_VEC,
      check: (interp) => {
        const inst = f3hVecInst(interp);
        if (!inst) return false;
        const bits = '1010' + '0'.repeat(21);
        try {
          ie.evalInterpWire(bits, 'F3hFlags', interp.schemaRegistry, inst, { declaredWidth: 25 });
          return false;
        } catch (e) {
          return String(e.message).indexOf('corrupt') >= 0;
        }
      },
    },
  ],
};

const F3I_VEC = [
  '<F3iU16Five>:',
  '    values: 80',
  ':',
  '<F3iTextVar>:',
  '    blob: 104',
  ':',
  '<F3iTextThree>:',
  '    blob: 144',
  ':',
  `inline [interp] .f3iInterp {
    F3iU16Five(values[5]/u16) {
        total = 0;
        i = 0;
        while (i < vectorLen(values)) {
            total = total + values[i];
            i = i + 1;
        }
        return total;
    }
    F3iTextVar(blob[]~/ascii) {
        return vectorLen(blob);
    }
    F3iTextThree(blob[3]~/ascii) {
        return vectorLen(blob);
    }
}`,
].join('\n');

function f3iInst(interp) {
  return interp.inlineInstances.get('.f3iInterp');
}

function f3iAsciiBits(str) {
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    bits += str.charCodeAt(i).toString(2).padStart(8, '0');
  }
  return bits;
}

module.exports.cases.push(
  {
    name: 'vector [5]/u16 fixed sum',
    src: F3I_VEC,
    check: (interp) => {
      const inst = f3iInst(interp);
      if (!inst) return false;
      const bits = [1, 2, 3, 4, 5].map((v) => v.toString(2).padStart(16, '0')).join('');
      return ie.evalInterpWire(bits, 'F3iU16Five', interp.schemaRegistry, inst, { declaredWidth: 80 }) === 15;
    },
  },
  {
    name: 'vector []~/ascii null-delimited',
    src: F3I_VEC,
    check: (interp) => {
      const inst = f3iInst(interp);
      if (!inst) return false;
      const bits = f3iAsciiBits('ceva\0\0altceva');
      return ie.evalInterpWire(bits, 'F3iTextVar', interp.schemaRegistry, inst, { declaredWidth: 104 }) === 3;
    },
  },
  {
    name: 'vector [3]~/ascii fixed take',
    src: F3I_VEC,
    check: (interp) => {
      const inst = f3iInst(interp);
      if (!inst) return false;
      const bits = f3iAsciiBits('ceva\0\0altceva\0\0bla');
      return ie.evalInterpWire(bits, 'F3iTextThree', interp.schemaRegistry, inst, { declaredWidth: 144 }) === 3;
    },
  },
  {
    name: 'multi-return helper doSumDiff arity',
    src: SCHEMAS + PARSER + INTERP_MULTI,
    check: (interp) => {
      const inst = interp.inlineInstances.get('.calcMulti');
      return inst && inst.methods.doSumDiff.returnArity === 2;
    },
  },
  {
    name: 'multi-return eval 7+3 via CallAdd',
    src: SCHEMAS + PARSER + INTERP_MULTI,
    check: (interp) => {
      const packed = packExpr(interp, '7+3');
      if (!packed || !packed.ok) return false;
      return evalMultiAst(interp, packed.bits, 'expr') === 10;
    },
  },
  {
    name: 'multi-return eval 3+7 via CallAdd',
    src: SCHEMAS + PARSER + INTERP_MULTI,
    check: (interp) => {
      const packed = packExpr(interp, '3+7');
      if (!packed || !packed.ok) return false;
      return evalMultiAst(interp, packed.bits, 'expr') === 10;
    },
  },
);

const F6_DEFERRED = [
  '<byte>:',
  '    value: 8',
  ':',
  '<symbol>+:',
  '    bytes: bound <byte>[1-]',
  ':',
  '<CallNumber>:',
  '    value: 8',
  ':',
  '<CallVariable>:',
  '    name: bound <symbol>',
  ':',
  '<CallAdd>:',
  '    left:  bound <expr>',
  '    right: bound <expr>',
  ':',
  '<CallSub>:',
  '    left:  bound <expr>',
  '    right: bound <expr>',
  ':',
  '<CallMul>:',
  '    left:  bound <expr>',
  '    right: bound <expr>',
  ':',
  '<expr>+:',
  '    CallNumber?:   <CallNumber>',
  '    CallVariable?: bound <CallVariable>',
  '    CallAdd?:      bound <CallAdd>',
  '    CallSub?:      bound <CallSub>',
  '    CallMul?:      bound <CallMul>',
  ':',
  '<CallAssign>:',
  '    name:  bound <symbol>',
  '    value: bound <expr>',
  ':',
  '<WhileLoop>:',
  '    condition: bound <expr>',
  '    body:      bound <CallStatement>[1-]',
  ':',
  '<CallStatement>+:',
  '    CallAssign?: bound <CallAssign>',
  '    WhileLoop?:  bound <WhileLoop>',
  ':',
  '<program>+:',
  '    statements: bound <CallStatement>[1-]',
  ':',
  '<DeferredProbe>:',
  '    node: bound <expr>',
  ':',
  `inline [parser] .factLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement
        = "while" "(" $$ $condition:expression ")" "{" $body:statement+ "}" -> WhileLoop
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;
    rule term
        = term "*" factor -> CallMul
        | factor;
    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | $name:ID -> CallVariable;
:`,
  `inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallMul(left/s16, right/s16) { return left * right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    WhileLoop(condition^, body^) {
        while eval(condition, 1) {
            eval(body, 1);
        }
        return 0;
    }
    DeferredProbe(node^) {
        v1 = eval(node);
        v2 = eval(node);
        return v2;
    }
}`,
].join('\n');

function f6Grammar(interp) {
  const inst = interp.inlineInstances.get('.factLang');
  if (!inst) return null;
  return { tokens: inst.tokens, rules: inst.rules };
}

function f6EvalProgram(interp, src) {
  const g = f6Grammar(interp);
  const inst = interp.inlineInstances.get('.factInterp');
  if (!g || !inst) return null;
  const packed = ab.buildAstFromParse(g, src, 'program', interp.schemaRegistry, { startRule: 'program' });
  if (!packed || !packed.ok) return null;
  return ie.evalInterpInline(inst, packed.bits, 'program', interp.schemaRegistry, { evaluationMap: new Map() });
}

module.exports.cases.push(
  {
    name: 'deferred eval lazy cache',
    src: F6_DEFERRED,
    check: (interp) => {
      const g = f6Grammar(interp);
      const inst = interp.inlineInstances.get('.factInterp');
      if (!g || !inst) return false;
      const built = ab.buildAstFromParse(g, '7', 'expr', interp.schemaRegistry, { startRule: 'expression' });
      if (!built || !built.ok) return false;
      const handle = ie.interpMakeNodeHandle({
        kind: 'leaf',
        schemaRef: 'expr',
        payloadBits: built.bits,
        pathKey: 'r/probe',
        fieldName: 'probe',
      });
      const map = new Map();
      const opts = { evaluationMap: map, registry: interp.schemaRegistry, program: inst, sharedEnv: { env: {} } };
      const v1 = ie.interpEvalNodeHandle(handle, false, interp.schemaRegistry, inst, opts.sharedEnv, opts);
      const v2 = ie.interpEvalNodeHandle(handle, false, interp.schemaRegistry, inst, opts.sharedEnv, opts);
      return v1 === 7 && v2 === 7 && map.size === 1;
    },
  },
  {
    name: 'deferred while re-reads env',
    src: F6_DEFERRED,
    check: (interp) => f6EvalProgram(interp, 'n=3; while(n) { n=n-1; } out=n;') === 0,
  },
  {
    name: 'deferred factorial 5! = 120',
    src: F6_DEFERRED,
    check: (interp) => f6EvalProgram(interp, 'fact=1; n=5; while(n) { fact=fact*n; n=n-1; } out=fact;') === 120,
  },
  {
    name: 'deferred forced cache refresh',
    src: F6_DEFERRED,
    check: (interp) => {
      const g = f6Grammar(interp);
      const inst = interp.inlineInstances.get('.factInterp');
      if (!g || !inst) return false;
      const built = ab.buildAstFromParse(g, 'x', 'expr', interp.schemaRegistry, { startRule: 'expression' });
      if (!built || !built.ok) return false;
      const handle = ie.interpMakeNodeHandle({
        kind: 'leaf',
        schemaRef: 'expr',
        payloadBits: built.bits,
        pathKey: 'r/x',
        fieldName: 'x',
      });
      const pinEnv = { env: { x: 5 } };
      const map = new Map();
      const opts = { evaluationMap: map, registry: interp.schemaRegistry, program: inst, sharedEnv: pinEnv };
      const v1 = ie.interpEvalNodeHandle(handle, false, interp.schemaRegistry, inst, pinEnv, opts);
      pinEnv.env.x = 99;
      const v2 = ie.interpEvalNodeHandle(handle, false, interp.schemaRegistry, inst, pinEnv, opts);
      const v3 = ie.interpEvalNodeHandle(handle, true, interp.schemaRegistry, inst, pinEnv, opts);
      const v4 = ie.interpEvalNodeHandle(handle, false, interp.schemaRegistry, inst, pinEnv, opts);
      return v1 === 5 && v2 === 5 && v3 === 99 && v4 === 99;
    },
  },
  {
    name: 'deferred composite BVA lazy no rerun',
    src: [
      F6_DEFERRED,
      '<StmtSeq>+:',
      '    stmts: bound <CallStatement>[1-]',
      ':',
      `inline [parser] .factLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule stmtSeq = statement+;
    rule statement
        = "while" "(" $$ $condition:expression ")" "{" $body:statement+ "}" -> WhileLoop
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;
    rule term
        = term "*" factor -> CallMul
        | factor;
    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | $name:ID -> CallVariable;
:`,
      `inline [interp] .stmtInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallMul(left/s16, right/s16) { return left * right; }
    CallAssign(name/ascii, value/s16) {
        hits = env['__hits'];
        env['__hits'] = hits + 1;
        env[name] = value;
        return value;
    }
    StmtSeq(stmts^) {
        env['__hits'] = 0;
        eval(stmts, 1);
        eval(stmts);
        return env['__hits'];
    }
}`,
    ].join('\n'),
    check: (interp) => {
      const gInst = interp.inlineInstances.get('.factLang');
      const inst = interp.inlineInstances.get('.stmtInterp');
      if (!gInst || !inst) return false;
      const g = { tokens: gInst.tokens, rules: gInst.rules };
      const packed = ab.buildAstFromParse(g, 'a=10; b=20;', 'StmtSeq', interp.schemaRegistry, { startRule: 'stmtSeq' });
      if (!packed || !packed.ok) return false;
      return ie.evalInterpInline(inst, packed.bits, 'StmtSeq', interp.schemaRegistry, { evaluationMap: new Map() }) === 2;
    },
  },
  {
    name: 'leaf /node rejects at dispatch',
    src: [
      '<CallNumber>:',
      '    value: 8',
      ':',
      'inline [interp] .badLeaf {',
      '  CallNumber(value/node) { return 0; }',
      '}',
    ].join('\n'),
    check: (interp) => {
      const inst = interp.inlineInstances.get('.badLeaf');
      if (!inst) return false;
      try {
        ie.evalInterpWire('0000000000101010', 'CallNumber', interp.schemaRegistry, inst, {});
        return false;
      } catch (e) {
        return String(e.message).indexOf('requires bound or BVA field for /node') >= 0;
      }
    },
  },
  {
    name: 'evaled pre0 post1 without executing before eval',
    src: [
      '<byte>:',
      '    value: 8',
      ':',
      '<CallNumber>:',
      '    value: 8',
      ':',
      '<expr>+:',
      '    CallNumber?: <CallNumber>',
      ':',
      '<EvaledProbeBody>:',
      '    node: bound <expr>',
      ':',
      '<EvaledProbeRoot>+:',
      '    EvaledProbe?: bound <EvaledProbeBody>',
      ':',
      `inline [parser] .evaledLang:
    token INT = [0-9]+;
    rule evaledRoot = $node:expression -> EvaledProbe;
    rule expression = INT -> CallNumber;
:`,
      `inline [interp] .evaledInterp {
    CallNumber(value/u8) { return value; }
    EvaledProbe(node^) {
        pre = evaled(node);
        val = eval(node);
        post = evaled(node);
        return pre * 100 + post * 10 + val;
    }
}`,
    ].join('\n'),
    check: (interp) => {
      const gInst = interp.inlineInstances.get('.evaledLang');
      const inst = interp.inlineInstances.get('.evaledInterp');
      if (!gInst || !inst) return false;
      const g = { tokens: gInst.tokens, rules: gInst.rules };
      const built = ab.buildAstFromParse(g, '7', 'EvaledProbeRoot', interp.schemaRegistry, { startRule: 'evaledRoot' });
      if (!built || !built.ok) return false;
      const map = new Map();
      const v = ie.evalInterpInline(inst, built.bits, 'EvaledProbeRoot', interp.schemaRegistry, { evaluationMap: map });
      return v === 17 && map.size === 1;
    },
  },
  {
    name: 'evaled reserved as method name',
    src: 'inline [interp] .x { evaled(n/u8) { return n; } }',
    expectError: 'reserved',
    check: () => {
      try {
        ia.parseInterpBody('evaled(x/u8) { return x; }');
        return false;
      } catch (e) {
        return String(e.message).indexOf('reserved') >= 0;
      }
    },
  },
);

const F7_SLOT_CORE = [
  '<byte>:',
  '    value: 8',
  ':',
  '<symbol>+:',
  '    bytes: bound <byte>[1-]',
  ':',
  '<CallNumber>:',
  '    value: 8',
  ':',
  '<CallVariable>:',
  '    name: bound <symbol>',
  ':',
  '<CallAssign>:',
  '    name:  bound <symbol>',
  '    value: bound <CallNumber>',
  ':',
  '<SaveProbeBody>:',
  '    node: bound <CallAssign>',
  ':',
  '<SaveProbeRoot>+:',
  '    SaveProbe?: bound <SaveProbeBody>',
  ':',
  `inline [parser] .slotLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule saveRoot = $node:statement -> SaveProbe;
    rule statement = $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression = INT -> CallNumber | $name:ID -> CallVariable;
:`,
  `inline [interp] .slotInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    SaveProbe(node^) {
        save:slot = node;
        pre = env['hits'];
        eval(get:slot, 1);
        post = env['hits'];
        return pre * 10 + post;
    }
}`,
].join('\n');

const F7_TX_CORE = [
  '<byte>:',
  '    value: 8',
  ':',
  '<symbol>+:',
  '    bytes: bound <byte>[1-]',
  ':',
  '<CallNumber>:',
  '    value: 8',
  ':',
  '<CallVariable>:',
  '    name: bound <symbol>',
  ':',
  '<CallAdd>:',
  '    left:  bound <expr>',
  '    right: bound <expr>',
  ':',
  '<CallSub>:',
  '    left:  bound <expr>',
  '    right: bound <expr>',
  ':',
  '<expr>+:',
  '    CallNumber?:   <CallNumber>',
  '    CallVariable?: bound <CallVariable>',
  '    CallAdd?:      bound <CallAdd>',
  '    CallSub?:      bound <CallSub>',
  ':',
  '<CallAssign>:',
  '    name:  bound <symbol>',
  '    value: bound <expr>',
  ':',
  '<F7BodyStmt>+:',
  '    CallAssign?: bound <CallAssign>',
  ':',
  '<CallStatement>+:',
  '    CallAssign?:      bound <CallAssign>',
  '    CallBeginBlock?:  bound <CallBeginBlock>',
  '    CallCommit?:      <CallCommit>',
  ':',
  '<CallBeginBlock>:',
  '    body: bound <F7BodyStmt>[1-]',
  ':',
  '<CallCommit>:',
  ':',
  '<program>+:',
  '    statements: bound <CallStatement>[1-]',
  ':',
  `inline [parser] .txLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule program = statement+;
    rule statement
        = "begin" "{" $body:statement+ "}" -> CallBeginBlock
        | "commit" ";" -> CallCommit
        | $name:ID "=" $value:expression ";" -> CallAssign;
    rule expression
        = expression "+" term -> CallAdd
        | expression "-" term -> CallSub
        | term;
    rule term = factor;
    rule factor = INT -> CallNumber | $name:ID -> CallVariable;
:`,
  `inline [interp] .txInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallSub(left/s16, right/s16) { return left - right; }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    CallBeginBlock(body^) {
        save:txBody = body;
        return 0;
    }
    CallCommit() {
        eval(get:txBody, 1);
        return env['hits'];
    }
}`,
].join('\n');

module.exports.cases.push(
  {
    name: 'save get deferred assign pre0 post1',
    src: F7_SLOT_CORE,
    check: (interp) => {
      const gInst = interp.inlineInstances.get('.slotLang');
      const inst = interp.inlineInstances.get('.slotInterp');
      if (!gInst || !inst) return false;
      const g = { tokens: gInst.tokens, rules: gInst.rules };
      const packed = ab.buildAstFromParse(g, 'hits=1;', 'SaveProbeRoot', interp.schemaRegistry, { startRule: 'saveRoot' });
      if (!packed || !packed.ok) return false;
      const v = ie.evalInterpInline(inst, packed.bits, 'SaveProbeRoot', interp.schemaRegistry, {
        evaluationMap: new Map(),
        savedHandles: new Map(),
        env: { env: { hits: 0 } },
      });
      return v === 1;
    },
  },
  {
    name: 'save literal rejected at elaboration',
    src: 'inline [interp] .x { Probe(n^) { save:slot = 5; return 0; } }',
    expectError: 'deferred node handle',
    check: () => {
      try {
        ia.parseInterpBody('Probe(n^) { save:slot = 5; return 0; }');
        return false;
      } catch (e) {
        return String(e.message).indexOf('deferred node handle') >= 0;
      }
    },
  },
  {
    name: 'save and get reserved method names',
    src: 'inline [interp] .x { save(x/u8) { return x; } }',
    expectError: 'reserved',
    check: () => {
      try {
        ia.parseInterpBody('save(x/u8) { return x; }');
        return false;
      } catch (e) {
        if (String(e.message).indexOf('reserved') < 0) return false;
      }
      try {
        ia.parseInterpBody('get(x/u8) { return x; }');
        return false;
      } catch (e) {
        return String(e.message).indexOf('reserved') >= 0;
      }
    },
  },
  {
    name: 'begin commit transaction wire',
    src: F7_TX_CORE,
    check: (interp) => {
      const gInst = interp.inlineInstances.get('.txLang');
      const inst = interp.inlineInstances.get('.txInterp');
      if (!gInst || !inst) return false;
      const g = { tokens: gInst.tokens, rules: gInst.rules };
      const packed = ab.buildAstFromParse(
        g,
        'hits=0; begin { hits=hits+1; } commit; out=hits;',
        'program',
        interp.schemaRegistry,
        { startRule: 'program' },
      );
      if (!packed || !packed.ok) return false;
      return ie.evalInterpInline(inst, packed.bits, 'program', interp.schemaRegistry, {
        evaluationMap: new Map(),
        savedHandles: new Map(),
      }) === 1;
    },
  },
);
