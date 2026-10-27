/**
 * FPGA combinational settle + :eval step (LUT / FF / RAM seqState).
 */
(function (global) {
  'use strict';

  function fpgaDetectCombLoop(design) {
    const n = design.lutInst.length;
    if (n === 0) return;
    const edges = [];
    for (let i = 0; i < n; i++) {
      const cfg = design.lutConfigs[i];
      for (let p = 0; p < cfg.inputs; p++) {
        const portKey = 'in' + p;
        const routes = design.lutRouting[portKey];
        if (!routes) continue;
        const sid = routes[i];
        if (sid >= design.lutBase && sid < design.lutBase + n) {
          edges.push({ from: sid - design.lutBase, to: i });
        }
      }
    }
    const visited = new Array(n).fill(0);
    function dfs(u) {
      visited[u] = 1;
      for (const e of edges) {
        if (e.from !== u) continue;
        const v = e.to;
        if (visited[v] === 1) {
          throw new Error(`Combinational loop in LUT fabric (includes LUT ${v})`);
        }
        if (visited[v] === 0) dfs(v);
      }
      visited[u] = 2;
    }
    for (let i = 0; i < n; i++) {
      if (visited[i] === 0) dfs(i);
    }
  }

  function unpackSeqState(design, seqBits) {
    let p = 0;
    const prevClock = seqBits[p] != null && seqBits[p] === '1' ? '1' : '0';
    p++;
    const ffQ = [];
    for (let i = 0; i < design.ffInst.length; i++) {
      ffQ.push(seqBits[p] === '1' ? '1' : '0');
      p++;
    }
    const ramMem = [];
    for (let ri = 0; ri < design.ramInst.length; ri++) {
      const cfg = design.ramConfigs[ri];
      const words = 1 << cfg.address;
      const mem = [];
      for (let w = 0; w < words; w++) {
        let word = '';
        for (let b = 0; b < cfg.data; b++) {
          word += seqBits[p] === '1' ? '1' : '0';
          p++;
        }
        mem.push(word);
      }
      ramMem.push(mem);
    }
    return { prevClock, ffQ, ramMem };
  }

  function packSeqState(design, prevClock, ffQ, ramMem) {
    let s = prevClock === '1' ? '1' : '0';
    for (let i = 0; i < design.ffInst.length; i++) {
      s += ffQ[i] === '1' ? '1' : '0';
    }
    for (let ri = 0; ri < design.ramInst.length; ri++) {
      const cfg = design.ramConfigs[ri];
      const mem = ramMem[ri] || [];
      const words = 1 << cfg.address;
      for (let w = 0; w < words; w++) {
        let word = mem[w] || '0'.repeat(cfg.data);
        if (word.length < cfg.data) word = word.padStart(cfg.data, '0');
        else if (word.length > cfg.data) word = word.slice(-cfg.data);
        s += word;
      }
    }
    return s;
  }

  function readRamWordBits(design, ramMem, ramIndex, addressBits) {
    const cfg = design.ramConfigs[ramIndex];
    let addr = 0;
    for (let b = 0; b < addressBits.length; b++) {
      addr = (addr << 1) | (addressBits[b] === '1' ? 1 : 0);
    }
    const maxAddr = (1 << cfg.address) - 1;
    if (addr > maxAddr) addr = maxAddr;
    const mem = ramMem[ramIndex] || [];
    return mem[addr] || '0'.repeat(cfg.data);
  }

  function readSourceBit(sourceId, design, ctx) {
    const { sourceValues, ffQ, ramMem } = ctx;
    if (sourceId < design.inputPortCount) {
      return sourceValues[sourceId] || '0';
    }
    if (sourceId >= design.lutBase && sourceId < design.lutBase + design.lutInst.length) {
      return sourceValues[sourceId] || '0';
    }
    if (design.ffInst.length && sourceId >= design.ffBase && sourceId < design.ffBase + design.ffInst.length) {
      return ffQ[sourceId - design.ffBase] || '0';
    }
    if (design.ramInst.length && design.ramReadBase != null) {
      let rb = design.ramReadBase;
      for (let ri = 0; ri < design.ramInst.length; ri++) {
        const cfg = design.ramConfigs[ri];
        const addrIds = design.ramAddressRouting[ri] || [];
        const addrBits = addrIds.map((sid) => readSourceBit(sid, design, ctx));
        const word = readRamWordBits(design, ramMem, ri, addrBits);
        for (let b = 0; b < cfg.data; b++) {
          if (sourceId === rb + b) return word[b] || '0';
        }
        rb += cfg.data;
      }
    }
    return '0';
  }

  function fpgaCombSettle(design, inputBits, ctx) {
    const n = design.lutInst.length;
    const sourceValues = ctx.sourceValues;
    for (let i = 0; i < design.inputPortCount; i++) {
      sourceValues[i] = inputBits[i] != null ? String(inputBits[i]) : '0';
    }
    const order = [];
    const indeg = new Array(n).fill(0);
    const adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      const cfg = design.lutConfigs[i];
      for (let p = 0; p < cfg.inputs; p++) {
        const portKey = 'in' + p;
        const routes = design.lutRouting[portKey];
        if (!routes) continue;
        const sid = routes[i];
        if (sid >= design.lutBase && sid < design.lutBase + n) {
          adj[sid - design.lutBase].push(i);
          indeg[i]++;
        }
      }
    }
    const q = [];
    for (let i = 0; i < n; i++) if (indeg[i] === 0) q.push(i);
    while (q.length) {
      const u = q.shift();
      order.push(u);
      for (const v of adj[u]) {
        indeg[v]--;
        if (indeg[v] === 0) q.push(v);
      }
    }
    if (order.length !== n) {
      throw new Error('Combinational loop in LUT fabric');
    }
    for (const li of order) {
      const cfg = design.lutConfigs[li];
      let key = 0;
      for (let p = 0; p < cfg.inputs; p++) {
        const portKey = 'in' + p;
        const routes = design.lutRouting[portKey];
        const sid = routes ? routes[li] : 0;
        const bit = readSourceBit(sid, design, ctx);
        key = (key << 1) | (bit === '1' ? 1 : 0);
      }
      const out = cfg.table[key] != null ? cfg.table[key] : 0;
      sourceValues[design.lutBase + li] = out ? '1' : '0';
    }
    const outs = [];
    for (let o = 0; o < design.outputPortCount; o++) {
      const sid = design.outMap[o];
      outs.push(readSourceBit(sid, design, ctx));
    }
    return outs.join('');
  }

  function readPortBitFromSid(sid, design, ctx) {
    return readSourceBit(sid, design, ctx);
  }

  function fpgaEvalStep(design, inputsWireBits, clockBit, seqStateInBits) {
    const seqIn = seqStateInBits != null ? String(seqStateInBits) : '';
    const paddedSeq = seqIn.padEnd(design.seqStateWidth, '0').slice(0, design.seqStateWidth);
    const unpacked = unpackSeqState(design, paddedSeq);
    const ctx = {
      sourceValues: Object.create(null),
      ffQ: unpacked.ffQ.slice(),
      ramMem: unpacked.ramMem.map((m) => m.slice()),
    };
    const inputBits = [];
    for (let i = 0; i < design.inputPortCount; i++) {
      inputBits[i] = i < inputsWireBits.length ? inputsWireBits[i] : '0';
    }
    fpgaCombSettle(design, inputBits, ctx);
    const clock = clockBit === '1' ? '1' : '0';
    const rising = unpacked.prevClock === '0' && clock === '1';

    if (rising && design.ffInst.length && design.ffDRouting) {
      for (let i = 0; i < design.ffInst.length; i++) {
        const sid = design.ffDRouting[i];
        const dBit = sid != null ? readSourceBit(sid, design, ctx) : '0';
        ctx.ffQ[i] = dBit === '1' ? '1' : '0';
      }
    }

    if (rising && design.ramInst.length) {
      for (let ri = 0; ri < design.ramInst.length; ri++) {
        const cfg = design.ramConfigs[ri];
        const wSid = design.ramWriteRouting[ri];
        const writeBit = wSid != null ? readSourceBit(wSid, design, ctx) : '0';
        if (writeBit !== '1') continue;
        const addrIds = design.ramAddressRouting[ri] || [];
        const dataIds = design.ramDataInRouting[ri] || [];
        const addrBits = addrIds.map((sid) => readSourceBit(sid, design, ctx));
        let addr = 0;
        for (let b = 0; b < addrBits.length; b++) {
          addr = (addr << 1) | (addrBits[b] === '1' ? 1 : 0);
        }
        let word = '';
        for (let b = 0; b < cfg.data; b++) {
          const sid = dataIds[b];
          word += readSourceBit(sid, design, ctx) === '1' ? '1' : '0';
        }
        if (!ctx.ramMem[ri]) ctx.ramMem[ri] = [];
        ctx.ramMem[ri][addr] = word;
      }
    }

    const outs = [];
    for (let o = 0; o < design.outputPortCount; o++) {
      outs.push(readSourceBit(design.outMap[o], design, ctx));
    }
    const seqStateOut = packSeqState(design, clock, ctx.ffQ, ctx.ramMem);
    return outs.join('') + seqStateOut;
  }

  global.fpgaDetectCombLoop = fpgaDetectCombLoop;
  global.fpgaCombSettle = fpgaCombSettle;
  global.fpgaEvalStep = fpgaEvalStep;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fpgaDetectCombLoop, fpgaCombSettle, fpgaEvalStep };
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
