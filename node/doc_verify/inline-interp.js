'use strict';

const pa = require('../../core/parser-assembler.js');
const ab = require('../../core/ast-builder.js');
const ie = require('../../core/interp-engine.js');

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

const CORE = SCHEMAS + PARSER + INTERP;

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
  ],
};
