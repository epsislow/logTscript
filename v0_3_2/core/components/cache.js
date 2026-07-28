var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

function cacheLineBits(lines) {
  if (lines <= 1) return 1;
  return 32 - Math.clz32(lines - 1);
}

function cacheParsePositiveInt(value, name) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1) throw Error(`cache ${name} must be a positive integer`);
  return n;
}

var CacheComponent = class CacheComponent extends BuiltinComponent {
  static get type() { return 'cache'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getSpecialParseAttributes() {
    return {
      bindingAttrs: ['mem'],
      literalAttrs: ['evictType', 'writePolicy', 'mode'],
    };
  }

  getWidthBits(attributes) {
    return attributes.depth !== undefined ? parseInt(attributes.depth, 10) : 8;
  }

  _resolveBacking(attributes, ctx) {
    const refs = attributes.memMembers;
    if (!refs || !refs.length) {
      throw Error('cache requires mem = backing comp [mem] or comp [cache]');
    }
    if (refs.length > 1) throw Error('cache mem = accepts one backing reference');
    if (typeof resolveStorageBackend !== 'function') {
      throw Error('cache storage resolver unavailable');
    }
    return resolveStorageBackend(refs[0], ctx, 0);
  }

  _validateDepthLength(attributes, backing) {
    if (attributes.depth === undefined) throw Error('cache requires depth:');
    if (attributes.length === undefined) throw Error('cache requires length:');
    const depth = cacheParsePositiveInt(attributes.depth, 'depth');
    const length = cacheParsePositiveInt(attributes.length, 'length');
    if (depth !== backing.depth) {
      throw Error(`cache depth ${depth} does not match backing ${backing.compRef} depth ${backing.depth}`);
    }
    if (length !== backing.length) {
      throw Error(`cache length ${length} does not match backing ${backing.compRef} length ${backing.length}`);
    }
    return { depth, length };
  }

  getDef(attributes) {
    const attrs = attributes || {};
    const depth = attrs.depth !== undefined ? parseInt(attrs.depth, 10) : 8;
    const length = attrs.length !== undefined ? parseInt(attrs.length, 10) : 16;
    const lines = attrs.lines !== undefined ? parseInt(attrs.lines, 10) : 16;
    const lineSize = attrs.lineSize !== undefined ? parseInt(attrs.lineSize, 10) : 1;
    const addrBits = typeof storageAddrBits === 'function'
      ? storageAddrBits(length)
      : (length <= 1 ? 1 : 32 - Math.clz32(length - 1));
    const lineBits = cacheLineBits(Math.max(1, lines));
    const tagBits = typeof cacheTagBits === 'function'
      ? cacheTagBits(Math.max(1, lines), Math.max(1, lineSize), length)
      : addrBits;
    const dataBits = Math.max(1, depth * Math.max(1, lineSize));
    const statBits = typeof CACHE_COUNTER_BITS !== 'undefined' ? String(CACHE_COUNTER_BITS) : '16';
    const hitBits = typeof CACHE_HITRATE_BITS !== 'undefined' ? String(CACHE_HITRATE_BITS) : '7';
    return {
      attrs: [
        { name: 'mem', value: '.backing' },
        { name: 'depth', value: 'integer' },
        { name: 'length', value: 'integer' },
        { name: 'lines', value: 'integer' },
        { name: 'lineSize', value: 'integer' },
        { name: 'evictType', value: 'lru|fifo|random' },
        { name: 'writePolicy', value: 'writeBack|writeThrough' },
        { name: 'writeAllocate', value: '0|1' },
        { name: 'on', value: 'mode' },
      ],
      initValue: 'Xbit',
      pins: [
        { bits: '1', name: 'flush' },
        { bits: '1', name: 'invalidate' },
        { bits: '1', name: 'invalidateAll' },
        { bits: '1', name: 'resetStats' },
        { bits: String(lineBits), name: 'line' },
        { bits: String(addrBits), name: 'adr' },
        { bits: '1', name: 'set' },
      ],
      pouts: [
        { bits: statBits, name: 'hits' },
        { bits: statBits, name: 'misses' },
        { bits: hitBits, name: 'hitRate' },
        { bits: statBits, name: 'evictions' },
        { bits: statBits, name: 'dirtyEvictions' },
        { bits: '1', name: 'busy' },
        { bits: '1', name: 'valid' },
        { bits: '1', name: 'dirty' },
        { bits: String(tagBits), name: 'tag' },
        { bits: String(dataBits), name: 'data' },
      ],
      returns: 'Xbit',
    };
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const backing = this._resolveBacking(attributes, ctx);
    const { depth, length } = this._validateDepthLength(attributes, backing);
    const lines = cacheParsePositiveInt(attributes.lines, 'lines');
    const lineSize = cacheParsePositiveInt(attributes.lineSize, 'lineSize');
    const evictType = attributes.evictType != null ? attributes.evictType : 'lru';
    const writePolicy = attributes.writePolicy != null ? attributes.writePolicy : 'writeBack';
    const writeAllocate = attributes.writeAllocate === undefined
      ? true
      : (attributes.writeAllocate === 1 || attributes.writeAllocate === '1');
    const enabled = attributes.on === undefined
      || attributes.on === 1 || attributes.on === '1' || attributes.on === 'raise' || attributes.on === 'edge';
    if (typeof addCache === 'function') {
      addCache({
        id: baseId,
        depth,
        length,
        lines,
        lineSize,
        backingId: backing.storageId,
        backingKind: backing.kind,
        evictType,
        writePolicy,
        writeAllocate,
        enabled,
        rngSeed: 1,
      });
    }
    return {
      deviceIds: [baseId],
      ref: null,
      backingRef: backing.compRef,
      cacheDepth: depth,
      cacheLength: length,
      cacheLines: lines,
      cacheLineSize: lineSize,
    };
  }

  static formatInstanceDoc(alias, comp) {
    const lines = [];
    const attrs = comp.attributes || {};
    const backing = comp.backingRef
      || (attrs.memMembers && attrs.memMembers[0])
      || '(none)';
    lines.push(`${alias} (comp [cache])`);
    lines.push('');
    lines.push(`mem = ${backing}`);
    lines.push(`depth: ${attrs.depth !== undefined ? attrs.depth : comp.cacheDepth || 8}`);
    lines.push(`length: ${attrs.length !== undefined ? attrs.length : comp.cacheLength || 16}`);
    lines.push(`lines: ${attrs.lines !== undefined ? attrs.lines : comp.cacheLines || 16}`);
    lines.push(`lineSize: ${attrs.lineSize !== undefined ? attrs.lineSize : comp.cacheLineSize || 1}`);
    lines.push(`evictType: ${attrs.evictType || 'lru'}`);
    lines.push(`writePolicy: ${attrs.writePolicy || 'writeBack'}`);
    lines.push(`writeAllocate: ${attrs.writeAllocate !== undefined ? attrs.writeAllocate : 1}`);
    const cap = (parseInt(attrs.lines, 10) || 0) * (parseInt(attrs.lineSize, 10) || 0);
    if (cap) lines.push(`capacity: ${cap} addresses`);
    return lines;
  }

  applyProperties(comp, compName, pending, when, reEvaluate, ctx) {
    if (when !== 'immediate' || !pending) return;
    if (typeof cacheApplyPins === 'function') {
      cacheApplyPins(comp.deviceIds[0], pending, reEvaluate, this, ctx);
    }
    if (pending.set !== undefined && ctx.updateComponentConnections) {
      ctx.updateComponentConnections(compName);
    }
  }

  evalGetProperty(comp, property, a, ctx) {
    const c = typeof getCache === 'function' ? getCache(comp.deviceIds[0]) : null;
    if (!c) return null;
    const set = c.sets[c.inspectSet] || c.sets[0];
    let val = null;
    let bitWidth = 1;
    switch (property) {
      case 'hits':
        val = cacheFormatStat(c.stats.hits);
        bitWidth = CACHE_COUNTER_BITS;
        break;
      case 'misses':
        val = cacheFormatStat(c.stats.misses);
        bitWidth = CACHE_COUNTER_BITS;
        break;
      case 'hitRate':
        val = cacheFormatHitRate(c.stats.hits, c.stats.misses);
        bitWidth = CACHE_HITRATE_BITS;
        break;
      case 'evictions':
        val = cacheFormatStat(c.stats.evictions);
        bitWidth = CACHE_COUNTER_BITS;
        break;
      case 'dirtyEvictions':
        val = cacheFormatStat(c.stats.dirtyEvictions);
        bitWidth = CACHE_COUNTER_BITS;
        break;
      case 'busy':
        val = '0';
        break;
      case 'valid':
        val = set && set.valid ? '1' : '0';
        break;
      case 'dirty':
        val = set && set.dirty ? '1' : '0';
        break;
      case 'tag':
        val = set ? set.tag.toString(2).padStart(cacheTagBits(c.lines, c.lineSize, c.length), '0') : '0';
        bitWidth = cacheTagBits(c.lines, c.lineSize, c.length);
        break;
      case 'data':
        val = cacheInspectLineData(c, c.inspectSet);
        bitWidth = c.lineSize * c.depth;
        break;
      default:
        return null;
    }
    const br = this.handleBitRange(a, val, a.var, property, ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CacheComponent;
}
