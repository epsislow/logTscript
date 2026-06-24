/**
 * Load test script lists from test_scripts.json (single source of truth).
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'test_scripts.json');

function loadTestScripts() {
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const runtime = raw.runtime.slice();
  const browserTail = raw.afterRuntime.browser.slice();
  const nodeTail = raw.afterRuntime.node.slice();
  return {
    runtime,
    browserTail,
    nodeTail,
    browserAll() {
      return runtime.concat(browserTail);
    },
    nodeAll() {
      return runtime.concat(nodeTail);
    },
  };
}

module.exports = { loadTestScripts, CONFIG_PATH };
