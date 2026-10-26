/**
 * FPGA combinational settle + :eval step (MVP).
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
    const stack = [];
    function dfs(u) {
      visited[u] = 1;
      stack.push(u);
      for (const e of edges) {
        if (e.from !== u) continue;
        const v = e.to;
        if (visited[v] === 1) {
          throw new Error(`Combinational loop in LUT fabric (includes LUT ${v})`);
        }
        if (visited[v] === 0) dfs(v);
      }
      stack.pop();
      visited[u] = 2;
    }
    for (let i = 0; i < n; i++) {
      if (visited[i] === 0) dfs(i);
    }
  }

  function readSourceBit(sourceId, design, sourceValues) {
    if (sourceId < design.inputPortCount) {
      return sourceValues[sourceId] || '0';
    }
    if (sourceId >= design.lutBase && sourceId < design.lutBase + design.lutInst.length) {
      return sourceValues[sourceId] || '0';
    }
    return '0';
  }

  function fpgaCombSettle(design, inputBits, sourceValues) {
    const n = design.lutInst.length;
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
        const bit = readSourceBit(sid, design, sourceValues);
        key = (key << 1) | (bit === '1' ? 1 : 0);
      }
      const out = cfg.table[key] != null ? cfg.table[key] : 0;
      sourceValues[design.lutBase + li] = out ? '1' : '0';
    }
    const outs = [];
    for (let o = 0; o < design.outputPortCount; o++) {
      const sid = design.outMap[o];
      outs.push(readSourceBit(sid, design, sourceValues));
    }
    return outs.join('');
  }

  function fpgaEvalStep(design, inputsWireBits, clockBit, seqStateInBits) {
    const inputBits = [];
    for (let i = 0; i < design.inputPortCount; i++) {
      inputBits[i] = i < inputsWireBits.length ? inputsWireBits[i] : '0';
    }
    const sourceValues = Object.create(null);
    const outBits = fpgaCombSettle(design, inputBits, sourceValues);
    const seqStateOut = (clockBit === '1' || clockBit === '0') ? clockBit : '0';
    return outBits + seqStateOut;
  }

  global.fpgaDetectCombLoop = fpgaDetectCombLoop;
  global.fpgaCombSettle = fpgaCombSettle;
  global.fpgaEvalStep = fpgaEvalStep;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fpgaDetectCombLoop, fpgaCombSettle, fpgaEvalStep };
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global);
