/**
 * Minimal browser-like globals for Node test runners (no real DOM).
 */
function createTestNodeSandbox() {
  function makeEl() {
    return {
      className: '',
      dataset: {},
      innerHTML: '',
      childNodes: [],
      textContent: '',
      style: {},
      classList: { toggle() {}, add() {}, remove() {} },
      appendChild(c) {
        this.childNodes.push(c);
        return c;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute() {},
      getAttribute() {
        return null;
      },
    };
  }

  const devices = makeEl();
  const document = {
    getElementById(id) {
      return id === 'devices' ? devices : null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return makeEl();
    },
    fonts: { load: () => Promise.resolve() },
    addEventListener() {},
    removeEventListener() {},
    activeElement: null,
  };

  const sandbox = {
    Error,
    parseInt,
    parseFloat,
    String,
    Array,
    Set,
    Map,
    RegExp,
    console,
    Object,
    Math,
    JSON,
    Number,
    isNaN,
    clearTimeout,
    setTimeout,
    window: {},
    document,
  };
  sandbox.window = sandbox;
  return sandbox;
}

module.exports = { createTestNodeSandbox };
