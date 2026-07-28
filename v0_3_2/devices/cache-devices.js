/* ================= CACHE DEVICE ================= */

const CACHE_COUNTER_BITS = 16;
const CACHE_COUNTER_MAX = (1 << CACHE_COUNTER_BITS) - 1;
const CACHE_HITRATE_BITS = 7;

function dmCaches() {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps) return null;
  if (!maps.caches) maps.caches = new Map();
  if (!maps.cacheBackingIndex) maps.cacheBackingIndex = new Map();
  return maps.caches;
}

function cacheBackingKey(backingKind, backingId) {
  return `${backingKind}:${backingId}`;
}

function cacheRegisterBacking(cacheId, backingId, backingKind) {
  if (backingKind !== 'mem') return;
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps) return;
  if (!maps.cacheBackingIndex) maps.cacheBackingIndex = new Map();
  const key = cacheBackingKey(backingKind, backingId);
  if (!maps.cacheBackingIndex.has(key)) maps.cacheBackingIndex.set(key, new Set());
  maps.cacheBackingIndex.get(key).add(cacheId);
}

function cacheUnregisterBacking(cacheId, backingId, backingKind) {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps || !maps.cacheBackingIndex) return;
  const key = cacheBackingKey(backingKind, backingId);
  const set = maps.cacheBackingIndex.get(key);
  if (set) {
    set.delete(cacheId);
    if (set.size === 0) maps.cacheBackingIndex.delete(key);
  }
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

function cacheWayBitsCount(ways) {
  const n = Math.max(1, ways) + 2;
  if (n <= 2) return 1;
  return Math.max(1, 32 - Math.clz32(n - 1));
}

function cacheWayCount(c) {
  return c.ways || 1;
}

function cacheCreateLine(lineSize, depth) {
  return {
    valid: false,
    dirty: false,
    tag: 0,
    addrs: new Array(lineSize).fill('0'.repeat(depth)),
    lastUsed: 0,
    fifoSeq: 0,
  };
}

function cacheCreateSets(lines, lineSize, depth, ways) {
  const sets = [];
  for (let i = 0; i < lines; i++) {
    const setWays = [];
    for (let w = 0; w < ways; w++) setWays.push(cacheCreateLine(lineSize, depth));
    sets.push(setWays);
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

function cacheParsePositiveInt(value, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 0) return fallback;
  return n;
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
  setMemDirect(c.backingId, address, value, c.id);
}

function cacheWriteBackWay(c, setIndex, wayIndex) {
  const line = c.sets[setIndex][wayIndex];
  if (!line.valid || !line.dirty) return;
  const lineBase = cacheLineBaseFromParts(setIndex, line.tag, c.lineSize, c.lines);
  for (let i = 0; i < c.lineSize; i++) {
    const addr = lineBase + i;
    if (addr >= 0 && addr < c.length) {
      cacheWriteBacking(c, addr, line.addrs[i]);
    }
  }
  line.dirty = false;
  c.stats.dirtyEvictions++;
}

function cacheLoadWay(c, setIndex, wayIndex, adr) {
  const tag = cacheTag(adr, c.lines, c.lineSize);
  const lineBase = cacheLineBase(adr, c.lineSize);
  const line = c.sets[setIndex][wayIndex];
  const zero = '0'.repeat(c.depth);
  line.tag = tag;
  for (let i = 0; i < c.lineSize; i++) {
    const addr = lineBase + i;
    if (addr >= 0 && addr < c.length) {
      line.addrs[i] = cachePadWord(cacheReadBacking(c, addr), c.depth);
    } else {
      line.addrs[i] = zero;
    }
  }
  line.valid = true;
  line.dirty = false;
  c.accessTick++;
  line.lastUsed = c.accessTick;
  line.fifoSeq = c.fifoTick++;
}

function cacheFindEmptyWay(c, setIndex) {
  const ways = cacheWayCount(c);
  for (let w = 0; w < ways; w++) {
    if (!c.sets[setIndex][w].valid) return w;
  }
  return -1;
}

function cachePickEvictWay(c, setIndex) {
  const ways = cacheWayCount(c);
  const set = c.sets[setIndex];
  if (c.evictType === 'fifo') {
    let pick = 0;
    let minSeq = Infinity;
    for (let w = 0; w < ways; w++) {
      if (set[w].fifoSeq < minSeq) {
        minSeq = set[w].fifoSeq;
        pick = w;
      }
    }
    return pick;
  }
  if (c.evictType === 'random') {
    c.rngSeed = (c.rngSeed * 1664525 + 1013904223) >>> 0;
    return c.rngSeed % ways;
  }
  let pick = 0;
  let minUsed = Infinity;
  for (let w = 0; w < ways; w++) {
    if (set[w].lastUsed < minUsed) {
      minUsed = set[w].lastUsed;
      pick = w;
    }
  }
  return pick;
}

function cacheInstallOnMiss(c, adr) {
  const setIndex = cacheSetIndex(adr, c.lines, c.lineSize);
  const tag = cacheTag(adr, c.lines, c.lineSize);
  const ways = cacheWayCount(c);
  for (let w = 0; w < ways; w++) {
    const line = c.sets[setIndex][w];
    if (line.valid && line.tag === tag) return w;
  }
  let wayIndex = cacheFindEmptyWay(c, setIndex);
  if (wayIndex < 0) {
    wayIndex = cachePickEvictWay(c, setIndex);
    const victim = c.sets[setIndex][wayIndex];
    if (victim.valid) {
      if (victim.dirty && c.writePolicy === 'writeBack') {
        cacheWriteBackWay(c, setIndex, wayIndex);
      }
      c.stats.evictions++;
    }
  }
  cacheLoadWay(c, setIndex, wayIndex, adr);
  return wayIndex;
}

function cacheFindHit(c, adr) {
  const setIndex = cacheSetIndex(adr, c.lines, c.lineSize);
  const tag = cacheTag(adr, c.lines, c.lineSize);
  const ways = cacheWayCount(c);
  for (let w = 0; w < ways; w++) {
    const line = c.sets[setIndex][w];
    if (line.valid && line.tag === tag) {
      c.accessTick++;
      line.lastUsed = c.accessTick;
      return { setIndex, wayIndex: w, offset: cacheOffset(adr, c.lineSize) };
    }
  }
  return null;
}

function cacheStartMissPenalty(c) {
  if (c.missCycles > 0) {
    c.remaining = c.missCycles;
    c.busy = true;
  }
}

function cacheTickPenalty(c) {
  if (c.remaining > 0) {
    c.remaining--;
    if (c.remaining === 0) c.busy = false;
  }
}

function cacheInvalidateLine(c, setIndex, wayIndex) {
  if (setIndex < 0 || setIndex >= c.lines) return;
  const line = c.sets[setIndex][wayIndex];
  if (!line) return;
  line.valid = false;
  line.dirty = false;
}

function cacheInvalidateSet(c, setIndex, waySel) {
  const ways = cacheWayCount(c);
  if (waySel === undefined || waySel === null) {
    cacheInvalidateLine(c, setIndex, 0);
    return;
  }
  if (waySel === ways) {
    for (let w = 0; w < ways; w++) cacheInvalidateLine(c, setIndex, w);
    return;
  }
  if (waySel >= 0 && waySel < ways) {
    cacheInvalidateLine(c, setIndex, waySel);
  }
}

function cacheInvalidateAll(c) {
  for (let i = 0; i < c.lines; i++) {
    cacheInvalidateSet(c, i, cacheWayCount(c));
  }
}

function cacheInvalidateAddress(cacheId, address) {
  const c = getCache(cacheId);
  if (!c || !c.enabled) return;
  if (address < 0 || address >= c.length) return;
  const setIndex = cacheSetIndex(address, c.lines, c.lineSize);
  const tag = cacheTag(address, c.lines, c.lineSize);
  const ways = cacheWayCount(c);
  for (let w = 0; w < ways; w++) {
    const line = c.sets[setIndex][w];
    if (line.valid && line.tag === tag) {
      line.valid = false;
      line.dirty = false;
    }
  }
}

function cacheNotifyBackingWrite(backingId, address, sourceCacheId) {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps || !maps.cacheBackingIndex) return;
  const key = cacheBackingKey('mem', backingId);
  const siblings = maps.cacheBackingIndex.get(key);
  if (!siblings) return;
  for (const cacheId of siblings) {
    if (cacheId !== sourceCacheId) {
      cacheInvalidateAddress(cacheId, address);
    }
  }
}

function cacheResolveInspectWay(c, wayPinVal, forInvalidate) {
  const ways = cacheWayCount(c);
  if (wayPinVal === undefined || wayPinVal === null) return 0;
  const way = parseInt(wayPinVal, 2);
  if (isNaN(way)) return 0;
  if (forInvalidate) {
    if (way === ways + 1) return null;
    return way;
  }
  if (way === ways + 1) {
    for (let w = 0; w < ways; w++) {
      if (c.sets[c.inspectSet][w].valid) return w;
    }
    return -1;
  }
  if (way >= 0 && way < ways) return way;
  return 0;
}

function addCache({
  id,
  depth,
  length,
  lines,
  lineSize,
  ways = 1,
  backingId,
  backingKind,
  evictType = 'lru',
  writePolicy = 'writeBack',
  writeAllocate = true,
  enabled = true,
  missCycles = 0,
  rngSeed = 1,
}) {
  if (!id) return;
  const wayCount = Math.max(1, parseInt(ways, 10) || 1);
  const penalty = cacheParsePositiveInt(missCycles, 0);
  dmCaches().set(id, {
    id,
    depth,
    length,
    lines,
    lineSize,
    ways: wayCount,
    backingId,
    backingKind,
    evictType: cacheParseEvictType(evictType),
    writePolicy: cacheParseWritePolicy(writePolicy),
    writeAllocate: !!writeAllocate,
    enabled: !!enabled,
    missCycles: penalty,
    remaining: 0,
    busy: false,
    sets: cacheCreateSets(lines, lineSize, depth, wayCount),
    stats: { hits: 0, misses: 0, evictions: 0, dirtyEvictions: 0 },
    accessTick: 0,
    fifoTick: 0,
    rngSeed: rngSeed >>> 0,
    inspectSet: 0,
    inspectWay: 0,
  });
  cacheRegisterBacking(id, backingId, backingKind);
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
    if (c.missCycles > 0) cacheTickPenalty(c);
    return c.sets[hit.setIndex][hit.wayIndex].addrs[hit.offset];
  }
  c.stats.misses++;
  const wayIndex = cacheInstallOnMiss(c, address);
  if (c.missCycles > 0) cacheStartMissPenalty(c);
  const setIndex = cacheSetIndex(address, c.lines, c.lineSize);
  const offset = cacheOffset(address, c.lineSize);
  return c.sets[setIndex][wayIndex].addrs[offset];
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
      if (c.missCycles > 0) cacheTickPenalty(c);
      cacheWriteBacking(c, address, word);
      c.stats.misses++;
      return;
    }
    c.stats.misses++;
    const wayIndex = cacheInstallOnMiss(c, address);
    if (c.missCycles > 0) cacheStartMissPenalty(c);
    const setIndex = cacheSetIndex(address, c.lines, c.lineSize);
    hit = { setIndex, wayIndex, offset: cacheOffset(address, c.lineSize) };
  } else {
    c.stats.hits++;
    if (c.missCycles > 0) cacheTickPenalty(c);
  }
  const line = c.sets[hit.setIndex][hit.wayIndex];
  line.addrs[hit.offset] = word;
  if (c.writePolicy === 'writeThrough') {
    cacheWriteBacking(c, address, word);
  } else {
    line.dirty = true;
  }
}

function cacheFlush(id) {
  const c = getCache(id);
  if (!c) return;
  const ways = cacheWayCount(c);
  for (let i = 0; i < c.lines; i++) {
    for (let w = 0; w < ways; w++) {
      const line = c.sets[i][w];
      if (line.valid && line.dirty && c.writePolicy === 'writeBack') {
        cacheWriteBackWay(c, i, w);
      }
    }
  }
}

function cacheResetStats(c) {
  c.stats.hits = 0;
  c.stats.misses = 0;
  c.stats.evictions = 0;
  c.stats.dirtyEvictions = 0;
}

function cacheInspectLineData(c, setIndex, wayIndex) {
  if (wayIndex < 0) return '0'.repeat(c.lineSize * c.depth);
  const line = c.sets[setIndex] && c.sets[setIndex][wayIndex];
  if (!line) return '0'.repeat(c.lineSize * c.depth);
  return line.addrs.join('');
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
  if (pending.way !== undefined) {
    const wv = resolvePin('way');
    if (wv !== undefined && wv !== null) {
      c.inspectWay = cacheResolveInspectWay(c, wv, false);
    }
  } else {
    c.inspectWay = 0;
  }

  const setVal = resolvePin('set');
  const doSet = setVal === '1' || setVal === 1;

  if (doSet) {
    const flushVal = resolvePin('flush');
    if (flushVal === '1' || flushVal === 1) cacheFlush(id);

    const invAll = resolvePin('invalidateAll');
    if (invAll === '1' || invAll === 1) cacheInvalidateAll(c);

    const inv = resolvePin('invalidate');
    if (inv === '1' || inv === 1) {
      const waySel = pending.way !== undefined
        ? cacheResolveInspectWay(c, resolvePin('way'), true)
        : 0;
      if (waySel !== null) cacheInvalidateSet(c, c.inspectSet, waySel);
    }

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

function setMemDirect(id, address, value, sourceCacheId) {
  const mem = dm().memories.get(id);
  if (!mem) return;
  if (address < 0 || address >= mem.length) {
    throw Error(`Memory invalid address ${address} (length: ${mem.length})`);
  }
  let binValue = value;
  if (binValue.length < mem.depth) binValue = binValue.padStart(mem.depth, '0');
  else if (binValue.length > mem.depth) binValue = binValue.substring(0, mem.depth);
  mem.data.set(address, binValue);
  cacheNotifyBackingWrite(id, address, sourceCacheId || null);
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
    cacheWayBitsCount,
    cacheInvalidateAddress,
    cacheNotifyBackingWrite,
    getMemDirect,
    setMemDirect,
  };
}
