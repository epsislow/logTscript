/* ================= WAVE LISTEN PANEL ================= */

const WAVE_LISTEN_ARMED_KEY = 'prog/waveListenArmed';
const WAVE_LISTEN_LEVEL_KEY = 'prog/waveListenLevel';
const WAVE_LISTEN_FMT_KEY = 'prog/waveListenFmt';
const WAVE_LISTEN_MAX_LINES = 2000;

const _waveListenState = {
  armed: false,
  level: 1,
  fmt: 'hex',
  displayLog: [],
  expanded: new Set(),
  nextId: 1,
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

function getWaveListenFmt() {
  return _waveListenState.fmt;
}

function setWaveListenFmt(fmt) {
  const next = typeof normalizeWaveListenFmt === 'function'
    ? normalizeWaveListenFmt(fmt)
    : (fmt === 'bin' ? 'bin' : 'hex');
  if (_waveListenState.fmt === next) return;
  _waveListenState.fmt = next;
  _waveListenSdbSet(WAVE_LISTEN_FMT_KEY, next);
  renderWaveListenPanel();
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
  const fmt = _waveListenSdbGet(WAVE_LISTEN_FMT_KEY, 'hex');
  _waveListenState.fmt = typeof normalizeWaveListenFmt === 'function'
    ? normalizeWaveListenFmt(fmt)
    : (fmt === 'bin' ? 'bin' : 'hex');
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

function _isWaveListenValuePayload(payload) {
  return payload && typeof payload === 'object' && payload.rawValue !== undefined;
}

function _allocWaveListenEntryId() {
  return _waveListenState.nextId++;
}

function _pushWaveListenEntry(entry) {
  _waveListenState.displayLog.push(entry);
  if (_waveListenState.displayLog.length > WAVE_LISTEN_MAX_LINES) {
    const drop = _waveListenState.displayLog.length - WAVE_LISTEN_MAX_LINES;
    const removed = _waveListenState.displayLog.splice(0, drop);
    for (const r of removed) {
      if (r && r.id != null) _waveListenState.expanded.delete(r.id);
    }
  }
}

function appendWaveListenPanelLine(instanceId, payload, kind) {
  const prefix = _countActiveListenInstances() >= 2 ? `[inst ${instanceId}] ` : '';
  let entry;
  if (typeof payload === 'string') {
    entry = {
      id: _allocWaveListenEntryId(),
      text: prefix + payload,
      kind: kind || 'trace',
      instanceId,
    };
  } else if (_isWaveListenValuePayload(payload)) {
    entry = {
      id: _allocWaveListenEntryId(),
      kind: kind || 'commit',
      instanceId,
      instPrefix: prefix,
      wave: payload.wave,
      label: payload.label,
      name: payload.name,
      rawValue: payload.rawValue,
      bitWidth: payload.bitWidth,
      wireType: payload.wireType,
      tensorMeta: payload.tensorMeta,
      schemaRef: payload.schemaRef || null,
      isComponent: payload.isComponent,
    };
  } else {
    entry = {
      id: _allocWaveListenEntryId(),
      text: prefix + String(payload),
      kind: kind || 'trace',
      instanceId,
    };
  }
  _pushWaveListenEntry(entry);
  const ctx = _getCtxForInstance(instanceId);
  if (ctx) {
    if (!ctx.waveListenLog) ctx.waveListenLog = [];
    ctx.waveListenLog.push({ ...entry });
    if (ctx.waveListenLog.length > WAVE_LISTEN_MAX_LINES) {
      ctx.waveListenLog.splice(0, ctx.waveListenLog.length - WAVE_LISTEN_MAX_LINES);
    }
  }
  renderWaveListenPanel();
}

function appendWaveListenMeta(text) {
  _pushWaveListenEntry({ id: _allocWaveListenEntryId(), text, kind: 'meta', instanceId: null });
  renderWaveListenPanel();
}

function appendWaveListenStatus(text) {
  _pushWaveListenEntry({ id: _allocWaveListenEntryId(), text, kind: 'status', instanceId: null });
  renderWaveListenPanel();
}

function clearWaveListenPanel() {
  _waveListenState.displayLog = [];
  _waveListenState.expanded.clear();
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
  interp.onWaveListenLine = function (payload, kind) {
    const inst = interp._instanceId != null ? interp._instanceId : (ctx ? ctx.id : 1);
    appendWaveListenPanelLine(inst, payload, kind);
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
  const armed = getWaveListenArmed();
  const legacy = _isLegacyPropagation();
  const keepListening = armed && !legacy && reason === 'complete';

  if (ctx) {
    if (keepListening) {
      ctx.waveListenActive = true;
      if (ctx.interp) {
        ctx.interp.waveListenActive = true;
        applyWaveListenToInterp(ctx.interp, ctx);
      }
    } else {
      ctx.waveListenActive = false;
      if (ctx.interp) {
        ctx.interp.waveListenActive = false;
        if (ctx.interp.signalPropagationStrategy) {
          ctx.interp.signalPropagationStrategy.setDebugLevel(0);
        }
      }
    }
  }

  if (reason === 'preempt' || reason === 'stop' || reason === 'error') {
    appendWaveListenStatus('* script stopped listen is OFF');
  } else if (reason === 'complete' && !keepListening) {
    appendWaveListenStatus('* script stopped listen is OFF');
  } else if (reason === 'complete' && keepListening) {
    appendWaveListenStatus('* Run complete — listen stays ON (interactive updates)');
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
    case 'schedule': return 'wave-listen-line--commit';
    default: return 'wave-listen-line--trace';
  }
}

function _waveListenInterpForEntry(entry) {
  if (!entry || entry.instanceId == null) return null;
  const ctx = _getCtxForInstance(entry.instanceId);
  return ctx && ctx.interp ? ctx.interp : null;
}

function _waveListenFormatValueFn(entry) {
  const interp = _waveListenInterpForEntry(entry);
  if (!interp || typeof interp.formatValue !== 'function') return null;
  return (v, bw) => interp.formatValue(v, bw);
}

function _waveListenValuePrefix(entry) {
  const wave = entry.wave != null ? entry.wave : '?';
  const label = entry.label || 'commit';
  const name = entry.name != null ? entry.name : '?';
  return `[wave ${wave}] ${label} ${name}`;
}

function _toggleWaveListenExpand(entryId) {
  if (_waveListenState.expanded.has(entryId)) _waveListenState.expanded.delete(entryId);
  else _waveListenState.expanded.add(entryId);
  renderWaveListenPanel();
}

function _waveListenCopyValue(entry, btn) {
  const fmt = getWaveListenFmt();
  const interp = _waveListenInterpForEntry(entry);
  const text = typeof formatWaveListenCopyText === 'function'
    ? formatWaveListenCopyText(entry, fmt, interp)
    : (typeof formatWaveListenFullText === 'function'
      ? formatWaveListenFullText(entry, fmt, interp)
      : String(entry.rawValue));
  const doCopy = typeof copyTextToClipboard === 'function'
    ? copyTextToClipboard(text)
    : (navigator.clipboard && navigator.clipboard.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error('clipboard unavailable')));
  doCopy.then(function () {
    if (!btn) return;
    const prev = btn.textContent;
    const prevTitle = btn.title;
    btn.textContent = 'ok';
    btn.title = 'Copied';
    setTimeout(function () {
      btn.textContent = prev;
      btn.title = prevTitle;
    }, 1200);
  }).catch(function () {
    if (btn) btn.title = 'Copy failed';
  });
}

function _waveListenAddActionBtn(main, className, label, title, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.title = title;
  btn.addEventListener('click', onClick);
  main.appendChild(btn);
  return btn;
}

function _renderWaveListenValueRow(entry, out) {
  const wrap = document.createElement('div');
  wrap.className = 'wave-listen-line ' + _waveListenLineClass(entry.kind);

  const main = document.createElement('div');
  main.className = 'wave-listen-row-main';

  const prefixSpan = document.createElement('span');
  prefixSpan.className = 'wave-listen-prefix';
  prefixSpan.textContent = (entry.instPrefix || '') + _waveListenValuePrefix(entry);

  const fmt = getWaveListenFmt();
  const formatFn = _waveListenFormatValueFn(entry);
  const interp = _waveListenInterpForEntry(entry);
  const needsExpand = typeof waveListenNeedsExpand === 'function'
    ? waveListenNeedsExpand(entry)
    : (entry.bitWidth || (entry.rawValue ? entry.rawValue.length : 0)) > 256;

  main.appendChild(prefixSpan);

  if (needsExpand) {
    _waveListenAddActionBtn(
      main,
      'wave-listen-expand-btn',
      _waveListenState.expanded.has(entry.id) ? '[-]' : '[+]',
      _waveListenState.expanded.has(entry.id) ? 'Collapse value' : 'Expand value',
      function (e) {
        e.preventDefault();
        e.stopPropagation();
        _toggleWaveListenExpand(entry.id);
      }
    );
  }

  _waveListenAddActionBtn(
    main,
    'wave-listen-copy-btn',
    '[cpy]',
    'Copy full value (script literal)',
    function (e) {
      e.preventDefault();
      e.stopPropagation();
      _waveListenCopyValue(entry, e.currentTarget);
    }
  );

  const valSpan = document.createElement('span');
  valSpan.className = 'wave-listen-value';
  const inline = typeof formatWaveListenInline === 'function'
    ? formatWaveListenInline(entry, fmt, formatFn, interp)
    : String(entry.rawValue);
  valSpan.textContent = ` = ${inline}`;
  main.appendChild(valSpan);

  wrap.appendChild(main);

  if (needsExpand && _waveListenState.expanded.has(entry.id)) {
    const expand = document.createElement('pre');
    expand.className = 'wave-listen-row-expand';
    const interp = _waveListenInterpForEntry(entry);
    const lines = typeof formatWaveListenExpandLines === 'function'
      ? formatWaveListenExpandLines(entry, fmt, interp)
      : [String(entry.rawValue)];
    expand.textContent = lines.join('\n');
    wrap.appendChild(expand);
  }

  out.appendChild(wrap);
}

function renderWaveListenPanel() {
  const panel = document.getElementById('waveListenPanel');
  const out = document.getElementById('waveListenOut');
  if (!panel || !out) return;
  const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
  out.innerHTML = '';
  for (const entry of _waveListenState.displayLog) {
    if (_isWaveListenValuePayload(entry)) {
      _renderWaveListenValueRow(entry, out);
      continue;
    }
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
  const fmtSelect = document.getElementById('waveListenFmtSelect');
  const levelBtns = [1, 2, 3].map((n) => document.getElementById('waveListenLevel' + n));

  if (armedBtn) {
    armedBtn.textContent = _waveListenState.armed ? 'ON' : 'OFF';
    armedBtn.classList.toggle('wave-listen-arm--on', _waveListenState.armed);
    armedBtn.classList.toggle('wave-listen-arm--off', !_waveListenState.armed);
  }

  if (fmtSelect && fmtSelect.value !== _waveListenState.fmt) {
    fmtSelect.value = _waveListenState.fmt;
  }

  for (const btn of levelBtns) {
    if (!btn) continue;
    const n = parseInt(btn.dataset.level, 10);
    btn.disabled = !_waveListenState.armed;
    btn.classList.toggle('active', n === _waveListenState.level);
  }

  if (badge) {
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

function syncWaveListenFmtSelectOptions() {
  const fmtSelect = document.getElementById('waveListenFmtSelect');
  if (!fmtSelect || typeof WAVE_LISTEN_FMT_OPTIONS === 'undefined') return;
  const current = fmtSelect.value;
  fmtSelect.replaceChildren();
  for (const fmt of WAVE_LISTEN_FMT_OPTIONS) {
    const opt = document.createElement('option');
    opt.value = fmt;
    opt.textContent = fmt;
    fmtSelect.appendChild(opt);
  }
  if (WAVE_LISTEN_FMT_OPTIONS.includes(current)) {
    fmtSelect.value = current;
  }
}

function initWaveListenPanel() {
  if (_waveListenState.initialized) return;
  _waveListenState.initialized = true;
  syncWaveListenFmtSelectOptions();
  loadWaveListenPreferences();

  const armBtn = document.getElementById('waveListenArmBtn');
  const clearBtn = document.getElementById('waveListenClear');
  const fmtSelect = document.getElementById('waveListenFmtSelect');
  if (armBtn) {
    armBtn.addEventListener('click', () => setWaveListenArmed(!getWaveListenArmed()));
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', () => clearWaveListenPanel());
  }
  if (fmtSelect) {
    fmtSelect.addEventListener('change', () => setWaveListenFmt(fmtSelect.value));
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
  _waveListenState.expanded.clear();
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
