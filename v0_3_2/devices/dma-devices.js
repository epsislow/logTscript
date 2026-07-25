/* ================= DMA DEVICE ================= */

function dmDma() {
  if (typeof deviceManager === 'function') return deviceManager();
  if (!dmDma._store) dmDma._store = { dmas: new Map() };
  return dmDma._store;
}

function dmaSlotBits(slotCount) {
  const n = Math.max(1, slotCount);
  return Math.max(1, 32 - Math.clz32(n));
}

function dmaAddrBits(length) {
  if (length <= 1) return 1;
  return 32 - Math.clz32(length - 1);
}

function dmaParseMode(mode) {
  if (mode === 'paced' || mode === 1 || mode === '1') return 'paced';
  return 'instant';
}

function dmaParseChunk(chunk) {
  if (chunk === undefined) return 1;
  const n = parseInt(chunk, 10);
  if (isNaN(n) || n < 1) {
    throw Error('DMA chunk must be a positive integer');
  }
  return n;
}

function dmaRangesOverlap(srcAdr, dstAdr, count) {
  if (count <= 0) return false;
  const srcEnd = srcAdr + count - 1;
  const dstEnd = dstAdr + count - 1;
  return !(dstEnd < srcAdr || dstAdr > srcEnd);
}

function dmaFillBlock(job) {
  if (job.mmapId) return dmaMmapFillBlock(job);
  const { dstMemId, dstAdr, count, value } = job;
  if (count <= 0) return;
  for (let i = 0; i < count; i++) {
    setMem(dstMemId, dstAdr + i, value);
  }
}

function dmaMmapFillBlock(job) {
  const { mmapId, dstAdr, count, value, ctx, registry } = job;
  if (count <= 0 || !mmapId || typeof mmapWrite !== 'function') return;
  for (let i = 0; i < count; i++) {
    mmapWrite(mmapId, dstAdr + i, value, ctx, registry);
  }
}

function dmaFillChunk(active, chunkSize) {
  if (active.mmapId) return dmaMmapFillChunk(active, chunkSize);
  const remaining = active.total - active.offset;
  const n = Math.min(chunkSize, remaining);
  if (n <= 0) return 0;
  const { dstMemId, dstAdr, value } = active;
  for (let i = 0; i < n; i++) {
    setMem(dstMemId, dstAdr + active.offset + i, value);
  }
  return n;
}

function dmaMmapFillChunk(active, chunkSize) {
  const remaining = active.total - active.offset;
  const n = Math.min(chunkSize, remaining);
  if (n <= 0) return 0;
  const { mmapId, dstAdr, value, ctx, registry } = active;
  for (let i = 0; i < n; i++) {
    mmapWrite(mmapId, dstAdr + active.offset + i, value, ctx, registry);
  }
  return n;
}

function dmaCopyBlock(job) {
  if (job.mmapId) return dmaMmapCopyBlock(job);
  const { srcMemId, dstMemId, srcAdr, dstAdr, count } = job;
  if (count <= 0) return;
  if (srcMemId === dstMemId && dmaRangesOverlap(srcAdr, dstAdr, count)) {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push(getMem(srcMemId, srcAdr + i));
    }
    for (let i = 0; i < count; i++) {
      setMem(dstMemId, dstAdr + i, temp[i]);
    }
    return;
  }
  for (let i = 0; i < count; i++) {
    setMem(dstMemId, dstAdr + i, getMem(srcMemId, srcAdr + i));
  }
}

function dmaMmapCopyBlock(job) {
  const { mmapId, srcAdr, dstAdr, count, ctx, registry } = job;
  if (count <= 0 || !mmapId || typeof mmapRead !== 'function' || typeof mmapWrite !== 'function') return;
  if (dmaRangesOverlap(srcAdr, dstAdr, count)) {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push(mmapRead(mmapId, srcAdr + i, ctx));
    }
    for (let i = 0; i < count; i++) {
      mmapWrite(mmapId, dstAdr + i, temp[i], ctx, registry);
    }
    return;
  }
  for (let i = 0; i < count; i++) {
    mmapWrite(mmapId, dstAdr + i, mmapRead(mmapId, srcAdr + i, ctx), ctx, registry);
  }
}

function dmaJobNeedsBackward(job) {
  if (job.mmapId) {
    return dmaRangesOverlap(job.srcAdr, job.dstAdr, job.count) && job.dstAdr > job.srcAdr;
  }
  return job.srcMemId === job.dstMemId
    && dmaRangesOverlap(job.srcAdr, job.dstAdr, job.count)
    && job.dstAdr > job.srcAdr;
}

function dmaCopyChunk(active, chunkSize) {
  if (active.fill) return dmaFillChunk(active, chunkSize);
  const remaining = active.total - active.offset;
  const n = Math.min(chunkSize, remaining);
  if (n <= 0) return 0;

  if (active.mmapId) {
    const { mmapId, srcAdr, dstAdr, ctx, registry } = active;
    if (active.backward) {
      const startIdx = active.total - active.offset - n;
      for (let i = 0; i < n; i++) {
        const idx = startIdx + i;
        mmapWrite(mmapId, dstAdr + idx, mmapRead(mmapId, srcAdr + idx, ctx), ctx, registry);
      }
    } else {
      for (let i = 0; i < n; i++) {
        mmapWrite(mmapId, dstAdr + active.offset + i,
          mmapRead(mmapId, srcAdr + active.offset + i, ctx), ctx, registry);
      }
    }
    return n;
  }

  const { srcMemId, dstMemId, srcAdr, dstAdr } = active;

  if (active.backward) {
    const startIdx = active.total - active.offset - n;
    for (let i = 0; i < n; i++) {
      const idx = startIdx + i;
      setMem(dstMemId, dstAdr + idx, getMem(srcMemId, srcAdr + idx));
    }
  } else {
    for (let i = 0; i < n; i++) {
      setMem(dstMemId, dstAdr + active.offset + i, getMem(srcMemId, srcAdr + active.offset + i));
    }
  }
  return n;
}

function dmaStartActiveJob(d, job) {
  if (job.fill) {
    d.active = {
      fill: true,
      mmapId: job.mmapId || null,
      dstMemId: job.dstMemId,
      dstAdr: job.dstAdr,
      total: job.count,
      offset: 0,
      value: job.value,
      ctx: job.ctx || null,
      registry: job.registry || null,
    };
    return;
  }
  d.active = {
    mmapId: job.mmapId || null,
    srcMemId: job.srcMemId,
    dstMemId: job.dstMemId,
    srcAdr: job.srcAdr,
    dstAdr: job.dstAdr,
    total: job.count,
    offset: 0,
    backward: dmaJobNeedsBackward(job),
    ctx: job.ctx || null,
    registry: job.registry || null,
  };
}

function dmaStepActive(d) {
  if (!d.active || d.mode !== 'paced') return;
  const moved = dmaCopyChunk(d.active, d.chunk);
  d.active.offset += moved;
  if (d.active.offset >= d.active.total) {
    d.active = null;
    d.done = true;
  } else {
    d.done = false;
  }
  dmaUpdateBusy(d);
}

function dmaGetRemaining(d) {
  if (!d.active || d.mode !== 'paced') return 0;
  return d.active.total - d.active.offset;
}

function addDma(id, config) {
  if (!id) return;
  const queueCapacity = config.queueCapacity != null ? config.queueCapacity : 1;
  dmDma().dmas.set(id, {
    memSlots: config.memSlots || [],
    mmapId: config.mmapId || null,
    mmapRef: config.mmapRef || null,
    queueCapacity,
    depth: config.depth || 8,
    maxAddrBits: config.maxAddrBits || 4,
    mode: config.mode || 'instant',
    chunk: config.chunk != null ? config.chunk : 1,
    active: null,
    queue: [],
    latch: {},
    busy: false,
    done: false,
    started: 0,
    queued: 0,
    rejected: 0,
    startedTotal: 0,
    queuedTotal: 0,
    rejectedTotal: 0,
    submitSeq: 0,
  });
}

function getDma(id) {
  return dmDma().dmas.get(id) || null;
}

function dmaResetState(d) {
  d.active = null;
  d.queue = [];
  d.latch = {};
  d.busy = false;
  d.done = false;
  d.started = 0;
  d.queued = 0;
  d.rejected = 0;
  d.startedTotal = 0;
  d.queuedTotal = 0;
  d.rejectedTotal = 0;
  d.submitSeq = 0;
}

function dmaClearSubmitFlags(d) {
  d.started = 0;
  d.queued = 0;
  d.rejected = 0;
}

function dmaSetSubmitResult(d, kind) {
  dmaClearSubmitFlags(d);
  if (kind === 'started') {
    d.started = 1;
    d.startedTotal++;
    d.submitSeq++;
  } else if (kind === 'queued') {
    d.queued = 1;
    d.queuedTotal++;
    d.submitSeq++;
  } else if (kind === 'rejected') {
    d.rejected = 1;
    d.rejectedTotal++;
    d.submitSeq++;
  }
}

function dmaUpdateBusy(d) {
  const pacedActive = d.active && d.mode === 'paced' && d.active.offset < d.active.total;
  d.busy = !!(pacedActive || d.queue.length > 0);
}

function dmaQueueFull(d) {
  return d.queue.length >= d.queueCapacity;
}

function dmaResolveSlot(d, slot, isSrc) {
  if (!isSrc && slot === 0) {
    throw Error('DMA dst slot cannot be 0');
  }
  if (slot < 1 || slot > d.memSlots.length) {
    throw Error(`DMA slot ${slot} out of range (mems has ${d.memSlots.length} entries)`);
  }
  return d.memSlots[slot - 1];
}

function dmaBuildMmapJob(d, latch, ctx, registry) {
  if (latch.count === undefined || latch.src === undefined) return null;
  const srcMode = parseInt(latch.src, 2);
  const dstAdr = latch.dstAdr !== undefined ? parseInt(latch.dstAdr, 2) : 0;
  const count = parseInt(latch.count, 2);
  if (isNaN(srcMode) || isNaN(dstAdr) || isNaN(count)) {
    throw Error('DMA job parameters must resolve to numeric values');
  }
  if (count <= 0) throw Error('DMA count must be positive');
  const jobBase = { mmapId: d.mmapId, count, ctx, registry };

  if (srcMode === 0) {
    if (latch.value === undefined) throw Error('DMA fill (src=0) requires value');
    return Object.assign({ fill: true, dstAdr, value: latch.value }, jobBase);
  }

  if (latch.value !== undefined) {
    throw Error('DMA copy cannot use value (use src=0 for fill)');
  }
  const srcAdr = latch.srcAdr !== undefined ? parseInt(latch.srcAdr, 2) : 0;
  if (isNaN(srcAdr)) throw Error('DMA job parameters must resolve to numeric values');
  return Object.assign({ fill: false, srcAdr, dstAdr }, jobBase);
}

function dmaBuildJob(d, latch, ctx, registry) {
  if (d.mmapId) return dmaBuildMmapJob(d, latch, ctx, registry);
  if (latch.dst === undefined || latch.count === undefined || latch.src === undefined) {
    return null;
  }
  const srcSlot = parseInt(latch.src, 2);
  const dstSlot = parseInt(latch.dst, 2);
  const dstAdr = latch.dstAdr !== undefined ? parseInt(latch.dstAdr, 2) : 0;
  const count = parseInt(latch.count, 2);
  if (isNaN(srcSlot) || isNaN(dstSlot) || isNaN(dstAdr) || isNaN(count)) {
    throw Error('DMA job parameters must resolve to numeric values');
  }
  if (count <= 0) {
    throw Error('DMA count must be positive');
  }

  if (srcSlot === 0) {
    if (latch.value === undefined) {
      throw Error('DMA fill (src=0) requires value');
    }
    const dstEntry = dmaResolveSlot(d, dstSlot, false);
    if (dstEntry.readonly) {
      throw Error(`DMA cannot write to readonly memory ${dstEntry.ref}`);
    }
    if (dstAdr + count > dstEntry.length) {
      throw Error('DMA transfer exceeds memory bounds');
    }
    return {
      fill: true,
      srcSlot,
      dstSlot,
      dstMemId: dstEntry.memId,
      dstAdr,
      count,
      value: latch.value,
    };
  }

  if (latch.value !== undefined) {
    throw Error('DMA copy cannot use value (use src=0 for fill)');
  }

  const srcAdr = latch.srcAdr !== undefined ? parseInt(latch.srcAdr, 2) : 0;
  if (isNaN(srcAdr)) {
    throw Error('DMA job parameters must resolve to numeric values');
  }
  const srcEntry = dmaResolveSlot(d, srcSlot, true);
  const dstEntry = dmaResolveSlot(d, dstSlot, false);
  if (dstEntry.readonly) {
    throw Error(`DMA cannot write to readonly memory ${dstEntry.ref}`);
  }
  if (srcAdr + count > srcEntry.length || dstAdr + count > dstEntry.length) {
    throw Error('DMA transfer exceeds memory bounds');
  }
  return {
    fill: false,
    srcSlot,
    dstSlot,
    srcMemId: srcEntry.memId,
    dstMemId: dstEntry.memId,
    srcAdr,
    dstAdr,
    count,
  };
}

function dmaRunJob(d, job) {
  if (job.fill) dmaFillBlock(job);
  else dmaCopyBlock(job);
  d.done = true;
}

function dmaIsPacedInProgress(d) {
  return !!(d.active && d.mode === 'paced' && d.active.offset < d.active.total);
}

function dmaTrySubmit(d, job) {
  if (!d.active && d.queue.length === 0) {
    dmaSetSubmitResult(d, 'started');
    if (d.mode === 'paced') {
      dmaStartActiveJob(d, job);
      dmaStepActive(d);
    } else {
      dmaRunJob(d, job);
    }
    dmaUpdateBusy(d);
    return;
  }
  if (d.queueCapacity > 0 && d.queue.length < d.queueCapacity) {
    d.queue.push(job);
    dmaSetSubmitResult(d, 'queued');
    dmaUpdateBusy(d);
    return;
  }
  dmaSetSubmitResult(d, 'rejected');
}

function dmaLatchPins(d, pending, reEvaluate, component, ctx) {
  const fields = ['src', 'dst', 'srcAdr', 'dstAdr', 'count', 'value'];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (pending[f] !== undefined) {
      d.latch[f] = component.reEvalPendingValue(pending, f, reEvaluate, ctx);
    }
  }
}

function dmaIsActive(val) {
  return val === '1' || (val && val[val.length - 1] === '1');
}

function dmaApplyPins(id, pending, reEvaluate, component, ctx) {
  const d = getDma(id);
  if (!d || !pending) return;

  if (pending.reset !== undefined) {
    const rv = component.reEvalPendingValue(pending, 'reset', reEvaluate, ctx);
    if (dmaIsActive(rv)) {
      dmaResetState(d);
      return;
    }
  }

  dmaLatchPins(d, pending, reEvaluate, component, ctx);

  if (pending.set === undefined) return;
  const sv = component.reEvalPendingValue(pending, 'set', reEvaluate, ctx);
  if (!dmaIsActive(sv)) return;

  if (dmaIsPacedInProgress(d)) {
    dmaStepActive(d);
    return;
  }

  const job = dmaBuildJob(d, d.latch, ctx, ctx && ctx.componentRegistry);
  if (!job) return;

  d.done = false;
  dmaTrySubmit(d, job);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addDma, getDma, dmaResetState, dmaApplyPins, dmaTrySubmit, dmaSlotBits, dmaAddrBits,
    dmaQueueFull, dmaUpdateBusy, dmaParseMode, dmaParseChunk, dmaGetRemaining, dmaIsPacedInProgress,
  };
}
