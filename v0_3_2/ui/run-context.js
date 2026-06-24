/* ================= RUN CONTEXT (multi-instance) ================= */

const MAX_RUN_INSTANCES = 5;

const INSTANCE_COLORS = {
  1: { bg: '#2d9448', border: '#5fdc8c' },
  2: { bg: '#1f66e0', border: '#5a9fff' },
  3: { bg: '#d35400', border: '#e67e22' },
  4: { bg: '#434fad', border: '#5b6ee8' },
  5: { bg: '#128a9e', border: '#17a2b8' }
};

const runContextRegistry = new Map();
const instanceOwners = new Map();

function clampInstance(n) {
  const x = parseInt(n, 10);
  if (isNaN(x) || x < 1) return 1;
  if (x > MAX_RUN_INSTANCES) return MAX_RUN_INSTANCES;
  return x;
}

function createRunContext(id) {
  const root = document.createElement('div');
  root.className = 'devices-instance-root';
  return {
    id,
    ownerTabId: null,
    interp: null,
    out: [],
    outBlocks: [],
    varsSnapshot: '',
    devicesHtml: '',
    devicesRoot: root,
    deviceMaps: null,
    timelineLabels: [],
    lastProcessedSource: '',
    secTimerId: null,
    currentInterval: 1000,
    currentIdx: 0
  };
}

function getOrCreateRunContext(instanceId) {
  const id = clampInstance(instanceId);
  if (!runContextRegistry.has(id)) {
    runContextRegistry.set(id, createRunContext(id));
  }
  return runContextRegistry.get(id);
}

function getRunContext(instanceId) {
  return runContextRegistry.get(clampInstance(instanceId)) || null;
}

function getOwnerTabId(instanceId) {
  const owner = instanceOwners.get(clampInstance(instanceId));
  return owner == null ? null : owner;
}

function setInstanceOwner(instanceId, tabId) {
  const id = clampInstance(instanceId);
  instanceOwners.set(id, tabId);
  const ctx = getRunContext(id);
  if (ctx) ctx.ownerTabId = tabId;
}

function clearInstanceOwnerTab(tabId) {
  for (const [inst, owner] of instanceOwners.entries()) {
    if (owner === tabId) {
      instanceOwners.delete(inst);
      const ctx = getRunContext(inst);
      if (ctx) ctx.ownerTabId = null;
    }
  }
}

function getTabRunningInstanceId(tabId) {
  for (const [inst, owner] of instanceOwners.entries()) {
    if (owner === tabId) return inst;
  }
  return null;
}

function isTabLiveOwner(tabId) {
  return getTabRunningInstanceId(tabId) != null;
}

function getRunContextForTab(tabId) {
  const inst = getTabRunningInstanceId(tabId);
  if (inst == null) return null;
  return getRunContext(inst);
}

function getActiveRunContext() {
  if (typeof currentTab === 'undefined') return null;
  if (!isTabLiveOwner(currentTab)) return null;
  return getRunContextForTab(currentTab);
}

function getInterpForInstance(instanceId) {
  const ctx = getRunContext(instanceId);
  return ctx && ctx.interp ? ctx.interp : null;
}

function stopRunContextTimers(ctx) {
  if (!ctx) return;
  if (ctx.secTimerId != null) {
    clearInterval(ctx.secTimerId);
    ctx.secTimerId = null;
  }
  if (ctx.interp && ctx.interp.oscTimers) {
    for (const tid of ctx.interp.oscTimers) {
      clearTimeout(tid);
    }
    ctx.interp.oscTimers = [];
  }
}

function stopInstanceSecUI(ctx) {
  if (!ctx || ctx.id !== clampInstance(
    typeof currentTab !== 'undefined' && tabs.get(currentTab)
      ? tabs.get(currentTab).instance : 1
  )) return;
  const sec = document.getElementById('sec');
  if (sec) sec.classList.remove('btn--primary');
}

function syncSecUIFromContext(ctx) {
  const sec = document.getElementById('sec');
  if (!sec || !ctx) return;
  if (ctx.secTimerId != null) {
    sec.classList.add('btn--primary');
  } else {
    sec.classList.remove('btn--primary');
  }
  const el = document.getElementById('secint');
  if (el && ctx.currentInterval) {
    el.textContent = String(1000 / ctx.currentInterval);
  }
}

function captureRunContextDom(ctx) {
  if (!ctx) return;
  if (ctx.devicesRoot) {
    ctx.devicesHtml = ctx.devicesRoot.innerHTML;
  } else {
    const devicesEl = document.getElementById('devices');
    ctx.devicesHtml = devicesEl ? devicesEl.innerHTML : '';
  }
  if (ctx.interp) {
    ctx.out = ctx.interp.out ? ctx.interp.out.slice() : [];
    ctx.outBlocks = ctx.interp.outBlocks ? ctx.interp.outBlocks.slice() : [];
  }
}

function clearPanelDom() {
  if (typeof clearOutput === 'function') clearOutput();
  const varsEl = document.getElementById('vars');
  if (varsEl) varsEl.textContent = '';
  const devicesEl = document.getElementById('devices');
  if (devicesEl) devicesEl.innerHTML = '';
  const astEl = document.getElementById('ast');
  if (astEl) astEl.textContent = '';
  if (typeof timelineAnalyzer !== 'undefined' && timelineAnalyzer) {
    timelineAnalyzer.reset([]);
  }
}

function syncActiveInstanceRuntime(ctx) {
  if (!ctx) return;
  if (typeof setDeviceOperationInstanceId === 'function') {
    setDeviceOperationInstanceId(ctx.id);
  }
  if (ctx.interp) globalInterp = ctx.interp;
  if (typeof publishWindowDeviceAliases === 'function' && ctx.deviceMaps) {
    publishWindowDeviceAliases(ctx.deviceMaps);
  } else if (typeof ensureCtxDeviceMaps === 'function' && typeof publishWindowDeviceAliases === 'function') {
    publishWindowDeviceAliases(ensureCtxDeviceMaps(ctx));
  }
}

function activateRunContextLive(ctx, tabInfo) {
  if (!ctx) {
    clearPanelDom();
    return;
  }
  syncActiveInstanceRuntime(ctx);
  if (typeof render === 'function') {
    render(ctx.out, ctx.outBlocks, ctx);
  }
  const varsEl = document.getElementById('vars');
  if (varsEl) varsEl.textContent = ctx.varsSnapshot || '';
  if (typeof mountDevicesPanelForContext === 'function') {
    mountDevicesPanelForContext(ctx);
  }
  if (ctx.devicesRoot) {
    if (!ctx.devicesRoot.childNodes.length && ctx.devicesHtml) {
      ctx.devicesRoot.innerHTML = ctx.devicesHtml;
    }
  } else {
    const devicesEl = document.getElementById('devices');
    if (devicesEl) devicesEl.innerHTML = ctx.devicesHtml || '';
  }
  const astEl = document.getElementById('ast');
  if (astEl) {
    astEl.textContent = (tabInfo && tabInfo.astText) ? tabInfo.astText : '';
  }
  if (typeof timelineAnalyzer !== 'undefined' && timelineAnalyzer && ctx.timelineLabels) {
    timelineAnalyzer.reset(ctx.timelineLabels.slice());
  }
  syncSecUIFromContext(ctx);
}

function mountPanelSnapshot(snapshot) {
  if (!snapshot) {
    clearPanelDom();
    return;
  }
  if (typeof render === 'function') {
    render(snapshot.out || [], snapshot.outBlocks || [], null);
  }
  const varsEl = document.getElementById('vars');
  if (varsEl) varsEl.textContent = snapshot.varsSnapshot || '';
  const devicesEl = document.getElementById('devices');
  if (devicesEl) devicesEl.innerHTML = snapshot.devicesHtml || '';
  const astEl = document.getElementById('ast');
  if (astEl) {
    astEl.textContent = snapshot.astText || '';
  }
  if (typeof timelineAnalyzer !== 'undefined' && timelineAnalyzer) {
    timelineAnalyzer.reset(snapshot.timelineLabels ? snapshot.timelineLabels.slice() : []);
  }
  const sec = document.getElementById('sec');
  if (sec) sec.classList.remove('btn--primary');
}

function mountTabPanels() {
  if (typeof tabs === 'undefined' || typeof currentTab === 'undefined') return;
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;

  if (isTabLiveOwner(currentTab)) {
    const ctx = getRunContextForTab(currentTab);
    activateRunContextLive(ctx, tabInfo);
  } else if (tabInfo.panelSnapshot) {
    mountPanelSnapshot(tabInfo.panelSnapshot);
  } else {
    clearPanelDom();
  }

  if (typeof updateRunButtonUI === 'function') updateRunButtonUI();
  if (typeof updateStepControlsUI === 'function') updateStepControlsUI();
  if (typeof updateInstSelectorUI === 'function') updateInstSelectorUI();
}

function releaseTabFromOtherInstances(tabId, targetInstanceId) {
  const target = clampInstance(targetInstanceId);
  for (const [inst, owner] of [...instanceOwners.entries()]) {
    if (owner !== tabId || inst === target) continue;
    if (typeof tabs !== 'undefined') {
      freezePanelSnapshot(tabId);
    }
    const oldCtx = getRunContext(inst);
    stopRunContextTimers(oldCtx);
    instanceOwners.delete(inst);
    if (oldCtx) {
      oldCtx.ownerTabId = null;
      oldCtx.interp = null;
    }
  }
}

function freezePanelSnapshot(tabId) {
  if (typeof tabs === 'undefined') return;
  const tabInfo = tabs.get(tabId);
  if (!tabInfo) return;
  const runningInst = getTabRunningInstanceId(tabId);
  if (runningInst == null) return;
  const ctx = getRunContext(runningInst);
  if (!ctx) return;
  captureRunContextDom(ctx);
  tabInfo.panelSnapshot = {
    out: (ctx.out || []).slice(),
    outBlocks: (ctx.outBlocks || []).slice(),
    varsSnapshot: ctx.varsSnapshot || '',
    devicesHtml: ctx.devicesHtml || '',
    astText: tabInfo.astText || '',
    timelineLabels: (ctx.timelineLabels || []).slice()
  };
}

function preemptInstanceForRun(instanceId, newOwnerTabId) {
  const id = clampInstance(instanceId);
  releaseTabFromOtherInstances(newOwnerTabId, id);

  const prevOwner = getOwnerTabId(id);
  const ctx = getOrCreateRunContext(id);

  if (prevOwner != null && prevOwner !== newOwnerTabId) {
    if (typeof tabs !== 'undefined') {
      const prevTab = tabs.get(prevOwner);
      if (prevTab) {
        freezePanelSnapshot(prevOwner);
        prevTab.hasRun = false;
      }
    }
  }

  stopRunContextTimers(ctx);
  setInstanceOwner(id, newOwnerTabId);

  if (ctx.deviceMaps && typeof clearDeviceMaps === 'function') {
    clearDeviceMaps(ctx.deviceMaps);
  } else if (typeof createDeviceMaps === 'function') {
    ctx.deviceMaps = createDeviceMaps();
  }
  if (typeof unregisterNetworkEndpoints === 'function') {
    unregisterNetworkEndpoints(id);
  }
  if (ctx.devicesRoot) ctx.devicesRoot.innerHTML = '';

  ctx.interp = null;
  ctx.out = [];
  ctx.outBlocks = [];
  ctx.varsSnapshot = '';
  ctx.devicesHtml = '';
  ctx.timelineLabels = [];
  ctx.lastProcessedSource = '';
}

function releaseRunContext(instanceId) {
  const id = clampInstance(instanceId);
  if (typeof unregisterNetworkEndpoints === 'function') {
    unregisterNetworkEndpoints(id);
  }
  const ctx = getRunContext(id);
  if (ctx) stopRunContextTimers(ctx);
  instanceOwners.delete(id);
  runContextRegistry.delete(id);
}

function releaseInstanceIfTabClosed(tabId) {
  const inst = getTabRunningInstanceId(tabId);
  if (inst == null) return;
  const ctx = getRunContext(inst);
  stopRunContextTimers(ctx);
  instanceOwners.delete(inst);
  if (ctx) ctx.ownerTabId = null;
  releaseRunContext(inst);
}

function bindInterpToRunContext(interp, ctx) {
  if (!interp || !ctx) return;
  interp._instanceId = ctx.id;
  interp._ownerTabId = ctx.ownerTabId;
  ctx.interp = interp;
}

function shouldRefreshRunDom(interp) {
  if (!interp || interp._instanceId == null) return true;
  const owner = getOwnerTabId(interp._instanceId);
  return owner != null && typeof currentTab !== 'undefined' && owner === currentTab;
}
