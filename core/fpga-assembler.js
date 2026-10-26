/**
 * inline [fpga] — parse body, elaborate design, doc helpers.
 */
(function (global) {
  'use strict';

  const FPGA_BUILTIN = {
    'lut.not': { inputs: 1, table: { 0: 1, 1: 0 } },
    'lut.and': { inputs: 2, table: { 0: 0, 1: 0, 2: 0, 3: 1 } },
    'lut.or': { inputs: 2, table: { 0: 0, 1: 1, 2: 1, 3: 1 } },
    'lut.xor': { inputs: 2, table: { 0: 0, 1: 1, 2: 1, 3: 0 } },
    'ff.d': { kind: 'ff', qBits: 1 },
  };

  function stripComments(raw) {
    const lines = String(raw || '').split(/\r?\n/);
    const out = [];
    for (let line of lines) {
      const hash = line.indexOf('#');
      if (hash >= 0) line = line.slice(0, hash);
      line = line.trim();
      if (line) out.push(line);
    }
    return out.join('\n');
  }

  function parseLutTableBody(body) {
    const table = {};
    let maxKey = 0;
    const parts = body.split(';');
    for (let part of parts) {
      part = part.trim();
      if (!part) continue;
      const m = part.match(/^([01]+)\s*->\s*([01]+)$/);
      if (!m) throw new Error(`Invalid LUT entry '${part}' (expected binary -> binary)`);
      const key = parseInt(m[1], 2);
      const val = parseInt(m[2], 2);
      table[key] = val;
      if (key > maxKey) maxKey = key;
    }
    const inputs = maxKey <= 1 ? 1 : (maxKey <= 3 ? 2 : Math.ceil(Math.log2(maxKey + 1)));
    return { inputs, table };
  }

  function parseRamConfigBody(body) {
    const cfg = {};
    const re = /(\w+)\s*=\s*(\d+)/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      cfg[m[1]] = parseInt(m[2], 10);
    }
    if (!cfg.address || !cfg.data) {
      throw new Error('RAM config requires address = N and data = M');
    }
    return cfg;
  }

  function wireLiterals() {
    return typeof LogTScriptWireLiterals !== 'undefined' ? LogTScriptWireLiterals : null;
  }

  function decodeRoutingLiteral(raw, totalBits, ctxLabel) {
    const WL = wireLiterals();
    const decFn = WL && WL.unsignedDecToWidthBin ? WL.unsignedDecToWidthBin : null;
    const b32Fn = WL && WL.b32cDigitsToBin ? WL.b32cDigitsToBin : null;
    const s = String(raw || '').trim();
    if (!s) throw new Error(`${ctxLabel}: empty routing literal`);
    let bin = '';
    if (/^\\/.test(s) || /^\d/.test(s) || s.indexOf('\\') >= 0) {
      const m = s.match(/^\\(\d+)(?:;(\d+))?$/);
      if (m && decFn) {
        const w = m[2] ? parseInt(m[2], 10) : totalBits;
        bin = decFn(m[1], w);
      } else {
        const grouped = s.split(/\s+/).filter(Boolean);
        if (grouped.length && grouped.every((g) => /^\\\d+/.test(g))) {
          for (const g of grouped) {
            const gm = g.match(/^\\(\d+)(?:;(\d+))?$/);
            if (!gm) throw new Error(`${ctxLabel}: invalid decimal group '${g}'`);
            const w = gm[2] ? parseInt(gm[2], 10) : 8;
            bin += decFn(gm[1], w);
          }
        }
      }
    }
    if (!bin && /^xc\^/i.test(s) && b32Fn) {
      bin = b32Fn(s.replace(/^xc\^/i, ''));
    }
    if (!bin && /^[01\s]+$/.test(s)) {
      bin = s.replace(/\s+/g, '');
    }
    if (!bin) throw new Error(`${ctxLabel}: unsupported routing literal '${s}'`);
    if (bin.length < totalBits) bin = bin.padStart(totalBits, '0');
    if (bin.length > totalBits) bin = bin.slice(bin.length - totalBits);
    if (bin.length !== totalBits) {
      throw new Error(`${ctxLabel}: expected ${totalBits} routing bits, got ${bin.length}`);
    }
    return bin;
  }

  function sliceRoutingIds(bin, idBits) {
    const ids = [];
    for (let i = 0; i < bin.length; i += idBits) {
      const chunk = bin.slice(i, i + idBits);
      ids.push(parseInt(chunk, 2));
    }
    return ids;
  }

  function parseFpgaBody(bodyRaw, instName) {
    const text = stripComments(bodyRaw);
    const configs = Object.create(null);
    const cells = { lut: [], ff: [], ram: [] };
    const routing = Object.create(null);
    let lutInIdBits = 8;
    let ffInIdBits = 8;
    let ramInIdBits = 8;
    let inpInIdBits = 8;
    let outInIdBits = 8;

    for (const line of text.split('\n')) {
      const ln = line.trim();
      if (!ln) continue;
      let m;

      m = ln.match(/^lut\.inIdBits\s*=\s*(\d+)\s*$/);
      if (m) { lutInIdBits = parseInt(m[1], 10); continue; }
      m = ln.match(/^ff\.inIdBits\s*=\s*(\d+)\s*$/);
      if (m) { ffInIdBits = parseInt(m[1], 10); continue; }
      m = ln.match(/^ram\.inIdBits\s*=\s*(\d+)\s*$/);
      if (m) { ramInIdBits = parseInt(m[1], 10); continue; }
      m = ln.match(/^inp\.inIdBits\s*=\s*(\d+)\s*$/);
      if (m) { inpInIdBits = parseInt(m[1], 10); continue; }
      m = ln.match(/^out\.inIdBits\s*=\s*(\d+)\s*$/);
      if (m) { outInIdBits = parseInt(m[1], 10); continue; }

      m = ln.match(/^cell\s+(lut|ff|ram)\[(\d+)\]\s+like\s+(lut\.\w+|ff\.\w+|ram\.\w+)\s*;?\s*$/);
      if (m) {
        cells[m[1]].push({ count: parseInt(m[2], 10), configRef: m[3] });
        continue;
      }

      m = ln.match(/^(lut\.\w+)\s*=\s*\{([^}]+)\}\s*$/);
      if (m) {
        configs[m[1]] = parseLutTableBody(m[2]);
        continue;
      }

      m = ln.match(/^ff\.(\w+)\s*;?\s*$/);
      if (m && FPGA_BUILTIN['ff.' + m[1]]) {
        configs['ff.' + m[1]] = FPGA_BUILTIN['ff.' + m[1]];
        continue;
      }

      m = ln.match(/^ram\.(\w+)\s*=\s*\{([^}]+)\}\s*$/);
      if (m) {
        configs['ram.' + m[1]] = parseRamConfigBody(m[2]);
        continue;
      }

      m = ln.match(/^(inp|out|lut\.\w+|ff\.\w+|ram\.\w+)\s*=\s*(.+)$/);
      if (m) {
        routing[m[1]] = m[2].trim();
        continue;
      }

      throw new Error(`inline ${instName}: unrecognized line '${ln}'`);
    }

    return {
      configs,
      cells,
      routing,
      inIdBits: { lut: lutInIdBits, ff: ffInIdBits, ram: ramInIdBits, inp: inpInIdBits, out: outInIdBits },
    };
  }

  function flattenCells(cells, kind) {
    const list = [];
    for (const bank of cells[kind] || []) {
      for (let i = 0; i < bank.count; i++) {
        list.push({ configRef: bank.configRef });
      }
    }
    return list;
  }

  function resolveConfig(ref, configs) {
    if (FPGA_BUILTIN[ref]) return Object.assign({ ref }, FPGA_BUILTIN[ref]);
    if (configs[ref]) return Object.assign({ ref }, configs[ref]);
    throw new Error(`Unknown FPGA config '${ref}'`);
  }

  function elaborateFpgaDesign(parsed, instName) {
    const lutInst = flattenCells(parsed.cells, 'lut');
    const ffInst = flattenCells(parsed.cells, 'ff');
    const ramInst = flattenCells(parsed.cells, 'ram');
    const lutConfigs = lutInst.map((x) => resolveConfig(x.configRef, parsed.configs));

    let inputPortCount = 0;
    if (parsed.routing.inp) {
      const nFields = parsed.routing.inp.trim().split(/\s+/).filter(Boolean).length;
      const totalBits = Math.max(nFields, 1) * parsed.inIdBits.inp;
      const bin = decodeRoutingLiteral(parsed.routing.inp, totalBits, `${instName} inp`);
      inputPortCount = sliceRoutingIds(bin, parsed.inIdBits.inp).length;
    } else {
      const lutCount = lutInst.length;
      const lutInputIds = new Set();
      for (const key of Object.keys(parsed.routing)) {
        if (!key.startsWith('lut.in')) continue;
        const idBits = parsed.inIdBits.lut;
        const totalBits = lutCount * idBits;
        const bin = decodeRoutingLiteral(parsed.routing[key], totalBits, `${instName} ${key}`);
        for (const sid of sliceRoutingIds(bin, idBits)) lutInputIds.add(sid);
      }

      function lutNamespaceOk(i) {
        if (lutInputIds.size === 0) return true;
        for (const sid of lutInputIds) {
          const isInput = sid < i;
          const isLutOut = lutCount > 0 && sid >= i && sid < i + lutCount;
          if (!isInput && !isLutOut) return false;
        }
        return true;
      }

      inputPortCount = 0;
      if (parsed.routing.out && lutCount > 0) {
        const idBits = parsed.inIdBits.out;
        const nFields = Math.max(1, parsed.routing.out.trim().split(/\s+/).filter(Boolean).length);
        const totalBits = nFields * idBits;
        const bin = decodeRoutingLiteral(parsed.routing.out, totalBits, `${instName} out`);
        const outIds = sliceRoutingIds(bin, idBits);
        if (outIds.length > 0) {
          inputPortCount = outIds[0];
          if (!lutNamespaceOk(inputPortCount)) {
            throw new Error(`${instName}: out routing and lut inputs disagree on inputPortCount`);
          }
        }
      } else if (lutInputIds.size > 0) {
        let found = false;
        for (let i = 0; i <= 256; i++) {
          if (lutNamespaceOk(i)) {
            inputPortCount = i;
            found = true;
            break;
          }
        }
        if (!found) {
          throw new Error(`${instName}: routing source ids do not fit input/LUT namespace`);
        }
      }
    }

    const lutBase = inputPortCount;
    const ffBase = lutBase + lutInst.length;
    const ramBase = ffBase + ffInst.length;

    function sourceIdLutOut(i) { return lutBase + i; }

    const lutRouting = {};
    for (const key of Object.keys(parsed.routing)) {
      if (!key.startsWith('lut.in')) continue;
      const port = key.slice(4);
      const idBits = parsed.inIdBits.lut;
      const totalBits = lutInst.length * idBits;
      const bin = decodeRoutingLiteral(parsed.routing[key], totalBits, `${instName} ${key}`);
      lutRouting[port] = sliceRoutingIds(bin, idBits);
    }

    let outputPortCount = 0;
    let outMap = [];
    if (parsed.routing.out) {
      const idBits = parsed.inIdBits.out;
      const nFields = parsed.routing.out.trim().split(/\s+/).filter(Boolean).length;
      const totalBits = Math.max(nFields, 1) * idBits;
      const bin = decodeRoutingLiteral(parsed.routing.out, totalBits, `${instName} out`);
      outMap = sliceRoutingIds(bin, idBits);
      outputPortCount = outMap.length;
    } else {
      outputPortCount = 1;
      outMap = [lutInst.length ? sourceIdLutOut(0) : 0];
    }

    const design = {
      name: instName,
      inputPortCount,
      outputPortCount,
      outMap,
      lutInst,
      lutConfigs,
      lutRouting,
      ffInst,
      ramInst,
      lutBase,
      ffBase,
      ramBase,
      inIdBits: parsed.inIdBits,
      seqStateWidth: 1 + ffInst.length + ramInst.reduce((s, r) => {
        const cfg = resolveConfig(r.configRef, parsed.configs);
        return s + (1 << cfg.address) * cfg.data;
      }, 0),
      outWidth: outputPortCount,
      evalReturnWidth: outputPortCount + (1 + ffInst.length + ramInst.reduce((s, r) => {
        const c = resolveConfig(r.configRef, parsed.configs);
        return s + (1 << c.address) * c.data;
      }, 0)),
    };
    design.evalReturnWidth = design.outWidth + design.seqStateWidth;

    if (typeof fpgaDetectCombLoop === 'function') {
      fpgaDetectCombLoop(design);
    }

    return design;
  }

  function parseFpgaInline(bodyRaw, instName) {
    const parsed = parseFpgaBody(bodyRaw, instName);
    const design = elaborateFpgaDesign(parsed, instName);
    return { parsed, design };
  }

  function formatFpgaInstanceDoc(instName, inst) {
    const d = inst.design;
    if (!d) return [`${instName}: (no design)`];
    const lines = [
      `${instName} (inline [fpga])`,
      `  inputPortCount: ${d.inputPortCount}`,
      `  outputPortCount: ${d.outputPortCount}`,
      `  outWidth: ${d.outWidth}`,
      `  seqStateWidth: ${d.seqStateWidth}`,
      `  evalReturnWidth: ${d.evalReturnWidth}`,
      `  lut instances: ${d.lutInst.length}`,
      `  ff instances: ${d.ffInst.length}`,
      `  ram instances: ${d.ramInst.length}`,
    ];
    return lines;
  }

  function formatFpgaTypeDoc() {
    return [
      'inline [fpga] — digital fabric definition (LUT / FF / RAM, routing).',
      'Use comp [fpga] for runtime wiring; :eval for stateless simulation steps.',
      'See doc/inline-fpga.md and doc/comp-fpga.md',
    ];
  }

  global.FPGA_BUILTIN = FPGA_BUILTIN;
  global.parseFpgaInline = parseFpgaInline;
  global.formatFpgaInstanceDoc = formatFpgaInstanceDoc;
  global.formatFpgaTypeDoc = formatFpgaTypeDoc;
  global.decodeFpgaRoutingLiteral = decodeRoutingLiteral;
  global.sliceFpgaRoutingIds = sliceRoutingIds;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseFpgaInline,
      formatFpgaInstanceDoc,
      formatFpgaTypeDoc,
      FPGA_BUILTIN,
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
