'use strict';

const pa = require('../../core/parser-assembler.js');
const pe = require('../../core/parser-engine.js');

const CALC_LANG = `
inline [parser] .calcLang:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule program = statement+;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | ID  -> CallVariable;

:
`;

function calcFromInterp(interp) {
  const inst = interp.inlineInstances.get('.calcLang');
  if (!inst) return null;
  return { tokens: inst.tokens, rules: inst.rules };
}

function parseCalc(interp, src, startRule) {
  const g = calcFromInterp(interp);
  if (!g) return null;
  if (typeof globalThis.compileParserTokenRegex !== 'function') {
    globalThis.compileParserTokenRegex = pa.compileParserTokenRegex;
  }
  return pe.parseGrammar(g, src, startRule ? { startRule } : undefined);
}

const ab = require('../../core/ast-builder.js');
const pr = require('../../core/parse-result.js');

const F2C_SCHEMAS = `
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

<expr>+:
    CallNumber?: <CallNumber>
    CallAdd?:    bound <CallAdd>
    CallMul?:    bound <CallMul>
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

const CALC_FULL = F2C_SCHEMAS + CALC_LANG;

function packCalc(interp, src, schemaName, startRule) {
  const g = calcFromInterp(interp);
  if (!g) return null;
  if (typeof globalThis.compileParserTokenRegex !== 'function') {
    globalThis.compileParserTokenRegex = pa.compileParserTokenRegex;
  }
  return ab.buildAstFromParse(g, src, schemaName, interp.schemaRegistry, { startRule, validateMapping: false });
}

function parseResultCalc(interp, src, schemaName, startRule) {
  const g = calcFromInterp(interp);
  if (!g) return null;
  if (typeof globalThis.compileParserTokenRegex !== 'function') {
    globalThis.compileParserTokenRegex = pa.compileParserTokenRegex;
  }
  return pr.buildParseResultFromCall(g, src, schemaName, interp.schemaRegistry, { startRule, validateMapping: false });
}

/** Extra checks for doc/inline-parser.md */
module.exports = {
  cases: [
    {
      name: 'colon form stores tokens and rules',
      src: `inline [parser] .calc:

    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;

    rule program = statement+;

    rule statement
        = $name:ID "=" $value:expression ";"
          -> CallAssign;

    rule expression
        = expression "+" term -> CallAdd
        | term;

    rule term
        = term "*" factor -> CallMul
        | factor;

    rule factor
        = "(" expression ")"
        | INT -> CallNumber
        | ID  -> CallVariable;

:`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.calc');
        return inst && inst.kind === 'parser' && inst.tokens.length === 2 && inst.rules.length === 5;
      },
    },
    {
      name: 'brace form stores grammar',
      src: `inline [parser] .mini {
    token NUM = [0-9]+;
    rule main = NUM -> CallNum;
}`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.mini');
        return inst && inst.rules[0].alternatives[0].call === 'CallNum';
      },
    },
    {
      name: 'doc inline.parser template',
      src: 'doc(inline.parser)',
      expect: ['token INT = [0-9]+', 'parseText', 'packAst', ':parse'],
    },
    {
      name: 'parseText program tree via engine',
      src: CALC_LANG,
      check: (interp) => {
        const r = parseCalc(interp, 'n=1+2*3;');
        return r && r.ok === 1 && r.tree.kind === 'repeat' && r.tree.items[0].call === 'CallAssign';
      },
    },
    {
      name: 'parseText expression precedence',
      src: CALC_LANG,
      check: (interp) => {
        const r = parseCalc(interp, '1+2*3', 'expression');
        return r && r.ok === 1 && r.tree.call === 'CallAdd' && r.tree.children.right.call === 'CallMul';
      },
    },
    {
      name: 'parseText strict trailing error',
      src: CALC_LANG,
      check: (interp) => {
        const r = parseCalc(interp, '1+2 xxx', 'expression');
        return r && r.ok === 0 && r.error.kind === 'syntax';
      },
    },
    {
      name: 'parseText lex error',
      src: `
inline [parser] .mini:
    token INT = [0-9]+;
    rule main = INT -> CallNumber;
:
`,
      check: (interp) => {
        const inst = interp.inlineInstances.get('.mini');
        if (!inst) return false;
        const r = pe.parseGrammar({ tokens: inst.tokens, rules: inst.rules }, '@');
        return r.ok === 0 && r.error.kind === 'lex';
      },
    },
    {
      name: 'parseText repeat plus two statements',
      src: CALC_LANG,
      check: (interp) => {
        const r = parseCalc(interp, 'a=1;b=2;');
        return r && r.ok === 1 && r.tree.kind === 'repeat' && r.tree.items.length === 2;
      },
    },
    {
      name: 'packAst expression precedence mask',
      src: CALC_FULL,
      check: (interp) => {
        const r = packCalc(interp, '1+2*3', 'expr', 'expression');
        return r && r.ok === 1 && r.bitWidth === 135 && r.bits.charAt(1) === '1';
      },
    },
    {
      name: 'packAst CallNumber literal',
      src: CALC_FULL,
      check: (interp) => {
        const r = packCalc(interp, '42', 'expr', 'expression');
        return r && r.ok === 1 && r.bits.substring(0, 3) === '100' && r.bitWidth === 11;
      },
    },
    {
      name: 'packAst program assign',
      src: CALC_FULL,
      check: (interp) => {
        const r = packCalc(interp, 'a=1;', 'program', 'program');
        return r && r.ok === 1 && r.bitWidth > 48;
      },
    },
    {
      name: 'packAst numeric overflow',
      src: CALC_FULL,
      check: (interp) => {
        const r = packCalc(interp, '999', 'expr', 'expression');
        return r && r.ok === 0 && r.error && r.error.kind === 'pack';
      },
    },
    {
      name: 'parse expression success envelope',
      src: CALC_FULL,
      check: (interp) => {
        const r = parseResultCalc(interp, '42', 'expr', 'expression');
        return r && r.ok === 1 && r.parseAstSchemaRef === 'expr' && r.bitWidth > 20;
      },
    },
    {
      name: 'parse lex error envelope',
      src: CALC_FULL,
      check: (interp) => {
        const r = parseResultCalc(interp, '@', 'expr', 'expression');
        return r && r.ok === 0 && r.bitWidth > 100;
      },
    },
    {
      name: 'parse pack overflow envelope',
      src: CALC_FULL,
      check: (interp) => {
        const r = parseResultCalc(interp, '999', 'expr', 'expression');
        return r && r.ok === 0 && r.bitWidth > 100;
      },
    },
  ],
};
