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

const F4A_PING = [
  '<F4aPing>+:',
  '    dummy: 8',
  ':',
].join('\n');

const F4A_U16 = F4A_PING + '\n' + `
inline [interp] .f4aVec {
    F4aPing(dummy/u8) {
        total = 0;
        i = 0;
        while (i < vectorLen(valsIn)) {
            total = total + valsIn[i];
            i = i + 1;
        }
        push res: total;
        return total;
    }
}
comp [interp] .f4aU16Comp:
    on: 1
    astSchema = .F4aPing
    .f4aVec { }
    pin vals[5]/u16 as valsIn
    pout res/u16 as resOut
    :
`;

const F4A_U16_RUN = F4A_U16 + '\n' + [
  '8wire<F4aPing> ast = 00000000',
  '16wire[5] valsWire = 0000000000000001 + 0000000000000010 + 0000000000000011 + 0000000000000100 + 0000000000000101',
  '16wire result = 0000000000000000',
  '1wire run = 1',
  '.f4aU16Comp:{ ast = ast valsIn = valsWire resOut >= result set = run }',
].join('\n');

function f4aAsciiBits(str) {
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    bits += str.charCodeAt(i).toString(2).padStart(8, '0');
  }
  return bits;
}

const F4A_STR_BITS = f4aAsciiBits('0123456789abcdefghij');
const F4A_NULL_BITS = f4aAsciiBits('ceva\0\0altceva');

const F4A_STR = F4A_PING + '\n' + `
inline [interp] .f4aStr {
    F4aPing(dummy/u8) { push strOut: dataIn; return vectorLen(dataIn); }
}
comp [interp] .f4aStrComp:
    on: 1
    astSchema = .F4aPing
    .f4aStr { }
    pin strIn[2]10/ascii as dataIn
    pout strOut[2]10/ascii as dataOut
    :
`;

const F4A_STR_RUN = F4A_STR + '\n' + [
  '8wire<F4aPing> ast = 00000000',
  '80wire[2] dataWire = ' + F4A_STR_BITS.match(/.{1,80}/g).join(' + '),
  '80wire[2] outWire = ' + '0'.repeat(160),
  '1wire run = 1',
  '.f4aStrComp:{ ast = ast dataIn = dataWire dataOut >= outWire set = run }',
].join('\n');

const F4A_NULL = F4A_PING + '\n' + `
inline [interp] .f4aNull {
    F4aPing(dummy/u8) {
        push tagOut: tagsIn;
        push res: vectorLen(tagsIn);
        return vectorLen(tagsIn);
    }
}
comp [interp] .f4aNullVarComp:
    on: 1
    astSchema = .F4aPing
    .f4aNull { }
    pin tagIn[]~/ascii as tagsIn
    pout tagOut[]~/ascii as tagsOut
    pout res/u16 as resOut
    :
`;

const F4A_NULL_RUN = F4A_NULL + '\n' + [
  '8wire<F4aPing> ast = 00000000',
  F4A_NULL_BITS.length + 'wire tagsWire = ' + F4A_NULL_BITS,
  F4A_NULL_BITS.length + 'wire tagsOutWire = ' + '0'.repeat(F4A_NULL_BITS.length),
  '16wire result = 0000000000000000',
  '1wire run = 1',
  '.f4aNullVarComp:{ ast = ast tagsIn = tagsWire tagsOut >= tagsOutWire resOut >= result set = run }',
].join('\n');

module.exports.cases.push(
  {
    name: 'comp pin [5]/u16 sum legacy',
    src: F4A_U16_RUN,
    wires: { result: '0000000000001111' },
  },
  {
    name: 'comp pin [5]/u16 sum wave',
    propagation: 'wave',
    src: F4A_U16_RUN,
    wires: { result: '0000000000001111' },
  },
  {
    name: 'comp [2]10/ascii round-trip legacy',
    src: F4A_STR_RUN,
    wires: { outWire: F4A_STR_BITS },
  },
  {
    name: 'comp [2]10/ascii round-trip wave',
    propagation: 'wave',
    src: F4A_STR_RUN,
    wires: { outWire: F4A_STR_BITS },
  },
  {
    name: 'comp []~/ascii null delim legacy',
    src: F4A_NULL_RUN,
    wires: { result: '0000000000000011', tagsOutWire: F4A_NULL_BITS },
  },
  {
    name: 'comp []~/ascii null delim wave',
    propagation: 'wave',
    src: F4A_NULL_RUN,
    wires: { result: '0000000000000011', tagsOutWire: F4A_NULL_BITS },
  },
  {
    name: 'comp pin width mismatch elaboration',
    src: F4A_PING + '\n' + `
inline [interp] .f4aBad { F4aPing(dummy/u8) { return 0; } }
comp [interp] .f4aBadComp:
    on: 1
    astSchema = .F4aPing
    .f4aBad { }
    pin data[4]3/ascii as dataIn
    :
` + '\n' + [
      '24wire[2] bad = ' + '0'.repeat(48),
      '8wire<F4aPing> ast = 00000000',
      '1wire run = 1',
      '.f4aBadComp:{ ast = ast dataIn = bad set = run }',
    ].join('\n'),
    expectError: 'width mismatch',
  },
);
