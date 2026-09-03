var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var IoportComponent = class IoportComponent extends BuiltinComponent {
  static get type() { return 'ioport'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return { bindingAttrs: ['in', 'out'] };
  }

  getWidthBits() {
    return 1;
  }

  getSupportedProperties() { return ['in', 'out']; }
  getRedirectProperties() { return ['in', 'out']; }

  getForbidDirectAssign() {
    return 'I/O port output must be written with .name:out = value (not direct .name = assignment)';
  }

  getDef(attributes) {
    const inW = attributes && attributes.inWidth != null ? attributes.inWidth : 'X';
    const outW = attributes && attributes.outWidth != null ? attributes.outWidth : 'Y';
    return {
      attrs: [
        { name: 'in', value: '.component' },
        { name: 'out', value: '.component' },
        { name: 'nl', value: null }
      ],
      initValue: null,
      pins: [{ bits: String(outW), name: 'out' }],
      pouts: [{ bits: String(inW), name: 'in' }],
      returns: null
    };
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    lines.push(`${alias} (ioport)`);
    lines.push('');
    lines.push('Input:');
    if (comp.inMap && comp.inMap.length) {
      for (const seg of comp.inMap) {
        lines.push(`  ${seg.start}-${seg.end}   ${seg.name}`);
      }
    } else {
      lines.push('  (none)');
    }
    lines.push('');
    lines.push('Output:');
    if (comp.outMap && comp.outMap.length) {
      for (const seg of comp.outMap) {
        lines.push(`  ${seg.start}-${seg.end}   ${seg.name}`);
      }
    } else {
      lines.push('  (none)');
    }
    return lines;
  }

  _readMemberGet(ctx, memberName) {
    const member = ctx.components.get(memberName);
    if (!member) {
      throw Error(`IOPORT member ${memberName} is not defined`);
    }
    if (member.type !== 'dip') {
      throw Error(`IOPORT input member ${memberName} must be comp [dip], got ${member.type}`);
    }
    const handler = ctx.componentRegistry.get('dip');
    const result = handler.evalGetProperty(member, 'get', { var: memberName, property: 'get' }, ctx);
    if (!result || result.value == null) {
      const bits = ctx.getComponentBits('dip', member.attributes) || 1;
      return '0'.repeat(bits);
    }
    return result.value;
  }

  _readOutBus(comp, ctx) {
    if (!comp.outMap || !comp.outMap.length) return '';
    let bus = '';
    for (const seg of comp.outMap) {
      const member = ctx.components.get(seg.name);
      if (!member) {
        bus += '0'.repeat(seg.bits);
        continue;
      }
      let val = null;
      if (member.ref && member.ref !== '&-') {
        val = ctx.getValueFromRef(member.ref);
      }
      if (val == null) {
        const handler = ctx.componentRegistry.get('led');
        if (handler) {
          const result = handler.evalGetProperty(member, 'get', { var: seg.name, property: 'get' }, ctx);
          if (result && result.value != null) val = result.value;
        }
      }
      if (val == null) val = '0'.repeat(seg.bits);
      if (val.length < seg.bits) val = val.padStart(seg.bits, '0');
      else if (val.length > seg.bits) val = val.substring(val.length - seg.bits);
      bus += val;
    }
    return bus;
  }

  _readInBus(comp, ctx) {
    if (!comp.inMap || !comp.inMap.length) return '';
    let bus = '';
    for (const seg of comp.inMap) {
      bus += this._readMemberGet(ctx, seg.name);
    }
    return bus;
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property === 'in') {
      const val = this._readInBus(comp, ctx);
      const br = this.handleBitRange(a, val, a.var, 'in', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:in`, bitWidth: comp.inWidth || val.length };
    }
    if (property === 'out') {
      const val = this._readOutBus(comp, ctx);
      const br = this.handleBitRange(a, val, a.var, 'out', ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:out`, bitWidth: comp.outWidth || val.length };
    }
    return null;
  }

  _assignMemberLed(ctx, memberName, slice) {
    const member = ctx.components.get(memberName);
    if (!member) throw Error(`IOPORT member ${memberName} is not defined`);
    if (member.type !== 'led') {
      throw Error(`IOPORT output member ${memberName} must be comp [led], got ${member.type}`);
    }
    const bits = ctx.getComponentBits('led', member.attributes) || slice.length;
    let val = slice;
    if (val.length < bits) val = val.padStart(bits, '0');
    else if (val.length > bits) val = val.substring(val.length - bits);

    if (member.ref && member.ref !== '&-') {
      ctx.setValueAtRef(member.ref, val);
    } else {
      const storageIdx = ctx.storeValue(val);
      member.ref = `&${storageIdx}`;
    }
    const handler = ctx.componentRegistry.get('led');
    if (handler && handler.updateDisplayValue) {
      handler.updateDisplayValue(member, val);
    }
    ctx._emitComputedComponentProbes(memberName);
    ctx.updateComponentConnections(memberName);
  }

  _splitAndAssignOut(comp, busValue, ctx) {
    if (!comp.outMap || !comp.outMap.length) return;
    let bus = busValue || '';
    const total = comp.outWidth || 0;
    if (bus.length < total) bus = bus.padStart(total, '0');
    else if (bus.length > total) bus = bus.substring(bus.length - total);

    for (const seg of comp.outMap) {
      const slice = bus.substring(seg.start, seg.end + 1);
      this._assignMemberLed(ctx, seg.name, slice);
    }
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'out') return false;
    this._splitAndAssignOut(comp, value, ctx);
    return true;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (!pending || pending.out === undefined) return;
    let outValue = this.reEvalPendingValue(pending, 'out', reEvaluate, ctx);
    if (outValue == null) return;
    this._splitAndAssignOut(comp, outValue, ctx);
  }

  _buildMaps(compInfo, attributes, ctx) {
    const inMembers = attributes.inMembers || [];
    const outMembers = attributes.outMembers || [];
    if (!inMembers.length && !outMembers.length) {
      throw Error('IOPORT requires at least one in = or out = binding');
    }

    const inMap = [];
    let inOffset = 0;
    for (const memberName of inMembers) {
      this._assertMemberAvailable(memberName, compInfo.name, ctx);
      const member = ctx.components.get(memberName);
      if (!member) {
        throw Error(`IOPORT input member ${memberName} is not defined (declare it before ${compInfo.name})`);
      }
      if (member.type !== 'dip') {
        throw Error(`IOPORT input member ${memberName} must be comp [dip]`);
      }
      const bits = ctx.getComponentBits('dip', member.attributes) || 1;
      inMap.push({ name: memberName, start: inOffset, end: inOffset + bits - 1, bits });
      inOffset += bits;
      ctx._registerIoportMember(memberName, compInfo.name);
    }

    const outMap = [];
    let outOffset = 0;
    for (const memberName of outMembers) {
      this._assertMemberAvailable(memberName, compInfo.name, ctx);
      const member = ctx.components.get(memberName);
      if (!member) {
        throw Error(`IOPORT output member ${memberName} is not defined (declare it before ${compInfo.name})`);
      }
      if (member.type !== 'led') {
        throw Error(`IOPORT output member ${memberName} must be comp [led]`);
      }
      const bits = ctx.getComponentBits('led', member.attributes) || 1;
      outMap.push({ name: memberName, start: outOffset, end: outOffset + bits - 1, bits });
      outOffset += bits;
      ctx._registerIoportMember(memberName, compInfo.name);
    }

    compInfo.inMembers = inMembers.slice();
    compInfo.outMembers = outMembers.slice();
    compInfo.inMap = inMap;
    compInfo.outMap = outMap;
    compInfo.inWidth = inOffset;
    compInfo.outWidth = outOffset;
    attributes.inWidth = inOffset;
    attributes.outWidth = outOffset;
  }

  _assertMemberAvailable(memberName, portName, ctx) {
    if (!ctx.ioportMemberOwners) ctx.ioportMemberOwners = new Map();
    const existing = ctx.ioportMemberOwners.get(memberName);
    if (existing && existing !== portName) {
      throw Error(`Component '${memberName}' already belongs to ioport '${existing}'`);
    }
  }

  _mountMembers(compInfo, ctx) {
    if (typeof mountIoportMember !== 'function') return;
    const containerId = compInfo.deviceIds[0];
    for (const memberName of compInfo.inMembers || []) {
      mountIoportMember(containerId, memberName, 'in');
    }
    for (const memberName of compInfo.outMembers || []) {
      mountIoportMember(containerId, memberName, 'out');
    }
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const nl = attributes.nl || false;
    const label = name;

    if (typeof addIoportContainer === 'function') {
      addIoportContainer({ id: baseId, label, nl });
    }

    const compInfo = {
      type: 'ioport',
      componentType: null,
      attributes,
      initialValue: null,
      returnType: null,
      ref: null,
      deviceIds: [baseId],
      name
    };

    this._buildMaps(compInfo, attributes, ctx);
    this._mountMembers(compInfo, ctx);

    return { deviceIds: compInfo.deviceIds, ref: null, earlyReturn: true, compInfo };
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = IoportComponent; }
