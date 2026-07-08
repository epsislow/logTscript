/* ================= WAVE LISTEN PANEL ================= */

const WAVE_LISTEN_ARMED_KEY = 'prog/waveListenArmed';
const WAVE_LISTEN_LEVEL_KEY = 'prog/waveListenLevel';
const WAVE_LISTEN_MAX_LINES = 2000;

const _waveListenState = {
  armed: false,
  level: 1,
  displayLog: [],
  initialized: false,
  viewTabId: null,
};

function _waveListenSdbGet(key, fallback) {
  if (typeof sdb !== 'undefined' && sdb.has(key)) return sdb.get(key);
  return fallback;
}

function _waveListenSdbSet(key, val) {
  if (typeof sdb !== 'undefined') sdb.set(key, val);
}

function getWaveListenArmed() {
  return _waveListenState.armed;
}

function getWaveListenLevel() {
  return _waveListenState.level;
}

function setWaveListenArmed(on) {
  const next = !!on;
  if (_waveListenState.armed === next) return;
  _waveListenState.armed = next;
  _waveListenSdbSet(WAVE_LISTEN_ARMED_KEY, next ? '1' : '0');
  appendWaveListenMeta(next ? '** state ON' : '** state OFF');
  _syncWaveListenToActiveInterps();
  updateWaveListenToolbarUI();
}

function setWaveListenLevel(level) {
  const n = Math.max(1, Math.min(3, parseInt(level, 10) || 1));
  if (_waveListenState.level === n) return;
  _waveListenState.level = n;
  _waveListenSdbSet(WAVE_LISTEN_LEVEL_KEY, String(n));
  appendWaveListenMeta(`** level is now ${n}`);
  _syncWaveListenToActiveInterps();
  updateWaveListenToolbarUI();
}

function loadWaveListenPreferences() {
  _waveListenState.armed = _waveListenSdbGet(WAVE_LISTEN_ARMED_KEY, '0') === '1';
  _waveListenState.level = Math.max(1, Math.min(3, parseInt(_waveListenSdbGet(WAVE_LISTEN_LEVEL_KEY, '1'), 10) || 1));
}

function _countActiveListenInstances() {
  if (typeof runContextRegistry === 'undefined' || !runContextRegistry) return 0;
  let n = 0;
  for (const ctx of runContextRegistry.values()) {
    if (ctx && ctx.waveListenActive) n++;
  }
  return n;
}

function _getCtxForInstance(instanceId) {
  return typeof getRunContext === 'function' ? getRunContext(instanceId) : null;
}

function appendWaveListenPanelLine(instanceId, text, kind) {
  const prefix = _countActiveListenInstances() >= 2 ? `[inst ${instanceId}] ` : '';
  const entry = { text: prefix + text, kind: kind || 'trace', instanceId };
  _waveListenState.displayLog.push(entry);
  if (_waveListenState.displayLog.length > WAVE_LISTEN_MAX_LINES) {
    _waveListenState.displayLog.splice(0, _waveListenState.displayLog.length - WAVE_LISTEN_MAX_LINES);
  }
  const ctx = _getCtxForInstance(instanceId);
  if (ctx) {
    if (!ctx.waveListenLog) ctx.waveListenLog = [];
    ctx.waveListenLog.push(entry);
    if (ctx.waveListenLog.length > WAVE_LISTEN_MAX_LINES) {
      ctx.waveListenLog.splice(0, ctx.waveListenLog.length - WAVE_LISTEN_MAX_LINES);
    }
  }
  renderWaveListenPanel();
}

function appendWaveListenMeta(text) {
  _waveListenState.displayLog.push({ text, kind: 'meta', instanceId: null });
  if (_waveListenState.displayLog.length > WAVE_LISTEN_MAX_LINES) {
    _waveListenState.displayLog.splice(0, _waveListenState.displayLog.length - WAVE_LISTEN_MAX_LINES);
  }
  renderWaveListenPanel();
}

function appendWaveListenStatus(text) {
  _waveListenState.displayLog.push({ text, kind: 'status', instanceId: null });
  renderWaveListenPanel();
}

function clearWaveListenPanel() {
  _waveListenState.displayLog = [];
  if (typeof runContextRegistry !== 'undefined' && runContextRegistry) {
    for (const ctx of runContextRegistry.values()) {
      if (ctx) ctx.waveListenLog = [];
    }
  }
  renderWaveListenPanel();
}

function _syncWaveListenToActiveInterps() {
  if (typeof runContextRegistry === 'undefined' || !runContextRegistry) return;
  const armed = getWaveListenArmed();
  const legacy = _isLegacyPropagation();
  for (const ctx of runContextRegistry.values()) {
    if (!ctx || !ctx.interp) continue;
    const running = !!ctx.ownerTabId && typeof getOwnerTabId === 'function'
      && getOwnerTabId(ctx.id) != null;
    if (running && armed && !legacy) {
      ctx.waveListenActive = true;
      ctx.interp.waveListenActive = true;
    } else if (!armed) {
      ctx.waveListenActive = false;
      ctx.interp.waveListenActive = false;
    }
    _applyWaveListenPrefsToInterp(ctx.interp, ctx);
  }
}

function _applyWaveListenPrefsToInterp(interp, ctx) {
  if (!interp) return;
  const armed = getWaveListenArmed();
  const level = getWaveListenLevel();
  if (interp.signalPropagationStrategy && typeof interp.signalPropagationStrategy.setDebugLevel === 'function') {
    interp.signalPropagationStrategy.setDebugLevel(armed && ctx && ctx.waveListenActive ? level : 0);
  }
  interp.onWaveListenLine = function (text, kind) {
    const inst = interp._instanceId != null ? interp._instanceId : (ctx ? ctx.id : 1);
    appendWaveListenPanelLine(inst, text, kind);
  };
}

function applyWaveListenToInterp(interp, ctx) {
  if (!interp) return;
  _applyWaveListenPrefsToInterp(interp, ctx || null);
}

function _isLegacyPropagation() {
  if (typeof getPropagationMode === 'function') return getPropagationMode() === 'legacy';
  return false;
}

function beginWaveListenRun(instanceId, opts) {
  const o = opts || {};
  const armed = getWaveListenArmed();
  const ctx = _getCtxForInstance(instanceId);
  if (!ctx) return;

  if (_waveListenState.displayLog.length > 0) {
    appendWaveListenStatus(`* --- Run start (instance ${instanceId}) ---`);
  }

  const legacy = o.legacy != null ? o.legacy : _isLegacyPropagation();

  if (legacy) {
    appendWaveListenStatus(`* Script runs in mode legacy, listen is ${armed ? 'ON' : 'OFF'}`);
    ctx.waveListenActive = false;
    if (ctx.interp) ctx.interp.waveListenActive = false;
    return;
  }

  ctx.waveListenActive = armed;
  if (ctx.interp) {
    ctx.interp.waveListenActive = armed;
    applyWaveListenToInterp(ctx.interp, ctx);
  }

  if (!armed) {
    ctx.waveListenActive = false;
    if (ctx.interp) ctx.interp.waveListenActive = false;
  }
}

function endWaveListenRun(instanceId, reason) {
  const ctx = _getCtxForInstance(instanceId);
  if (ctx) {
    ctx.waveListenActive = false;
    if (ctx.interp) {
      ctx.interp.waveListenActive = false;
      if (ctx.interp.signalPropagationStrategy) {
        ctx.interp.signalPropagationStrategy.setDebugLevel(0);
      }
    }
  }
  if (reason === 'preempt' || reason === 'stop' || reason === 'complete' || reason === 'error') {
    appendWaveListenStatus('* script stopped listen is OFF');
  }
  updateWaveListenToolbarUI();
}

function _waveListenLineClass(kind) {
  switch (kind) {
    case 'meta': return 'wave-listen-line--meta';
    case 'status': return 'wave-listen-line--status';
    case 'lut-mut': return 'wave-listen-line--lut-mut';
    case 'commit': return 'wave-listen-line--commit';
    case 'flush': return 'wave-listen-line--flush';
    case 'init': return 'wave-listen-line--init';
    case 'exec': return 'wave-listen-line--exec';
    default: return 'wave-listen-line--trace';
  }
}

function renderWaveListenPanel() {
  const panel = document.getElementById('waveListenPanel');
  const out = document.getElementById('waveListenOut');
  if (!panel || !out) return;
  const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
  out.innerHTML = '';
  for (const entry of _waveListenState.displayLog) {
    const div = document.createElement('div');
    div.className = 'wave-listen-line ' + _waveListenLineClass(entry.kind);
    div.textContent = entry.text;
    out.appendChild(div);
  }
  if (atBottom) out.scrollTop = out.scrollHeight;
  updateWaveListenToolbarUI();
}

function updateWaveListenToolbarUI() {
  const armedBtn = document.getElementById('waveListenArmBtn');
  const badge = document.getElementById('waveListenBadge');
  const levelBtns = [1, 2, 3].map((n) => document.getElementById('waveListenLevel' + n));

  if (armedBtn) {
    armedBtn.textContent = _waveListenState.armed ? 'ON' : 'OFF';
    armedBtn.classList.toggle('wave-listen-arm--on', _waveListenState.armed);
    armedBtn.classList.toggle('wave-listen-arm--off', !_waveListenState.armed);
  }

  for (const btn of levelBtns) {
    if (!btn) continue;
    const n = parseInt(btn.dataset.level, 10);
    btn.disabled = !_waveListenState.armed;
    btn.classList.toggle('active', n === _waveListenState.level);
  }

  if (badge) {
    const active = _countActiveListenInstances();
    const listening = [];
    if (typeof runContextRegistry !== 'undefined' && runContextRegistry) {
      for (const ctx of runContextRegistry.values()) {
        if (ctx && ctx.waveListenActive) listening.push(ctx.id);
      }
    }
    if (listening.length === 0) {
      badge.textContent = 'Idle';
      badge.className = 'wave-listen-badge wave-listen-badge--idle';
    } else if (listening.length === 1) {
      badge.textContent = `Listening… inst ${listening[0]}`;
      badge.className = 'wave-listen-badge wave-listen-badge--live';
    } else {
      badge.textContent = `Listening… (${listening.map((i) => 'inst ' + i).join(', ')})`;
      badge.className = 'wave-listen-badge wave-listen-badge--live';
    }
  }
}

function initWaveListenPanel() {
  if (_waveListenState.initialized) return;
  _waveListenState.initialized = true;
  loadWaveListenPreferences();

  const armBtn = document.getElementById('waveListenArmBtn');
  const clearBtn = document.getElementById('waveListenClear');
  if (armBtn) {
    armBtn.addEventListener('click', () => setWaveListenArmed(!getWaveListenArmed()));
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => clearWaveListenPanel());
  }
  for (const n of [1, 2, 3]) {
    const btn = document.getElementById('waveListenLevel' + n);
    if (btn) {
      btn.addEventListener('click', () => {
        if (getWaveListenArmed()) setWaveListenLevel(n);
      });
    }
  }
  updateWaveListenToolbarUI();
  renderWaveListenPanel();
}

function toggleWaveListenPanel() {
  const panel = document.getElementById('waveListenPanel');
  if (!panel) return;
  const show = panel.style.display === 'none';
  panel.style.display = show ? '' : 'none';
  if (show) {
    initWaveListenPanel();
    renderWaveListenPanel();
  }
}

function restoreWaveListenFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.waveListenLog)) return;
  _waveListenState.displayLog = snapshot.waveListenLog.map((e) => ({ ...e }));
  renderWaveListenPanel();
}

function captureWaveListenSnapshot() {
  return _waveListenState.displayLog.map((e) => ({ ...e }));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWaveListenPreferences);
  } else {
    loadWaveListenPreferences();
  }
}
