var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function dmaParseQueue(attributes) {
  if (attributes.queue === undefined) return 1;
  const n = parseInt(attributes.queue, 10);
  if (isNaN(n) || n < 0) return 1;
  return n;
}

function dmaParseModeAttr(attributes) {
  if (typeof dmaParseMode === 'function') return dmaParseMode(attributes && attributes.mode);
  const m = attributes && attributes.mode;
  if (m === 'paced' || m === 1 || m === '1') return 'paced';
  return 'instant';
}

function dmaParseChunkAttr(attributes) {
  if (typeof dmaParseChunk === 'function') return dmaParseChunk(attributes && attributes.chunk);
  if (attributes && attributes.chunk === undefined) return 1;
  const n = parseInt(attributes.chunk, 10);
  if (isNaN(n) || n < 1) throw Error('DMA chunk must be a positive integer');
  return n;
}

function dmaQueueSizeBits(capacity) {
  const cap = Math.max(1, capacity);
  return Math.max(1, 32 - Math.clz32(cap));
}

var DmaComponent = class DmaComponent extends BuiltinComponent {
  static get type() { return 'dma'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return { refListAttrs: ['mems'], literalAttrs: ['mode'] };
  }

  getWidthBits(attributes) {
    const slots = attributes.memsMembers ? attributes.memsMembers.length : 1;
    return dmaSlotBits(slots);
  }

  _resolveMemSlots(attributes, ctx) {
    const refs = attributes.memsMembers;
    if (!refs || !refs.length) {
      throw Error('DMA requires mems: with at least one comp [mem]');
    }
    const slots = [];
    let depth = null;
    let maxLen = 1;
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i];
      const comp = ctx.components.get(ref);
      if (!comp || comp.type !== 'mem') {
        throw Error(`DMA mems entry ${ref} must be comp [mem]`);
      }
      if (!comp.deviceIds || !comp.deviceIds[0]) {
        throw Error(`DMA mems entry ${ref} has no device id`);
      }
      const d = comp.attributes.depth !== undefined ? parseInt(comp.attributes.depth, 10) : 4;
      const length = comp.attributes.length !== undefined ? parseInt(comp.attributes.length, 10) : 3;
      if (depth === null) depth = d;
      else if (depth !== d) {
        throw Error(`DMA mems depth mismatch: expected ${depth} bits, ${ref} has ${d}`);
      }
      if (length > maxLen) maxLen = length;
      const readonly = !!(comp.attributes && comp.attributes.readonly);
      slots.push({
        slot: i + 1,
        ref,
        memId: comp.deviceIds[0],
        depth: d,
        length,
        readonly,
      });
    }
    return { slots, depth, maxAddrBits: dmaAddrBits(maxLen) };
  }

  _dmaId(comp) {
    return comp.deviceIds[0];
  }

  getDef(attributes) {
    const slotCount = attributes && attributes.memsMembers ? attributes.memsMembers.length : 1;
    const slotBits = dmaSlotBits(slotCount);
    const addrBits = '4';
    const depthBits = '8';
    const qCap = attributes ? dmaParseQueue(attributes) : 1;
    const qsBits = String(dmaQueueSizeBits(qCap));
    const ctrBits = '16';
    const countBits = addrBits;
    return {
      attrs: [
        { name: 'mems', value: '.mem …' },
        { name: 'queue', value: 'integer (default 1)' },
        { name: 'mode', value: 'instant|paced' },
        { name: 'chunk', value: 'integer (default 1, paced only)' },
      ],
      initValue: null,
      pins: [
        { bits: String(slotBits), name: 'src' },
        { bits: String(slotBits), name: 'dst' },
        { bits: addrBits, name: 'srcAdr' },
        { bits: addrBits, name: 'dstAdr' },
        { bits: addrBits, name: 'count' },
        { bits: depthBits, name: 'value' },
        { bits: '1', name: 'set' },
        { bits: '1', name: 'reset' },
      ],
      pouts: [
        { bits: '1', name: 'busy' },
        { bits: '1', name: 'done' },
        { bits: qsBits, name: 'queueSize' },
        { bits: '1', name: 'queueFull' },
        { bits: '1', name: 'started' },
        { bits: '1', name: 'queued' },
        { bits: '1', name: 'rejected' },
        { bits: ctrBits, name: 'startedTotal' },
        { bits: ctrBits, name: 'queuedTotal' },
        { bits: ctrBits, name: 'rejectedTotal' },
        { bits: ctrBits, name: 'submitSeq' },
        { bits: countBits, name: 'remaining' },
      ],
      returns: null,
    };
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    lines.push(`${alias} (dma)`);
    lines.push('');
    const slots = comp.dmaMemSlots || [];
    if (slots.length) {
      lines.push('mems (slot → instance):');
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        lines.push(`  ${s.slot}  ${s.ref}`);
      }
    } else {
      lines.push('mems: (none)');
    }
    const q = comp.attributes && comp.attributes.queue !== undefined ? comp.attributes.queue : 1;
    const mode = comp.attributes && comp.attributes.mode ? comp.attributes.mode : 'instant';
    const chunk = comp.attributes && comp.attributes.chunk !== undefined ? comp.attributes.chunk : 1;
    lines.push('');
    lines.push(`queue: ${q}`);
    lines.push(`mode: ${mode}`);
    if (mode === 'paced' || mode === 1 || mode === '1') {
      lines.push(`chunk: ${chunk}`);
    }
    return lines;
  }

  supportsPropertyName(property) {
    return ['busy', 'done', 'queueSize', 'queueFull', 'started', 'queued', 'rejected',
      'startedTotal', 'queuedTotal', 'rejectedTotal', 'submitSeq', 'remaining'].includes(property);
  }

  getSupportedProperties() {
    return ['src', 'dst', 'srcAdr', 'dstAdr', 'count', 'value', 'set', 'reset',
      'busy', 'done', 'queueSize', 'queueFull', 'started', 'queued', 'rejected',
      'startedTotal', 'queuedTotal', 'rejectedTotal', 'submitSeq', 'remaining'];
  }

  getRedirectProperties() {
    return ['busy', 'done', 'queueSize', 'queueFull', 'started', 'queued', 'rejected',
      'startedTotal', 'queuedTotal', 'rejectedTotal', 'submitSeq', 'remaining'];
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const { slots, depth, maxAddrBits } = this._resolveMemSlots(attributes, ctx);
    const queueCapacity = dmaParseQueue(attributes);
    const mode = dmaParseModeAttr(attributes);
    const chunk = dmaParseChunkAttr(attributes);
    if (typeof addDma === 'function') {
      addDma(baseId, {
        memSlots: slots,
        queueCapacity,
        depth,
        maxAddrBits,
        mode,
        chunk,
      });
    }
    return {
      deviceIds: [baseId],
      ref: null,
      dmaMemSlots: slots,
    };
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {
    if (compInfo.dmaMemSlots) return;
    const d = typeof getDma === 'function' ? getDma(compInfo.deviceIds[0]) : null;
    if (d && d.memSlots) compInfo.dmaMemSlots = d.memSlots;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate' || !pending) return;
    if (typeof dmaApplyPins === 'function') {
      dmaApplyPins(this._dmaId(comp), pending, reEvaluate, this, ctx);
    }
    if (pending.set !== undefined && ctx.updateComponentConnections) {
      ctx.updateComponentConnections(compName);
    }
  }

  evalGetProperty(comp, property, a, ctx) {
    const d = typeof getDma === 'function' ? getDma(this._dmaId(comp)) : null;
    if (!d) return null;
    const qBits = dmaQueueSizeBits(d.queueCapacity);
    const ctrBits = 16;
    const countBits = d.maxAddrBits || 4;
    let val = null;
    let bitWidth = 1;
    switch (property) {
      case 'busy':
        val = d.busy ? '1' : '0';
        break;
      case 'done':
        val = d.done ? '1' : '0';
        break;
      case 'queueSize':
        val = d.queue.length.toString(2).padStart(qBits, '0');
        bitWidth = qBits;
        break;
      case 'queueFull':
        val = dmaQueueFull(d) ? '1' : '0';
        break;
      case 'started':
        val = d.started ? '1' : '0';
        break;
      case 'queued':
        val = d.queued ? '1' : '0';
        break;
      case 'rejected':
        val = d.rejected ? '1' : '0';
        break;
      case 'startedTotal':
        val = d.startedTotal.toString(2).padStart(ctrBits, '0');
        bitWidth = ctrBits;
        break;
      case 'queuedTotal':
        val = d.queuedTotal.toString(2).padStart(ctrBits, '0');
        bitWidth = ctrBits;
        break;
      case 'rejectedTotal':
        val = d.rejectedTotal.toString(2).padStart(ctrBits, '0');
        bitWidth = ctrBits;
        break;
      case 'submitSeq':
        val = d.submitSeq.toString(2).padStart(ctrBits, '0');
        bitWidth = ctrBits;
        break;
      case 'remaining': {
        const rem = typeof dmaGetRemaining === 'function' ? dmaGetRemaining(d) : 0;
        val = rem.toString(2).padStart(countBits, '0');
        bitWidth = countBits;
        break;
      }
      default:
        return null;
    }
    const br = this.handleBitRange(a, val, a.var, property, ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DmaComponent;
}
