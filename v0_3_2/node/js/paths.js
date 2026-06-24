/**
 * Shared paths for node/ scripts (v0_3_2 root = parent of node/).
 */
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TESTS = path.join(ROOT, 'tests');
const DOC = path.join(ROOT, 'doc');
const RES_JS = path.join(ROOT, 'res', 'js');
const RES_CSS = path.join(ROOT, 'res', 'css');
const RES_FONTS = path.join(ROOT, 'res', 'fonts');

module.exports = { ROOT, TESTS, DOC, RES_JS, RES_CSS, RES_FONTS };
