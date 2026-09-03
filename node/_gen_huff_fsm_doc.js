'use strict';
/** Emit FSM round-trip script for huffman-v2.md (logts-play wave block). */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./js/paths');
const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
const { createTestNodeSandbox } = require('./js/test_node_sandbox');

let src = '';
for (const f of TEST_RUNTIME_SCRIPTS) {
  src += fs.readFileSync(path.join(ROOT, f), 'utf8') + '\n';
}
const sandbox = createTestNodeSandbox();
vm.runInNewContext(src, sandbox);
const script = sandbox.LogTScriptTestSuite.huffFsmRoundTripScript('aacb', { afterSettleClock: true });
process.stdout.write('```logts-play wave\n' + script + '\n```\n');
