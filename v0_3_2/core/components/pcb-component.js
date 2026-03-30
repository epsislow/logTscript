var ComponentBase = (typeof require !== 'undefined') ? require('./component-base') : ComponentBase;

var PcbComponent = class PcbComponent extends ComponentBase {
  static get type() { return 'pcb'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return false; }

  getWidthBits(attributes) { return null; }
  getSupportedProperties() { return []; }
  getRedirectProperties() { return []; }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = PcbComponent; }
