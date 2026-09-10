var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function interpWriteWire(wireName, value, width, ctx) {
  let v = value || '0'.repeat(width);
  if (v.length < width) v = v.padStart(width, '0');
  else if (v.length > width) v = v.slice(-width);
  if (!ctx.wires.has(wireName)) throw Error(`Interp output wire '${wireName}' not found`);
  ctx.writeWireStable(wireName, v);
  if (typeof ctx.deferWirePropagation === 'function' && ctx.deferWirePropagation()
      && ctx.signalPropagationStrategy) {
    ctx.signalPropagationStrategy.wirePendingStates.set(wireName, v);
    return;
  }
  if (typeof ctx.publishWireValue === 'function') {
    ctx.publishWireValue(wireName, v);
    return;
  }
  if (typeof ctx.updateConnectedComponents === 'function') {
    ctx.updateConnectedComponents(wireName, v);
  }
}

var InterpComponent = class InterpComponent extends BuiltinComponent {
  static get type() { return 'interp'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits() { return 1; }

  getSpecialParseAttributes() {
    return {
      interpProgramBlockAttrs: true,
      literalAttrs: ['astSchema'],
    };
  }

  _parsePrograms(attributes, ctx, compName) {
    const raw = attributes.interpPrograms || [];
    if (!raw.length) {
      throw Error(`comp ${compName}: missing inline [interp] link (e.g. .calcInterp { })`);
    }
    if (raw.length > 1) {
      throw Error(`comp ${compName}: exactly one inline [interp] link required`);
    }
    const entry = raw[0];
    const ref = entry.ref;
    const inst = ctx.inlineInstances.get(ref);
    if (!inst || inst.kind !== 'interp') {
      throw Error(`comp ${compName}: inline ${ref} not found or not [interp]`);
    }
    return { ref, inst };
  }

  _resolveAstSchemaRef(attributes) {
    const raw = attributes.astSchema;
    if (raw == null || raw === '') return null;
    const name = String(raw).replace(/^\./, '').replace(/\+$/, '');
    if (!name) throw Error('astSchema must name a user schema');
    return name;
  }

  _getProgram(comp, ctx) {
    const inst = ctx.inlineInstances.get(comp.programRef);
    if (!inst) throw Error(`interp ${comp.name}: inline ${comp.programRef} not found`);
    if (!inst.methods) {
      const parseFn = typeof parseInterpBody === 'function' ? parseInterpBody : null;
      if (!parseFn) throw Error('Interp assembler is not loaded');
      inst.methods = parseFn(inst.bodyRaw, `inline ${comp.programRef}`).methods;
    }
    return inst;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const prog = this._parsePrograms(attributes, ctx, name);
    const parseHeaderFn = typeof parseInterpCompHeaderPinPouts === 'function'
      ? parseInterpCompHeaderPinPouts : null;
    if (!parseHeaderFn) throw Error('Interp comp assembler is not loaded');

    const { pins, pouts } = parseHeaderFn(attributes, name);
    const astSchemaRef = this._resolveAstSchemaRef(attributes);
    if (!astSchemaRef) {
      throw Error(`comp ${name}: astSchema = .schema required`);
    }
    if (typeof validateAstSchemaHasPlus === 'function') {
      validateAstSchemaHasPlus(astSchemaRef, ctx.schemaRegistry);
    }

    const program = this._getProgram({ programRef: prog.ref, name }, ctx);
    if (program.requiresCompContext) {
      /* OK — comp provides push/remove context */
    }

    const pinByAlias = {};
    const pinStorage = {};
    for (const pin of pins) {
      const bitWFn = typeof interpCompPinPoutBitWidth === 'function' ? interpCompPinPoutBitWidth : null;
      const bitW = pin.vector ? 8 : (bitWFn ? bitWFn(pin) : 8);
      const storageIdx = ctx.storeValue('0'.repeat(bitW));
      pinByAlias[pin.execAlias] = pin;
      pinStorage[pin.execAlias] = {
        ref: `&${storageIdx}`,
        bits: bitW,
        decl: pin,
      };
    }

    const poutChannelDefs = {};
    const poutByAlias = {};
    const poutStorage = {};
    for (const pout of pouts) {
      const bitWFn = typeof interpCompPinPoutBitWidth === 'function' ? interpCompPinPoutBitWidth : null;
      const bitW = pout.vector ? 8 : (bitWFn ? bitWFn(pout) : 8);
      const storageIdx = ctx.storeValue('0'.repeat(bitW));
      poutChannelDefs[pout.channel] = Object.assign({}, pout, { wireBits: null });
      poutByAlias[pout.execAlias] = pout;
      poutStorage[pout.execAlias] = {
        ref: `&${storageIdx}`,
        bits: bitW,
        decl: pout,
        channel: pout.channel,
      };
    }

    const compInfo = {
      type: 'interp',
      name,
      attributes,
      deviceIds: [baseId],
      programRef: prog.ref,
      astSchemaRef,
      pinByAlias,
      pinStorage,
      poutChannelDefs,
      poutByAlias,
      poutStorage,
      _interpAstBits: null,
      _interpAstSchema: null,
    };

    if (attributes) {
      attributes.interpPoutAliases = Object.keys(poutByAlias);
      attributes.interpPinAliases = Object.keys(pinByAlias);
    }

    return { earlyReturn: true, compInfo };
  }

  getSupportedProperties() {
    return ['set', 'ast'];
  }

  getRedirectProperties() {
    return [];
  }

  supportsRedirectProperty(property, comp) {
    return !!(comp && comp.poutByAlias && comp.poutByAlias[property]);
  }

  supportsPropertyName(property, attributes) {
    if (property === 'set' || property === 'ast') return true;
    const pins = attributes && attributes.interpPinAliases;
    if (pins && pins.includes(property)) return true;
    return false;
  }

  _isActive(val) {
    return val === '1' || (val && val[val.length - 1] === '1');
  }

  reEvalPendingValue(pending, key, reEvaluate, ctx) {
    const entry = pending[key];
    if (!entry) return '0';
    if (!reEvaluate && entry.value != null) return entry.value;
    if (!entry.expr) return entry.value || '0';
    let value = '';
    const exprResult = ctx.evalExpr(entry.expr, false);
    for (const part of exprResult) {
      if (part.value && part.value !== '-') value += part.value;
      else if (part.ref && part.ref !== '&-') {
        const val = ctx.getValueFromRef(part.ref);
        if (val) value += val;
      }
    }
    return value;
  }

  _resolveAstSchema(comp, pending, ctx) {
    const entry = pending && pending.ast;
    if (entry && entry.schemaRef) {
      const name = String(entry.schemaRef).replace(/\+$/, '');
      if (typeof validateAstSchemaHasPlus === 'function') {
        validateAstSchemaHasPlus(name, ctx.schemaRegistry);
      }
      return name;
    }
    if (entry && entry.expr && entry.expr.length === 1 && entry.expr[0].var) {
      const w = ctx.wires.get(entry.expr[0].var);
      if (w && w.schemaRef && w.schemaRef !== 'parseResult') {
        return String(w.schemaRef).replace(/\+$/, '');
      }
      if (w && w.parseAstSchemaRef) {
        return String(w.parseAstSchemaRef).replace(/\+$/, '');
      }
    }
    return comp.astSchemaRef;
  }

  _readAstBits(pending, reEvaluate, ctx, compName) {
    const entry = pending && pending.ast;
    if (!entry || !entry.expr) {
      throw Error(`interp ${compName}: exec block requires ast = …`);
    }
    const bits = this.reEvalPendingValue(pending, 'ast', reEvaluate, ctx);
    return bits == null ? '' : String(bits);
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    const pin = comp.pinStorage && comp.pinStorage[property];
    if (!pin) return false;
    let v = value == null ? '' : String(value);
    if (pin.decl && pin.decl.vector) {
      pin.bits = v.length || pin.bits;
    } else if (v.length < pin.bits) {
      v = v.padStart(pin.bits, '0');
    } else if (v.length > pin.bits) {
      v = v.slice(-pin.bits);
    }
    ctx.setValueAtRef(pin.ref, v);
    return true;
  }

  static validatePropertyBlockWiring(comp, compName, properties, ctx) {
    if (!comp || comp.type !== 'interp') return;
    const validateFn = typeof validateInterpCompPinPoutWire === 'function'
      ? validateInterpCompPinPoutWire : null;
    const extractFn = typeof interpCompExtractWireName === 'function'
      ? interpCompExtractWireName : null;
    if (!validateFn || !extractFn) return;

    for (const p of properties || []) {
      if (p.property === 'pout>' && p.poutName && p.target && p.target.var) {
        const decl = comp.poutByAlias && comp.poutByAlias[p.poutName];
        if (decl) validateFn(decl, p.target.var, ctx, compName, 'pout');
        continue;
      }
      const pinDecl = comp.pinByAlias && comp.pinByAlias[p.property];
      if (!pinDecl || !p.expr) continue;
      const wireName = extractFn(p.expr);
      if (wireName) validateFn(pinDecl, wireName, ctx, compName, 'pin');
    }
  }

  static preparePropertyBlock(comp, properties, ctx, compName) {
    if (!comp || comp.type !== 'interp') return;
    InterpComponent.validatePropertyBlockWiring(comp, compName, properties, ctx);
    for (const p of properties || []) {
      if (p.property !== 'ast' || !p.expr) continue;
      const schemaName = InterpComponent._resolveAstSchemaStatic(comp, p, ctx);
      let bits = '';
      const exprResult = ctx.evalExpr(p.expr, false);
      for (const part of exprResult) {
        if (part.value && part.value !== '-') bits += part.value;
        else if (part.ref && part.ref !== '&-') {
          const val = ctx.getValueFromRef(part.ref);
          if (val) bits += val;
        }
      }
      const validateFn = typeof validateInterpAstWire === 'function' ? validateInterpAstWire : null;
      if (validateFn) {
        try {
          validateFn(bits, schemaName, ctx.schemaRegistry);
        } catch (err) {
          const detail = err && err.message ? err.message : String(err);
          throw Error(`ast binary is invalid for schema ${schemaName}: ${detail}`);
        }
      }
      comp._interpAstBits = bits;
      comp._interpAstSchema = schemaName;
    }
  }

  static _resolveAstSchemaStatic(comp, astProp, ctx) {
    if (astProp.schemaRef) {
      const name = String(astProp.schemaRef).replace(/\+$/, '');
      if (typeof validateAstSchemaHasPlus === 'function') {
        validateAstSchemaHasPlus(name, ctx.schemaRegistry);
      }
      return name;
    }
    if (astProp.expr && astProp.expr.length === 1 && astProp.expr[0].var) {
      const w = ctx.wires.get(astProp.expr[0].var);
      if (w && w.schemaRef && w.schemaRef !== 'parseResult') {
        return String(w.schemaRef).replace(/\+$/, '');
      }
      if (w && w.parseAstSchemaRef) {
        return String(w.parseAstSchemaRef).replace(/\+$/, '');
      }
    }
    return comp.astSchemaRef;
  }

  _buildPinEnv(comp, pending, reEvaluate, ctx, compName) {
    const decodeFn = typeof decodeInterpCompPinBits === 'function' ? decodeInterpCompPinBits : null;
    if (!decodeFn) throw Error('Interp engine is not loaded');
    const env = {};
    for (const [alias, pin] of Object.entries(comp.pinStorage || {})) {
      let bits;
      if (pending && pending[alias]) {
        bits = this.reEvalPendingValue(pending, alias, reEvaluate, ctx);
      } else {
        bits = ctx.getValueFromRef(pin.ref) || '0'.repeat(pin.bits);
      }
      env[alias] = decodeFn(bits, pin.decl, alias);
    }
    return env;
  }

  _applyPoutWires(comp, compName, ctx, committedChannels) {
    const channelFilter = committedChannels != null;
    const channelSet = channelFilter ? new Set(committedChannels) : null;
    for (const prop of comp._interpRedirectProps || []) {
      if (prop.property !== 'pout>') continue;
      const store = comp.poutStorage[prop.poutName];
      if (!store) continue;
      if (channelFilter && !channelSet.has(store.channel)) continue;
      let val = ctx.getValueFromRef(store.ref) || '0'.repeat(store.bits);
      const target = prop.target && prop.target.var;
      if (!target) continue;
      const wire = ctx.wires.get(target);
      if (!wire) throw Error(`Wire ${target} not found for ${prop.poutName}>= assignment`);
      const w = ctx.getBitWidth(wire.type);
      if (val.length < w) val = val.padStart(w, '0');
      else if (val.length > w) val = val.slice(-w);
      interpWriteWire(target, val, w, ctx);
    }
    if (typeof ctx._emitComputedComponentProbes === 'function') {
      ctx._emitComputedComponentProbes(compName);
    }
  }

  _commitPoutBuffer(comp, buffer, ctx, compName, pending, reEvaluate) {
    for (const [channel, encoded] of Object.entries(buffer || {})) {
      const def = comp.poutChannelDefs[channel];
      if (!def) continue;
      const store = comp.poutStorage[def.execAlias];
      if (!store) continue;
      const bits = encoded == null ? '' : String(encoded);
      if (bits.length > store.bits) {
        const storageIdx = ctx.storeValue(bits);
        store.ref = `&${storageIdx}`;
        store.bits = bits.length;
      } else {
        let v = bits;
        if (v.length < store.bits) v = v.padStart(store.bits, '0');
        ctx.setValueAtRef(store.ref, v);
      }
      def.wireBits = bits;
    }
    comp._lastPending = pending;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending || pending.set === undefined) return;
    const setVal = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!this._isActive(setVal)) return;

    const astBits = comp._interpAstBits != null
      ? comp._interpAstBits
      : this._readAstBits(pending, reEvaluate, ctx, compName);
    const schemaName = comp._interpAstSchema || this._resolveAstSchema(comp, pending, ctx);

    const programInst = this._getProgram(comp, ctx);
    const pinEnv = this._buildPinEnv(comp, pending, reEvaluate, ctx, compName);

    const poutChannelDefs = {};
    for (const [ch, def] of Object.entries(comp.poutChannelDefs || {})) {
      const store = comp.poutStorage[def.execAlias];
      let wireBits = null;
      if (store && store.ref) {
        wireBits = ctx.getValueFromRef(store.ref);
      }
      const redirect = (comp._interpRedirectProps || []).find(
        (p) => p.property === 'pout>' && p.poutName === def.execAlias,
      );
      if (redirect && redirect.target && redirect.target.var) {
        const tw = ctx.wires.get(redirect.target.var);
        if (tw) {
          const w = ctx.getBitWidth(tw.type);
          if (tw.ref) wireBits = ctx.getValueFromRef(tw.ref);
          if (w) {
            let bits = wireBits == null ? '' : String(wireBits);
            if (bits.length < w) bits = bits.padStart(w, '0');
            else if (bits.length > w) bits = bits.slice(-w);
            wireBits = bits;
          }
        }
      }
      poutChannelDefs[ch] = Object.assign({}, def, { wireBits });
    }

    const execFn = typeof evalInterpCompExec === 'function' ? evalInterpCompExec : null;
    if (!execFn) throw Error('Interp engine is not loaded');

    let buffer;
    try {
      buffer = execFn(astBits, schemaName, ctx.schemaRegistry, programInst, pinEnv, {
        poutBuffer: {},
        poutChannelDefs,
      });
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (typeof ctx.reportRuntimeError === 'function') {
        ctx.reportRuntimeError(msg);
      }
      throw err;
    }

    this._commitPoutBuffer(comp, buffer, ctx, compName, pending, reEvaluate);
    comp._interpLastCommittedPoutChannels = Object.keys(buffer || {});
    this._applyPoutWires(comp, compName, ctx, comp._interpLastCommittedPoutChannels);
    comp._interpAstBits = null;
    comp._interpAstSchema = null;
  }

  shouldApplyAfterPropertyBlock(propertyNames) {
    return propertyNames.some((p) => p === 'set');
  }

  evalGetProperty(comp, property, a, ctx) {
    const store = comp.poutStorage && comp.poutStorage[property];
    if (!store) return null;
    let val = ctx.getValueFromRef(store.ref) || '0'.repeat(store.bits);
    return {
      value: val,
      ref: store.ref,
      varName: `${a.var}:${property}`,
      bitWidth: store.bits,
    };
  }

  getDef() {
    return {
      attrs: [
        { name: 'on', value: '0|1' },
        { name: 'astSchema', value: 'schemaRef' },
      ],
      initValue: null,
      pins: [],
      pouts: [],
      returns: null,
      on: true,
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = InterpComponent;
}
