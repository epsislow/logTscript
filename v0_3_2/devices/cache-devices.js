/* ================= CACHE DEVICE ================= */

const CACHE_COUNTER_BITS = 16;
const CACHE_COUNTER_MAX = (1 << CACHE_COUNTER_BITS) - 1;
const CACHE_HITRATE_BITS = 7;

function dmCaches() {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps) return null;
  if (!maps.caches) maps.caches = new Map();
  return maps.caches;
}

function isCacheStorage(id) {
  return dmCaches() && dmCaches().has(id);
}

function cachePadWord(value, depth) {
  let v = value == null ? '' : String(value);
  if (v.length < depth) v = v.padStart(depth, '0');
  else if (v.length > depth) v = v.substring(0, depth);
  return v;
}

function cacheClampStat(n) {
  if (n < 0) return 0;
  if (n > CACHE_COUNTER_MAX) return CACHE_COUNTER_MAX;
  return n;
}

function cacheFormatStat(n) {
  return cacheClampStat(n).toString(2).padStart(CACHE_COUNTER_BITS, '0');
}

function cacheFormatHitRate(hits, misses) {
  const total = hits + misses;
  let pct = 0;
  if (total > 0) pct = Math.round((hits * 100) / total);
  if (pct > 100) pct = 100;
  return pct.toString(2).padStart(CACHE_HITRATE_BITS, '0');
}

function cacheLineBaseFromParts(setIndex, tag, lineSize, lines) {
  return tag * lineSize * lines + setIndex * lineSize;
}

function cacheSetIndex(adr, lines, lineSize) {
  return Math.floor(adr / lineSize) % lines;
}

function cacheTag(adr, lines, lineSize) {
  return Math.floor(adr / (lineSize * lines));
}

function cacheOffset(adr, lineSize) {
  return adr % lineSize;
}

function cacheLineBase(adr, lineSize) {
  return Math.floor(adr / lineSize) * lineSize;
}

function cacheTagBits(lines, lineSize, length) {
  const maxTag = length > 0 ? cacheTag(length - 1, lines, lineSize) : 0;
  if (maxTag <= 0) return 1;
  return 32 - Math.clz32(maxTag);
}

function cacheCreateSets(lines, lineSize, depth) {
  const sets = [];
  const zero = '0'.repeat(depth);
  for (let i = 0; i < lines; i++) {
    sets.push({
      valid: false,
      dirty: false,
      tag: 0,
      addrs: new Array(lineSize).fill(zero),
      lastUsed: 0,
      fifoSeq: 0,
    });
  }
  return sets;
}

function cacheParseEvictType(value) {
  const v = value == null ? 'lru' : String(value).toLowerCase();
  if (v === 'fifo' || v === 'random') return v;
  return 'lru';
}

function cacheParseWritePolicy(value) {
  const v = value == null ? 'writeback' : String(value).toLowerCase().replace(/_/g, '');
  if (v === 'writethrough') return 'writeThrough';
  return 'writeBack';
}

function cacheParseBool01(value, defaultVal) {
  if (value === undefined || value === null) return defaultVal;
  if (value === 1 || value === '1' || value === true) return true;
  if (value === 0 || value === '0' || value === false) return false;
  return defaultVal;
}

function cacheReadBacking(c, address) {
  if (c.backingKind === 'cache') {
    return cacheRead(c.backingId, address);
  }
  return getMemDirect(c.backingId, address);
}

function cacheWriteBacking(c, address, value) {
  if (c.backingKind === 'cache') {
    cacheWrite(c.backingId, address, value);
    return;
  }
  setMemDirect(c.backingId, address, value);
}

function cacheWriteBackSet(c, setIndex) {
  const set = c.sets[setIndex];
  if (!set.valid || !set.dirty) return;
  const lineBase = cacheLineBaseFromParts(setIndex, set.tag, c.lineSize, c.lines);
  for (let i = 0; i < c.lineSize; i++) {
    const addr = lineBase + i;
    if (addr >= 0 && addr < c.length) {
      cacheWriteBacking(c, addr, set.addrs[i]);
    }
  }
  set.dirty = false;
  c.stats.dirtyEvictions++;
}

function cacheLoadSet(c, setIndex, adr) {
  const tag = cacheTag(adr, c.lines, c.lineSize);
  const lineBase = cacheLineBase(adr, c.lineSize);
  const set = c.sets[setIndex];
  const zero = '0'.repeat(c.depth);
  set.tag = tag;
  for (let i = 0; i < c.lineSize; i++) {
    const addr = lineBase + i;
    if (addr >= 0 && addr < c.length) {
      set.addrs[i] = cachePadWord(cacheReadBacking(c, addr), c.depth);
    } else {
      set.addrs[i] = zero;
    }
  }
  set.valid = true;
  set.dirty = false;
  c.accessTick++;
  set.lastUsed = c.accessTick;
  set.fifoSeq = c.fifoTick++;
}

function cacheEvictSetIfNeeded(c, setIndex, adr) {
  const set = c.sets[setIndex];
  const newTag = cacheTag(adr, c.lines, c.lineSize);
  if (set.valid && set.tag === newTag) return;
  if (set.valid) {
    if (set.dirty && c.writePolicy === 'writeBack') {
      cacheWriteBackSet(c, setIndex);
    }
    c.stats.evictions++;
  }
  cacheLoadSet(c, setIndex, adr);
}

function cacheFindHit(c, adr) {
  const setIndex = cacheSetIndex(adr, c.lines, c.lineSize);
  const set = c.sets[setIndex];
  const tag = cacheTag(adr, c.lines, c.lineSize);
  if (set.valid && set.tag === tag) {
    c.accessTick++;
    set.lastUsed = c.accessTick;
    return { setIndex, offset: cacheOffset(adr, c.lineSize) };
  }
  return null;
}

function addCache({
  id,
  depth,
  length,
  lines,
  lineSize,
  backingId,
  backingKind,
  evictType = 'lru',
  writePolicy = 'writeBack',
  writeAllocate = true,
  enabled = true,
  rngSeed = 1,
}) {
  if (!id) return;
  dmCaches().set(id, {
    depth,
    length,
    lines,
    lineSize,
    backingId,
    backingKind,
    evictType: cacheParseEvictType(evictType),
    writePolicy: cacheParseWritePolicy(writePolicy),
    writeAllocate: !!writeAllocate,
    enabled: !!enabled,
    sets: cacheCreateSets(lines, lineSize, depth),
    stats: { hits: 0, misses: 0, evictions: 0, dirtyEvictions: 0 },
    accessTick: 0,
    fifoTick: 0,
    rngSeed: rngSeed >>> 0,
    inspectSet: 0,
  });
}

function getCache(id) {
  return dmCaches().get(id) || null;
}

function cacheRead(id, address) {
  const c = getCache(id);
  if (!c) return null;
  if (address < 0 || address >= c.length) {
    throw Error(`Cache invalid address ${address} (length: ${c.length})`);
  }
  if (!c.enabled) {
    return cachePadWord(cacheReadBacking(c, address), c.depth);
  }
  const hit = cacheFindHit(c, address);
  if (hit) {
    c.stats.hits++;
    return c.sets[hit.setIndex].addrs[hit.offset];
  }
  c.stats.misses++;
  const setIndex = cacheSetIndex(address, c.lines, c.lineSize);
  cacheEvictSetIfNeeded(c, setIndex, address);
  const offset = cacheOffset(address, c.lineSize);
  return c.sets[setIndex].addrs[offset];
}

function cacheWrite(id, address, value) {
  const c = getCache(id);
  if (!c) return;
  if (address < 0 || address >= c.length) {
    throw Error(`Cache invalid address ${address} (length: ${c.length})`);
  }
  const word = cachePadWord(value, c.depth);
  if (!c.enabled) {
    cacheWriteBacking(c, address, word);
    return;
  }
  let hit = cacheFindHit(c, address);
  if (!hit) {
    if (!c.writeAllocate) {
      cacheWriteBacking(c, address, word);
      c.stats.misses++;
      return;
    }
    c.stats.misses++;
    const setIndex = cacheSetIndex(address, c.lines, c.lineSize);
    cacheEvictSetIfNeeded(c, setIndex, address);
    hit = { setIndex, offset: cacheOffset(address, c.lineSize) };
  } else {
    c.stats.hits++;
  }
  const set = c.sets[hit.setIndex];
  set.addrs[hit.offset] = word;
  if (c.writePolicy === 'writeThrough') {
    cacheWriteBacking(c, address, word);
  } else {
    set.dirty = true;
  }
}

function cacheFlush(id) {
  const c = getCache(id);
  if (!c) return;
  for (let i = 0; i < c.lines; i++) {
    const set = c.sets[i];
    if (set.valid && set.dirty && c.writePolicy === 'writeBack') {
      cacheWriteBackSet(c, i);
    }
  }
}

function cacheInvalidateSet(c, setIndex) {
  if (setIndex < 0 || setIndex >= c.lines) return;
  const set = c.sets[setIndex];
  set.valid = false;
  set.dirty = false;
}

function cacheInvalidateAll(c) {
  for (let i = 0; i < c.lines; i++) {
    cacheInvalidateSet(c, i);
  }
}

function cacheResetStats(c) {
  c.stats.hits = 0;
  c.stats.misses = 0;
  c.stats.evictions = 0;
  c.stats.dirtyEvictions = 0;
}

function cacheInspectLineData(c, setIndex) {
  const set = c.sets[setIndex];
  if (!set) return '0'.repeat(c.lineSize * c.depth);
  return set.addrs.join('');
}

function cacheApplyPins(id, pending, reEvaluate, component, ctx) {
  const c = getCache(id);
  if (!c || !pending) return;

  function resolvePin(name) {
    if (pending[name] === undefined) return undefined;
    if (component && typeof component.reEvalPendingValue === 'function') {
      return component.reEvalPendingValue(pending, name, reEvaluate, ctx);
    }
    const p = pending[name];
    return p && p.value !== undefined ? p.value : undefined;
  }

  if (pending.line !== undefined) {
    const lv = resolvePin('line');
    if (lv !== undefined && lv !== null) {
      c.inspectSet = parseInt(lv, 2);
      if (isNaN(c.inspectSet)) c.inspectSet = 0;
      if (c.inspectSet < 0) c.inspectSet = 0;
      if (c.inspectSet >= c.lines) c.inspectSet = c.lines - 1;
    }
  }
  if (pending.adr !== undefined) {
    const av = resolvePin('adr');
    if (av !== undefined && av !== null) {
      const adr = parseInt(av, 2);
      if (!isNaN(adr) && adr >= 0 && adr < c.length) {
        c.inspectSet = cacheSetIndex(adr, c.lines, c.lineSize);
      }
    }
  }

  const setVal = resolvePin('set');
  const doSet = setVal === '1' || setVal === 1;

  if (doSet) {
    const flushVal = resolvePin('flush');
    if (flushVal === '1' || flushVal === 1) cacheFlush(id);

    const invAll = resolvePin('invalidateAll');
    if (invAll === '1' || invAll === 1) cacheInvalidateAll(c);

    const inv = resolvePin('invalidate');
    if (inv === '1' || inv === 1) cacheInvalidateSet(c, c.inspectSet);

    const resetStatsVal = resolvePin('resetStats');
    if (resetStatsVal === '1' || resetStatsVal === 1) cacheResetStats(c);
  }
}

function getMemDirect(id, address) {
  const mem = dm().memories.get(id);
  if (!mem) return null;
  if (address < 0 || address >= mem.length) {
    throw Error(`Memory invalid address ${address} (length: ${mem.length})`);
  }
  if (mem.data.has(address)) return mem.data.get(address);
  return mem.default;
}

function setMemDirect(id, address, value) {
  const mem = dm().memories.get(id);
  if (!mem) return;
  if (address < 0 || address >= mem.length) {
    throw Error(`Memory invalid address ${address} (length: ${mem.length})`);
  }
  let binValue = value;
  if (binValue.length < mem.depth) binValue = binValue.padStart(mem.depth, '0');
  else if (binValue.length > mem.depth) binValue = binValue.substring(0, mem.depth);
  mem.data.set(address, binValue);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CACHE_COUNTER_BITS,
    CACHE_HITRATE_BITS,
    isCacheStorage,
    addCache,
    getCache,
    cacheRead,
    cacheWrite,
    cacheFlush,
    cacheApplyPins,
    cacheFormatStat,
    cacheFormatHitRate,
    cacheTagBits,
    getMemDirect,
    setMemDirect,
  };
}
