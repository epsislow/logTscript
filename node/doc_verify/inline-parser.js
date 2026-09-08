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
      expect: ['token INT = [0-9]+', 'parseText'],
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
  ],
};
