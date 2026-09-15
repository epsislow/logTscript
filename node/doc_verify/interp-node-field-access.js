'use strict';

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

<CallVariable>:
    name: bound <symbol>
:

<CallAdd>:
    left:  bound <expr>
    right: bound <expr>
:

<expr>+:
    CallNumber?:   <CallNumber>
    CallVariable?: bound <CallVariable>
    CallAdd?:      bound <CallAdd>
:
`;

const PARSER = `
inline [parser] .factLang:
    token INT = [0-9]+;
    token ID  = [a-zA-Z_][a-zA-Z0-9_]*;
    rule expression
        = expression "+" term -> CallAdd
        | term;
    rule term = factor;
    rule factor = INT -> CallNumber | $name:ID -> CallVariable;
:
`;

const INTERP_ADD = `
inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallVariable(name/ascii) { return env[name]; }
    CallAdd(left/s16, right/s16) {
        child = node:left;
        if (isNode(child) == 1 && typeOf(child) == "node") {
            return node:left:value/u8 + node:1:value/u8;
        }
        return 0;
    }
}
`;

const CORE = SCHEMAS + PARSER + INTERP_ADD;

module.exports = {
  doc: 'interp-node-field-access.md',
  cases: [
    {
      name: 'bound slice isNode and nested decode sum',
      src: CORE + '\n4096wire<expr> ast =: .factLang:packAst("4+5", <expr>, "expression")\n16wire result = .factInterp:eval(ast, <expr>)',
      wires: { result: '0000000000001001' },
    },
    {
      name: 'CallNumber fieldRef ref/u8',
      src: SCHEMAS + PARSER + `
inline [interp] .factInterp {
    CallNumber(value/u8) {
        ref = node:0;
        return ref/u8;
    }
}
` + '\n4096wire<expr> ast =: .factLang:packAst("6", <expr>, "expression")\n16wire result = .factInterp:eval(ast, <expr>)',
      wires: { result: '0000000000000110' },
    },
    {
      name: 'fieldCount and nodeName on CallAdd',
      src: SCHEMAS + PARSER + `
inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) {
        r = fieldCount(node) * 10;
        if (nodeName(node:0) == "left") { r = r + 1; }
        return r;
    }
}
` + '\n4096wire<expr> ast =: .factLang:packAst("1+2", <expr>, "expression")\n16wire result = .factInterp:eval(ast, <expr>)',
      wires: { result: '0000000000010101' },
    },
    {
      name: 'missing field aborts',
      src: SCHEMAS + PARSER + `
inline [interp] .factInterp {
    CallNumber(value/u8) { return value; }
    CallAdd(left/s16, right/s16) { return node:missing; }
}
` + '\n4096wire<expr> ast =: .factLang:packAst("1+2", <expr>, "expression")\n16wire result = .factInterp:eval(ast, <expr>)',
      expectError: 'no field',
    },
  ],
};
