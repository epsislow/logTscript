/* ================= PLC DEVICE ================= */

function dmPlcs() {
  const maps = typeof dm === 'function' ? dm() : null;
  if (!maps) return null;
  if (!maps.plcs) maps.plcs = new Map();
  return maps.plcs;
}

function addPlc(id, config) {
  const plcs = dmPlcs();
  if (!plcs) return;
  plcs.set(id, {
    id,
    programRef: config.programRef,
    inputMap: config.inputMap || {},
    outputMap: config.outputMap || {},
    outputState: config.outputState || {},
    scanCount: config.scanCount || 0,
  });
}

function getPlc(id) {
  const plcs = dmPlcs();
  return plcs ? plcs.get(id) : null;
}

function plcSetScanCount(id, count) {
  const p = getPlc(id);
  if (p) p.scanCount = count;
}

function plcGetScanCount(id) {
  const p = getPlc(id);
  return p ? p.scanCount : 0;
}

if (typeof globalThis !== 'undefined') {
  globalThis.addPlc = addPlc;
  globalThis.getPlc = getPlc;
  globalThis.plcSetScanCount = plcSetScanCount;
  globalThis.plcGetScanCount = plcGetScanCount;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { addPlc, getPlc, plcSetScanCount, plcGetScanCount };
}
