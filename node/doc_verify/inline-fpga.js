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

const TFF_SRC = [
  'inline [fpga] .tff:',
  '  lut.inIdBits = 8',
  '  cell lut[1] like lut.not',
  '  cell ff[1] like ff.d',
  '  lut.in0 = \\1;8',
  '  ff.d = \\0;8',
  '  out = \\1;8',
  ':',
  '',
  '1wire ins = 0',
  '1wire q0, 2wire s1 = .tff:eval(ins, 0, 00)',
  '1wire q1, 2wire s2 = .tff:eval(ins, 1, s1)',
].join('\n');

const RAM_SRC = [
  'inline [fpga] .nibbleRam:',
  '  ram.nibble = { address = 2, data = 4 }',
  '  cell ram[1] like ram.nibble',
  '  ram.address = \\0;8 \\0;8',
  '  ram.dataIn = \\3;8 \\4;8 \\5;8 \\6;8',
  '  ram.write = \\2;8',
  '  out = \\8;8 \\9;8 \\10;8 \\11;8',
  ':',
  '',
  '21wire pack0 = .nibbleRam:eval(0011111, 1)',
  '4wire read0, 17wire seq1 = pack0',
  '21wire pack1 = .nibbleRam:eval(0010000, 0, seq1)',
  '4wire read1, 17wire seq2 = pack1',
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
    {
      name: 'TFF rising edge legacy',
      propagation: 'legacy',
      src: TFF_SRC,
      wires: { q0: '0', q1: '1' },
    },
    {
      name: 'TFF rising edge wave',
      propagation: 'wave',
      src: TFF_SRC,
      wires: { q0: '0', q1: '1' },
    },
    {
      name: 'RAM write read legacy',
      propagation: 'legacy',
      src: RAM_SRC,
      wires: { read1: '1111' },
    },
    {
      name: 'RAM write read wave',
      propagation: 'wave',
      src: RAM_SRC,
      wires: { read1: '1111' },
    },
  ],
};
