'use strict';

/**
 * Huffman FSM script generator — mirrors tests/test_suite.js helpers.
 * Run tests via test_suite.js; this module is for node scratch scripts.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { ROOT } = require('./js/paths');

function loadFromTestSuite() {
  const src = fs.readFileSync(path.join(ROOT, 'tests', 'test_suite.js'), 'utf8');
  const fullStart = src.indexOf('const HUFF_FULL_BASE = ');
  const fullEnd = src.indexOf('function huffMergeRound');
  let HUFF_FULL_BASE = src.slice(fullStart + 'const HUFF_FULL_BASE = '.length, fullEnd).trim();
  if (HUFF_FULL_BASE.startsWith('`')) HUFF_FULL_BASE = HUFF_FULL_BASE.slice(1, HUFF_FULL_BASE.lastIndexOf('`'));
  const chunkStart = src.indexOf('const HUFF_FSM_MAX_MERGES');
  const chunkEnd = src.indexOf('reg(2111');
  const chunk = src.slice(chunkStart, chunkEnd);
  const sb = { HUFF_FULL_BASE, HUFF_FSM_MAX_MERGES: 31 };
  vm.runInNewContext(`${chunk}\nthis.api = { huffFsmScript, huffFsmRoundTripScript, huffFsmMergeStepBlocks, huffWalkExecAacb, huffWalkEmit, huffFsmBin8, huffFsmTick };`, sb);
  return sb.api;
}

const api = loadFromTestSuite();

module.exports = {
  huffFsmScript: api.huffFsmScript,
  huffFsmRoundTripScript: api.huffFsmRoundTripScript,
  huffFsmMergeStepBlocks: api.huffFsmMergeStepBlocks,
  huffWalkExecAacb: api.huffWalkExecAacb,
  huffWalkEmit: api.huffWalkEmit,
  huffFsmBin8: api.huffFsmBin8,
  huffFsmTick: api.huffFsmTick,
};
