/**
 * PHZ runtime engine — phase 1 + phase 2:
 * types registry, typed collections, membership, move/remove/toFloor, spawn paths.
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
    this.types = new Map();
    /** @type {Map<string, number>} anonymous spawn counts by phzType */
    this.anonCounts = new Map();
    /** Named instance names in declaration order (for doc). */
    this.namedOrder = [];
    this.nextId = 1;
    this._eachCurrent = null;
    this._selfName = null;
  }

  PhzEngine.prototype.reset = function () {
    this.objs = new Map();
    this.gens = new Map();
    this.conts = new Map();
    this.types = new Map();
    this.anonCounts = new Map();
    this.namedOrder = [];
    this.nextId = 1;
    this._eachCurrent = null;
    this._selfName = null;
  };

  PhzEngine.prototype._incAnonCount = function (phzType) {
    var t = phzType || 'obj';
    this.anonCounts.set(t, (this.anonCounts.get(t) || 0) + 1);
  };

  /** Display tag: `phz.obj` or `phz.[wheel < obj]`. */
  PhzEngine.prototype.formatTypeTag = function (typeName) {
    var t = typeName || 'obj';
    if (t === 'obj' || t === 'gen' || t === 'cont') return 'phz.' + t;
    var def = this.types.get(t);
    if (!def) return 'phz.' + t;
    return 'phz.[' + t + ' < ' + def.base + ']';
  };

  /** Header kind fragment: `obj` or `wheel < obj`. */
  PhzEngine.prototype.formatTypeKind = function (typeName) {
    var t = typeName || 'obj';
    if (t === 'obj' || t === 'gen' || t === 'cont') return t;
    var def = this.types.get(t);
    if (!def) return t;
    return t + ' < ' + def.base;
  };

  PhzEngine.prototype.allocId = function () {
    var W = getWidth();
    if (this.nextId > (W ? W.ID_MAX : 65535)) {
      throw new Error('PHZ id autoincrement overflow (max ' + (W ? W.ID_MAX : 65535) + ')');
    }
    return this.nextId++;
  };

  PhzEngine.prototype._storeAttr = function (bin, bits) {
    var storageIdx = this.interp.storeValue(bin);
    return { bits: bits, storageIdx: storageIdx, ref: '&' + storageIdx, bin: bin };
  };

  PhzEngine.prototype._asciiTypeBits = function (typeName) {
    var W = getWidth();
    return W.stringToBits(String(typeName || 'obj'));
  };

  /** True if typeName is typeName or inherits from it (along user type chain / root). */
  PhzEngine.prototype.isTypeCompatible = function (actualType, expectedType) {
    if (!expectedType || expectedType === 'obj') {
      // obj collection accepts anything rooted at obj OR cont (both ultimately "things")
      // Spec: trunk: obj[N] accepts types deriving from obj.
      // Cont-rooted types are not obj-derived under O1a — only accept if expected is obj and actual roots to obj,
      // OR expected is cont and actual roots to cont, OR exact/ancestor match.
    }
    if (actualType === expectedType) return true;
    if (expectedType === 'obj') {
      return this._rootKind(actualType) === 'obj';
    }
    if (expectedType === 'cont') {
      return this._rootKind(actualType) === 'cont';
    }
    var t = actualType;
    var guard = 0;
    while (t && guard++ < 64) {
      if (t === expectedType) return true;
      var def = this.types.get(t);
      if (!def) break;
      t = def.base;
    }
    return false;
  };

  PhzEngine.prototype._rootKind = function (typeName) {
    if (typeName === 'obj' || typeName === 'gen' || typeName === 'cont') return typeName;
    var t = typeName;
    var guard = 0;
    while (t && guard++ < 64) {
      if (t === 'obj' || t === 'cont') return t;
      var def = this.types.get(t);
      if (!def) return 'obj';
      t = def.base;
    }
    return 'obj';
  };

  PhzEngine.prototype.registerType = function (name, base, collections, attrDefs) {
    if (name === 'obj' || name === 'gen' || name === 'cont') {
      throw new Error("Cannot redefine built-in PHZ type '" + name + "'");
    }
    if (this.types.has(name)) {
      throw new Error("PHZ type '" + name + "' already defined");
    }
    if (base !== 'obj' && base !== 'cont' && !this.types.has(base)) {
      throw new Error("Unknown PHZ base type '" + base + "'");
    }
    if (base === 'gen') {
      throw new Error('PHZ user types cannot extend gen');
    }
    var root = this._rootKind(base);
    if (root !== 'obj' && root !== 'cont') {
      throw new Error("PHZ type '" + name + "' must ultimately derive from obj or cont");
    }
    var colls = {};
    if (root === 'cont') {
      // inherit / default inside
      var parentColls = null;
      if (base === 'cont') {
        parentColls = { inside: { elementType: 'obj', max: getWidth().MAX_DEFAULT } };
      } else {
        parentColls = Object.assign({}, this.types.get(base).collections);
      }
      Object.keys(parentColls).forEach(function (k) {
        colls[k] = { elementType: parentColls[k].elementType, max: parentColls[k].max };
      });
      if (collections) {
        Object.keys(collections).forEach(function (k) {
          colls[k] = {
            elementType: collections[k].elementType,
            max: collections[k].max,
          };
        });
      }
      if (!colls.inside) {
        colls.inside = { elementType: 'obj', max: getWidth().MAX_DEFAULT };
      }
    }
    this.types.set(name, {
      name: name,
      base: base,
      rootKind: root,
      collections: colls,
      attrDefs: attrDefs || {},
    });
    return this.types.get(name);
  };

  PhzEngine.prototype._resolveAttrDef = function (name, attrAst, kind) {
    var W = getWidth();
    if (!attrAst) return null;
    if (attrAst.kind === 'type') return { special: 'type', value: attrAst.value };

    if (name === 'id') {
      if (kind !== 'obj' && this._rootKind(kind) !== 'obj') {
        // id only on obj-rooted instances
      }
      if (attrAst.kind !== 'decimal') throw new Error("PHZ id expects decimal value");
      if (attrAst.width != null) throw new Error("PHZ id does not allow (W) width suffix");
      return this._storeAttr(W.encodeId(attrAst.value), W.ID_BITS);
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
      if (attrAst.width != null) throw new Error("PHZ max does not allow (W) width suffix");
      if (attrAst.kind !== 'decimal') throw new Error("PHZ max expects decimal value");
      return this._storeAttr(W.encodeMax(attrAst.value), W.MAX_BITS);
    }
    if (attrAst.kind === 'wire') {
      return { deferred: true, wireName: attrAst.value, role: 'custom' };
    }
    if (attrAst.kind === 'decimal') {
      if (attrAst.width != null) {
        return this._storeAttr(W.decimalToWidthBin(attrAst.value, attrAst.width), attrAst.width);
      }
      var min = W.decimalToMinimalBin(attrAst.value);
      return this._storeAttr(min.bin, min.bits);
    }
    if (attrAst.kind === 'string') {
      if (attrAst.width != null) {
        return this._storeAttr(W.stringToWidthBits(attrAst.value, attrAst.width), attrAst.width);
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

  PhzEngine.prototype._buildAttrMap = function (kindRoot, attributes, skipReservedColl) {
    var W = getWidth();
    var attrs = attributes || {};
    var map = new Map();
    var reservedCont = { inside: 1, count: 1, empty: 1 };

    for (var name in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, name)) continue;
      if (attrs[name] && attrs[name].kind === 'collection') continue;
      if (kindRoot === 'cont' && reservedCont[name] && !skipReservedColl) {
        throw new Error("PHZ cont attribute name '" + name + "' is reserved");
      }
      if (kindRoot === 'gen' && name === 'id') {
        throw new Error("PHZ gen cannot define 'id'");
      }
      if (name === 'type') {
        if (kindRoot !== 'gen') throw new Error("PHZ attribute 'type' is only allowed on gen");
        continue;
      }
      var resolved = this._resolveAttrDef(name, attrs[name], kindRoot);
      if (resolved && resolved.special === 'type') continue;
      if (resolved) map.set(name, resolved);
    }

    for (var [k, v] of map) {
      if (v.deferred) map.set(k, this._resolveDeferred(v));
    }

    if (kindRoot === 'obj') {
      if (!map.has('id')) {
        map.set('id', this._storeAttr(W.encodeId(this.allocId()), W.ID_BITS));
      } else {
        var idVal = parseInt(this.interp.getValueFromRef(map.get('id').ref), 2);
        if (idVal >= this.nextId) this.nextId = idVal + 1;
      }
      if (!map.has('floor')) {
        map.set('floor', this._storeAttr(W.encodeFloor(0), W.FLOOR_BITS));
      }
    }

    if (kindRoot === 'cont') {
      if (!map.has('floor')) {
        map.set('floor', this._storeAttr(W.encodeFloor(0), W.FLOOR_BITS));
      }
    }

    if (kindRoot === 'gen') {
      if (!map.has('floor')) {
        map.set('floor', this._storeAttr(W.encodeFloor(0), W.FLOOR_BITS));
      }
    }

    return map;
  };

  PhzEngine.prototype._initCollections = function (collDefs, maxOverride) {
    var W = getWidth();
    var collections = new Map();
    var defs = collDefs || { inside: { elementType: 'obj', max: W.MAX_DEFAULT } };
    Object.keys(defs).forEach(function (name) {
      var d = defs[name];
      var max = d.max;
      if (name === 'inside' && maxOverride != null) max = maxOverride;
      collections.set(name, {
        elementType: d.elementType,
        max: max,
        items: [],
      });
    });
    if (!collections.has('inside')) {
      collections.set('inside', {
        elementType: 'obj',
        max: maxOverride != null ? maxOverride : W.MAX_DEFAULT,
        items: [],
      });
    }
    return collections;
  };

  PhzEngine.prototype._contMaxAlias = function (collections) {
    var W = getWidth();
    var inside = collections.get('inside');
    var max = inside ? inside.max : W.MAX_DEFAULT;
    return this._storeAttr(W.encodeMax(max), W.MAX_BITS);
  };

  PhzEngine.prototype.createObj = function (name, attributes, phzType) {
    if (this.getNamed(name)) throw new Error("PHZ instance '" + name + "' already exists");
    var typeName = phzType || 'obj';
    var idProvided = !!(attributes && attributes.id);
    var attrMap = this._buildAttrMap('obj', attributes);
    var inst = {
      kind: 'obj',
      phzType: typeName,
      name: name,
      attributes: attrMap,
      named: true,
      idAuto: !idProvided,
      membership: null,
    };
    this.objs.set(name, inst);
    this.namedOrder.push(name);
    return inst;
  };

  PhzEngine.prototype.createGen = function (name, attributes) {
    if (this.getNamed(name)) throw new Error("PHZ instance '" + name + "' already exists");
    var attrs = attributes || {};
    if (!attrs.type || attrs.type.kind !== 'type') {
      throw new Error('PHZ gen requires type: <Type>');
    }
    var prodType = attrs.type.value;
    if (prodType !== 'obj' && prodType !== 'cont' && !this.types.has(prodType)) {
      throw new Error("PHZ gen type '" + prodType + "' is not defined");
    }
    if (prodType === 'gen') throw new Error('PHZ gen cannot produce gen');
    var attrMap = this._buildAttrMap('gen', attributes);
    var template = {};
    for (var [k, v] of attrMap) {
      if (k === 'floor') continue;
      template[k] = { bits: v.bits, bin: this.interp.getValueFromRef(v.ref) };
    }
    var inst = {
      kind: 'gen',
      name: name,
      attributes: attrMap,
      template: template,
      type: prodType,
      phzType: 'gen',
    };
    this.gens.set(name, inst);
    this.namedOrder.push(name);
    return inst;
  };

  PhzEngine.prototype.createCont = function (name, attributes, phzType) {
    if (this.getNamed(name)) throw new Error("PHZ instance '" + name + "' already exists");
    var typeName = phzType || 'cont';
    var typeDef = typeName !== 'cont' ? this.types.get(typeName) : null;
    var collDefs = typeDef ? typeDef.collections : { inside: { elementType: 'obj', max: getWidth().MAX_DEFAULT } };

    var maxOverride = null;
    if (attributes && attributes.max && attributes.max.kind === 'decimal') {
      maxOverride = parseInt(attributes.max.value, 10);
    }

    var attrMap = this._buildAttrMap('cont', attributes, true);
    var collections = this._initCollections(collDefs, maxOverride);
    if (!attrMap.has('max')) {
      attrMap.set('max', this._contMaxAlias(collections));
    } else {
      // sync inside max from explicit max
      var maxBin = this.interp.getValueFromRef(attrMap.get('max').ref);
      var maxN = parseInt(maxBin, 2);
      collections.get('inside').max = maxN;
    }

    var inst = {
      kind: 'cont',
      phzType: typeName,
      name: name,
      attributes: attrMap,
      collections: collections,
      membership: null,
    };
    Object.defineProperty(inst, 'contents', {
      get: function () { return collections.get('inside').items; },
      enumerable: true,
    });
    this.conts.set(name, inst);
    this.namedOrder.push(name);
    return inst;
  };

  PhzEngine.prototype.createFromType = function (typeName, instName, attributes) {
    if (typeName === 'obj') return this.createObj(instName, attributes, 'obj');
    if (typeName === 'cont') return this.createCont(instName, attributes, 'cont');
    if (typeName === 'gen') throw new Error('Use phz [gen] for generators');
    var def = this.types.get(typeName);
    if (!def) throw new Error("Unknown PHZ type '" + typeName + "'");
    var merged = Object.assign({}, def.attrDefs || {}, attributes || {});
    if (def.rootKind === 'cont') return this.createCont(instName, merged, typeName);
    return this.createObj(instName, merged, typeName);
  };

  PhzEngine.prototype.getNamed = function (name) {
    return this.objs.get(name) || this.gens.get(name) || this.conts.get(name) || null;
  };

  PhzEngine.prototype._isContLike = function (inst) {
    return inst && (inst.kind === 'cont' || (inst.collections && inst.collections.size));
  };

  PhzEngine.prototype.getAttrValue = function (inst, attrName) {
    if (!inst) throw new Error('missing attribute named ' + attrName);
    if (attrName === 'type') {
      var enc = this._asciiTypeBits(inst.phzType || inst.kind);
      return { value: enc.bin, ref: null, bitWidth: enc.bits, isText: false };
    }
    if (!inst.attributes) throw new Error('missing attribute named ' + attrName);
    var slot = inst.attributes.get(attrName);
    if (!slot) throw new Error('missing attribute named ' + attrName);
    return { value: this.interp.getValueFromRef(slot.ref), ref: slot.ref, bitWidth: slot.bits };
  };

  PhzEngine.prototype.setAttrValue = function (inst, attrName, binValue) {
    if (this._isContLike(inst) && (attrName === 'inside' || attrName === 'count' || attrName === 'empty')) {
      throw new Error("Cannot write reserved PHZ cont path '" + attrName + "'");
    }
    if (attrName === 'type') throw new Error("Cannot write PHZ 'type'");
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
    var prodType = gen.type || 'obj';
    var root = this._rootKind(prodType);
    var attrMap = new Map();
    attrMap.set('id', this._storeAttr(W.encodeId(this.allocId()), W.ID_BITS));
    var floorBin = floorOverrideBin;
    if (floorBin == null) {
      floorBin = this.interp.getValueFromRef(gen.attributes.get('floor').ref);
    }
    attrMap.set('floor', this._storeAttr(floorBin, W.FLOOR_BITS));
    for (var key in gen.template) {
      if (!Object.prototype.hasOwnProperty.call(gen.template, key)) continue;
      if (key === 'id' || key === 'floor') continue;
      var t = gen.template[key];
      attrMap.set(key, this._storeAttr(t.bin, t.bits));
    }

    var obj = {
      kind: root === 'cont' ? 'cont' : 'obj',
      phzType: prodType,
      name: null,
      attributes: attrMap,
      named: false,
      membership: null,
    };
    if (root === 'cont') {
      var typeDef = this.types.get(prodType);
      var collDefs = typeDef ? typeDef.collections : { inside: { elementType: 'obj', max: W.MAX_DEFAULT } };
      obj.collections = this._initCollections(collDefs, null);
      obj.attributes.set('max', this._contMaxAlias(obj.collections));
      Object.defineProperty(obj, 'contents', {
        get: function () { return obj.collections.get('inside').items; },
        enumerable: true,
      });
    }
    return obj;
  };

  /** Parse inside target: ".room" or ".car:wheels" → {ownerName, collName} */
  PhzEngine.prototype.parseCollectionRef = function (ref) {
    if (!ref) throw new Error('PHZ collection reference required');
    var s = String(ref);
    if (s[0] !== '.') throw new Error("PHZ collection ref must start with '.'");
    var body = s.slice(1);
    var parts = body.split(':');
    var ownerName = '.' + parts[0];
    var collName = parts.length > 1 ? parts.slice(1).join(':') : 'inside';
    return { ownerName: ownerName, collName: collName };
  };

  PhzEngine.prototype._getCollection = function (owner, collName) {
    if (!this._isContLike(owner)) {
      throw new Error('PHZ target is not a container');
    }
    var coll = owner.collections.get(collName);
    if (!coll) throw new Error("PHZ collection '" + collName + "' not found on " + (owner.name || 'anon'));
    return coll;
  };

  PhzEngine.prototype._detach = function (obj) {
    if (!obj || !obj.membership) return;
    var m = obj.membership;
    var owner = m.owner;
    var coll = owner.collections.get(m.collName);
    if (coll) {
      var idx = coll.items.indexOf(obj);
      if (idx >= 0) coll.items.splice(idx, 1);
    }
    obj.membership = null;
  };

  PhzEngine.prototype._insert = function (obj, owner, collName) {
    var coll = this._getCollection(owner, collName);
    if (!this.isTypeCompatible(obj.phzType || obj.kind, coll.elementType)) {
      throw new Error(
        "PHZ type '" + (obj.phzType || obj.kind) + "' is not compatible with collection '" +
        collName + "' expecting '" + coll.elementType + "'"
      );
    }
    if (coll.items.length >= coll.max) {
      throw new Error(
        'PHZ cont ' + (owner.name || '') + ':' + collName + ' overflow: count ' +
        coll.items.length + ' + add 1 > max ' + coll.max
      );
    }
    if (obj.membership) this._detach(obj);
    coll.items.push(obj);
    obj.membership = { owner: owner, collName: collName };
  };

  PhzEngine.prototype.spawn = function (genName, addCount, destRef, floorOverride) {
    var W = getWidth();
    var gen = this.gens.get(genName);
    if (!gen) throw new Error("PHZ gen '" + genName + "' is not defined");
    var ref = this.parseCollectionRef(destRef);
    var owner = this.getNamed(ref.ownerName);
    if (!owner || !this._isContLike(owner)) {
      throw new Error("PHZ cont '" + ref.ownerName + "' is not defined");
    }
    var coll = this._getCollection(owner, ref.collName);

    var add = Number(addCount);
    if (!Number.isFinite(add) || add < 0 || Math.floor(add) !== add) {
      throw new Error('PHZ gen add must be a non-negative integer');
    }
    if (coll.items.length + add > coll.max) {
      throw new Error(
        'PHZ cont ' + ref.ownerName + (ref.collName !== 'inside' ? ':' + ref.collName : '') +
        ' overflow: count ' + coll.items.length + ' + add ' + add + ' > max ' + coll.max
      );
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
      var obj = this._cloneTemplateObject(gen, floorBin);
      if (!this.isTypeCompatible(obj.phzType, coll.elementType)) {
        throw new Error(
          "PHZ spawn type '" + obj.phzType + "' incompatible with '" + coll.elementType + "'"
        );
      }
      obj.idAuto = true;
      coll.items.push(obj);
      obj.membership = { owner: owner, collName: ref.collName };
      this._incAnonCount(obj.phzType);
    }
  };

  PhzEngine.prototype.resolveObjectRef = function (ref) {
    if (!ref) return null;
    if (this._eachCurrent && (ref === ':each' || ref === 'each')) return this._eachCurrent;
    if (typeof ref === 'object' && ref.phzType) return ref;
    var s = String(ref);
    if (s[0] === '.') {
      var named = this.getNamed(s);
      if (named && named.kind !== 'gen') return named;
    }
    return null;
  };

  PhzEngine.prototype.moveObject = function (objOrRef, destRef) {
    var obj = this.resolveObjectRef(objOrRef);
    if (!obj) throw new Error('PHZ move: object not found');
    if (obj.kind === 'gen') throw new Error('Cannot move a gen');
    var dest = this.parseCollectionRef(destRef);
    var owner = this.getNamed(dest.ownerName);
    if (!owner || !this._isContLike(owner)) {
      throw new Error("PHZ move destination '" + dest.ownerName + "' is not a container");
    }
    this._insert(obj, owner, dest.collName);
  };

  PhzEngine.prototype.removeObject = function (objOrRef) {
    var obj = this.resolveObjectRef(objOrRef);
    if (!obj) throw new Error('PHZ remove: object not found');
    this._detach(obj);
  };

  PhzEngine.prototype.toFloor = function (objOrRef, floorVal) {
    var W = getWidth();
    var obj = this.resolveObjectRef(objOrRef);
    if (!obj) throw new Error('PHZ toFloor: object not found');
    var bin = W.encodeFloor(floorVal);
    this.setAttrValue(obj, 'floor', bin);
  };

  PhzEngine.prototype._listObjectAttrs = function (obj) {
    var attrs = [];
    if (!obj || !obj.attributes) return attrs;
    for (var [k, slot] of obj.attributes) {
      attrs.push({ name: k, value: this.interp.getValueFromRef(slot.ref), bits: slot.bits });
    }
    var enc = this._asciiTypeBits(obj.phzType || obj.kind);
    attrs.push({ name: 'type', value: enc.bin, bits: enc.bits });
    return attrs;
  };

  PhzEngine.prototype._formatObjectAttrs = function (obj) {
    var attrs = this._listObjectAttrs(obj);
    return '{' + attrs.map(function (a) {
      if (a.name === 'type') {
        var W = getWidth();
        // show type as readable name in dump
        try {
          var chars = [];
          var b = a.value;
          for (var i = 0; i + 8 <= b.length; i += 8) {
            chars.push(String.fromCharCode(parseInt(b.substring(i, i + 8), 2)));
          }
          return 'type=' + chars.join('');
        } catch (e) {
          return a.name + '=' + a.value;
        }
      }
      return a.name + '=' + a.value;
    }).join(', ') + '}';
  };

  PhzEngine.prototype._objectShowPayload = function (obj) {
    var attrs = this._listObjectAttrs(obj);
    return {
      value: null,
      ref: null,
      bitWidth: 0,
      isText: true,
      displayText: this._formatObjectAttrs(obj),
      phzObjectDump: true,
      phzAttrs: attrs,
    };
  };

  PhzEngine.prototype._collectionShowPayload = function (owner, collName) {
    var coll = this._getCollection(owner, collName);
    var objects = coll.items.map(function (obj, idx) {
      return { index: idx, dump: this._formatObjectAttrs(obj), attrs: this._listObjectAttrs(obj) };
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
  };

  PhzEngine.prototype._resolveCollectionPath = function (owner, collName, rest) {
    var W = getWidth();
    var coll = this._getCollection(owner, collName);
    var contents = coll.items;
    var count = contents.length;

    if (rest.length === 0) {
      return this._collectionShowPayload(owner, collName);
    }

    var head = rest[0];
    if (head === 'count') {
      return { value: W.decimalToWidthBin(count, W.MAX_BITS), ref: null, bitWidth: W.MAX_BITS };
    }
    if (head === 'empty') {
      return { value: count === 0 ? '1' : '0', ref: null, bitWidth: 1 };
    }

    // each binding for reads during iteration
    if (head === 'each') {
      if (!this._eachCurrent) throw new Error('PHZ :each is only valid during property-block iteration');
      var eachRest = rest.slice(1);
      if (eachRest.length === 0) return this._objectShowPayload(this._eachCurrent);
      if (eachRest.length === 1) return this.getAttrValue(this._eachCurrent, eachRest[0]);
      throw new Error("Invalid PHZ :each path");
    }

    var index;
    if (head === 'first') {
      if (count === 0) throw new Error('PHZ :' + collName + ':first on empty ' + owner.name);
      index = 0;
    } else if (head === 'last') {
      if (count === 0) throw new Error('PHZ :' + collName + ':last on empty ' + owner.name);
      index = count - 1;
    } else if (/^\d+$/.test(head)) {
      index = parseInt(head, 10);
      if (index < 0 || index >= count) {
        throw new Error('PHZ :' + collName + ' index ' + index + ' out of range (count=' + count + ')');
      }
    } else {
      throw new Error("Unknown PHZ collection segment '" + head + "'");
    }

    var obj = contents[index];
    var attrParts = rest.slice(1);
    if (attrParts.length === 0) return this._objectShowPayload(obj);
    if (attrParts.length !== 1) {
      throw new Error("Invalid PHZ collection attribute path");
    }
    return this.getAttrValue(obj, attrParts[0]);
  };

  PhzEngine.prototype.resolveProperty = function (instanceName, property) {
    var inst = this.getNamed(instanceName);
    if (!inst) return null;
    var parts = String(property || '').split(':').filter(function (p) { return p.length > 0; });
    if (parts.length === 0) {
      throw new Error('Cannot read PHZ instance ' + instanceName + ' without a property');
    }

    // Cont-like collection path (inside, wheels, …)
    if (this._isContLike(inst) && inst.collections.has(parts[0])) {
      return this._resolveCollectionPath(inst, parts[0], parts.slice(1));
    }

    if (parts[0] === 'inside' && !this._isContLike(inst)) {
      throw new Error('PHZ :inside is only valid on cont instances');
    }

    if (parts.length === 1) {
      return this.getAttrValue(inst, parts[0]);
    }
    throw new Error("Unknown PHZ property path '" + property + "' on " + instanceName);
  };

  /** Resolve self-relative property path against current self / each. */
  PhzEngine.prototype.resolveSelfProperty = function (property) {
    var selfName = this._selfName;
    if (!selfName) throw new Error('PHZ self-relative path requires an active property block');
    return this.resolveProperty(selfName, property);
  };

  PhzEngine.prototype._formatAttrDocValue = function (slot) {
    if (!slot) return '?';
    var bin = this.interp.getValueFromRef(slot.ref);
    var bits = slot.bits || (bin ? bin.length : 0);
    var dec = parseInt(String(bin || '0').replace(/[^01]/g, '') || '0', 2);
    if (!Number.isFinite(dec)) dec = 0;
    return dec + ' (' + bits + 'bit)';
  };

  PhzEngine.prototype._pushCollectionDocLines = function (lines, collections) {
    if (!collections) return;
    for (var [collName, coll] of collections) {
      if (collName === 'inside' && coll.elementType === 'obj') {
        // default inside shown via max attr; still list if non-default element type handled below
      }
      lines.push('  ' + collName + ': ' + coll.elementType + '[' + coll.max + ']');
    }
  };

  PhzEngine.prototype._pushAttrDocLines = function (lines, inst) {
    if (!inst || !inst.attributes) return;
    var order = [];
    if (inst.attributes.has('id')) order.push('id');
    if (inst.attributes.has('floor')) order.push('floor');
    if (inst.kind === 'gen') order.push('type');
    for (var [k] of inst.attributes) {
      if (k === 'id' || k === 'floor') continue;
      order.push(k);
    }
    var seen = {};
    for (var i = 0; i < order.length; i++) {
      var name = order[i];
      if (seen[name]) continue;
      seen[name] = true;
      if (name === 'type' && inst.kind === 'gen') {
        lines.push('  type: ' + (inst.type || 'obj'));
        continue;
      }
      if (!inst.attributes.has(name)) continue;
      if (name === 'id' && inst.idAuto) {
        lines.push('  id: auto');
        continue;
      }
      lines.push('  ' + name + ': ' + this._formatAttrDocValue(inst.attributes.get(name)));
    }
  };

  /** doc(phz) — builtins, user types, named instances, anonymous counts. */
  PhzEngine.prototype.formatPhzIndexDoc = function () {
    var lines = ['phz.obj', 'phz.gen', 'phz.cont'];
    for (var [typeName] of this.types) {
      lines.push(this.formatTypeTag(typeName));
    }

    var named = [];
    for (var ni = 0; ni < this.namedOrder.length; ni++) {
      var nInst = this.getNamed(this.namedOrder[ni]);
      if (nInst) named.push(nInst);
    }

    lines.push('');
    if (named.length === 0) {
      lines.push('(no user defined phz)');
    } else {
      lines.push('User defined phz:');
      for (var i = 0; i < named.length; i++) {
        var inst = named[i];
        var tag = this.formatTypeTag(inst.phzType || inst.kind);
        lines.push(inst.name + ' (' + tag + ')');
      }
    }

    if (this.anonCounts.size > 0) {
      lines.push('');
      for (var [anonType, count] of this.anonCounts) {
        lines.push(count + 'x (' + this.formatTypeTag(anonType) + ')');
      }
    }
    return lines;
  };

  /** doc(phz.obj) / doc(phz.wheel) — type template. */
  PhzEngine.prototype.formatTypeDoc = function (typeName) {
    var t = typeName || '';
    if (t === 'obj') {
      return [
        'phz [obj] .name:',
        '  id: auto',
        '  floor: 0 (8bit)',
        '  …attrs…',
        '  :',
      ];
    }
    if (t === 'gen') {
      return [
        'phz [gen] .name:',
        '  type: obj|Type',
        '  floor: 0 (8bit)',
        '  …template attrs…',
        '  :',
        '  :{',
        '    add',
        '    inside',
        '    set',
        '    floor?',
        '  }',
      ];
    }
    if (t === 'cont') {
      return [
        'phz [cont] .name:',
        '  floor: 0 (8bit)',
        '  max: 16 (16bit)',
        '  inside: obj[16]',
        '  :',
      ];
    }
    var def = this.types.get(t);
    if (!def) return ['phz.' + t + ': undefined PHZ type'];
    var lines = ['phz +[' + t + ' < ' + def.base + ']:'];
    if (def.rootKind === 'cont' && def.collections) {
      Object.keys(def.collections).forEach(function (collName) {
        var coll = def.collections[collName];
        lines.push('  ' + collName + ': ' + coll.elementType + '[' + coll.max + ']');
      });
    }
    if (def.attrDefs) {
      Object.keys(def.attrDefs).forEach(function (attrName) {
        if (def.attrDefs[attrName] && def.attrDefs[attrName].kind === 'collection') return;
        lines.push('  ' + attrName + ': …');
      });
    }
    lines.push('  :');
    return lines;
  };

  /** doc(.inst) — named PHZ instance attributes / collections. */
  PhzEngine.prototype.formatInstanceDoc = function (inst) {
    if (!inst) return ['(no PHZ instance)'];
    var kind = this.formatTypeKind(inst.phzType || inst.kind);
    var lines = ['phz [' + kind + '] ' + (inst.name || '.anon') + ':'];
    this._pushAttrDocLines(lines, inst);
    if (inst.collections) {
      this._pushCollectionDocLines(lines, inst.collections);
    }
    lines.push('  :');
    return lines;
  };

  /**
   * doc(phz) / doc(phz.type).
   * @param {string} name e.g. 'phz' or 'phz.wheel'
   */
  PhzEngine.prototype.formatDocLines = function (name) {
    if (name === 'phz') return this.formatPhzIndexDoc();
    if (typeof name === 'string' && name.startsWith('phz.')) {
      return this.formatTypeDoc(name.slice(4));
    }
    return [String(name) + ': unknown PHZ doc'];
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PhzEngine: PhzEngine };
  }
  global.LogTScriptPhzEngine = PhzEngine;
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
