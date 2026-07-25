/* ================= MMAP DEVICE ================= */

function dmMmap() {
  if (typeof deviceManager === 'function') return deviceManager();
  if (!dmMmap._store) dmMmap._store = { mmaps: new Map() };
  return dmMmap._store;
}

function mmapParseInt(v) {
  if (v == null) return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return NaN;
  if (/^\\/.test(s) || /^[0-9]+$/.test(s)) return parseInt(s.replace(/^\\/, ''), 10);
  if (/^0x/i.test(s)) return parseInt(s, 16);
  if (/^[01]+$/.test(s)) return parseInt(s, 2);
  return parseInt(s, 10);
}

function mmapZero(depth) {
  return '0'.repeat(Math.max(1, depth));
}

function mmapPadWord(val, depth) {
  const d = Math.max(1, depth);
  if (val == null) return mmapZero(d);
  let s = String(val);
  if (s.length < d) s = s.padStart(d, '0');
  if (s.length > d) s = s.slice(-d);
  return s;
}

function mmapFindRegion(m, addr) {
  const regions = m.regions || [];
  for (let i = 0; i < regions.length; i++) {
    const r = regions[i];
    if (addr >= r.base && addr < r.base + r.size) return { region: r, local: addr - r.base };
  }
  return null;
}

function mmapFindMmioSlot(region, local) {
  if (!region.slots) return null;
  for (let i = 0; i < region.slots.length; i++) {
    const s = region.slots[i];
    if (s.offset === local) return s;
  }
  return null;
}

function mmapReadWire(ctx, wireName, depth) {
  if (!ctx || !wireName) return mmapZero(depth);
  const val = typeof ctx.getWireStableValue === 'function'
    ? ctx.getWireStableValue(wireName)
    : null;
  return mmapPadWord(val, depth);
}

function mmapWriteWire(ctx, wireName, word, depth) {
  if (!ctx || !wireName) return;
  const padded = mmapPadWord(word, depth);
  if (typeof ctx.publishWireValue === 'function') {
    ctx.publishWireValue(wireName, padded);
    return;
  }
  if (typeof ctx.scheduleWireChange === 'function') {
    ctx.scheduleWireChange(wireName, padded);
  } else if (ctx.wires && ctx.wires.has(wireName)) {
    const wire = ctx.wires.get(wireName);
    if (wire && wire.ref && typeof ctx.setValueAtRef === 'function') {
      ctx.setValueAtRef(wire.ref, padded);
    }
  }
}

function mmapReadPin(ctx, compRef, pin, depth) {
  if (!ctx || !compRef) return mmapZero(depth);
  const comp = ctx.components.get(compRef);
  if (!comp) throw Error(`mmap mmio target ${compRef} not found`);
  const handler = ctx.componentRegistry && ctx.componentRegistry.get(comp.type);
  if (!handler) return mmapZero(depth);
  const r = handler.evalGetProperty(comp, pin, { var: compRef, property: pin }, ctx);
  const val = r && r.value != null ? r.value : mmapZero(depth);
  return mmapPadWord(val, depth);
}

function mmapWritePin(ctx, compRef, pin, word, depth, componentRegistry) {
  if (!ctx || !compRef) return;
  const comp = ctx.components.get(compRef);
  if (!comp) throw Error(`mmap mmio target ${compRef} not found`);
  const handler = componentRegistry && componentRegistry.get(comp.type);
  if (!handler || typeof handler.applyProperties !== 'function') {
    throw Error(`mmap cannot write ${compRef}:${pin}`);
  }
  const padded = mmapPadWord(word, depth);
  const pending = {};
  pending[pin] = { value: padded };
  handler.applyProperties(comp, compRef, pending, 'immediate', false, ctx);
  if (typeof ctx.updateComponentConnections === 'function') {
    ctx.updateComponentConnections(compRef);
  }
}

function mmapReadDeviceSlot(ctx, slot, depth) {
  if (!slot || !slot.deviceProfile) return mmapZero(depth);
  const p = slot.deviceProfile;
  if (p.readPin) return mmapReadPin(ctx, p.compRef, p.readPin, depth);
  return mmapZero(depth);
}

function mmapWriteDeviceSlot(ctx, slot, word, depth, componentRegistry) {
  if (!slot || !slot.deviceProfile) return;
  const p = slot.deviceProfile;
  if (p.writePin) {
    mmapWritePin(ctx, p.compRef, p.writePin, word, depth, componentRegistry);
    return;
  }
  if (p.writeLatch && p.deviceId && typeof getDma === 'function') {
    const d = getDma(p.deviceId);
    if (d) d.latch[p.writeLatch] = mmapPadWord(word, depth);
  }
}

function addMmap(id, config) {
  if (!id) return;
  const regions = mmapValidateRegions(config.regions || [], config.depth || 8);
  dmMmap().mmaps.set(id, {
    depth: config.depth || 8,
    unmapped: config.unmapped || 'error',
    regions,
    lastRead: null,
    latch: { adr: null, data: null },
  });
}

function getMmap(id) {
  return dmMmap().mmaps.get(id) || null;
}

function mmapResolve(id, addr) {
  const m = getMmap(id);
  if (!m) return null;
  const hit = mmapFindRegion(m, mmapParseInt(addr));
  if (!hit) return { unmapped: true };
  return { unmapped: false, region: hit.region, local: hit.local, kind: hit.region.kind };
}

function mmapRead(id, addr, ctx) {
  const m = getMmap(id);
  if (!m) throw Error('mmap not found');
  const a = mmapParseInt(addr);
  if (isNaN(a) || a < 0) throw Error('mmap invalid address');
  const hit = mmapFindRegion(m, a);
  if (!hit) {
    if (m.unmapped === 'read0') return mmapZero(m.depth);
    throw Error(`mmap unmapped address ${a}`);
  }
  const { region, local } = hit;
  if (region.kind === 'mem') {
    const val = typeof getMem === 'function' ? getMem(region.memId, local) : null;
    m.lastRead = mmapPadWord(val, m.depth);
    return m.lastRead;
  }
  if (region.kind === 'regs') {
    const val = typeof getReg === 'function' ? getReg(region.regsId, local) : null;
    m.lastRead = mmapPadWord(val, m.depth);
    return m.lastRead;
  }
  if (region.kind === 'mmio') {
    const slot = mmapFindMmioSlot(region, local);
    if (!slot) {
      m.lastRead = mmapZero(m.depth);
      return m.lastRead;
    }
    if (slot.kind === 'wire') m.lastRead = mmapReadWire(ctx, slot.wireName, m.depth);
    else if (slot.kind === 'pin') m.lastRead = mmapReadPin(ctx, slot.compRef, slot.pin, m.depth);
    else if (slot.kind === 'device') m.lastRead = mmapReadDeviceSlot(ctx, slot, m.depth);
    else m.lastRead = mmapZero(m.depth);
    return m.lastRead;
  }
  m.lastRead = mmapZero(m.depth);
  return m.lastRead;
}

function mmapWrite(id, addr, word, ctx, componentRegistry) {
  const m = getMmap(id);
  if (!m) throw Error('mmap not found');
  const a = mmapParseInt(addr);
  if (isNaN(a) || a < 0) throw Error('mmap invalid address');
  const padded = mmapPadWord(word, m.depth);
  const hit = mmapFindRegion(m, a);
  if (!hit) {
    if (m.unmapped === 'ignore') return;
    throw Error(`mmap unmapped address ${a}`);
  }
  const { region, local } = hit;
  if (region.kind === 'mem') {
    if (region.readonly) throw Error(`mmap cannot write readonly region at ${a}`);
    if (typeof setMem === 'function') setMem(region.memId, local, padded);
    return;
  }
  if (region.kind === 'regs') {
    if (typeof setReg === 'function') setReg(region.regsId, padded, local);
    if (ctx && region.regsRef && ctx.updateComponentConnections) {
      ctx.updateComponentConnections(region.regsRef);
    }
    return;
  }
  if (region.kind === 'mmio') {
    const slot = mmapFindMmioSlot(region, local);
    if (!slot) return;
    if (slot.kind === 'wire') mmapWriteWire(ctx, slot.wireName, padded, m.depth);
    else if (slot.kind === 'pin') {
      if (slot.readOnly) throw Error(`mmap cannot write read-only mmio at ${a}`);
      mmapWritePin(ctx, slot.compRef, slot.pin, padded, m.depth, componentRegistry);
    } else if (slot.kind === 'device') {
      mmapWriteDeviceSlot(ctx, slot, padded, m.depth, componentRegistry);
    }
  }
}

function mmapValidateRegions(regions, depth) {
  const sorted = (regions || []).slice().sort((a, b) => a.base - b.base);
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.size <= 0) throw Error('mmap region size must be positive');
    if (i > 0) {
      const prev = sorted[i - 1];
      if (r.base < prev.base + prev.size) {
        throw Error(`mmap regions overlap at base ${r.base}`);
      }
    }
    if (r.kind === 'mmio' && r.slots) {
      for (let j = 0; j < r.slots.length; j++) {
        const s = r.slots[j];
        if (s.bits !== depth) {
          throw Error(`mmap mmio slot ${s.offset} width ${s.bits} must equal depth ${depth}`);
        }
      }
    }
  }
  return sorted;
}

function mmapApplyPins(id, pending, reEvaluate, component, ctx) {
  const m = getMmap(id);
  if (!m || !pending) return;
  if (!m.latch) m.latch = { adr: null, data: null };
  if (pending.adr !== undefined) {
    m.latch.adr = component.reEvalPendingValue(pending, 'adr', reEvaluate, ctx);
  }
  if (pending.data !== undefined) {
    m.latch.data = component.reEvalPendingValue(pending, 'data', reEvaluate, ctx);
  }
  const adr = m.latch.adr != null ? parseInt(m.latch.adr, 2) : NaN;
  if (pending.write !== undefined) {
    const wv = component.reEvalPendingValue(pending, 'write', reEvaluate, ctx);
    if (wv === '1' || (wv && wv[wv.length - 1] === '1')) {
      if (m.latch.data == null) return;
      if (isNaN(adr)) throw Error('mmap write requires adr');
      mmapWrite(id, adr, m.latch.data, ctx, ctx.componentRegistry);
      return;
    }
  }
  if (pending.get !== undefined) {
    const gv = component.reEvalPendingValue(pending, 'get', reEvaluate, ctx);
    if (gv === '1' || (gv && gv[gv.length - 1] === '1')) {
      if (isNaN(adr)) throw Error('mmap get requires adr');
      m.lastRead = mmapRead(id, adr, ctx);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addMmap, getMmap, mmapResolve, mmapRead, mmapWrite, mmapValidateRegions,
    mmapParseInt, mmapPadWord, mmapZero, mmapApplyPins,
  };
}
