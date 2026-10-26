'use strict';

/** Extra checks for doc/inline-fpga.md (:eval legacy + wave). */
const AND_GATE = [
  'inline [fpga] .andGate:',
  '  lut.inIdBits = 8',
  '  cell lut[1] like lut.and',
  '  lut.in0 = \\0;8',
  '  lut.in1 = \\1;8',
  '  out = \\2;8',
  ':',
].join('\n');

const EVAL_SRC = [
  AND_GATE,
  '',
  '2wire ins = 11',
  '1wire clk = 0',
  '1wire y, 1wire prevClk = .andGate:eval(ins, clk)',
].join('\n');

module.exports = {
  cases: [
    {
      name: ':eval AND 11 legacy',
      propagation: 'legacy',
      src: EVAL_SRC,
      wires: { y: '1', prevClk: '0' },
    },
    {
      name: ':eval AND 11 wave',
      propagation: 'wave',
      src: EVAL_SRC,
      wires: { y: '1', prevClk: '0' },
    },
  ],
};
