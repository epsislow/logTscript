'use strict';

/** Extra checks for doc/semantic-schemas.md (recursive bound + presence_mask sections). */
module.exports = {
  cases: [
    {
      name: 'presence mask number literal width',
      src: `<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>+:
    number?: <number>
    add?: bound <add>
:

10wire<expr> num = { number={ value=\\2 }<number> }<expr>`,
      check: (interp) => {
        const w = interp.wires.get('num');
        if (!w || !w.ref) return false;
        const bits = interp.getValueFromRef(w.ref);
        return bits && bits.length === 10 && bits.substring(0, 2) === '10';
      },
    },
    {
      name: 'deep field read legacy matches wave',
      src: `<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>+:
    number?: <number>
    add?: bound <add>
:

70wire<expr> tree = {
    add={
        left={ number={ value=\\2 }<number> }<expr>
        right={ number={ value=\\3 }<number> }<expr>
    }<add>
}<expr>
8wire leftVal = tree:add:left:number:value`,
      check: (interp) => {
        const w = interp.wires.get('leftVal');
        if (!w || !w.ref) return false;
        return interp.getValueFromRef(w.ref) === '00000010';
      },
    },
    {
      name: 'multi optional mask allows both fields',
      src: `<number>:
    value: 8
:

<twoNumbers>+:
    add?: <number>
    sub?: <number>
:

18wire<twoNumbers> both = {
    add={ value=\\1 }<number>
    sub={ value=\\2 }<number>
}<twoNumbers>`,
      check: (interp) => {
        const w = interp.wires.get('both');
        if (!w || !w.ref) return false;
        const bits = interp.getValueFromRef(w.ref);
        return bits && bits.length === 18 && bits.substring(0, 2) === '11';
      },
    },
    {
      name: 'inline sugar same width as separate blocks',
      src: `<number>:
    value: 8
:

<expr>+:
    number?: <number>: value: 8 :
    add?: bound <add>: left: bound <expr>  right: bound <expr> :
:

10wire<expr> ast = { number={ value=\\5 }<number> }<expr>`,
      check: (interp) => {
        const w = interp.wires.get('ast');
        if (!w || !w.ref) return false;
        const bits = interp.getValueFromRef(w.ref);
        return bits && bits.length === 10 && bits.substring(bits.length - 8) === '00000101';
      },
    },
  ],
};
