var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function aluParseList(attr) {
  if (typeof normalizeAluList === 'function') return normalizeAluList(attr);
  if (!attr) return [];
  if (Array.isArray(attr)) return attr.map(s => String(s).trim()).filter(Boolean);
  return String(attr).split(',').map(s => s.trim()).filter(Boolean);
}

function aluOpBits(extraOp) {
  const count = 4 + extraOp.length;
  if (typeof aluBitIndexWidth === 'function') return aluBitIndexWidth(count);
  return count <= 1 ? 1 : 32 - Math.clz32(count - 1);
}

function aluLength(attributes) {
  return attributes && attributes.length !== undefined ? parseInt(attributes.length, 10) : 4;
}

var AluComponent = class AluComponent extends BuiltinComponent {
  static get type() { return 'alu'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return {
      listAttrs: ['extraOp', 'extraFlags'],
      bindingAttrs: ['lut'],
    };
  }

  getWidthBits(attributes) {
    return aluLength(attributes);
  }

  getSupportedProperties() {
    return ['result', 'get', 'carry', 'zero', 'over', 'mod',
      'overflow', 'less', 'equal', 'negative', 'sign', 'borrow'];
  }

  getRedirectProperties() {
    return ['result', 'get', 'carry', 'zero', 'over', 'mod',
      'overflow', 'less', 'equal', 'negative', 'sign', 'borrow'];
  }

  supportsPropertyName(property, attributes) {
    const base = ['result', 'get', 'carry', 'zero'];
    if (base.includes(property)) return true;
    const extraOp = aluParseList(attributes.extraOp).map(s => s.toUpperCase());
    const extraFlags = aluParseList(attributes.extraFlags).map(s => s.toLowerCase());
    if (property === 'over' && extraOp.includes('MUL')) return true;
    if (property === 'mod' && extraOp.includes('DIV')) return true;
    if (extraFlags.includes(property.toLowerCase())) return true;
    return false;
  }

  getDef(attributes) {
    const attrs = attributes || {};
    const length = aluLength(attrs);
    const extraOp = aluParseList(attrs.extraOp).map(s => s.toUpperCase());
    const extraFlags = aluParseList(attrs.extraFlags).map(s => s.toLowerCase());
    const opBits = aluOpBits(extraOp);
    const defAttrs = [
      { name: 'length', value: 'integer' },
      { name: 'on', value: '1/raise/edge' },
      { name: 'extraOp', value: 'ID list (optional)' },
      { name: 'extraFlags', value: 'ID list (optional)' },
      { name: 'lut', value: '.component (optional)' },
    ];
    const pins = [
      { bits: '1', name: 'set' },
      { bits: String(length), name: 'a' },
      { bits: String(length), name: 'b' },
      { bits: String(opBits), name: 'op' },
    ];
    const pouts = [
      { bits: String(length), name: 'result' },
      { bits: String(length), name: 'get' },
      { bits: '1', name: 'carry' },
      { bits: '1', name: 'zero' },
    ];
    if (extraOp.includes('MUL')) pouts.push({ bits: String(length), name: 'over' });
    if (extraOp.includes('DIV')) pouts.push({ bits: String(length), name: 'mod' });
    for (const f of extraFlags) pouts.push({ bits: '1', name: f });
    return {
      attrs: defAttrs,
      initValue: null,
      pins,
      pouts,
      returns: null,
    };
  }

  finalizeCompInfo(compInfo, attributes) {
    const extraOp = aluParseList(attributes.extraOp).map(s => s.toUpperCase());
    const extraFlags = aluParseList(attributes.extraFlags).map(s => s.toLowerCase());
    attributes.extraOp = extraOp;
    attributes.extraFlags = extraFlags;
    attributes._opBits = aluOpBits(extraOp);
    compInfo.extraOp = extraOp.slice();
    compInfo.extraFlags = extraFlags.slice();
    compInfo.lutMembers = (attributes.lutMembers || []).slice();
  }

  _aluId(comp) { return comp.deviceIds[0]; }

  _depth(comp) { return aluLength(comp.attributes); }

  _readOutput(comp, property) {
    const id = this._aluId(comp);
    const depth = this._depth(comp);
    if (property === 'result' || property === 'get') {
      let val = typeof getAluResult === 'function' ? getAluResult(id) : null;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      return { val, bitWidth: depth };
    }
    if (property === 'carry') {
      let val = typeof getAluCarry === 'function' ? getAluCarry(id) : '0';
      return { val: val || '0', bitWidth: 1 };
    }
    if (property === 'zero') {
      let val = typeof getAluZero === 'function' ? getAluZero(id) : '0';
      return { val: val || '0', bitWidth: 1 };
    }
    if (property === 'over') {
      let val = typeof getAluOver === 'function' ? getAluOver(id) : null;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      return { val, bitWidth: depth };
    }
    if (property === 'mod') {
      let val = typeof getAluMod === 'function' ? getAluMod(id) : null;
      if (val === null || val === undefined) val = '0'.repeat(depth);
      return { val, bitWidth: depth };
    }
    if (typeof getAluFlag === 'function') {
      const val = getAluFlag(id, property) || '0';
      return { val, bitWidth: 1 };
    }
    return null;
  }

  evalGetProperty(comp, property, a, ctx) {
    if (!this.supportsPropertyName(property, comp.attributes)) return null;
    const out = this._readOutput(comp, property);
    if (!out) return null;
    const br = this.handleBitRange(a, out.val, a.var, property, ctx);
    if (br) return br;
    return { value: out.val, ref: null, varName: `${a.var}:${property}`, bitWidth: out.bitWidth };
  }

  _resolveLutId(comp, ctx) {
    const members = comp.lutMembers || comp.attributes.lutMembers || [];
    if (!members.length) return null;
    const lutName = members[0];
    const lutComp = ctx.components && ctx.components.get(lutName);
    if (!lutComp || lutComp.type !== 'lut' || !lutComp.deviceIds.length) return null;
    return lutComp.deviceIds[0];
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const length = aluLength(attributes);
    if (length <= 0) throw Error(`ALU length must be positive for component ${name}`);
    const extraOp = aluParseList(attributes.extraOp).map(s => s.toUpperCase());
    const extraFlags = aluParseList(attributes.extraFlags).map(s => s.toLowerCase());
    attributes.extraOp = extraOp;
    attributes.extraFlags = extraFlags;
    const lutId = this._resolveLutId({ attributes, lutMembers: attributes.lutMembers }, ctx);
    if (typeof addAlu === 'function') {
      addAlu({
        id: baseId,
        length,
        extraOp,
        extraFlags,
        lutId,
        nl: !!attributes.nl,
      });
    }
    return { deviceIds: [baseId], ref: null };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'a' && property !== 'b' && property !== 'op') return false;
    const id = this._aluId(comp);
    const depth = this._depth(comp);
    const opBits = comp.attributes._opBits || aluOpBits(aluParseList(comp.attributes.extraOp));
    let binValue = property === 'op' ? this.padOrTruncate(value, opBits) : this.padOrTruncate(value, depth);
    if (property === 'a' && typeof setAluA === 'function') setAluA(id, binValue);
    else if (property === 'b' && typeof setAluB === 'function') setAluB(id, binValue);
    else if (property === 'op' && typeof setAluOp === 'function') setAluOp(id, binValue);
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending) return;
    const id = this._aluId(comp);
    const depth = this._depth(comp);
    const opBits = comp.attributes._opBits || aluOpBits(aluParseList(comp.attributes.extraOp));
    if (pending.a !== undefined) {
      let aValue = this.reEvalPendingValue(pending, 'a', reEvaluate, ctx);
      if (typeof setAluA === 'function') setAluA(id, this.padOrTruncate(aValue, depth));
    }
    if (pending.b !== undefined) {
      let bValue = this.reEvalPendingValue(pending, 'b', reEvaluate, ctx);
      if (typeof setAluB === 'function') setAluB(id, this.padOrTruncate(bValue, depth));
    }
    if (pending.op !== undefined) {
      let opValue = this.reEvalPendingValue(pending, 'op', reEvaluate, ctx);
      if (typeof setAluOp === 'function') setAluOp(id, this.padOrTruncate(opValue, opBits));
    }
    if (pending.set !== undefined) {
      let setValue = this.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
      if (setValue === '1' || (setValue && setValue[setValue.length - 1] === '1')) {
        const lutId = this._resolveLutId(comp, ctx);
        if (typeof setAluLutId === 'function') setAluLutId(id, lutId);
        if (typeof executeAlu === 'function') executeAlu(id);
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = AluComponent; }
