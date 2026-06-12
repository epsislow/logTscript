(function () {
  'use strict';
  const suite = window.LogTScriptTestSuite;
  if (!suite) return;
  const reg = (id, group, title, run, opts) => suite.registerTest(id, group, title, run, opts);

reg(300, 'doc', 'Tokenizer — doc este KEYWORD', function(h, session) {
  const { tokens } = session.tokenize('doc(OR)');
  h.assert('doc tokenizat ca KEYWORD', tokens[0].type, 'KEYWORD');
  h.assert('doc valoare corecta', tokens[0].value, 'doc');
});

reg(301, 'doc', 'Parser — doc(OR) produce nodul AST corect', function(h, session) {
  const stmts = session.parse('doc(OR)');
  h.assert('1 statement', String(stmts.length), '1');
  h.assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
  h.assert('doc.name este OR', stmts[0].doc, 'OR');
});

reg(302, 'doc', 'Parser — doc(MUX1) accepta token MUX', function(h, session) {
  const stmts = session.parse('doc(MUX1)');
  h.assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
  h.assert('doc.name este MUX1', stmts[0].doc, 'MUX1');
});

reg(303, 'doc', 'Parser — doc(REG) produce nodul AST corect', function(h, session) {
  const stmts = session.parse('doc(REG)');
  h.assert('stmt are camp doc', String(stmts[0].doc !== undefined), 'true');
  h.assert('doc.name este REG', stmts[0].doc, 'REG');
});

reg(304, 'doc', 'BUILTIN_DOC — NOT', function(h, session) {
  const lines = Interpreter.getDocLines('NOT', new Map());
  h.assert('NOT semnatura', lines[0], 'NOT(Xbit) -> Xbit');
});

reg(305, 'doc', 'BUILTIN_DOC — OR are 2 semnaturi', function(h, session) {
  const lines = Interpreter.getDocLines('OR', new Map());
  h.assert('OR 2 semnaturi', String(lines.length), '2');
  h.assert('OR semnatura 1', lines[0], 'OR(Xbit) -> 1bit');
  h.assert('OR semnatura 2', lines[1], 'OR(Xbit, Xbit) -> Xbit');
});

reg(306, 'doc', 'BUILTIN_DOC — EQ are 1 semnatura', function(h, session) {
  const lines = Interpreter.getDocLines('EQ', new Map());
  h.assert('EQ 1 semnatura', String(lines.length), '1');
  h.assert('EQ semnatura', lines[0], 'EQ(Xbit, Xbit) -> 1bit');
});

reg(307, 'doc', 'BUILTIN_DOC — MUX', function(h, session) {
  const lines = Interpreter.getDocLines('MUX', new Map());
  h.assert('MUX semnatura', lines[0], 'MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit');
});

reg(308, 'doc', 'BUILTIN_DOC — DEMUX', function(h, session) {
  const lines = Interpreter.getDocLines('DEMUX', new Map());
  h.assert('DEMUX semnatura', lines[0], 'DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..');
});

reg(309, 'doc', 'BUILTIN_DOC — REG', function(h, session) {
  const lines = Interpreter.getDocLines('REG', new Map());
  h.assert('REG semnatura', lines[0], 'REG(Xbit data, 1bit clock, 1bit clear) -> Xbit');
});

reg(310, 'doc', 'BUILTIN_DOC — MUX/DEMUX/REGn vechi nedefinite', function(h, session) {
  const linesMUX1 = Interpreter.getDocLines('MUX1', new Map());
  h.assert('MUX1 nedefinit', linesMUX1[0], 'MUX1: funcție nedefinită');
  const linesDEMUX1 = Interpreter.getDocLines('DEMUX1', new Map());
  h.assert('DEMUX1 nedefinit', linesDEMUX1[0], 'DEMUX1: funcție nedefinită');
  const linesREG8 = Interpreter.getDocLines('REG8', new Map());
  h.assert('REG8 nedefinit', linesREG8[0], 'REG8: funcție nedefinită');
});

reg(311, 'doc', 'BUILTIN_DOC — REG are un singur rand', function(h, session) {
  const lines = Interpreter.getDocLines('REG', new Map());
  h.assert('REG 1 rand', String(lines.length), '1');
});

reg(312, 'doc', 'BUILTIN_DOC — LSHIFT are 2 semnaturi', function(h, session) {
  const lines = Interpreter.getDocLines('LSHIFT', new Map());
  h.assert('LSHIFT 2 semnaturi', String(lines.length), '2');
  h.assert('LSHIFT semnatura 1', lines[0], 'LSHIFT(Xbit data, Nbit n) -> Xbit');
  h.assert('LSHIFT semnatura 2', lines[1], 'LSHIFT(Xbit data, Nbit n, 1bit fill) -> Xbit');
});

reg(313, 'doc', 'BUILTIN_DOC — RSHIFT are 2 semnaturi', function(h, session) {
  const lines = Interpreter.getDocLines('RSHIFT', new Map());
  h.assert('RSHIFT 2 semnaturi', String(lines.length), '2');
});

reg(314, 'doc', 'BUILTIN_DOC — LATCH', function(h, session) {
  const lines = Interpreter.getDocLines('LATCH', new Map());
  h.assert('LATCH semnatura', lines[0], 'LATCH(Xbit data, 1bit clock) -> Xbit');
});

reg(315, 'doc', 'getDocLines — REG generic', function(h, session) {
  const lines = Interpreter.getDocLines('REG', null, new Map());
  h.assert('REG semnatura din BUILTIN_DOC', lines[0], 'REG(Xbit data, 1bit clock, 1bit clear) -> Xbit');
});

reg(316, 'doc', 'getDocLines — REG unic rand', function(h, session) {
  const lines = Interpreter.getDocLines('REG', null, new Map());
  h.assert('REG are exact 1 rand', String(lines.length), '1');
});

reg(317, 'doc', 'getDocLines — functie user-defined fara return', function(h, session) {
  const funcs = new Map();
  funcs.set('myGate', {
    params: [{ type: '8bit', id: 'a' }, { type: '1bit', id: 'b' }],
    returns: []
  });
  const lines = Interpreter.getDocLines('myGate', null, funcs);
  h.assert('myGate semnatura', lines[0], 'myGate(8bit a, 1bit b)');
});

reg(318, 'doc', 'getDocLines — functie user-defined cu return', function(h, session) {
  const funcs = new Map();
  funcs.set('split', {
    params: [{ type: '8bit', id: 'x' }],
    returns: [{ type: '4bit' }, { type: '4bit' }]
  });
  const lines = Interpreter.getDocLines('split', null, funcs);
  h.assert('split semnatura cu return', lines[0], 'split(8bit x) -> 4bit, 4bit');
});

reg(319, 'doc', 'getDocLines — functie necunoscuta', function(h, session) {
  const lines = Interpreter.getDocLines('Foo', new Map());
  h.assert('Foo necunoscuta', lines[0], 'Foo: funcție nedefinită');
});

reg(320, 'doc', 'Interpreter end-to-end — doc(OR) in out', function(h, session) {
  const out = session.runDoc('doc(OR)');
  h.assert('OR linia 1', out[0], 'OR(Xbit) -> 1bit');
  h.assert('OR linia 2', out[1], 'OR(Xbit, Xbit) -> Xbit');
});

reg(321, 'doc', 'Interpreter end-to-end — doc(NOT)', function(h, session) {
  const out = session.runDoc('doc(NOT)');
  h.assert('NOT linia 1', out[0], 'NOT(Xbit) -> Xbit');
  h.assert('NOT o singura linie', String(out.length), '1');
});

reg(322, 'doc', 'Interpreter end-to-end — doc(MUX)', function(h, session) {
  const out = session.runDoc('doc(MUX)');
  h.assert('MUX semnatura completa', out[0], 'MUX(Nbit sel, Xbit data0, Xbit data1, ..) -> Xbit');
});

reg(323, 'doc', 'Interpreter end-to-end — doc(REG)', function(h, session) {
  const out = session.runDoc('doc(REG)');
  h.assert('REG semnatura', out[0], 'REG(Xbit data, 1bit clock, 1bit clear) -> Xbit');
});

reg(324, 'doc', 'Interpreter end-to-end — doc(DEMUX)', function(h, session) {
  const out = session.runDoc('doc(DEMUX)');
  h.assert('DEMUX semnatura', out[0], 'DEMUX(Nbit sel, Xbit data) -> Xbit, Xbit, ..');
});

reg(325, 'doc', 'Interpreter end-to-end — doc(myFunc) user-defined', function(h, session) {
  const src = `def myFunc(8bit a, 1bit b):
  :1bit OR(a, b)
doc(myFunc)`;
  const out = session.runDoc(src);
  h.assert('myFunc semnatura cu return', out[0], 'myFunc(8bit a, 1bit b) -> 1bit');
});

reg(326, 'doc', 'Interpreter end-to-end — doc(Unknown)', function(h, session) {
  const out = session.runDoc('doc(Unknown)');
  h.assert('Unknown nedefinita', out[0], 'Unknown: funcție nedefinită');
});

reg(327, 'doc', 'Toate portile AND NAND NOR NXOR XOR', function(h, session) {
  for (const gate of ['AND', 'NAND', 'NOR', 'NXOR', 'XOR']) {
    const lines = Interpreter.getDocLines(gate, new Map());
    h.assert(gate + ' are 2 semnaturi', String(lines.length), '2');
    h.assert(gate + ' semnatura 1 bit', lines[0], gate + '(Xbit) -> 1bit');
    h.assert(gate + ' semnatura 2 biti', lines[1], gate + '(Xbit, Xbit) -> Xbit');
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
    h.assert(fn + ' recognized (not undefined)', String(lines[0].includes('funcție nedefinită')), 'false');
  }
});

reg(400, 'doc-comp', 'Parser — doc(comp) produce nodul AST corect', function(h, session) {
  const stmts = session.parse('doc(comp)');
  h.assert('doc camp este comp', stmts[0].doc, 'comp');
});

reg(401, 'doc-comp', 'Parser — doc(comp.adder) produce nodul AST corect', function(h, session) {
  const stmts = session.parse('doc(comp.adder)');
  h.assert('doc camp este comp.adder', stmts[0].doc, 'comp.adder');
});

reg(402, 'doc-comp', 'Parser — doc(pcb.bcd) produce nodul AST corect', function(h, session) {
  const stmts = session.parse('doc(pcb.bcd)');
  h.assert('doc camp este pcb.bcd', stmts[0].doc, 'pcb.bcd');
});

reg(403, 'doc-comp', 'doc(comp) contine comp.adder', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const hasAdder = out.some(l => l.includes('comp.adder'));
  h.assert('doc(comp) contine comp.adder', String(hasAdder), 'true');
});

reg(404, 'doc-comp', 'doc(comp) contine shortname comp.+', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const hasPlus = out.some(l => l.includes('comp.+'));
  h.assert('doc(comp) contine comp.+', String(hasPlus), 'true');
});

reg(405, 'doc-comp', 'doc(comp) contine comp.7seg', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const has7seg = out.some(l => l.includes('comp.7seg'));
  h.assert('doc(comp) contine comp.7seg', String(has7seg), 'true');
});

reg(406, 'doc-comp', 'doc(comp) shortname comp.7 pe aceeasi linie cu comp.7seg', function(h, session) {
  const out = session.runDoc('doc(comp)');
  const line7seg = out.find(l => l.includes('comp.7seg'));
  h.assert('linia cu 7seg contine si comp.7', String(line7seg && line7seg.includes('comp.7')), 'true');
});

reg(407, 'doc-comp', 'doc(comp.adder) prima linie', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('prima linie adder', out[0], 'comp [adder] .name:');
});

reg(408, 'doc-comp', 'doc(comp.adder) contine depth: integer', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contine depth', String(out.some(l => l.includes('depth: integer'))), 'true');
});

reg(409, 'doc-comp', 'doc(comp.adder) contine = Xbit', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contine = Xbit', String(out.some(l => l.trim() === '= Xbit')), 'true');
});

reg(410, 'doc-comp', 'doc(comp.adder) contine Xpin a', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contine Xpin a', String(out.some(l => l.includes('Xpin a'))), 'true');
});

reg(411, 'doc-comp', 'doc(comp.adder) contine Xpout get', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contine Xpout get', String(out.some(l => l.includes('Xpout get'))), 'true');
});

reg(412, 'doc-comp', 'doc(comp.adder) contine -> Xbit', function(h, session) {
  const out = session.runDoc('doc(comp.adder)');
  h.assert('adder contine -> Xbit', String(out.some(l => l.trim() === '-> Xbit')), 'true');
});

reg(413, 'doc-comp', 'doc(comp.+) same output as doc(comp.adder)', function(h, session) {
  const outAdder = session.runDoc('doc(comp.adder)');
  const outPlus = session.runDoc('doc(comp.+)');
  h.assert('doc(comp.+) prima linie', outPlus[0], 'comp [adder] .name:');
  h.assert('doc(comp.+) lungime egala cu adder', String(outPlus.length), String(outAdder.length));
});

reg(414, 'doc-comp', 'doc(comp.7seg) prima linie', function(h, session) {
  const out = session.runDoc('doc(comp.7seg)');
  h.assert('prima linie 7seg', out[0], 'comp [7seg] .name:');
});

reg(415, 'doc-comp', 'doc(comp.7seg) contine 1pin set', function(h, session) {
  const out = session.runDoc('doc(comp.7seg)');
  h.assert('7seg contine 1pin set', String(out.some(l => l.includes('1pin set'))), 'true');
});

reg(416, 'doc-comp', 'doc(comp.7seg) contine -> 8bit', function(h, session) {
  const out = session.runDoc('doc(comp.7seg)');
  h.assert('7seg contine -> 8bit', String(out.some(l => l.trim() === '-> 8bit')), 'true');
});

reg(417, 'doc-comp', 'doc(comp.7) shortname pentru 7seg', function(h, session) {
  const out = session.runDoc('doc(comp.7)');
  h.assert('doc(comp.7) prima linie', out[0], 'comp [7seg] .name:');
});

reg(418, 'doc-comp', 'doc(comp.mem) contine = Xbit', function(h, session) {
  const out = session.runDoc('doc(comp.mem)');
  h.assert('mem contine = Xbit', String(out.some(l => l.trim().startsWith('= '))), 'true');
});

reg(419, 'doc-comp', 'doc(comp.xyz) tip nedefinit', function(h, session) {
  const out = session.runDoc('doc(comp.xyz)');
  h.assert('comp.xyz nedefinit', out[0], 'comp.xyz: tip de componentă nedefinit');
});

reg(420, 'doc-comp', 'doc(pcb) cu PCB definit contine pcb.bcd', function(h, session) {
  const src = `pcb +[bcd]:
  4pin sum
  1pin set
  4pout corr
  1pout carry
  exec: set
  on: 1
  :1bit set`;
  const out = session.runDoc(src + '\ndoc(pcb)');
  h.assert('doc(pcb) contine pcb.bcd', String(out.some(l => l === 'pcb.bcd')), 'true');
});

reg(421, 'doc-comp', 'doc(pcb.bcd) prima linie', function(h, session) {
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
  h.assert('pcb.bcd prima linie', out[0], 'pcb [bcd] .name:');
});

reg(422, 'doc-comp', 'doc(pcb.bcd) contine 4pin sum', function(h, session) {
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
  h.assert('pcb.bcd contine 4pin sum', String(out.some(l => l.includes('4pin sum'))), 'true');
});

reg(423, 'doc-comp', 'doc(pcb.bcd) contine 1pout carry', function(h, session) {
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
  h.assert('pcb.bcd contine 1pout carry', String(out.some(l => l.includes('1pout carry'))), 'true');
});

reg(424, 'doc-comp', 'doc(pcb.bcd) contine -> 1bit', function(h, session) {
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
  h.assert('pcb.bcd contine -> 1bit', String(out.some(l => l.trim() === '-> 1bit')), 'true');
});

reg(425, 'doc-comp', 'doc(pcb.xyz) tip nedefinit', function(h, session) {
  const out = session.runDoc('doc(pcb.xyz)');
  h.assert('pcb.xyz nedefinit', out[0], 'pcb.xyz: tip PCB nedefinit');
});

reg(426, 'doc-comp', 'doc(comp.osc) nu contine = si returneaza 1bit', function(h, session) {
  const out = session.runDoc('doc(comp.osc)');
  h.assert('osc fara = ', String(out.some(l => l.trim().startsWith('= '))), 'false');
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
  h.assert('formatCompDef linia 0', lines[0], 'comp [testComp] .name:');
  h.assert('formatCompDef attr', lines[1], '  depth: integer');
  h.assert('formatCompDef = Xbit', lines[2], '  = Xbit');
  h.assert('formatCompDef :{', lines[3], '  :{');
  h.assert('formatCompDef 1pin set', lines[4], '    1pin set');
  h.assert('formatCompDef Xpout get', lines[5], '    Xpout get');
  h.assert('formatCompDef }', lines[6], '  }');
  h.assert('formatCompDef -> Xbit', lines[7], '  -> Xbit');
});

reg(500, 'pcb', 'PCB property block on:1 cu set=1 declanseaza executia', function(h, session) {
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

reg(501, 'pcb', 'PCB property block on:1 cu set=0 nu declanseaza executia', function(h, session) {
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
  h.assert('PCB property block on:1 set=0 nu actualizeaza pout', session.getPcbPout(interp, '.q2', 'result'), '0000');
});

reg(502, 'pcb', 'scenario regs PCB cu adr si data', function(h, session) {
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
  h.assert('PCB regs property block returneaza rezultat calculat', session.getPcbPout(interp, '.q', 'result'), '1010');
});

reg(503, 'pcb', 'wire extern "q = .q" reflecta pout dupa property block', function(h, session) {
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
  h.assert('Test 503 pout result dupa block', session.getPcbPout(interp, '.e', 'result'), '0110');
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
  h.assert('Test 504 instance.returnValue setat', inst ? String(inst.returnValue) : 'null', '1010');
  h.assert('Test 504 wire q reflecta wire intern NOT(data)', session.getWire(interp, 'q'), '1010');
});

reg(505, 'pcb', 'alternare A->B->A->B intre doua blocuri PCB cu on:1', function(h, session) {
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
  h.assert('505 A=1 din nou: result=0101', session.getPcbPout(interp, '.p', 'result'), '0101');
  session.setWire(interp, 'bb', '0');
  session.setWire(interp, 'bb', '1');
  h.assert('505 B=1 din nou: result=1010', session.getPcbPout(interp, '.p', 'result'), '1010');
});

reg(506, 'pcb', 'comp interne PCB nu sunt re-create la re-executie', function(h, session) {
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
  h.assert('506 componentPropertyBlocks nu creste la re-executie', String(blocksAfter1), String(blocksAfter2));
  h.assert('506 result corect la a doua executie', session.getPcbPout(interp, '.wc', 'result'), '0101');
});

reg(507, 'pcb', 'storage nu creste la re-executii PCB repetate', function(h, session) {
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
  h.assert('507 storage stabil dupa executia 2', String(storageAfter2), String(storageAfter1));
  h.assert('507 storage stabil dupa executia 3', String(storageAfter3), String(storageAfter1));
  h.assert('507 result corect NOT(0101)=1010', session.getPcbPout(interp, '.s', 'result'), '1010');
});

reg(508, 'pcb', 'storage stabil cu doua blocuri PCB alternante', function(h, session) {
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
  h.assert('508 storage stabil A->B', String(s1), String(s2));
  h.assert('508 storage stabil B->A', String(s2), String(s3));
  h.assert('508 storage stabil A->B din nou', String(s3), String(s4));
});

reg(509, 'pcb', 'blocuri cu set=expr(comp) se executa in ordinea din sursa', function(h, session) {
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
  h.assert('509 doua blocuri inregistrate pentru .q', String(blocksBefore), '2');
  session.setWire(interp, 'trigger', '1');
  h.assert('509 ambele blocuri s-au executat, pout=1111', session.getPcbPout(interp, '.q', 'val'), '1111');
});

reg(510, 'pcb', 'ordinea executiei blocurilor cu trigger component direct', function(h, session) {
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
  h.assert('510 blocul cu blockIndex mare se executa dupa cel cu blockIndex mic', session.getPcbPout(interp, '.t', 'val'), '0000');
});

reg(511, 'pcb', 'mai multe blocuri pe acelasi comp, ordinea = blockIndex', function(h, session) {
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
  h.assert('511 ultimul bloc din sursa castiga (data=1000)', session.getPcbPout(interp, '.o', 'val'), '1000');
});

reg(512, 'pcb', 'bitrange pe literali BIN (\\N) si HEX (^N)', function(h, session) {
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
  h.assert('513 variabila aa;8 = 00000001', session.getWire(interp, 'i'), '00000001');
  ({ interp } = session.run('8wire data = 11001100\n8wire j = data.0-3;8'));
  h.assert('513 data.0-3;8 = 00001100', session.getWire(interp, 'j'), '00001100');
  ({ interp } = session.run('16wire df = \\12;8 + ^2;8'));
  h.assert('513 \\12;8 + ^2;8 = 0000110000000010', session.getWire(interp, 'df'), '0000110000000010');
  ({ interp } = session.run('8wire sn = `\\12;8 & [^ff]`'));
  h.assert('513 short notation \\12;8 & [^ff] = 00001100', session.getWire(interp, 'sn'), '00001100');
});

reg(514, 'pcb', 'padding ;p pe componente si PCB-uri', function(h, session) {
  let interp;
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:1\n:\n8wire x = .m:get;8'));
  h.assert('514 .mem:get;8 = 00000000', session.getWire(interp, 'x'), '00000000');
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:1\n= \\12\n:\n8wire x = .m:get;8'));
  h.assert('514 .mem:get;8 cu initVal=1100 = 00001100', session.getWire(interp, 'x'), '00001100');
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
  h.assert('514 PCB direct;4 nu trunchiaza (11001100)', session.getWire(interp, 'x'), '11001100');
});

reg(515, 'pcb', 'mem comp = variabila si .mem = d', function(h, session) {
  let interp;
  ({ interp } = session.run('comp [mem] .m:\ndepth:4\nlength:4\n= \\12\n:\n8wire x = .m:get;8'));
  h.assert('515 = literal \\12 in declaratie (adresa 0 = 1100, padded 8)', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run('4wire d = 1010\ncomp [mem] .m:\ndepth:4\nlength:4\n= d\n:\n8wire x = .m:get;8'));
  h.assert('515 = variabila d=1010 in declaratie (adresa 0 = 1010, padded 8)', session.getWire(interp, 'x'), '00001010');
  ({ interp } = session.run('comp [mem] .m:\ndepth:8\nlength:4\n= ^ffff\n:\n8wire x = .m:get;8'));
  h.assert('515 = ^ffff in declaratie (adresa 0 = 11111111)', session.getWire(interp, 'x'), '11111111');
  ({ interp } = session.run('16wire d = ^ffff\ncomp [mem] .m:\ndepth:8\nlength:4\n= d\n:\n8wire x = .m:get;8'));
  h.assert('515 = variabila d=^ffff in declaratie (adresa 0 = 11111111)', session.getWire(interp, 'x'), '11111111');
  ({ interp } = session.run('4wire d = 1100\ncomp [mem] .m:\ndepth:8\nlength:4\n= d\n:\n8wire x = .m:get;8'));
  h.assert('515 = variabila mai scurta decat depth, pad (00001100)', session.getWire(interp, 'x'), '00001100');
  ({ interp } = session.run(`
comp [mem] .m:
depth:4
length:4
:

4wire d = 1010
.m = d

8wire x = .m:get;8`));
  h.assert('515 .mem = d dupa declaratie (adresa 0 = 1010, padded 8)', session.getWire(interp, 'x'), '00001010');
  ({ interp } = session.run(`
comp [mem] .m:
depth:8
length:4
:

16wire d = ^f0f0
.m = d

8wire x = .m:get;8`));
  h.assert('515 .mem = d multi-adresa (adresa 0 = 11110000)', session.getWire(interp, 'x'), '11110000');
});

function regPcbWave(id, legacyId, title, run) {
  reg(id, 'pcb', title + ' (wave)', run, { propagation: 'wave' });
}

const _pcbWavePairs = [
  [500, 516], [501, 517], [502, 518], [503, 519], [504, 520], [505, 521],
  [506, 522], [507, 523], [508, 524], [509, 525], [510, 526], [511, 527],
  [512, 528], [513, 529], [514, 530], [515, 531]
];
for (const [legacyId, waveId] of _pcbWavePairs) {
  const t = suite.getTest(legacyId);
  if (t) regPcbWave(waveId, legacyId, t.title, t.run);
}

reg(600, 'signal', 'wire simplu — propagare cascadat prin assignment', function(h, session) {
  const { interp } = session.run(`
1wire a = 0
1wire b = NOT(a)
1wire c = NOT(b)`);
  session.setWire(interp, 'a', '1');
  h.assert('600 b=NOT(a) dupa a=1', session.getWire(interp, 'b'), '0');
  h.assert('600 c=NOT(b) cascadat dupa a=1', session.getWire(interp, 'c'), '1');
}, { propagation: 'wave' });

reg(601, 'signal', 'cascada de 3 niveluri a->b->c->d', function(h, session) {
  const { interp } = session.run(`
1wire a = 0
1wire b = a
1wire c = b
1wire d = c`);
  session.setWire(interp, 'a', '1');
  h.assert('601 b=a dupa a=1', session.getWire(interp, 'b'), '1');
  h.assert('601 c=b cascadat', session.getWire(interp, 'c'), '1');
  h.assert('601 d=c cascadat', session.getWire(interp, 'd'), '1');
}, { propagation: 'wave' });

reg(602, 'signal', 'MUX toggle — tg0 se toggleaza cand p trece 1->0', function(h, session) {
  const { interp } = session.run(`
1wire p := 0
1wire tg0 := 0

tg0 = MUX(p, tg0, NOT(tg0))`);
  h.assert('602 tg0 initial = 0', session.getWire(interp, 'tg0'), '0');
  session.setWire(interp, 'p', '1');
  h.assert('602 tg0 dupa p=1 (toggle → 1)', session.getWire(interp, 'tg0'), '1');
  session.setWire(interp, 'p', '0');
  h.assert('602 tg0 dupa p=0 (hold la 1)', session.getWire(interp, 'tg0'), '1');
  session.setWire(interp, 'p', '1');
  h.assert('602 tg0 dupa p=1 din nou (toggle → 0)', session.getWire(interp, 'tg0'), '0');
  session.setWire(interp, 'p', '0');
  h.assert('602 tg0 dupa p=0 din nou (hold la 0)', session.getWire(interp, 'tg0'), '0');
}, { propagation: 'wave' });

reg(603, 'signal', 'counter binar tg0/tg1/tg2 cascadat', function(h, session) {
  const { interp } = session.run(`
1wire p := 0
1wire tg0 := 0
1wire tg1 := 0
1wire tg2 := 0

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

reg(604, 'signal', 'propagare se opreste daca valoarea nu s-a schimbat', function(h, session) {
  const { interp } = session.run(`
1wire a = 0
1wire b = NOT(a)`);
  const bBefore = session.getWire(interp, 'b');
  session.setWire(interp, 'a', '0');
  h.assert('604 b ramane acelasi cand a nu se schimba', session.getWire(interp, 'b'), bBefore);
}, { propagation: 'wave' });

reg(605, 'signal', 'auto-referinta a = NOT(a) — executata o singura data per cascada', function(h, session) {
  const { interp } = session.run(`
1wire a := 0
a = NOT(a)`);
  session.setWire(interp, 'a', '0');
  h.assert('605 a = NOT(0) = 1 dupa o singura evaluare', session.getWire(interp, 'a'), '1');
}, { propagation: 'wave' });

reg(606, 'signal', 'wire multi-decl — propagare individuala per wire', function(h, session) {
  const { interp } = session.run(`
2wire src = 00
1wire x = src.1/1
1wire y = src.0/1
1wire cx = NOT(x)
1wire cy = NOT(y)`);
  session.setWire(interp, 'src', '10');
  h.assert('606 x=src.1/1=0 dupa src=10', session.getWire(interp, 'x'), '0');
  h.assert('606 y=src.0/1=1 dupa src=10', session.getWire(interp, 'y'), '1');
  h.assert('606 cx=NOT(x)=1 cascadat', session.getWire(interp, 'cx'), '1');
  h.assert('606 cy=NOT(y)=0 cascadat', session.getWire(interp, 'cy'), '0');
}, { propagation: 'wave' });

reg(607, 'signal', 'paralelism ramuri — ordinea sursei nu conteaza', function(h, session) {
  const { interp } = session.run(`
1wire A := 1
1wire B := 0
1wire X = NOT(A)
1wire Y = AND(X, A)
1wire Z = NOT(B)
1wire T = AND(Z, B)`);
  h.assert('607 X=NOT(A)=0', session.getWire(interp, 'X'), '0');
  h.assert('607 Y=AND(X,A)=0', session.getWire(interp, 'Y'), '0');
  h.assert('607 Z=NOT(B)=1', session.getWire(interp, 'Z'), '1');
  h.assert('607 T=AND(Z,B)=0', session.getWire(interp, 'T'), '0');
}, { propagation: 'wave' });

reg(608, 'signal', 'switch → wire → cascadat NOT (wave)', function(h, session) {
  const { interp } = session.run(`
comp [switch] .sw::

1wire a = .sw:get
1wire b = NOT(a)`);
  h.assert('608 initial b=NOT(0)=1', session.getWire(interp, 'b'), '1');
  session.setComp(interp, '.sw', '1');
  h.assert('608 a=1 dupa switch', session.getWire(interp, 'a'), '1');
  h.assert('608 b=0 dupa switch', session.getWire(interp, 'b'), '0');
}, { propagation: 'wave' });

reg(609, 'signal', 'key press → wire (wave)', function(h, session) {
  const { interp } = session.run(`
comp [key] .k::

1wire a = .k:get`);
  h.assert('609 initial a=0', session.getWire(interp, 'a'), '0');
  session.setComp(interp, '.k', '1');
  h.assert('609 a=1 dupa key press', session.getWire(interp, 'a'), '1');
  session.setComp(interp, '.k', '0');
  h.assert('609 a=0 dupa key release', session.getWire(interp, 'a'), '0');
}, { propagation: 'wave' });

reg(610, 'signal', 'dip → wire multi-bit (wave)', function(h, session) {
  const { interp } = session.run(`
comp [dip] .d:
  length: 4
  :

4wire a = .d:get`);
  h.assert('610 initial a=0000', session.getWire(interp, 'a'), '0000');
  session.setComp(interp, '.d', '1010');
  h.assert('610 a=1010 dupa dip', session.getWire(interp, 'a'), '1010');
}, { propagation: 'wave' });

reg(611, 'signal', 'osc output → wire (wave, manual tick)', function(h, session) {
  const { interp } = session.run(`
comp [osc] .o .freq=10 .duration1=1 .duration0=1::

1wire a = .o:get`);
  h.assert('611 initial a=0', session.getWire(interp, 'a'), '0');
  session.setComp(interp, '.o', '1');
  h.assert('611 a=1 dupa osc high', session.getWire(interp, 'a'), '1');
  session.setComp(interp, '.o', '0');
  h.assert('611 a=0 dupa osc low', session.getWire(interp, 'a'), '0');
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

reg(700, 'reg', 'REG cu wire clock — falling edge', function(h, session) {
  runReg700FallingEdge(h, session, '700');
});

function runReg701NextBased(h, session) {
  const { interp } = session.run(`
1wire data = 1
1wire read = REG(data, ~, 0)`);
  h.assert('701 initial read=0', session.getWire(interp, 'read'), '0');
  session.execNext(interp, 1);
  h.assert('701 dupa NEXT(1) read=1 (latchat data=1)', session.getWire(interp, 'read'), '1');
  session.setWire(interp, 'data', '0');
  h.assert('701 data=0 fara NEXT → read=1 (hold)', session.getWire(interp, 'read'), '1');
  session.execNext(interp, 1);
  h.assert('701 dupa NEXT(2) read=0 (latchat data=0)', session.getWire(interp, 'read'), '0');
}

reg(701, 'reg', 'REG cu clock ~ — NEXT-based', runReg701NextBased);

reg(704, 'reg', 'REG cu clock ~ — NEXT-based (wave)', runReg701NextBased, { propagation: 'wave' });

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

reg(705, 'reg', 'REG falling edge — cascadă downstream (wave)', function(h, session) {
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
  h.assert('705 inv=1 inainte de falling edge', session.getWire(interp, 'inv'), '1');
  session.setWire(interp, 'clk', '0');
  h.assert('705 falling edge → read=1', session.getWire(interp, 'read'), '1');
  h.assert('705 inv=0 dupa propagate', session.getWire(interp, 'inv'), '0');
  session.setWire(interp, 'data', '0');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert('705 falling edge data=0 → read=0', session.getWire(interp, 'read'), '0');
  h.assert('705 inv=1 dupa al doilea falling edge', session.getWire(interp, 'inv'), '1');
}, { propagation: 'wave' });

reg(706, 'reg', 'REG clear — cascadă multi-bit falling edge (wave)', function(h, session) {
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
  h.assert('706 bus=0000 dupa clear propagate', session.getWire(interp, 'bus'), '0000');
  session.setWire(interp, 'clr', '0');
  session.setWire(interp, 'clk', '1');
  session.setWire(interp, 'clk', '0');
  h.assert('706 falling edge dupa clear → read=1010', session.getWire(interp, 'read'), '1010');
  h.assert('706 bus=1010 dupa re-latch', session.getWire(interp, 'bus'), '1010');
}, { propagation: 'wave' });

reg(707, 'reg', 'REG falling edge — data ignorat pana la clk 1→0 (wave)', function(h, session) {
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

reg(428, 'doc-comp', 'doc(chip) cu chip definit contine chip.halfAdd', function(h, session) {
  const out = session.runDoc(CHIP_HALFADD + '\ndoc(chip)');
  h.assert('doc(chip) contine chip.halfAdd', String(out.some(l => l === 'chip.halfAdd')), 'true');
});

reg(429, 'doc-comp', 'doc(chip.halfAdd) prima linie', function(h, session) {
  const out = session.runDoc(CHIP_HALFADD + '\ndoc(chip.halfAdd)');
  h.assert('chip.halfAdd prima linie', out[0], 'chip [halfAdd] .name:');
});

reg(430, 'doc-comp', 'doc(chip.halfAdd) contine 4pin a', function(h, session) {
  const out = session.runDoc(CHIP_HALFADD + '\ndoc(chip.halfAdd)');
  h.assert('chip.halfAdd contine 4pin a', String(out.some(l => l.includes('4pin a'))), 'true');
});

reg(431, 'doc-comp', 'doc(chip.xyz) tip nedefinit', function(h, session) {
  const out = session.runDoc('doc(chip.xyz)');
  h.assert('chip.xyz nedefinit', out[0], 'chip.xyz: tip chip nedefinit');
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

reg(540, 'chip', 'chip instanțiere și acces pout', runChipInstTest);

reg(541, 'chip', 'chip +[inner] în body — eroare parse', function(h, session) {
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
  h.assert('eroare chip nested def', String(err.includes('cannot define new chip')), 'true');
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
  h.assert('eroare switch in chip', String(err.includes('switch')), 'true');
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
regChipWave(556, 'chip instanțiere și acces pout', runChipInstTest);
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
1wire a := 0
a = AND(b, 1)
probe(a)`);
  h.assert('probe initialised', String(out.some(l => l.includes('# a = 0') && l.includes('initialised'))), 'true');
  session.setWire(interp, 'b', '1');
  h.assert('probe changed', String(out.some(l => l.includes('# a = 1') && l.includes('changed'))), 'true');
}

reg(800, 'probe', 'probe wire initialised și changed', runProbeBasic);
reg(801, 'probe', 'probe wire initialised și changed (wave)', runProbeBasic, { propagation: 'wave' });

reg(802, 'probe', 'Parser — probe este KEYWORD', function(h, session) {
  const { tokens } = session.tokenize('probe(a)');
  h.assert('probe tokenizat', tokens[0].value, 'probe');
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

reg(804, 'debug', 'show combinational fără NEXT (legacy)', runShowSimple);
reg(805, 'debug', 'show combinational fără NEXT (wave)', runShowSimple, { propagation: 'wave' });

const MID_CHANGE = `1wire a := 0
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
  h.assert('3 linii show/peek', String(lines.length === 3), 'true');
  h.assert('show initial b=1', String(/b \(1wire\) = 1/.test(lines[0])), 'true');
  h.assert('peek după a=1 b=0', String(/b \(1wire\) = 0/.test(lines[1])), 'true');
  h.assert('show final b=0', String(/b \(1wire\) = 0/.test(lines[2])), 'true');
  h.assert('wire b=0', session.getWire(interp, 'b'), '0');
}

function runMidChangeWave(h, session) {
  const { out, interp } = session.run(MID_CHANGE);
  const lines = debugOutLines(out);
  h.assert('3 linii show/peek', String(lines.length === 3), 'true');
  h.assert('peek după a=1 b=1 (înainte de settle)', String(/b \(1wire\) = 1/.test(lines[1])), 'true');
  h.assert('toate liniile b=1 pe wave', String(lines.every(l => /b \(1wire\) = 1/.test(l))), 'true');
  h.assert('wire b=1 la final RUN wave', session.getWire(interp, 'b'), '1');
}

reg(806, 'debug', 'show/peek la schimbare wire — legacy cascade', runMidChangeLegacy);
reg(807, 'debug', 'show/peek la schimbare wire — wave amână show', runMidChangeWave, { propagation: 'wave' });

const REG_SHOW_ONLY = `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)`;

function runRegShowOnly(h, session) {
  const { out, interp } = session.run(REG_SHOW_ONLY);
  h.assert('show q=0 fără NEXT', String(out.some(l => l.includes('q') && l.includes('= 0'))), 'true');
  h.assert('q=0', session.getWire(interp, 'q'), '0');
}

reg(808, 'debug', 'show REG(~) fără NEXT în script — legacy', runRegShowOnly);
reg(809, 'debug', 'show REG(~) fără NEXT în script — wave', runRegShowOnly, { propagation: 'wave' });

const REG_WITH_NEXT = `1wire data = 1
1wire q = REG(data, ~, 0)
show(q)
NEXT(~)
show(q)`;

function runRegNextLegacy(h, session) {
  const lines = debugOutLines(session.run(REG_WITH_NEXT).out);
  h.assert('2 show', String(lines.length === 2), 'true');
  h.assert('primul q=0', String(/q \(1wire\) = 0/.test(lines[0])), 'true');
  h.assert('după NEXT q=1', String(/q \(1wire\) = 1/.test(lines[1])), 'true');
}

function runRegNextWave(h, session) {
  const { out, interp } = session.run(REG_WITH_NEXT);
  const lines = debugOutLines(out);
  h.assert('2 show amânate', String(lines.length === 2), 'true');
  h.assert('ambele q=1 după flush', String(lines.every(l => /q \(1wire\) = 1/.test(l))), 'true');
  h.assert('q=1', session.getWire(interp, 'q'), '1');
}

reg(810, 'debug', 'show înainte/după NEXT(~) în script — legacy', runRegNextLegacy);
reg(811, 'debug', 'show înainte/după NEXT(~) în script — wave', runRegNextWave, { propagation: 'wave' });

const MULTI_SHOW = `1wire a := 0
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
  h.assert('ambele b=1 pe wave', String(lines.every(l => /b \(1wire\) = 1/.test(l))), 'true');
}

reg(812, 'debug', 'două show(b) după schimbare a — legacy', runMultiShowLegacy);
reg(813, 'debug', 'două show(b) după schimbare a — wave', runMultiShowWave, { propagation: 'wave' });

const PROBE_AND_SETTLE = `1wire a := 0
1wire b := 1
a = AND(b, 1)
probe(a)`;

function runProbeInitThenChangedLegacy(h, session) {
  const { out } = session.run(PROBE_AND_SETTLE);
  h.assert('legacy o singură linie', String(out.filter(l => l.startsWith('# a =')).length === 1), 'true');
  h.assert('legacy a=1 initialised', String(out.some(l => l.includes('# a = 1') && l.includes('initialised'))), 'true');
}

function runProbeInitThenChangedWave(h, session) {
  const { out } = session.run(PROBE_AND_SETTLE);
  h.assert('wave a=0 initialised', String(out.some(l => l.includes('# a = 0') && l.includes('initialised'))), 'true');
  h.assert('wave a=1 changed', String(out.some(l => l.includes('# a = 1') && l.includes('changed'))), 'true');
  h.assert('wave fără al doilea initialised', String(!out.some(l => l.includes('# a = 1') && l.includes('initialised'))), 'true');
}

reg(814, 'debug', 'probe settle RUN — legacy o linie', runProbeInitThenChangedLegacy);
reg(815, 'debug', 'probe settle RUN — wave initialised apoi changed', runProbeInitThenChangedWave, { propagation: 'wave' });

const PROBE_REG_EDGE = `1wire data := 0
1wire clk := 0
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

const PROBE_KEY_REG = `1wire data := 1
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
  h.assert('press — q încă 0', String(session.getWire(interp, 'q')), '0');
  session.setComp(interp, '.clk', '0');
  h.assert('release — q=1', String(session.getWire(interp, 'q')), '1');
  h.assert('probe q=1 edge committed', String(out.some(l => l.includes('# q = 1') && l.includes('edge committed'))), 'true');
}

reg(818, 'debug', 'probe key + REG — edge committed la release', runProbeKeyReg);
reg(819, 'debug', 'probe key + REG — edge committed la release (wave)', runProbeKeyReg, { propagation: 'wave' });

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

reg(821, 'probe', 'probe(.sw) — initialised și changed', runProbeComponentSwitch);
reg(822, 'probe', 'probe(.sw) — initialised și changed (wave)', runProbeComponentSwitch, { propagation: 'wave' });

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

reg(825, 'probe', 'probe(.div:mod) — initialised la RUN fără pulse', function(h, session) {
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

reg(827, 'probe', 'probe(.u1:sum) chip pout — initialised și changed', runProbeChipPout);
reg(828, 'probe', 'probe(.u1:sum) chip pout — initialised și changed (wave)', runProbeChipPout, { propagation: 'wave' });

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

reg(829, 'probe', 'probe(.q:result) PCB pout — initialised și changed', runProbePcbPout);
reg(830, 'probe', 'probe(.q:result) PCB pout — initialised și changed (wave)', runProbePcbPout, { propagation: 'wave' });

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

reg(836, 'probe', 'probe(.div:mod) — initialised și changed', runProbeDivMod);
reg(837, 'probe', 'probe(.div:mod) — initialised și changed (wave)', runProbeDivMod, { propagation: 'wave' });

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

reg(838, 'probe', 'probe(.add:carry) — carry la overflow', function(h, session) {
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
  h.assert('dot sum fără linie', String(!out.some(l => l.includes('# .u1.sum'))), 'true');
}

reg(839, 'probe', 'probe(.u1:sum) vs probe(.u1.sum) — dot nu urmărește pout', runProbePoutVsInternalDot);

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

reg(840, 'board', 'board instanțiere și acces pout', runBoardInstTest);

reg(841, 'board', 'board +[inner] în body — eroare parse', function(h, session) {
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
  h.assert('eroare board nested def', String(err.includes('cannot define new board')), 'true');
});

reg(842, 'board', 'def în body board — eroare parse', function(h, session) {
  let err = '';
  try {
    session.parse(`board +[bad]:
  def foo(1bit x):
    :1bit x
  :1bit x`);
  } catch (e) {
    err = String(e.message || e);
  }
  h.assert('eroare def in board', String(err.includes("'def'")), 'true');
});

reg(843, 'board', 'pcb instanță în body board — eroare parse', function(h, session) {
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
  h.assert('eroare pcb in board', String(err.includes('PCB')), 'true');
});

reg(844, 'board', 'comp switch permis în body board', function(h, session) {
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
regBoardWave(846, 'board instanțiere și acces pout', runBoardInstTest);
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

reg(848, 'doc-comp', 'doc(board) cu board definit contine board.halfAdd', function(h, session) {
  const out = session.runDoc(BOARD_HALFADD + '\ndoc(board)');
  h.assert('doc(board) contine board.halfAdd', String(out.some(l => l === 'board.halfAdd')), 'true');
});

reg(849, 'doc-comp', 'doc(board.halfAdd) prima linie', function(h, session) {
  const out = session.runDoc(BOARD_HALFADD + '\ndoc(board.halfAdd)');
  h.assert('board.halfAdd prima linie', out[0], 'board [halfAdd] .name:');
});

reg(850, 'doc-comp', 'doc(board.xyz) tip nedefinit', function(h, session) {
  const out = session.runDoc('doc(board.xyz)');
  h.assert('board.xyz nedefinit', out[0], 'board.xyz: tip board nedefinit');
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

reg(855, 'board', 'nested chip în board', function(h, session) {
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

reg(856, 'board', 'nested board în board', function(h, session) {
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

reg(857, 'chip', 'board +[inner] în body chip — eroare parse', function(h, session) {
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
  h.assert('eroare board def in chip', String(err.includes('cannot define new board')), 'true');
});

reg(858, 'chip', 'board instanță în body chip — permis', function(h, session) {
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
  .prog:{ at = pcval
    set = set }
  instr = .prog:get
  opc = instr.0/4
  opd = instr.4/4
  curacc = .accum:get
  .data:at = opd
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
  .data:at = opd
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

reg(861, 'board', 'cpu4 stare inițială acc=0 pc=0', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + '\nboard [cpu4] .cpu::\n');
  h.assert('cpu acc init', session.getPcbPout(interp, '.cpu', 'acc'), '0000');
  h.assert('cpu pc init', session.getPcbPout(interp, '.cpu', 'pc'), '0000');
});

reg(862, 'board', 'cpu4 un pas LOAD 0 → acc=7 pc=1', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + '\nboard [cpu4] .cpu::\n');
  cpuStep(session, interp, 1);
  h.assert('cpu acc după LOAD', session.getPcbPout(interp, '.cpu', 'acc'), '0111');
  h.assert('cpu pc după LOAD', session.getPcbPout(interp, '.cpu', 'pc'), '0001');
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
  h.assert('cpu acc după step', session.getPcbPout(interp, '.cpu', 'acc'), '0111');
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
  h.assert('cpu acc după 4 pulse', session.getPcbPout(interp, '.cpu', 'acc'), '1000');
  h.assert('cpu pc după 4 pulse', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
});

reg(866, 'board', 'cpu4 NEXT(~) step', function(h, session) {
  const { interp } = session.run(CHIP_ALU4 + '\n' + BOARD_CPU4 + `
board [cpu4] .cpu::
.cpu:{ set = ~ }
`);
  for (let i = 0; i < 4; i++) session.execNext(interp, 1);
  h.assert('cpu acc după 4 NEXT', session.getPcbPout(interp, '.cpu', 'acc'), '1000');
  h.assert('cpu pc după 4 NEXT', session.getPcbPout(interp, '.cpu', 'pc'), '0100');
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

reg(869, 'lut', 'LUT adresă binară 010 → slot 2', function(h, session) {
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

reg(870, 'lut', 'LUT adresă zecimală \\\\50', function(h, session) {
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
  h.assert('method B slot 0 după schimbare addr', got, '0001');
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

reg(876, 'lut', 'probe(.lut:get) — initialised și changed', runProbeLut);
reg(877, 'lut', 'probe(.lut:get) — wave', runProbeLut, { propagation: 'wave' });

reg(878, 'lut', 'doc(comp.lut) — sintaxă tip', function(h, session) {
  const out = session.runDoc('doc(comp.lut)');
  h.assert('data block', String(out.some(l => l.includes('data {'))), 'true');
  h.assert('fillwith attr', String(out.some(l => l.includes('fillwith'))), 'true');
  h.assert('Xpout get', String(out.some(l => l.includes('Xpout get'))), 'true');
});

reg(879, 'lut', 'doc(.decoder) — instanță map + fill', function(h, session) {
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

reg(880, 'lut', 'LUT eroare — adresă >= length', function(h, session) {
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

reg(881, 'lut', 'LUT eroare — valoare prea lată', function(h, session) {
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

reg(882, 'lut', 'LUT eroare — fillwith prea lat', function(h, session) {
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

reg(885, 'asm', 'NOP singur → biți așteptați', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { NOP }');
  h.assert('NOP 8b', session.getWire(interp, 'x'), '00000000');
});

reg(886, 'asm', 'LOAD R1 A3 fără virgulă', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { LOAD R1 A3 }');
  h.assert('LOAD enc', session.getWire(interp, 'x'), '00010111');
});

reg(887, 'asm', 'program multi-line în { }', function(h, session) {
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
40wire x = .myisa {
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
  h.assert('5 instr', String(session.getWire(interp, 'x').length), '40');
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

reg(893, 'asm', 'literal \\\\-3 în S4b', function(h, session) {
  const { interp } = session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { BEQ \\-3 }');
  h.assert('literal -3', session.getWire(interp, 'x'), '01001101');
});

reg(894, 'asm', 'offset -21 pe S4b → eroare bounds', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { BEQ \\-21 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('bounds', String(err.includes('out of bounds')), 'true');
});

reg(895, 'asm', 'prefix greșit ADD \\\\2 R1', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { ADD \\2 R1 \\5 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('Register prefix', String(err.includes('Register prefix')), 'true');
});

reg(896, 'asm', 'overflow \\\\18 pe 4b', function(h, session) {
  let err = '';
  try {
    session.run(INLINE_ASM_ISA + '\n8wire x = .myisa { MOVI \\18 }');
  } catch (e) { err = String(e.message || e); }
  h.assert('max 15', String(err.includes('max 15')), 'true');
});

reg(897, 'asm', 'label nedefinit JMP nowhere', function(h, session) {
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
  h.assert('mismatch', String(err.includes('Bit-width mismatch')), 'true');
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

reg(904, 'asm', 'doc(inline) listează instanțe', function(h, session) {
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

reg(907, 'asm', 'myisa { } fără punct + show', function(h, session) {
  const { out, interp } = session.run(INLINE_ASM_ISA + `
show(myisa { NOP })`);
  h.assert('show output', String(out.some(l => l.includes('00000000'))), 'true');
  h.assert('bare brace wire', String(true), 'true');
  const { interp: i2 } = session.run(INLINE_ASM_ISA + '\n8wire x = myisa { LOAD R1 A3 }');
  h.assert('bare name LOAD', session.getWire(i2, 'x'), '00010111');
});

  suite.finalize();
})();
