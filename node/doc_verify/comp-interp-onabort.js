'use strict';

/** Extra checks for doc/comp-interp-onabort.md (legacy + wave parity where wired). */
const pa = require('../../core/parser-assembler.js');
const ab = require('../../core/ast-builder.js');
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

<CallVariable>:
    name: bound <symbol>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallAdd?:      bound <CallAdd>
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

const INTERP_ONABORT = `
inline [interp] .calcAbort {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallAssign(name/ascii, value/s16) { env[name] = value; return value; }
    CallVariable(name/ascii) { return env[name]; }
    onabort setErr(msg, info) {
        push errCode: info["kindCode"];
    }
}
`;

const INTERP_CHAIN = `
inline [interp] .calcChain {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return left + right; }
    CallAssign(name/ascii, value/s16) { env[name] = value; return value; }
    CallVariable(name/ascii) { return env[name]; }
    onabort first(msg, info) {
        push errCode: info["kindCode"];
    }
    onabort second(msg) {
        push errCode: 99;
    }
}
`;

const COMP = `
comp [interp] .calcAbortComp:
    on: 1
    astSchema = .program
    .calcAbort { }
    pout errCode/u16 as errOut
    :
`;

const CHAIN_COMP = `
comp [interp] .chainComp:
    on: 1
    astSchema = .program
    .calcChain { }
    pout errCode/u16 as errOut
    :
`;

const CORE = SCHEMAS + '\n' + PARSER + '\n' + INTERP_ONABORT + '\n' + COMP;
const CHAIN_CORE = SCHEMAS + '\n' + PARSER + '\n' + INTERP_CHAIN + '\n' + CHAIN_COMP;

const ABORT_SCRIPT = CORE + '\n' + [
  '148wire<program> prog = .calcLang:packAst("x=z;", <program>, "program")',
  '16wire errWire = 0000000000000000',
  '1wire run = 1',
  '.calcAbortComp:{ ast = prog errOut >= errWire set = run }',
].join('\n');

const CHAIN_SCRIPT = CHAIN_CORE + '\n' + [
  '148wire<program> prog = .calcLang:packAst("x=z;", <program>, "program")',
  '16wire errWire = 0000000000000000',
  '1wire run = 1',
  '.chainComp:{ ast = prog errOut >= errWire set = run }',
].join('\n');

function outHas(session, prefix) {
  return (session.out || []).some((l) => l.startsWith(prefix));
}

module.exports = {
  skipBlocks: true,
  cases: [
    {
      name: 'onabort requiresCompContext flag',
      src: CORE,
      check: (interp) => interp.inlineInstances.get('.calcAbort').requiresCompContext === true
        && (interp.inlineInstances.get('.calcAbort').onabortHandlers || []).length === 1,
    },
    {
      name: 'onabort undefined variable kindCode legacy',
      src: ABORT_SCRIPT,
      expectError: 'undefined variable',
      wires: { errWire: '0000000000000101' },
      check: (interp, session) => outHas(session, 'kind: undefinedVariable')
        && outHas(session, 'compName: .calcAbortComp'),
    },
    {
      name: 'onabort undefined variable kindCode wave',
      propagation: 'wave',
      src: ABORT_SCRIPT,
      expectError: 'undefined variable',
      wires: { errWire: '0000000000000101' },
      check: (interp, session) => outHas(session, 'kindCode: 5'),
    },
    {
      name: 'onabort handler chain legacy',
      src: CHAIN_SCRIPT,
      expectError: 'undefined variable',
      wires: { errWire: '0000000001100011' },
    },
    {
      name: 'onabort handler chain wave',
      propagation: 'wave',
      src: CHAIN_SCRIPT,
      expectError: 'undefined variable',
      wires: { errWire: '0000000001100011' },
    },
    {
      name: 'parse onabort arity 0/1/2',
      src: CORE,
      check: () => {
        const p = ia.parseInterpBody('onabort a() { return; }\nonabort b(m) { return; }\nonabort c(m,i) { return; }');
        return p.onabortHandlers.length === 3 && p.requiresCompContext === true;
      },
    },
  ],
};
