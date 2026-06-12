var BuiltinComponent = (typeof require !== 'undefined') ? require('./builtin-component') : BuiltinComponent;

var LutComponent = class LutComponent extends BuiltinComponent {
  static get type() { return 'lut'; }
  static get shortnames() { return {}; }
  static get isReservedName() { return true; }

  getWidthBits(attributes) {
    return attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
  }

  getSupportedProperties() { return ['get']; }
  getRedirectProperties() { return ['get']; }

  _addrBits(length) {
    if (length <= 1) return 1;
    return Math.ceil(Math.log2(length));
  }

  getDef() {
    return {
      attrs: [
        { name: 'depth', value: 'integer' },
        { name: 'length', value: 'integer' },
        { name: 'fillwith', value: 'Xbit' },
      ],
      initValue: 'data { addr : value, addr-addr : value, ... }',
      pins: [{ bits: 'X', name: 'in' }],
      pouts: [{ bits: 'X', name: 'get' }],
      returns: null,
    };
  }

  _resolveFillwith(attributes, depth) {
    let fill = attributes.fillwith;
    if (fill === undefined || fill === null) return '0'.repeat(depth);
    fill = String(fill);
    if (fill.length !== depth) {
      throw Error(`LUT fillwith must be exactly ${depth} bits, got ${fill.length}`);
    }
    if (!/^[01]+$/.test(fill)) {
      throw Error(`LUT fillwith must be a binary literal`);
    }
    return fill;
  }

  _buildTable(length, depth, fillwith, initialValue) {
    const table = new Array(length);
    for (let i = 0; i < length; i++) table[i] = fillwith;
    const entries = (initialValue && initialValue.kind === 'lutData') ? initialValue.entries : [];
    for (const entry of entries) {
      for (let i = entry.from; i <= entry.to; i++) {
        table[i] = entry.value;
      }
    }
    return table;
  }

  createDevice(name, baseId, bits, attributes, initialValue, returnType, ctx) {
    const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 16;
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    if (length <= 0 || depth <= 0) throw Error(`LUT length and depth must be positive for component ${name}`);
    if (!initialValue || initialValue.kind !== 'lutData') {
      throw Error(`LUT component ${name} requires '= data { ... }' initializer`);
    }
    const fillwith = this._resolveFillwith(attributes, depth);
    for (const entry of initialValue.entries) {
      if (entry.value.length !== depth) {
        throw Error(`LUT value must be exactly ${depth} bits at address ${entry.from}`);
      }
    }
    const table = this._buildTable(length, depth, fillwith, initialValue);
    const lutId = baseId;
    if (typeof addLut === 'function') {
      addLut({ id: lutId, length, depth, table, default: fillwith });
    }
    return { deviceIds: [lutId], ref: null };
  }

  finalizeCompInfo(compInfo, attributes, initialValue, bits) {
    const length = attributes['length'] !== undefined ? parseInt(attributes['length'], 10) : 16;
    const depth = attributes['depth'] !== undefined ? parseInt(attributes['depth'], 10) : 4;
    const fillwith = this._resolveFillwith(attributes, depth);
    compInfo.fillwithValue = fillwith;
    if (initialValue && initialValue.kind === 'lutData') {
      compInfo.lutEntries = initialValue.entries;
      compInfo.lutRawEntries = initialValue.rawEntries;
      compInfo.lutTable = this._buildTable(length, depth, fillwith, initialValue);
    }
  }

  _lookup(comp, lutId) {
    let val = null;
    if (typeof getLutOut === 'function') val = getLutOut(lutId);
    if (val === null || val === undefined) {
      const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
      if (comp.lutTable && comp.lutTable.length) {
        const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 16;
        const addrBits = this._addrBits(length);
        const pending = comp._lutInValue || '0'.repeat(addrBits);
        const addr = parseInt(pending, 2);
        if (!isNaN(addr) && addr >= 0 && addr < comp.lutTable.length) val = comp.lutTable[addr];
      }
      if (val === null || val === undefined) val = comp.fillwithValue || '0'.repeat(depth);
    }
    return val;
  }

  evalGetProperty(comp, property, a, ctx) {
    if (comp.labelMap && comp.labelMap[property]) {
      const entry = comp.labelMap[property];
      const meta = typeof makeSymbolicMeta === 'function'
        ? makeSymbolicMeta(a.var, property, entry.exprSource)
        : { labelName: property, exprSource: entry.exprSource, lutRef: a.var };
      let val = entry.bits;
      const br = this.handleBitRange(a, val, a.var, property, ctx);
      if (br) return br;
      return { value: val, ref: null, varName: `${a.var}:${property}`, bitWidth: val.length, symbolicMeta: meta };
    }
    if (property === 'isValid' || property === 'decode') return null;
    if (property !== 'get') return null;
    const lutId = comp.deviceIds[0];
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    let val = this._lookup(comp, lutId);
    const br = this.handleBitRange(a, val, a.var, 'get', ctx);
    if (br) return br;
    return { value: val, ref: null, varName: `${a.var}:get`, bitWidth: depth };
  }

  handleImmediateAssignment(comp, property, value, ctx) {
    if (property !== 'in') return false;
    const lutId = comp.deviceIds[0];
    const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 16;
    const addrBits = this._addrBits(length);
    const binValue = this.padOrTruncate(value, addrBits);
    comp._lutInValue = binValue;
    if (typeof setLutIn === 'function') setLutIn(lutId, binValue);
    return true;
  }

  static formatInlineTypeDoc() {
    const lines = [];
    lines.push('inline [lut] .name:');
    lines.push('  depth: 4');
    lines.push('  length: 16');
    lines.push('  fillwith: 0110');
    lines.push('  data {');
    lines.push('    0         : 0001');
    lines.push('    \\1 - \\5   : 0010');
    lines.push('  }');
    lines.push('  :');
    lines.push('');
    lines.push('Lookup (combinational):');
    lines.push('  .name(in = addr)   # named address');
    lines.push('  .name(0011)        # positional address');
    return lines;
  }

  static formatInlineInstanceDoc(alias, inst) {
    const depth = inst.attributes && inst.attributes.depth !== undefined ? parseInt(inst.attributes.depth, 10) : 4;
    const length = inst.attributes && inst.attributes.length !== undefined ? parseInt(inst.attributes.length, 10) : 16;
    const fill = inst.fillwithValue || '0'.repeat(depth);
    const lines = [];
    lines.push(`${alias} (inline [lut])`);
    lines.push(`  depth: ${depth}`);
    lines.push(`  length: ${length}`);
    lines.push(`  fillwith: ${fill}`);
    const labelMap = inst.labelMap || {};
    const labelNames = Object.keys(labelMap);
    if (labelNames.length) {
      lines.push('  labels:');
      for (const name of labelNames) {
        const entry = labelMap[name];
        if (entry.exprSource) {
          lines.push(`    ${name} = ${entry.exprSource}`);
          lines.push(`           ${entry.bits}`);
        } else {
          lines.push(`    ${name} = ${entry.bits}`);
        }
      }
    }
    lines.push('  decode:');
    lines.push('    supported');
    lines.push('  matches:');
    lines.push('    reverse lookup');
    const raw = inst.lutRawEntries || [];
    const entries = inst.lutEntries || [];
    if (raw.length) {
      lines.push(labelNames.length ? '  data:' : '  map:');
      for (let i = 0; i < raw.length; i++) {
        const r = raw[i];
        const e = entries[i];
        const fromLabel = r.fromRaw;
        const toLabel = (e && e.to !== e.from) ? (r.toRaw || r.fromRaw) : null;
        const rangeLabel = toLabel ? `${fromLabel}-${toLabel}` : fromLabel;
        const valShow = r.valueRaw || (e ? e.value : r.value);
        lines.push(`    ${rangeLabel} -> ${valShow}`);
      }
    } else if (entries.length) {
      lines.push('  map:');
      for (const e of entries) {
        const rangeLabel = e.to !== e.from ? `${e.from}-${e.to}` : String(e.from);
        lines.push(`    ${rangeLabel} -> ${e.value}`);
      }
    } else if (!labelNames.length) {
      lines.push('  map:');
      lines.push('    (none)');
    }
    const mapped = new Set();
    for (const e of entries) {
      for (let i = e.from; i <= e.to; i++) mapped.add(i);
    }
    const gaps = [];
    let gapStart = null;
    for (let i = 0; i < length; i++) {
      if (!mapped.has(i)) {
        if (gapStart === null) gapStart = i;
      } else if (gapStart !== null) {
        gaps.push([gapStart, i - 1]);
        gapStart = null;
      }
    }
    if (gapStart !== null) gaps.push([gapStart, length - 1]);
    if (gaps.length) {
      lines.push('  fill:');
      for (const [a, b] of gaps) {
        const label = a === b ? String(a) : `${a}-${b}`;
        lines.push(`    ${label} -> ${fill} (fillwith)`);
      }
    }
    if (length <= 16 && inst.lutTable) {
      lines.push('  table:');
      for (let i = 0; i < inst.lutTable.length; i++) {
        lines.push(`    [${i}]=${inst.lutTable[i]}`);
      }
    }
    return lines;
  }

  static formatInstanceDoc(alias, comp) {
    const depth = comp.attributes['depth'] !== undefined ? parseInt(comp.attributes['depth'], 10) : 4;
    const length = comp.attributes['length'] !== undefined ? parseInt(comp.attributes['length'], 10) : 16;
    const fill = comp.fillwithValue || '0'.repeat(depth);
    const lines = [];
    lines.push(`${alias} (comp [lut])`);
    lines.push(`  depth: ${depth}`);
    lines.push(`  length: ${length}`);
    lines.push(`  fillwith: ${fill}`);
    lines.push('  map:');
    const raw = comp.lutRawEntries || [];
    const entries = comp.lutEntries || [];
    if (raw.length) {
      for (let i = 0; i < raw.length; i++) {
        const r = raw[i];
        const e = entries[i];
        const fromLabel = r.fromRaw;
        const toLabel = (e && e.to !== e.from) ? (r.toRaw || r.fromRaw) : null;
        const rangeLabel = toLabel ? `${fromLabel}-${toLabel}` : fromLabel;
        lines.push(`    ${rangeLabel} -> ${e ? e.value : r.value}`);
      }
    } else if (entries.length) {
      for (const e of entries) {
        const rangeLabel = e.to !== e.from ? `${e.from}-${e.to}` : String(e.from);
        lines.push(`    ${rangeLabel} -> ${e.value}`);
      }
    } else {
      lines.push('    (none)');
    }
    const mapped = new Set();
    for (const e of entries) {
      for (let i = e.from; i <= e.to; i++) mapped.add(i);
    }
    const gaps = [];
    let gapStart = null;
    for (let i = 0; i < length; i++) {
      if (!mapped.has(i)) {
        if (gapStart === null) gapStart = i;
      } else if (gapStart !== null) {
        gaps.push([gapStart, i - 1]);
        gapStart = null;
      }
    }
    if (gapStart !== null) gaps.push([gapStart, length - 1]);
    if (gaps.length) {
      lines.push('  fill:');
      for (const [a, b] of gaps) {
        const label = a === b ? String(a) : `${a}-${b}`;
        lines.push(`    ${label} -> ${fill} (fillwith)`);
      }
    }
    if (length <= 16 && comp.lutTable) {
      lines.push('  table:');
      for (let i = 0; i < comp.lutTable.length; i++) {
        lines.push(`    [${i}]=${comp.lutTable[i]}`);
      }
    }
    return lines;
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = LutComponent; }
