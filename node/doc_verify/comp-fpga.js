'use strict';

/** Extra checks for doc/comp-fpga.md (legacy + wave parity on wired AND gate). */
const AND_GATE = [
  'inline [fpga] .andGate:',
  '  lut.inIdBits = 8',
  '  cell lut[1] like lut.and',
  '  lut.in0 = \\0;8',
  '  lut.in1 = \\1;8',
  '  out = \\2;8',
  ':',
  '',
  '1wire clk = 0',
  '1wire inA = 1',
  '1wire inB = 1',
  '1wire trig = 1',
  '1wire q = 0',
  '',
  'comp [fpga] .andGate:',
  '  on: 1',
  '  clock = clk',
  ':',
  '',
  '.andGate:{ in0 = inA, in1 = inB, out0 >= q, set = trig }',
].join('\n');

module.exports = {
  cases: [
    {
      name: 'comp andGate wired legacy',
      propagation: 'legacy',
      src: AND_GATE,
      wires: { q: '1' },
    },
    {
      name: 'comp andGate wired wave',
      propagation: 'wave',
      src: AND_GATE,
      wires: { q: '1' },
    },
  ],
};
