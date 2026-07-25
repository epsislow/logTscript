var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function mmapAddrBits(maxAddr) {
  const n = Math.max(1, maxAddr);
  if (n <= 1) return 1;
  return 32 - Math.clz32(n - 1);
}

var MmapComponent = class MmapComponent extends BuiltinComponent {
  static get type() { return 'mmap'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return { regionsBlockAttrs: ['regions'], literalAttrs: ['unmapped'] };
  }

  getWidthBits() {
    return 8;
  }

  _resolveMemRef(ref, ctx) {
    const comp = ctx.components.get(ref);
    if (!comp || comp.type !== 'mem') {
      throw Error(`mmap mem region ${ref} must be comp [mem]`);
    }
    if (!comp.deviceIds || !comp.deviceIds[0]) {
      throw Error(`mmap mem region ${ref} has no device id`);
    }
    const depth = comp.attributes.depth !== undefined ? parseInt(comp.attributes.depth, 10) : 4;
    const length = comp.attributes.length !== undefined ? parseInt(comp.attributes.length, 10) : 3;
    const readonly = !!(comp.attributes && comp.attributes.readonly);
    return { ref, memId: comp.deviceIds[0], depth, length, readonly };
  }

  _resolveRegsRef(ref, ctx) {
    const comp = ctx.components.get(ref);
    if (!comp || comp.type !== 'reg') {
      throw Error(`mmap regs region ${ref} must be comp [reg]`);
    }
    if (!comp.deviceIds || !comp.deviceIds[0]) {
      throw Error(`mmap regs region ${ref} has no device id`);
    }
    const depth = comp.attributes.depth !== undefined ? parseInt(comp.attributes.depth, 10) : 4;
    const length = comp.attributes.length !== undefined ? parseInt(comp.attributes.length, 10) : 1;
    return { ref, regsId: comp.deviceIds[0], depth, length };
  }

  _wireBits(ctx, wireName) {
    const wire = ctx.wires.get(wireName);
    if (!wire || !wire.type) return null;
    const m = /^(\d+)wire$/.exec(wire.type);
    return m ? parseInt(m[1], 10) : null;
  }

  _parseMmioTarget(target, depth, ctx) {
    if (!target) throw Error('mmap mmio slot target missing');
    if (target.charAt(0) === '.') {
      const dot = target.indexOf(':');
      if (dot < 0) throw Error(`mmap mmio target ${target} must be wire or .comp:pin`);
      const compRef = target.slice(0, dot);
      const pin = target.slice(dot + 1);
      const comp = ctx.components.get(compRef);
      if (!comp) throw Error(`mmap mmio target ${compRef} not found`);
      const handler = ctx.componentRegistry.get(comp.type);
      let bits = depth;
      if (handler && typeof handler.getWidthBits === 'function') {
        bits = handler.getWidthBits(comp.attributes) || depth;
      }
      if (bits !== depth) {
        throw Error(`mmap mmio ${target} width ${bits} must equal depth ${depth}`);
      }
      const readOnly = pin === 'busy' || pin === 'done' || pin === 'started' || pin === 'get';
      return { kind: 'pin', compRef, pin, bits: depth, readOnly };
    }
    const bits = this._wireBits(ctx, target);
    if (bits == null) throw Error(`mmap mmio wire ${target} not found`);
    if (bits !== depth) {
      throw Error(`mmap mmio wire ${target} width ${bits} must equal depth ${depth}`);
    }
    return { kind: 'wire', wireName: target, bits: depth };
  }

  _buildDeviceSlots(compRef, depth, ctx) {
    const comp = ctx.components.get(compRef);
    if (!comp) throw Error(`mmap device ${compRef} not found`);
    const handler = ctx.componentRegistry.get(comp.type);
    if (!handler || typeof handler.constructor.getMmapProfile !== 'function') {
      throw Error(`mmap device ${compRef} type ${comp.type} has no getMmapProfile`);
    }
    const profile = handler.constructor.getMmapProfile(comp, depth);
    if (!profile || !profile.slots || !profile.slots.length) {
      throw Error(`mmap device ${compRef} returned empty profile`);
    }
    const slots = [];
    for (let i = 0; i < profile.slots.length; i++) {
      const s = profile.slots[i];
      slots.push({
        kind: 'device',
        offset: s.offset,
        bits: depth,
        readOnly: !!s.readOnly,
        deviceProfile: {
          compRef,
          deviceId: comp.deviceIds[0],
          readPin: s.readPin || null,
          writePin: s.writePin || null,
          writeLatch: s.writeLatch || null,
        },
      });
    }
    return slots;
  }

  _buildRegions(attributes, ctx) {
    const raw = attributes.regions;
    if (!raw || !raw.length) {
      throw Error('mmap requires regions: with at least one entry');
    }
    let depth = attributes.depth !== undefined ? parseInt(attributes.depth, 10) : null;
    const built = [];
    let maxEnd = 0;
    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const base = typeof mmapParseInt === 'function' ? mmapParseInt(r.base) : parseInt(r.base, 10);
      const size = typeof mmapParseInt === 'function' ? mmapParseInt(r.size) : parseInt(r.size, 10);
      if (isNaN(base) || isNaN(size)) throw Error('mmap region base/size must be numeric');
      if (r.mem) {
        const mem = this._resolveMemRef(r.mem, ctx);
        if (depth === null) depth = mem.depth;
        else if (depth !== mem.depth) {
          throw Error(`mmap mems depth mismatch: expected ${depth}, ${mem.ref} has ${mem.depth}`);
        }
        if (size > mem.length) {
          throw Error(`mmap region size ${size} exceeds mem ${mem.ref} length ${mem.length}`);
        }
        built.push({
          kind: 'mem',
          base,
          size,
          memId: mem.memId,
          memRef: mem.ref,
          readonly: mem.readonly,
        });
      } else if (r.regs) {
        const regs = this._resolveRegsRef(r.regs, ctx);
        if (depth === null) depth = regs.depth;
        else if (depth !== regs.depth) {
          throw Error(`mmap regs depth mismatch: expected ${depth}, ${regs.ref} has ${regs.depth}`);
        }
        if (size > regs.length) {
          throw Error(`mmap region size ${size} exceeds reg ${regs.ref} length ${regs.length}`);
        }
        built.push({
          kind: 'regs',
          base,
          size,
          regsId: regs.regsId,
          regsRef: regs.ref,
        });
      } else if (r.mmio) {
        if (depth === null) depth = attributes.depth !== undefined ? parseInt(attributes.depth, 10) : 8;
        const slots = [];
        const slotMap = r.mmio || {};
        const keys = Object.keys(slotMap).map(k => parseInt(k, 10)).sort((a, b) => a - b);
        for (let k = 0; k < keys.length; k++) {
          const off = keys[k];
          const target = slotMap[String(off)];
          const slot = this._parseMmioTarget(target, depth, ctx);
          slot.offset = off;
          slots.push(slot);
        }
        built.push({ kind: 'mmio', base, size, slots });
      } else if (r.device) {
        if (depth === null) depth = attributes.depth !== undefined ? parseInt(attributes.depth, 10) : 8;
        const slots = this._buildDeviceSlots(r.device, depth, ctx);
        built.push({ kind: 'mmio', base, size, slots });
      } else {
        throw Error('mmap region requires mem:, regs:, mmio:, or device:');
      }
      if (base + size > maxEnd) maxEnd = base + size;
    }
    if (depth === null) depth = 8;
    return { depth, regions: built, maxEnd };
  }

  getRedirectProperties() {
    return ['read'];
  }

  supportsPropertyName(property) {
    return ['read', 'adr', 'data', 'write', 'get'].includes(property);
  }

  getSupportedProperties() {
    return ['read', 'adr', 'data', 'write', 'get'];
  }

  shouldApplyAfterPropertyBlock(propertyNames) {
    return propertyNames.includes('get') || propertyNames.includes('write');
  }

  getDef(attributes) {
    const depth = attributes && attributes.depth !== undefined ? String(attributes.depth) : '8';
    let addrBits = '16';
    if (attributes && attributes.regions && attributes.regions.length) {
      let maxEnd = 0;
      for (let i = 0; i < attributes.regions.length; i++) {
        const r = attributes.regions[i];
        const base = typeof mmapParseInt === 'function' ? mmapParseInt(r.base) : parseInt(r.base, 10);
        const size = typeof mmapParseInt === 'function' ? mmapParseInt(r.size) : parseInt(r.size, 10);
        if (!isNaN(base) && !isNaN(size) && base + size > maxEnd) maxEnd = base + size;
      }
      if (maxEnd > 0) addrBits = String(mmapAddrBits(maxEnd));
    }
    return {
      attrs: [
        { name: 'depth', value: 'integer' },
        { name: 'regions', value: 'region list' },
        { name: 'unmapped', value: 'error|read0|ignore' },
      ],
      initValue: null,
      pins: [
        { bits: addrBits, name: 'adr' },
        { bits: depth, name: 'data' },
        { bits: '1', name: 'write' },
        { bits: '1', name: 'get' },
      ],
      pouts: [
        { bits: depth, name: 'read' },
      ],
      returns: null,
    };
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    lines.push(`${alias} (mmap)`);
    lines.push('');
    lines.push(`depth: ${comp.mmapDepth || 8}`);
    lines.push('');
    lines.push('regions:');
    const regions = comp.mmapRegions || [];
    for (let i = 0; i < regions.length; i++) {
      const r = regions[i];
      if (r.kind === 'mem') {
        lines.push(`  ${r.base}..${r.base + r.size - 1}  mem ${r.memRef}`);
      } else if (r.kind === 'regs') {
        lines.push(`  ${r.base}..${r.base + r.size - 1}  regs ${r.regsRef}`);
      } else if (r.kind === 'mmio') {
        lines.push(`  ${r.base}..${r.base + r.size - 1}  mmio (${(r.slots || []).length} slots)`);
      }
    }
    return lines;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const { depth, regions } = this._buildRegions(attributes, ctx);
    const unmapped = attributes.unmapped || 'error';
    if (typeof addMmap === 'function') {
      addMmap(baseId, { depth, regions, unmapped });
    }
    return {
      deviceIds: [baseId],
      ref: null,
      mmapDepth: depth,
      mmapRegions: regions,
    };
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {
    if (compInfo.mmapRegions) return;
    const d = typeof getMmap === 'function' ? getMmap(compInfo.deviceIds[0]) : null;
    if (d) {
      compInfo.mmapDepth = d.depth;
      compInfo.mmapRegions = d.regions;
    }
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate' || !pending) return;
    if (typeof mmapApplyPins === 'function') {
      mmapApplyPins(comp.deviceIds[0], pending, reEvaluate, this, ctx);
    }
    if (pending.write !== undefined || pending.get !== undefined) {
      if (ctx.updateComponentConnections) ctx.updateComponentConnections(compName);
    }
  }

  evalGetProperty(comp, property, a, ctx) {
    if (property !== 'read') return null;
    const d = typeof getMmap === 'function' ? getMmap(comp.deviceIds[0]) : null;
    if (!d) return null;
    const val = d.lastRead != null ? d.lastRead : mmapZero(d.depth);
    const br = this.handleBitRange(a, val, a.var, 'read', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:read`, bitWidth: d.depth };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MmapComponent;
}
