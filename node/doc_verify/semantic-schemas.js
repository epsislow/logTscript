'use strict';

/** Extra checks for doc/semantic-schemas.md (recursive bound + union sections). */
module.exports = {
  cases: [
    {
      name: 'bound union number literal width',
      src: `<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>:
    number?: <number>
    add?: <add>
:

12wire<expr> num = { number={ value=\\2 }<number> }<expr>`,
      check: (interp) => {
        const w = interp.wires.get('num');
        if (!w || !w.ref) return false;
        const bits = interp.getValueFromRef(w.ref);
        return bits && bits.length === 12 && bits.substring(0, 4) === '0000';
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

<expr>:
    number?: <number>
    add?: <add>
:

60wire<expr> tree = {
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
      name: 'union two branches reports error',
      src: `<number>:
    value: 8
:

<add>:
    left: bound <expr>
    right: bound <expr>
:

<expr>:
    number?: <number>
    add?: <add>
:

60wire<expr> bad = { number={ value=\\1 }<number> add={ left={ number={ value=\\2 }<number> }<expr> }<add> }<expr>`,
      check: (interp) => {
        const err = interp.lastReportedError;
        return err && String(err.message).indexOf('at most one branch') >= 0;
      },
    },
    {
      name: 'inline sugar same width as separate blocks',
      src: `<number>:
    value: 8
:

<expr>:
    number?: <number>: value: 8 :
    add?: <add>: left: bound <expr>  right: bound <expr> :
:

12wire<expr> ast = { number={ value=\\5 }<number> }<expr>`,
      check: (interp) => {
        const w = interp.wires.get('ast');
        if (!w || !w.ref) return false;
        const bits = interp.getValueFromRef(w.ref);
        return bits && bits.length === 12 && bits.substring(bits.length - 8) === '00000101';
      },
    },
  ],
};
