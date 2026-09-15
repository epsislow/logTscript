'use strict';

/**
 * Load the browser test runtime bundle into the current Node globalThis.
 * Required for doc_verify extra checks: interp-engine + interp-field-access
 * share symbols via global scope in the browser, not via CJS exports.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { ROOT } = require('./paths');
const { createTestNodeSandbox } = require('./test_node_sandbox');

let booted = false;

function copyInterpGlobalsFromSandbox(sandbox) {
  const names = Object.getOwnPropertyNames(sandbox).concat(
    sandbox.window ? Object.getOwnPropertyNames(sandbox.window) : [],
  );
  for (const name of names) {
    if (!/^(interp|evalInterp|encodeInterp)/.test(name)) continue;
    const value = sandbox[name] != null ? sandbox[name] : sandbox.window && sandbox.window[name];
    if (value != null) globalThis[name] = value;
  }
}

function ensureInterpRuntimeGlobals() {
  if (booted) return;
  const { TEST_RUNTIME_SCRIPTS } = require(path.join(ROOT, 'tests', 'test_runtime_bundle_generated.js'));
  const sandbox = createTestNodeSandbox({ verbose: false });
  let src = '';
  for (const script of TEST_RUNTIME_SCRIPTS) {
    src += fs.readFileSync(path.join(ROOT, script), 'utf8') + '\n';
  }
  vm.runInNewContext(src, sandbox);
  copyInterpGlobalsFromSandbox(sandbox);
  booted = true;
}

module.exports = { ensureInterpRuntimeGlobals };
