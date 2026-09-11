'use strict';

const pa = require('../../core/parser-assembler.js');
const pe = require('../../core/parser-engine.js');

globalThis.compileParserTokenRegex = pa.compileParserTokenRegex;

const ASSIGN_LANG = `
inline [parser] .assignLang:
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    token INT = [0-9]+;
    rule stmt = $name:ID &("=") "=" $value:INT -> CallAssign;
:
`;

const CALL_LANG = `
inline [parser] .callLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule callSuffix = "(" INT ")" -> CallSuffix;
    rule value
        = $name:ID &(callSuffix) callSuffix -> CallFunction
        | $name:ID -> CallVariable;
    rule expression = value | INT -> CallNumber;
:
`;

function grammarFromInterp(interp, name) {
  const inst = interp.inlineInstances.get(name);
  if (!inst) return null;
  return { tokens: inst.tokens, rules: inst.rules };
}

function parseLang(interp, name, src, startRule) {
  const g = grammarFromInterp(interp, name);
  if (!g) return null;
  return pe.parseGrammar(g, src, { startRule });
}

module.exports = {
  doc: 'inline-parser-complex-rules.md',
  cases: [
    {
      name: 'positive lookahead assign',
      src: ASSIGN_LANG,
      check: (interp) => {
        const ok = parseLang(interp, '.assignLang', 'a=3', 'stmt');
        const bad = parseLang(interp, '.assignLang', 'a', 'stmt');
        return ok && ok.ok === 1 && ok.tree.call === 'CallAssign' && bad && bad.ok === 0;
      },
    },
    {
      name: 'negative lookahead variable',
      src: `
inline [parser] .varLang:
    token ID = [a-zA-Z_][a-zA-Z0-9_]*;
    rule stmt = $name:ID !("=") -> CallVariable;
:
`,
      check: (interp) => {
        const ok = parseLang(interp, '.varLang', 'item', 'stmt');
        const bad = parseLang(interp, '.varLang', 'item=1', 'stmt');
        return ok && ok.ok === 1 && ok.tree.call === 'CallVariable' && bad && bad.ok === 0;
      },
    },
    {
      name: 'literal count {3} and {1,3}',
      src: `
inline [parser] .eqLang:
    rule header = "="{3} "title";
    rule pad    = "="{1,3} "x";
:
`,
      check: (interp) => {
        const h = parseLang(interp, '.eqLang', '===title', 'header');
        const p = parseLang(interp, '.eqLang', '==x', 'pad');
        const nf = parseLang(interp, '.eqLang', 'x', 'pad');
        return h && h.ok === 1 && p && p.ok === 1 && nf && nf.ok === 0;
      },
    },
    {
      name: 'rule ref probe function vs variable',
      src: CALL_LANG,
      check: (interp) => {
        const fn = parseLang(interp, '.callLang', 'foo(9)', 'expression');
        const id = parseLang(interp, '.callLang', 'foo', 'expression');
        return fn && fn.ok === 1 && fn.tree.call === 'CallFunction' &&
          id && id.ok === 1 && id.tree.call === 'CallVariable';
      },
    },
  ],
};
