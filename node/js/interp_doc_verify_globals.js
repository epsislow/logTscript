'use strict';

const { ensureInterpRuntimeGlobals } = require('./interp_node_bootstrap');

ensureInterpRuntimeGlobals();

function req(name) {
  const fn = globalThis[name];
  if (typeof fn !== 'function') {
    throw new Error(`interp doc_verify: ${name} is not available — bootstrap failed`);
  }
  return fn;
}

module.exports = {
  evalInterpWire: (...args) => req('evalInterpWire')(...args),
  evalInterpInline: (...args) => req('evalInterpInline')(...args),
  interpExecuteMethod: (...args) => req('interpExecuteMethod')(...args),
  interpRunWithContext: (...args) => req('interpRunWithContext')(...args),
  interpMakeNodeHandle: (...args) => req('interpMakeNodeHandle')(...args),
  interpEvalNodeHandle: (...args) => req('interpEvalNodeHandle')(...args),
  encodeInterpResult: (...args) => req('encodeInterpResult')(...args),
};
