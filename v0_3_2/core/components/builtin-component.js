var ComponentBase = (typeof require !== 'undefined') ? require('./component-base') : ComponentBase;

var BuiltinComponent = class BuiltinComponent extends ComponentBase {
  evalGetProperty(comp, property, a, ctx) { return null; }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    throw new Error('createDevice must be implemented');
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {}

  handleImmediateAssignment(comp, property, value, ctx) { return false; }

  getForbidDirectAssign() { return null; }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {}

  updateDisplayValue(comp, value, bitRange) {}
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BuiltinComponent;
}
