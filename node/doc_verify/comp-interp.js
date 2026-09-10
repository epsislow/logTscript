'use strict';

/** Extra checks for doc/comp-interp.md (legacy + wave parity where wired). */
const pa = require('../../core/parser-assembler.js');
const ab = require('../../core/ast-builder.js');

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

const INTERP_PUSH = `
inline [interp] .calcInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        push res: left + right;
        return left + right;
    }
    CallMul(left/s16, right/s16) {
        push res: left * right;
        return left * right;
    }
    CallAssign(name/ascii, value/s16) {
        env[name] = value;
        return value;
    }
    CallVariable(name/ascii) { return env[name]; }
}
`;

const COMP_CALC = `
comp [interp] .calculator:
    on: 1
    astSchema = .program
    .calcInterp { }
    pin limit/s32 as limitIn
    pout res/s16 as resOut
    :
`;

const CORE = SCHEMAS + '\n' + PARSER + '\n' + INTERP_PUSH + '\n' + COMP_CALC;

const INTERP_RM = `
inline [interp] .calcRm {
    CallNumber(value/u8) { push res: value; remove res; return value; }
}
comp [interp] .calcRmComp:
    on: 1
    astSchema = .expr
    .calcRm { }
    pout res/s16 as resOut
    :
`;

function grammar(interp) {
  const inst = interp.inlineInstances.get('.calcLang');
  return { tokens: inst.tokens || [], rules: inst.rules || [] };
}

function packProgram(interp, src) {
  const g = grammar(interp);
  return ab.buildAstFromParse(g, src, 'program', interp.schemaRegistry, { startRule: 'program' });
}

const COMP_ADD_SCRIPT = CORE + '\n' + [
  '165wire<program> prog = .calcLang:packAst("x=1+2;", <program>, "program")',
  '16wire result = 0000000000000000',
  '32wire limitWire = ' + '0'.repeat(32),
  '1wire run = 1',
  '.calculator:{ ast = prog limitIn = limitWire resOut >= result set = run }',
].join('\n');

module.exports = {
  cases: [
    {
      name: 'comp header pin pout astSchema',
      src: CORE,
      check: (i) => {
        const c = i.components.get('.calculator');
        return c && c.type === 'interp' && c.astSchemaRef === 'program'
          && c.pinByAlias.limitIn && c.poutByAlias.resOut
          && i.inlineInstances.get('.calcInterp').requiresCompContext === true;
      },
    },
    {
      name: 'comp 1+2 push res legacy',
      src: COMP_ADD_SCRIPT,
      wires: { result: '0000000000000011' },
    },
    {
      name: 'comp 1+2 push res wave',
      propagation: 'wave',
      src: COMP_ADD_SCRIPT,
      wires: { result: '0000000000000011' },
    },
    {
      name: 'comp parse pr ast legacy',
      src: CORE + '\n' + [
        '4096wire<parseResult> pr =: .calcLang:parse("x=3+4;", <program>, "program")',
        '165wire<program> progAst = pr:ast',
        '16wire result = 0000000000000000',
        '32wire limitWire = ' + '0'.repeat(32),
        '1wire run = 1',
        '.calculator:{ ast = progAst limitIn = limitWire resOut >= result set = run }',
      ].join('\n'),
      wires: { result: '0000000000000111' },
    },
    {
      name: 'comp parse pr ast wave',
      propagation: 'wave',
      src: CORE + '\n' + [
        '4096wire<parseResult> pr =: .calcLang:parse("x=3+4;", <program>, "program")',
        '165wire<program> progAst = pr:ast',
        '16wire result = 0000000000000000',
        '32wire limitWire = ' + '0'.repeat(32),
        '1wire run = 1',
        '.calculator:{ ast = progAst limitIn = limitWire resOut >= result set = run }',
      ].join('\n'),
      wires: { result: '0000000000000111' },
    },
    {
      name: 'remove keeps wire legacy',
      src: SCHEMAS + '\n' + PARSER + '\n' + INTERP_RM + '\n' + [
        '12wire<expr> ast = .calcLang:packAst("5", <expr>, "expression")',
        '16wire result = 0000000000001111',
        '1wire run = 1',
        '.calcRmComp:{ ast = ast resOut >= result set = run }',
      ].join('\n'),
      wires: { result: '0000000000001111' },
    },
    {
      name: 'remove keeps wire wave',
      propagation: 'wave',
      src: SCHEMAS + '\n' + PARSER + '\n' + INTERP_RM + '\n' + [
        '12wire<expr> ast = .calcLang:packAst("5", <expr>, "expression")',
        '16wire result = 0000000000001111',
        '1wire run = 1',
        '.calcRmComp:{ ast = ast resOut >= result set = run }',
      ].join('\n'),
      wires: { result: '0000000000001111' },
    },
    {
      name: 'push blocks inline eval',
      src: CORE + '\n101wire<program> prog = .calcLang:packAst("x=1;", <program>, "program")\n8wire r = .calcInterp:eval(prog, <program>)',
      expectError: 'push/remove',
      expect: ['push/remove'],
    },
  ],
};
