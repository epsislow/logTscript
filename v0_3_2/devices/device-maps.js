/* ================= DEVICE MAPS (per RunContext instance) ================= */

let _deviceOpInstanceId = null;
let _fallbackDeviceMaps = null;
const _execInterpStack = [];

function createDeviceMaps() {
  return {
    leds: new Map(),
    sevenSegDisplays: new Map(),
    dipSwitches: new Map(),
    ioportContainers: new Map(),
    terminalDisplays: new Map(),
    lcdDisplays: new Map(),
    clcdDisplays: new Map(),
    alus: new Map(),
    memories: new Map(),
    registers: new Map(),
    counters: new Map(),
    adders: new Map(),
    subtracts: new Map(),
    dividers: new Map(),
    multipliers: new Map(),
    shifters: new Map(),
    luts: new Map(),
    stores: new Map(),
    panelKeyboards: new Map(),
    panelKeys: new Map(),
    sliders: new Map(),
    sliderValues: new Map(),
    rotaryKnobs: new Map(),
    rotaryKnobValues: new Map(),
    cpus: new Map()
  };
}

function clearDeviceMaps(maps) {
  if (!maps) return;
  for (const key of Object.keys(maps)) {
    if (maps[key] instanceof Map) maps[key].clear();
  }
}

function setDeviceOperationInstanceId(id) {
  if (typeof clampInstance === 'function') {
    _deviceOpInstanceId = id == null ? null : clampInstance(id);
  } else {
    _deviceOpInstanceId = id == null ? null : id;
  }
}

function getDeviceOperationInstanceId() {
  return _deviceOpInstanceId;
}

function ensureCtxDeviceMaps(ctx) {
  if (!ctx.deviceMaps) ctx.deviceMaps = createDeviceMaps();
  return ctx.deviceMaps;
}

function pushExecInterp(interp) {
  if (interp) _execInterpStack.push(interp);
}

function popExecInterp(interp) {
  const top = _execInterpStack[_execInterpStack.length - 1];
  if (top === interp) _execInterpStack.pop();
}

function getExecInterp() {
  return _execInterpStack.length ? _execInterpStack[_execInterpStack.length - 1] : null;
}

function getDeviceMapsForInterp(interp) {
  if (interp && interp._instanceId != null && typeof getRunContext === 'function') {
    const runCtx = getRunContext(interp._instanceId);
    if (runCtx) return ensureCtxDeviceMaps(runCtx);
  }
  return getDeviceMaps();
}

function resolveRunContextForDeviceOps() {
  if (typeof getRunContext !== 'function') return null;

  const exec = getExecInterp();
  if (exec && exec._instanceId != null) {
    const ctx = getRunContext(exec._instanceId);
    if (ctx) return ctx;
  }

  if (typeof currentTab !== 'undefined' && typeof isTabLiveOwner === 'function' && typeof getTabRunningInstanceId === 'function') {
    if (isTabLiveOwner(currentTab)) {
      const inst = getTabRunningInstanceId(currentTab);
      if (inst != null) {
        const ctx = getRunContext(inst);
        if (ctx) return ctx;
      }
    }
  }

  if (_deviceOpInstanceId != null) {
    const ctx = getRunContext(_deviceOpInstanceId);
    if (ctx) return ctx;
  }

  if (typeof globalInterp !== 'undefined' && globalInterp && globalInterp._instanceId != null) {
    const ctx = getRunContext(globalInterp._instanceId);
    if (ctx) return ctx;
  }

  if (typeof getActiveRunContext === 'function') {
    const active = getActiveRunContext();
    if (active) return active;
  }

  return null;
}

function shouldPublishWindowDeviceAliases(runCtx) {
  if (!runCtx) return false;
  if (getExecInterp() && getExecInterp()._instanceId === runCtx.id) return true;
  if (typeof shouldRefreshRunDom === 'function' && runCtx.interp && shouldRefreshRunDom(runCtx.interp)) {
    return true;
  }
  return _deviceOpInstanceId === runCtx.id;
}

function publishWindowDeviceAliases(maps) {
  if (typeof window === 'undefined' || !maps) return;
  window.panelKeyboards = maps.panelKeyboards;
  window.panelKeys = maps.panelKeys;
  window.sliders = maps.sliders;
  window.sliderValues = maps.sliderValues;
  window.rotaryKnobs = maps.rotaryKnobs;
  window.rotaryKnobValues = maps.rotaryKnobValues;
  try {
    Object.defineProperty(window, 'terminalDisplays', {
      get: function () { return maps.terminalDisplays; },
      configurable: true
    });
  } catch (_) {
    window.terminalDisplays = maps.terminalDisplays;
  }
}

function getDeviceMaps() {
  const runCtx = resolveRunContextForDeviceOps();
  let maps = runCtx ? ensureCtxDeviceMaps(runCtx) : null;

  if (!maps) {
    if (!_fallbackDeviceMaps) _fallbackDeviceMaps = createDeviceMaps();
    maps = _fallbackDeviceMaps;
  }

  if (runCtx && shouldPublishWindowDeviceAliases(runCtx)) {
    publishWindowDeviceAliases(maps);
  }
  return maps;
}

function getDevicesContainer() {
  const runCtx = resolveRunContextForDeviceOps();
  if (runCtx && runCtx.devicesRoot) return runCtx.devicesRoot;
  return document.getElementById('devices');
}

function mountDevicesPanelForContext(ctx) {
  const panel = document.getElementById('devices');
  if (!panel || !ctx || !ctx.devicesRoot) return;
  if (ctx.devicesRoot.parentNode !== panel) {
    panel.innerHTML = '';
    panel.appendChild(ctx.devicesRoot);
  }
}

function dm() {
  return getDeviceMaps();
}

function resetFallbackDeviceMapsForTests() {
  _fallbackDeviceMaps = null;
  _deviceOpInstanceId = null;
  _execInterpStack.length = 0;
}
