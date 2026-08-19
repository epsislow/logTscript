var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function logicReadWire(wireName, width, ctx) {
  const val = ctx.getWireEffectiveValue(wireName);
  return val || '0'.repeat(width);
}

function logicWriteWire(wireName, value, width, ctx) {
  let v = value || '0'.repeat(width);
  if (v.length < width) v = v.padStart(width, '0');
  else if (v.length > width) v = v.slice(-width);
  if (!ctx.wires.has(wireName)) throw Error(`Logic output wire '${wireName}' not found`);
  if (ctx._logicRedirectSyncWrite) {
    ctx.writeWireStable(wireName, v);
    if (typeof ctx.deferWirePropagation === 'function' && ctx.deferWirePropagation()
        && ctx.signalPropagationStrategy) {
      ctx.signalPropagationStrategy.wirePendingStates.set(wireName, v);
    }
    return;
  }
  if (typeof ctx.publishWireValue === 'function') {
    ctx.publishWireValue(wireName, v);
    return;
  }
  ctx.writeWireStable(wireName, v);
  if (typeof ctx.updateConnectedComponents === 'function') {
    ctx.updateConnectedComponents(wireName, v);
  }
}

function logicWireShape(wire, ctx) {
  if (wire && wire.tensor && wire.tensor.dims) {
    const rows = wire.tensor.dims[0];
    const cols = wire.tensor.dims[1];
    const ew = wire.tensor.elementWidth;
    if (wire.tensor.singleDim || rows === 1) {
      return { kind: 'vector', ew, count: rows * cols };
    }
    return { kind: 'matrix', ew, rows, cols };
  }
  if (wire && wire.vector && wire.vector.elementCount > 1) {
    return {
      kind: 'vector',
      ew: wire.vector.elementWidth,
      count: wire.vector.elementCount,
    };
  }
  const w = ctx.getBitWidth(wire.type);
  return { kind: 'scalar', ew: w };
}

var LogicComponent = class LogicComponent extends BuiltinComponent {
  static get type() { return 'logic'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }
  static get TEXT_PIN_MIN_BITS() { return 8; }
  static get TEXT_PIN_MAX_BITS() { return 256; }
  static get NUMBER_PIN_MIN_BITS() { return 8; }
  static get NUMBER_PIN_DEFAULT_BITS() { return 64; }
  static get NUMBER_PIN_MAX_BITS() { return 64; }

  _fitTextPinWidth(bitLen) {
    let n = bitLen == null || bitLen <= 0 ? LogicComponent.TEXT_PIN_MIN_BITS : bitLen;
    if (n % 8 !== 0) n = Math.ceil(n / 8) * 8;
    return Math.min(LogicComponent.TEXT_PIN_MAX_BITS, Math.max(LogicComponent.TEXT_PIN_MIN_BITS, n));
  }

  _fitNumberPinWidth(bitLen) {
    if (bitLen == null || bitLen <= 0) return LogicComponent.NUMBER_PIN_DEFAULT_BITS;
    let n = bitLen;
    if (n % 8 !== 0) n = Math.ceil(n / 8) * 8;
    return Math.min(LogicComponent.NUMBER_PIN_MAX_BITS, Math.max(LogicComponent.NUMBER_PIN_MIN_BITS, n));
  }

  _writeVarPinStorage(pin, value, ctx, fitFn) {
    const targetBits = fitFn(value != null ? String(value).length : 0);
    let v = value != null ? String(value) : '';
    if (v.length < targetBits) v = v.padStart(targetBits, '0');
    else if (v.length > targetBits) v = v.slice(-targetBits);
    if (pin.bits !== targetBits) {
      const storageIdx = ctx.storeValue(v);
      pin.ref = `&${storageIdx}`;
      pin.bits = targetBits;
    } else {
      ctx.setValueAtRef(pin.ref, v);
    }
    return v;
  }

  _writeTextPinStorage(pin, value, ctx) {
    return this._writeVarPinStorage(pin, value, ctx, (n) => this._fitTextPinWidth(n));
  }

  _writeNumberPinStorage(pin, value, ctx) {
    return this._writeVarPinStorage(pin, value, ctx, (n) => this._fitNumberPinWidth(n));
  }

  getSpecialParseAttributes() {
    return {
      logicProgramBlockAttrs: true,
    };
  }

  getWidthBits() { return 1; }

  getSupportedProperties() {
    return ['execCount', 'truncated', 'depthExceeded'];
  }

  getRedirectProperties() {
    return ['execCount', 'truncated', 'depthExceeded'];
  }

  _parsePositiveIntAttr(attributes, name, compName) {
    if (attributes[name] == null || attributes[name] === '') return null;
    const n = parseInt(String(attributes[name]), 10);
    if (isNaN(n) || n < 1) {
      throw Error(`logic ${compName}: ${name} must be a positive integer`);
    }
    return n;
  }

  getDef() {
    return {
      attrs: [
        { name: 'on', value: 'mode (raise / edge / 1)' },
        { name: 'maxDepth', value: 'integer (default 256)' },
        { name: 'maxSolutions', value: 'integer (default 64)' },
      ],
      initValue: '1bit',
      pins: [{ bits: '1', name: 'set' }],
      pouts: [
        { bits: '16', name: 'execCount' },
        { bits: '1', name: 'truncated' },
        { bits: '1', name: 'depthExceeded' },
      ],
      returns: '1bit',
    };
  }

  _parsePrograms(attributes, ctx, compName) {
    const blocks = attributes.logicPrograms;
    if (!blocks || !blocks.length) {
      throw Error(`logic ${compName}: requires inline reference block (.module { ... })`);
    }
    const programs = [];
    for (const block of blocks) {
      const inst = ctx.inlineInstances.get(block.ref);
      if (!inst || inst.kind !== 'logic') {
        throw Error(`logic program ${block.ref} must be inline [logic]`);
      }
      const bindings = typeof parseLogicProgramBlock === 'function'
        ? parseLogicProgramBlock(block.bodyRaw)
        : [];
      programs.push({ ref: block.ref, inst, bindings });
    }
    return programs;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const programs = this._parsePrograms(attributes, ctx, name);
    const prog = programs[0];
    const pinDefs = {};
    const inputVars = new Set();
    for (const b of prog.bindings) {
      if (pinDefs[b.pinName]) {
        throw Error(`logic ${name}: duplicate pin '${b.pinName}'`);
      }
      inputVars.add(b.logicVar);
      pinDefs[b.pinName] = {
        logicVar: b.logicVar,
        bindType: b.bindType,
        bits: b.bindType === 'bool'
          ? 1
          : b.bindType === 'text'
            ? LogicComponent.TEXT_PIN_MIN_BITS
            : b.bindType === 'number'
              ? LogicComponent.NUMBER_PIN_DEFAULT_BITS
              : 8,
      };
    }

    const merged = typeof logicResolveMerged === 'function'
      ? logicResolveMerged(prog.inst, ctx.inlineInstances)
      : prog.inst;
    const listGoalsFn = typeof logicListFreeVarsInGoals === 'function' ? logicListFreeVarsInGoals : null;
    const listGoalFn = typeof logicListFreeVarsInGoal === 'function' ? logicListFreeVarsInGoal : null;
    const queryGoalsFn = typeof logicQueryGoals === 'function' ? logicQueryGoals : null;
    const queryMeta = {};
    if (listGoalsFn || listGoalFn) {
      for (const q of merged.queries || []) {
        const goals = queryGoalsFn ? queryGoalsFn(q) : (q.goals || (q.goal ? [q.goal] : []));
        let free;
        if (listGoalsFn) {
          free = listGoalsFn(goals);
        } else {
          const acc = new Set();
          for (const g of goals) {
            for (const v of listGoalFn(g)) acc.add(v);
          }
          free = [...acc];
        }
        free = free.filter((v) => !inputVars.has(v));
        if (free.length > 2) {
          throw Error(`logic ${name}: query '${q.name}' has ${free.length} output variables (maximum 2)`);
        }
        queryMeta[q.name] = { freeVars: free };
      }
    }

    const maxDepth = this._parsePositiveIntAttr(attributes, 'maxDepth', name);
    const maxSolutions = this._parsePositiveIntAttr(attributes, 'maxSolutions', name);

    const compInfo = {
      type: 'logic',
      name,
      attributes,
      deviceIds: [baseId],
      ref: null,
      programRef: prog.ref,
      programBindings: prog.bindings,
      pinDefs,
      pinStorage: {},
      queryResults: {},
      queryMeta,
      execCount: 0,
      truncated: 0,
      depthExceeded: 0,
      maxDepth,
      maxSolutions,
      _logicRedirects: [],
    };

    for (const [pinName, meta] of Object.entries(pinDefs)) {
      const initial = '0'.repeat(meta.bits);
      const storageIdx = ctx.storeValue(initial);
      compInfo.pinStorage[pinName] = {
        bits: meta.bits,
        ref: `&${storageIdx}`,
        logicVar: meta.logicVar,
        bindType: meta.bindType,
      };
    }

    return { earlyReturn: true, compInfo };
  }

  finalizeCompInfo(compInfo, attributes) {
    if (attributes.logicPrograms && attributes.logicPrograms.length) {
      compInfo.programRef = attributes.logicPrograms[0].ref;
    }
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    const pin = comp.pinStorage && comp.pinStorage[property];
    if (!pin) return false;
    if (pin.bindType === 'text') {
      this._writeTextPinStorage(pin, value, ctx);
      return true;
    }
    if (pin.bindType === 'number') {
      this._writeNumberPinStorage(pin, value, ctx);
      return true;
    }
    let v = value || '0'.repeat(pin.bits);
    if (v.length < pin.bits) v = v.padStart(pin.bits, '0');
    else if (v.length > pin.bits) v = v.slice(-pin.bits);
    ctx.setValueAtRef(pin.ref, v);
    return true;
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

  _readPinValues(comp, pending, reEvaluate, ctx) {
    const inputEnv = {};
    for (const [pinName, pin] of Object.entries(comp.pinStorage || {})) {
      let bits;
      if (pending && pending[pinName]) {
        bits = this.reEvalPendingValue(pending, pinName, reEvaluate, ctx);
      } else {
        bits = ctx.getValueFromRef(pin.ref) || '0'.repeat(pin.bits);
      }
      if (pin.bindType === 'text') {
        bits = this._writeTextPinStorage(pin, bits, ctx);
      } else if (pin.bindType === 'number') {
        bits = this._writeNumberPinStorage(pin, bits, ctx);
      } else {
        if (bits.length < pin.bits) bits = bits.padStart(pin.bits, '0');
        else if (bits.length > pin.bits) bits = bits.slice(-pin.bits);
      }
      const term = typeof logicPinToInputValue === 'function'
        ? logicPinToInputValue(bits, pin.bindType)
        : { kind: 'number', value: parseInt(bits, 2) || 0 };
      inputEnv[pin.logicVar] = term;
    }
    return inputEnv;
  }

  _runLogic(comp, compName, pending, reEvaluate, ctx, redirects) {
    const resolveFn = typeof logicResolveMerged === 'function' ? logicResolveMerged : null;
    const execFn = typeof executeLogicQueries === 'function' ? executeLogicQueries : null;
    if (!resolveFn || !execFn) throw Error('Logic engine is not loaded');

    const inst = ctx.inlineInstances.get(comp.programRef);
    if (!inst) throw Error(`logic ${compName}: inline ${comp.programRef} not found`);

    const merged = resolveFn(inst, ctx.inlineInstances);
    const inputEnv = this._readPinValues(comp, pending, reEvaluate, ctx);
    const execOpts = {};
    if (comp.maxDepth != null) execOpts.maxDepth = comp.maxDepth;
    if (comp.maxSolutions != null) execOpts.maxSolutions = comp.maxSolutions;
    const raw = execFn(merged, inputEnv, execOpts);
    const meta = raw._logicMeta || {};
    delete raw._logicMeta;
    comp.queryResults = raw;
    comp.truncated = meta.truncated ? 1 : 0;
    comp.depthExceeded = meta.depthExceeded ? 1 : 0;
    comp.execCount = (comp.execCount || 0) + 1;

    this._applyRedirects(comp, compName, redirects, ctx);
  }

  _applyRedirects(comp, compName, redirects, ctx) {
    if (!redirects || !redirects.length) return;
    const encFn = typeof logicTermToWireValue === 'function' ? logicTermToWireValue : null;
    const fillFn = typeof logicGetElementFill === 'function' ? logicGetElementFill : null;
    const packVecFn = typeof logicPackVectorSolutions === 'function' ? logicPackVectorSolutions : null;
    const packMatFn = typeof logicPackMatrixSolutions === 'function' ? logicPackMatrixSolutions : null;
    const packRowFn = typeof logicPackMatrixRow === 'function' ? logicPackMatrixRow : null;
    const packColFn = typeof logicPackMatrixCol === 'function' ? logicPackMatrixCol : null;
    const encodeFn = typeof logicEncodeSolutionTerm === 'function' ? logicEncodeSolutionTerm : null;

    for (const rd of redirects) {
      const qName = rd.queryName || rd.poutName;

      const targetName = rd.target && rd.target.var;
      if (!targetName) continue;
      const wire = ctx.wires.get(targetName);
      if (!wire) throw Error(`Logic redirect wire '${targetName}' not found`);
      const shape = logicWireShape(wire, ctx);
      const width = ctx.getBitWidth(wire.type);
      const fillBits = fillFn ? fillFn(wire, ctx) : '0'.repeat(shape.ew || width);

      let bits = null;

      if (rd.property === 'pout>') {
        if (rd.poutName === 'truncated') {
          bits = comp.truncated ? '1' : '0';
        } else if (rd.poutName === 'depthExceeded') {
          bits = comp.depthExceeded ? '1' : '0';
        } else if (rd.poutName === 'execCount') {
          const count = comp.execCount != null ? comp.execCount : 0;
          bits = count.toString(2).padStart(width, '0').slice(-width);
        } else {
          const solutions = comp.queryResults && comp.queryResults[qName];
          if (!solutions) continue;
          const meta = comp.queryMeta && comp.queryMeta[qName];
          const freeVars = meta && meta.freeVars ? meta.freeVars : [];
          if (freeVars.length === 0) {
            const val = solutions.length > 0 ? 1 : 0;
            bits = encFn ? encFn({ kind: 'number', value: val }, width, 'bool') : (val ? '1' : '0');
          } else if (freeVars.length === 1 && shape.kind === 'vector' && packVecFn) {
            bits = packVecFn(solutions, freeVars, shape.count, shape.ew, fillBits);
          } else if (freeVars.length === 2 && shape.kind === 'matrix' && packMatFn) {
            bits = packMatFn(solutions, freeVars, shape.rows, shape.cols, shape.ew, fillBits);
          } else if (freeVars.length >= 1 && solutions.length > 0) {
            const sol = solutions[0];
            const term = sol[freeVars[0]];
            bits = encFn ? encFn(term, width, 'number') : '0'.repeat(width);
          } else {
            bits = fillBits.padStart(width, '0').slice(-width);
          }
        }
      } else if (rd.property === 'logicQuery>') {
        const solutions = comp.queryResults && comp.queryResults[qName];
        if (!solutions) continue;

        const meta = comp.queryMeta && comp.queryMeta[qName];
        const freeVars = meta && meta.freeVars ? meta.freeVars : [];
        const mode = rd.redirectMode || (rd.solutionIndex != null ? 'indexOrRow' : null);

        if (mode === 'count') {
          let count = solutions.length;
          if (shape.kind === 'matrix') count = Math.min(count, shape.rows);
          else if (shape.kind === 'vector') count = Math.min(count, shape.count);
          bits = encFn ? encFn({ kind: 'number', value: count }, width, 'number') : String(count);
        } else if (mode === 'width') {
          const cols = shape.kind === 'matrix' ? shape.cols : freeVars.length;
          bits = encFn ? encFn({ kind: 'number', value: cols }, width, 'number') : String(cols);
        } else if (mode === 'cell' && encodeFn) {
          const r = rd.rowIndex != null ? rd.rowIndex : 0;
          const c = rd.colIndex != null ? rd.colIndex : 0;
          if (r < solutions.length && freeVars[c]) {
            bits = encodeFn(solutions[r][freeVars[c]], shape.ew);
          } else {
            bits = fillBits;
          }
        } else if (mode === 'col' && packColFn) {
          if (freeVars.length < 2) {
            throw Error(`logic ${compName}: query '${qName}' column slice requires 2 free variables`);
          }
          const col = rd.colIndex != null ? rd.colIndex : 0;
          if (col < 0 || col >= freeVars.length) continue;
          const maxRows = shape.kind === 'matrix' ? shape.rows : shape.count;
          bits = packColFn(solutions, freeVars, col, maxRows, shape.ew, fillBits);
        } else if (mode === 'indexOrRow') {
          const idx = rd.solutionIndex != null ? rd.solutionIndex : rd.rowIndex;
          if (freeVars.length === 1 && shape.kind === 'scalar') {
            if (!solutions[idx]) continue;
            const term = solutions[idx][freeVars[0]];
            bits = encFn ? encFn(term, width, 'number') : '0'.repeat(width);
          } else if (freeVars.length === 2 && shape.kind === 'vector' && packRowFn) {
            const cols = freeVars.length;
            bits = packRowFn(solutions, freeVars, idx, cols, shape.ew, fillBits);
          } else if (freeVars.length === 1 && shape.kind === 'vector' && encodeFn) {
            const cells = [];
            for (let i = 0; i < shape.count; i++) {
              if (i === idx && solutions[idx]) {
                cells.push(encodeFn(solutions[idx][freeVars[0]], shape.ew));
              } else {
                cells.push(fillBits);
              }
            }
            bits = cells.join('');
          } else if (!solutions[idx]) {
            continue;
          } else {
            const term = solutions[idx][freeVars[0]];
            bits = encFn ? encFn(term, width, 'number') : '0'.repeat(width);
          }
        }
      }

      if (bits == null) continue;
      logicWriteWire(targetName, bits, width, ctx);
    }
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending || pending.set === undefined) return;
    const setVal = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
    if (!this._isActive(setVal)) return;
    const redirects = comp._logicRedirects || [];
    this._runLogic(comp, compName, pending, reEvaluate, ctx, redirects);
    comp._logicRedirects = [];
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'execCount') {
      const count = comp.execCount != null ? comp.execCount : 0;
      const val = count.toString(2).padStart(16, '0');
      return { value: val, ref: null, varName: `${a.var}:execCount`, bitWidth: 16 };
    }
    if (property === 'truncated') {
      const val = comp.truncated ? '1' : '0';
      return { value: val, ref: null, varName: `${a.var}:truncated`, bitWidth: 1 };
    }
    if (property === 'depthExceeded') {
      const val = comp.depthExceeded ? '1' : '0';
      return { value: val, ref: null, varName: `${a.var}:depthExceeded`, bitWidth: 1 };
    }
    return null;
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.logicWireShape = logicWireShape;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LogicComponent;
}
