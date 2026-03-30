var ComponentRegistry = class ComponentRegistry {
  constructor() {
    this._components = new Map();
    this._shortnames = {};
    this._reservedNames = [];
  }

  register(ComponentClass) {
    const instance = new ComponentClass();
    const type = ComponentClass.type;
    this._components.set(type, instance);
    const shortnames = ComponentClass.shortnames;
    if (shortnames) {
      for (const [key, val] of Object.entries(shortnames)) {
        this._shortnames[key] = val;
      }
    }
    if (ComponentClass.isReservedName) {
      this._reservedNames.push(type);
    }
  }

  get(type) {
    return this._components.get(type);
  }

  has(type) {
    return this._components.has(type);
  }

  getShortnames() {
    return { ...this._shortnames };
  }

  getReservedNames() {
    return [...this._reservedNames];
  }

  getAllTypes() {
    return [...this._components.keys()];
  }

  getTypesSupporting(property) {
    const result = [];
    for (const [type, comp] of this._components) {
      if (comp.getSupportedProperties().includes(property)) {
        result.push(type);
      }
    }
    return result;
  }

  supportsProperty(type, property) {
    const comp = this._components.get(type);
    if (!comp) return false;
    return comp.getSupportedProperties().includes(property);
  }

  supportsRedirect(type, redirectProp) {
    const comp = this._components.get(type);
    if (!comp) return false;
    return comp.getRedirectProperties().includes(redirectProp);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComponentRegistry;
}
