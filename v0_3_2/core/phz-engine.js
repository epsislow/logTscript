/**
 * PHZ runtime engine: obj / gen / cont instances, spawn, :inside path resolution.
 */
(function (global) {
  'use strict';

  function getWidth() {
    return typeof LogTScriptPhzWidth !== 'undefined' ? LogTScriptPhzWidth : null;
  }

  function PhzEngine(interpreter) {
    this.interp = interpreter;
    this.objs = new Map();
    this.gens = new Map();
    this.conts = new Map();
    this.nextId = 1;
  }

  PhzEngine.prototype.reset = function () {
    this.objs = new Map();
    this.gens = new Map();
    this.conts = new Map();
    this.nextId = 1;
  };

  PhzEngine.prototype.allocId = function () {
    var W = getWidth();
    if (this.nextId > (W ? W.ID_MAX : 65535)) {
      throw new Error('PHZ id autoincrement overflow (max ' + (W ? W.ID_MAX : 65535) + ')');
    }
    return this.nextId++;
  };

  PhzEngine.prototype._storeAttr = function (bin, bits) {
    var interp = this.interp;
    var storageIdx = interp.storeValue(bin);
    return { bits: bits, storageIdx: storageIdx, ref: '&' + storageIdx, bin: bin };
  };

  PhzEngine.prototype._resolveAttrDef = function (name, attrAst, kind) {
    var W = getWidth();
    if (!attrAst) return null;

    if (attrAst.kind === 'type') {
      return { special: 'type', value: attrAst.value };
    }

    if (name === 'id') {
      if (kind !== 'obj') throw new Error("PHZ attribute 'id' is only allowed on obj");
      if (attrAst.kind !== 'decimal') throw new Error("PHZ id expects decimal value");
      if (attrAst.width != null) throw new Error("PHZ id does not allow (W) width suffix");
      if (attrAst.kind === 'wire') throw new Error("PHZ id does not allow wire reference");
      var idBin = W.encodeId(attrAst.value);
      return this._storeAttr(idBin, W.ID_BITS);
    }

    if (name === 'floor') {
      if (attrAst.width != null) throw new Error("PHZ floor does not allow (W) width suffix");
      if (attrAst.kind === 'wire') {
        return { deferred: true, wireName: attrAst.value, bits: W.FLOOR_BITS, role: 'floor' };
      }
      if (attrAst.kind !== 'decimal') throw new Error("PHZ floor expects decimal or wire");
      return this._storeAttr(W.encodeFloor(attrAst.value), W.FLOOR_BITS);
    }

    if (name === 'max') {
      if (kind !== 'cont') throw new Error("PHZ attribute 'max' is only allowed on cont");
      if (attrAst.width != null) throw new Error("PHZ max does not allow (W) width suffix");
      if (attrAst.kind !== 'decimal') throw new Error("PHZ max expects decimal value");
      return this._storeAttr(W.encodeMax(attrAst.value), W.MAX_BITS);
    }

    if (attrAst.kind === 'wire') {
      return { deferred: true, wireName: attrAst.value, role: 'custom' };
    }

    if (attrAst.kind === 'decimal') {
      if (attrAst.width != null) {
        var padded = W.decimalToWidthBin(attrAst.value, attrAst.width);
        return this._storeAttr(padded, attrAst.width);
      }
      var min = W.decimalToMinimalBin(attrAst.value);
      return this._storeAttr(min.bin, min.bits);
    }

    if (attrAst.kind === 'string') {
      if (attrAst.width != null) {
        var sPad = W.stringToWidthBits(attrAst.value, attrAst.width);
        return this._storeAttr(sPad, attrAst.width);
      }
      var s = W.stringToBits(attrAst.value);
      return this._storeAttr(s.bin, s.bits);
    }

    throw new Error('Unknown PHZ attribute kind: ' + attrAst.kind);
  };

  PhzEngine.prototype._resolveDeferred = function (slot) {
    if (!slot || !slot.deferred) return slot;
    var wire = this.interp.wires.get(slot.wireName);
    if (!wire) throw new Error("Undefined wire '" + slot.wireName + "' in PHZ attribute");
    var bits = this.interp.getBitWidth(wire.type);
    if (slot.role === 'floor' && bits !== getWidth().FLOOR_BITS) {
      throw new Error('PHZ floor wire must be exactly ' + getWidth().FLOOR_BITS + ' bits, got ' + bits);
    }
    var val = this.interp.getWireEffectiveValue(slot.wireName);
    if (val == null) val = '0'.repeat(bits);
    if (val.length < bits) val = val.padStart(bits, '0');
    else if (val.length > bits) val = val.substring(val.length - bits);
    return this._storeAttr(val, bits);
  };

  PhzEngine.prototype._buildAttrMap = function (kind, attributes) {
    var W = getWidth();
    var attrs = attributes || {};
    var map = new Map();
    var reservedCont = { inside: 1, count: 1, empty: 1 };

    for (var name in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, name)) continue;
      if (kind === 'cont' && reservedCont[name]) {
        throw new Error("PHZ cont attribute name '" + name + "' is reserved");
      }
      if (kind === 'gen' && name === 'id') {
        throw new Error("PHZ gen cannot define 'id'");
      }
      if (name === 'type') {
        if (kind !== 'gen') throw new Error("PHZ attribute 'type' is only allowed on gen");
        continue;
      }
      var resolved = this._resolveAttrDef(name, attrs[name], kind);
      if (resolved && resolved.special === 'type') continue;
      if (resolved) map.set(name, resolved);
    }

    // Resolve deferred wire refs
    for (var [k, v] of map) {
      if (v.deferred) map.set(k, this._resolveDeferred(v));
    }

    if (kind === 'obj') {
      if (!map.has('id')) {
        var autoId = this.allocId();
        map.set('id', this._storeAttr(W.encodeId(autoId), W.ID_BITS));
      } else {
        // bump nextId past explicit id if needed
        var idVal = parseInt(this.interp.getValueFromRef(map.get('id').ref), 2);
        if (idVal >= this.nextId) this.nextId = idVal + 1;
      }
      if (!map.has('floor')) {
        map.set('floor', this._storeAttr(W.encodeFloor(0), W.FLOOR_BITS));
      }
    }

    if (kind === 'cont') {
      if (!map.has('floor')) {
        map.set('floor', this._storeAttr(W.encodeFloor(0), W.FLOOR_BITS));
      }
      if (!map.has('max')) {
        map.set('max', this._storeAttr(W.encodeMax(W.MAX_DEFAULT), W.MAX_BITS));
      }
    }

    if (kind === 'gen') {
      if (!map.has('floor')) {
        map.set('floor', this._storeAttr(W.encodeFloor(0), W.FLOOR_BITS));
      }
    }

    return map;
  };

  PhzEngine.prototype.createObj = function (name, attributes) {
    if (this.objs.has(name) || this.gens.has(name) || this.conts.has(name)) {
      throw new Error("PHZ instance '" + name + "' already exists");
    }
    var attrMap = this._buildAttrMap('obj', attributes);
    var inst = { kind: 'obj', name: name, attributes: attrMap, named: true };
    this.objs.set(name, inst);
    return inst;
  };

  PhzEngine.prototype.createGen = function (name, attributes) {
    if (this.objs.has(name) || this.gens.has(name) || this.conts.has(name)) {
      throw new Error("PHZ instance '" + name + "' already exists");
    }
    var attrs = attributes || {};
    if (!attrs.type || attrs.type.kind !== 'type' || attrs.type.value !== 'obj') {
      throw new Error("PHZ gen requires type: obj");
    }
    var attrMap = this._buildAttrMap('gen', attributes);
    var template = {};
    for (var [k, v] of attrMap) {
      if (k === 'floor') continue;
      template[k] = {
        bits: v.bits,
        bin: this.interp.getValueFromRef(v.ref),
      };
    }
    var inst = {
      kind: 'gen',
      name: name,
      attributes: attrMap,
      template: template,
      type: 'obj',
    };
    this.gens.set(name, inst);
    return inst;
  };

  PhzEngine.prototype.createCont = function (name, attributes) {
    if (this.objs.has(name) || this.gens.has(name) || this.conts.has(name)) {
      throw new Error("PHZ instance '" + name + "' already exists");
    }
    var attrMap = this._buildAttrMap('cont', attributes);
    var inst = {
      kind: 'cont',
      name: name,
      attributes: attrMap,
      contents: [],
    };
    this.conts.set(name, inst);
    return inst;
  };

  PhzEngine.prototype.getNamed = function (name) {
    return this.objs.get(name) || this.gens.get(name) || this.conts.get(name) || null;
  };

  PhzEngine.prototype.getAttrValue = function (inst, attrName) {
    if (!inst || !inst.attributes) {
      throw new Error("missing attribute named " + attrName);
    }
    var slot = inst.attributes.get(attrName);
    if (!slot) throw new Error('missing attribute named ' + attrName);
    var val = this.interp.getValueFromRef(slot.ref);
    return { value: val, ref: slot.ref, bitWidth: slot.bits };
  };

  PhzEngine.prototype.setAttrValue = function (inst, attrName, binValue) {
    if (inst.kind === 'cont' && (attrName === 'inside' || attrName === 'count' || attrName === 'empty')) {
      throw new Error("Cannot write reserved PHZ cont path '" + attrName + "'");
    }
    var slot = inst.attributes.get(attrName);
    if (!slot) throw new Error('missing attribute named ' + attrName);
    var bits = slot.bits;
    var value = binValue == null ? '' : String(binValue);
    if (value.length < bits) value = value.padStart(bits, '0');
    else if (value.length > bits) value = value.substring(value.length - bits);
    this.interp.setValueAtRef(slot.ref, value);
  };

  PhzEngine.prototype._cloneTemplateObject = function (gen, floorOverrideBin) {
    var W = getWidth();
    var attrMap = new Map();
    var autoId = this.allocId();
    attrMap.set('id', this._storeAttr(W.encodeId(autoId), W.ID_BITS));

    var floorBin = floorOverrideBin;
    if (floorBin == null) {
      var floorSlot = gen.attributes.get('floor');
      floorBin = this.interp.getValueFromRef(floorSlot.ref);
    }
    attrMap.set('floor', this._storeAttr(floorBin, W.FLOOR_BITS));

    for (var key in gen.template) {
      if (!Object.prototype.hasOwnProperty.call(gen.template, key)) continue;
      if (key === 'id' || key === 'floor') continue;
      var t = gen.template[key];
      attrMap.set(key, this._storeAttr(t.bin, t.bits));
    }

    return { kind: 'obj', name: null, attributes: attrMap, named: false };
  };

  PhzEngine.prototype.spawn = function (genName, addCount, contName, floorOverride) {
    var W = getWidth();
    var gen = this.gens.get(genName);
    if (!gen) throw new Error("PHZ gen '" + genName + "' is not defined");
    if (!contName) throw new Error('PHZ gen spawn requires inside: .<cont>');
    var cont = this.conts.get(contName);
    if (!cont) throw new Error("PHZ cont '" + contName + "' is not defined");

    var add = Number(addCount);
    if (!Number.isFinite(add) || add < 0 || Math.floor(add) !== add) {
      throw new Error('PHZ gen add must be a non-negative integer');
    }

    var maxBin = this.interp.getValueFromRef(cont.attributes.get('max').ref);
    var max = parseInt(maxBin, 2);
    var count = cont.contents.length;
    if (count + add > max) {
      throw new Error('PHZ cont ' + contName + ' overflow: count ' + count + ' + add ' + add + ' > max ' + max);
    }

    var floorBin = null;
    if (floorOverride != null) {
      if (typeof floorOverride === 'object' && floorOverride.wireName) {
        var wire = this.interp.wires.get(floorOverride.wireName);
        if (!wire) throw new Error("Undefined wire '" + floorOverride.wireName + "' for PHZ floor override");
        var wb = this.interp.getBitWidth(wire.type);
        if (wb !== W.FLOOR_BITS) {
          throw new Error('PHZ floor wire must be exactly ' + W.FLOOR_BITS + ' bits, got ' + wb);
        }
        floorBin = this.interp.getWireEffectiveValue(floorOverride.wireName) || '0'.repeat(W.FLOOR_BITS);
        if (floorBin.length < W.FLOOR_BITS) floorBin = floorBin.padStart(W.FLOOR_BITS, '0');
        else if (floorBin.length > W.FLOOR_BITS) floorBin = floorBin.substring(floorBin.length - W.FLOOR_BITS);
      } else {
        floorBin = W.encodeFloor(floorOverride);
      }
    }

    for (var i = 0; i < add; i++) {
      cont.contents.push(this._cloneTemplateObject(gen, floorBin));
    }
  };

  PhzEngine.prototype._listObjectAttrs = function (obj) {
    var attrs = [];
    if (!obj || !obj.attributes) return attrs;
    for (var [k, slot] of obj.attributes) {
      var val = this.interp.getValueFromRef(slot.ref);
      attrs.push({ name: k, value: val, bits: slot.bits });
    }
    return attrs;
  };

  PhzEngine.prototype._formatObjectAttrs = function (obj) {
    var attrs = this._listObjectAttrs(obj);
    var parts = attrs.map(function (a) { return a.name + '=' + a.value; });
    return '{' + parts.join(', ') + '}';
  };

  PhzEngine.prototype._objectShowPayload = function (obj) {
    var attrs = this._listObjectAttrs(obj);
    var dump = '{' + attrs.map(function (a) { return a.name + '=' + a.value; }).join(', ') + '}';
    return {
      value: null,
      ref: null,
      bitWidth: 0,
      isText: true,
      displayText: dump,
      phzObjectDump: true,
      phzAttrs: attrs,
    };
  };

  /**
   * Resolve path segments after instance name.
   * property may be "floor", "inside", "inside:count", "inside:0:id", etc.
   */
  PhzEngine.prototype.resolveProperty = function (instanceName, property) {
    var W = getWidth();
    var inst = this.getNamed(instanceName);
    if (!inst) return null;

    var parts = String(property || '').split(':').filter(function (p) { return p.length > 0; });
    if (parts.length === 0) {
      throw new Error('Cannot read PHZ instance ' + instanceName + ' without a property');
    }

    // Cont :inside path
    if (inst.kind === 'cont' && parts[0] === 'inside') {
      return this._resolveInside(inst, parts.slice(1));
    }

    // Writing to inside is forbidden (read handled above)
    if (parts[0] === 'inside') {
      throw new Error("PHZ :inside is only valid on cont instances");
    }

    if (parts.length !== 1) {
      throw new Error("Unknown PHZ property path '" + property + "' on " + instanceName);
    }

    return this.getAttrValue(inst, parts[0]);
  };

  PhzEngine.prototype._resolveInside = function (cont, rest) {
    var W = getWidth();
    var contents = cont.contents;
    var count = contents.length;

    if (rest.length === 0) {
      var objects = contents.map(function (obj, idx) {
        var attrs = this._listObjectAttrs(obj);
        return {
          index: idx,
          dump: this._formatObjectAttrs(obj),
          attrs: attrs,
        };
      }.bind(this));
      var text = objects.length
        ? objects.map(function (o) { return ':' + o.index + ' = ' + o.dump; }).join('; ')
        : '(empty)';
      return {
        value: null,
        ref: null,
        bitWidth: 0,
        isText: true,
        displayText: text,
        phzInsideList: true,
        phzObjects: objects,
      };
    }

    var head = rest[0];

    if (head === 'count') {
      var cbin = W.decimalToWidthBin(count, W.MAX_BITS);
      return { value: cbin, ref: null, bitWidth: W.MAX_BITS };
    }

    if (head === 'empty') {
      return { value: count === 0 ? '1' : '0', ref: null, bitWidth: 1 };
    }

    var index;
    if (head === 'first') {
      if (count === 0) throw new Error('PHZ :inside:first on empty container ' + cont.name);
      index = 0;
    } else if (head === 'last') {
      if (count === 0) throw new Error('PHZ :inside:last on empty container ' + cont.name);
      index = count - 1;
    } else if (/^\d+$/.test(head)) {
      index = parseInt(head, 10);
      if (index < 0 || index >= count) {
        throw new Error('PHZ :inside index ' + index + ' out of range (count=' + count + ') in ' + cont.name);
      }
    } else {
      throw new Error("Unknown PHZ :inside segment '" + head + "'");
    }

    var obj = contents[index];
    var attrParts = rest.slice(1);
    if (attrParts.length === 0) {
      return this._objectShowPayload(obj);
    }

    if (attrParts.length !== 1) {
      throw new Error("Invalid PHZ :inside attribute path '" + rest.join(':') + "'");
    }
    return this.getAttrValue(obj, attrParts[0]);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhzEngine: PhzEngine };
  }
  global.LogTScriptPhzEngine = PhzEngine;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
