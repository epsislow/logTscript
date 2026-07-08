/* ================= APP LOGIC ================= */

let prog=null, pc=0;
let globalInterp = null;
let timelineAnalyzer = null;
let lastProcessedSource = '';
let errorMarks = [];
let errorGutterMarker = null;
let editorErrorDismissed = false;

function clearErrorMarkers() {
  if (!cmEditor) return;
  for (const m of errorMarks) {
    try { m.clear(); } catch (_) {}
  }
  errorMarks = [];
  cmEditor.operation(function () {
    const lineCount = cmEditor.lineCount();
    for (let i = 0; i < lineCount; i++) {
      cmEditor.setGutterMarker(i, 'CodeMirror-linenumbers', null);
      cmEditor.removeLineClass(i, 'gutter', 'cm-error-linenumber-gutter');
    }
  });
  errorGutterMarker = null;
}

function dismissEditorErrorHighlight() {
  editorErrorDismissed = true;
  clearErrorMarkers();
}

function makeErrorLineNumberGutter(lineNum) {
  const el = document.createElement('div');
  el.className = 'CodeMirror-linenumber cm-error-linenumber';
  el.textContent = String(lineNum);
  return el;
}

function highlightEditorError(line, col, spanLen, lineText, isMissing) {
  if (!cmEditor || !line || !col) return;
  clearErrorMarkers();
  editorErrorDismissed = false;
  const l = line - 1;
  const ch = col - 1;
  const cmLine = cmEditor.getLine(l) || lineText || '';
  cmEditor.setGutterMarker(l, 'CodeMirror-linenumbers', makeErrorLineNumberGutter(line));
  cmEditor.addLineClass(l, 'gutter', 'cm-error-linenumber-gutter');
  errorGutterMarker = { line: l };

  if (isMissing) {
    const endCh = Math.min(ch + 1, cmLine.length);
    errorMarks.push(cmEditor.markText(
      { line: l, ch },
      { line: l, ch: endCh },
      { className: 'cm-error-missing-col' }
    ));
    const EF = window.LogTScriptErrorFormat;
    const prev = EF ? EF.findPrevTokenRangeInLine(cmLine, col) : null;
    if (prev) {
      errorMarks.push(cmEditor.markText(
        { line: l, ch: prev.from },
        { line: l, ch: prev.to },
        { className: 'cm-error-context-token' }
      ));
    }
  } else {
    const endCh = Math.min(ch + Math.max(1, spanLen || 1), cmLine.length);
    errorMarks.push(cmEditor.markText(
      { line: l, ch },
      { line: l, ch: endCh },
      { className: 'cm-error-token' }
    ));
  }
  cmEditor.scrollIntoView({ line: l, ch }, 100);
}

function getEditorSource() {
  if (typeof code !== 'undefined' && code && code.value != null) {
    return code.value;
  }
  if (typeof cmEditor !== 'undefined' && cmEditor) {
    return cmEditor.getValue();
  }
  const el = document.getElementById('code');
  return el ? el.value : '';
}

function finalizeErrorDisplay(display, runSource) {
  const EF = window.LogTScriptErrorFormat;
  if (!EF || !display) return display;
  const editorSource = getEditorSource();
  if (editorSource && EF.alignErrorDisplayToSource) {
    return EF.alignErrorDisplayToSource(display, editorSource, runSource);
  }
  return display;
}

function applyErrorEditorHighlight(display) {
  if (editorErrorDismissed || !display || !display.loc) return;
  highlightEditorError(
    display.loc.line,
    display.loc.col,
    display.spanLen,
    display.sourceLine,
    display.isMissing
  );
}

function clearOutput() {
  const el = document.getElementById('out');
  if (el) el.innerHTML = '';
}

function scrollOutputToBottom(preservePage) {
  const el = document.getElementById('out');
  if (!el) return;
  const pageX = preservePage ? preservePage.x : (window.scrollX || 0);
  const pageY = preservePage ? preservePage.y : (window.scrollY || 0);
  const apply = () => {
    el.scrollTop = el.scrollHeight;
    window.scrollTo(pageX, pageY);
  };
  apply();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(apply);
  }
}

function appendOutputLine(text, className) {
  const el = document.getElementById('out');
  if (!el) return null;
  const div = document.createElement('div');
  div.className = 'output-line' + (className ? ' ' + className : '');
  div.textContent = text;
  el.appendChild(div);
  return div;
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error('clipboard unavailable'));
}

function appendOutputCopyBlock(text) {
  const el = document.getElementById('out');
  if (!el || text == null) return null;
  const wrap = document.createElement('div');
  wrap.className = 'output-copy-block';

  const pre = document.createElement('pre');
  pre.className = 'output-copy-block__text';
  pre.textContent = text;

  const actions = document.createElement('div');
  actions.className = 'output-copy-block__actions';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn output-copy-block__btn';
  btn.textContent = '\u2FCB';
  btn.title = 'Copy';
  btn.addEventListener('click', function () {
    copyTextToClipboard(text).then(function () {
      const prev = btn.title;
      btn.title = 'Copied!';
      setTimeout(function () { btn.title = prev; }, 1000);
    }).catch(function () {});
  });

  actions.appendChild(btn);
  wrap.appendChild(pre);
  wrap.appendChild(actions);
  el.appendChild(wrap);
  return wrap;
}

function findOutputBlockAt(blocks, index) {
  if (!blocks || !blocks.length) return null;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].start === index) return blocks[i];
  }
  return null;
}

function errorDisplayContext() {
  return null;
}

function appendErrorOutput(err, processedSource) {
  const EF = window.LogTScriptErrorFormat;
  const rawMsg = (err && err.message) ? err.message : String(err);
  const runSource = processedSource || lastProcessedSource;
  let display = EF
    ? EF.resolveErrorDisplay(err, runSource)
    : { message: rawMsg, sourceLine: null, caretLine: null, loc: null };
  display = finalizeErrorDisplay(display, runSource);

  appendOutputLine('Error: ' + display.message, 'output-line--error');
  if (display.sourceLine != null && display.caretLine != null) {
    appendOutputLine(display.sourceLine, 'output-line--source');
    appendOutputLine(display.caretLine, 'output-line--caret');
  }
  scrollOutputToBottom();
  applyErrorEditorHighlight(display);
}

function getOutputLines() {
  const el = document.getElementById('out');
  if (!el) return [];
  return Array.from(el.querySelectorAll('.output-line')).map((n) => n.textContent);
}

function watchLabelsFromExprs(exprs, wireWidths, compPropWidths, vectorMetas) {
  const WE = typeof LogTScriptWatchExpand !== 'undefined' ? LogTScriptWatchExpand : null;
  if (WE && (wireWidths || compPropWidths || vectorMetas)) {
    return WE.watchLabelsFromExprs(exprs, wireWidths, null, compPropWidths, vectorMetas);
  }
  return (exprs || []).map((expr, i) => {
    const a = expr && expr[0];
    if (!a) return 'ch' + i;
    if (a.var) {
      if (a.property) return a.var + ':' + a.property;
      if (a.internalWire) return a.var + '.' + a.internalWire;
      if (a.vectorIndex !== undefined && a.vectorIndex !== null) {
        const base = `${a.var}:${a.vectorIndex}`;
        if (a.bitRange) {
          const start = a.bitRange.start;
          const end = a.bitRange.end != null ? a.bitRange.end : start;
          return start === end ? `${base}.${start}` : `${base}.${start}-${end}`;
        }
        return base;
      }
      if (a.bitRange) {
        const start = a.bitRange.start;
        const end = a.bitRange.end != null ? a.bitRange.end : start;
        return start === end ? `${a.var}.${start}` : `${a.var}.${start}-${end}`;
      }
      return a.var;
    }
    if (a.ref || a.refLiteral) return String(a.ref || a.refLiteral);
    return 'ch' + i;
  });
}

function prepareTimelineForRun(watches, stmts, registry) {
  if (timelineAnalyzer) {
    const WE = typeof LogTScriptWatchExpand !== 'undefined' ? LogTScriptWatchExpand : null;
    const wireWidths = WE ? WE.buildWireWidthMapFromStmts(stmts) : null;
    const compPropWidths = WE && registry ? WE.buildComponentPropertyWidthMap(stmts, registry) : null;
    const vectorMetas = WE ? WE.buildVectorMetaMapFromStmts(stmts) : null;
    timelineAnalyzer.reset(watchLabelsFromExprs(watches, wireWidths, compPropWidths, vectorMetas));
  }
}

function bindWatchRecorder(interp) {
  if (!interp) return;
  interp.watchSeq = 0;
  interp.watchRecorder = timelineAnalyzer ? (sample) => timelineAnalyzer.ingest(sample) : null;
}

function initTimelineAnalyzer() {
  const canvas = document.getElementById('timelineCanvas');
  if (!canvas || typeof TimelineAnalyzer !== 'function') return;
  timelineAnalyzer = new TimelineAnalyzer(canvas);
  const pauseBtn = document.getElementById('timelinePauseBtn');
  const liveBtn = document.getElementById('timelineLiveBtn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!timelineAnalyzer) return;
      timelineAnalyzer.setPaused(!timelineAnalyzer.isPaused);
      pauseBtn.textContent = timelineAnalyzer.isPaused ? 'Resume' : 'Pause';
    });
  }
  if (liveBtn) {
    liveBtn.addEventListener('click', () => {
      if (!timelineAnalyzer) return;
      timelineAnalyzer.setPaused(false);
      if (pauseBtn) pauseBtn.textContent = 'Pause';
    });
  }
  timelineAnalyzer.reset([]);
}

let sdb = new DbLocalStorage();
let fss = new FileStorageSystem(sdb);
let currentFilesLocation = '>';
window.lib_files = window.lib_files || {};

const PROPAGATION_STORAGE_KEY = 'prog/propagation';

function getPropagationMode() {
  if (sdb.has(PROPAGATION_STORAGE_KEY)) {
    const v = sdb.get(PROPAGATION_STORAGE_KEY);
    return v === 'legacy' ? 'legacy' : 'wave';
  }
  return 'wave';
}

function setPropagationMode(mode) {
  const m = mode === 'legacy' ? 'legacy' : 'wave';
  sdb.set(PROPAGATION_STORAGE_KEY, m);
  updatePropagationToggleUI();
  if (typeof tabs !== 'undefined' && tabs.get(currentTab)) {
    tabs.get(currentTab).propagation = m;
  }
}

function togglePropagationMode() {
  setPropagationMode(getPropagationMode() === 'wave' ? 'legacy' : 'wave');
}

function createSignalStrategy() {
  const mode = getPropagationMode();
  if (typeof createSignalPropagationStrategy === 'function') {
    return createSignalPropagationStrategy(mode);
  }
  return null;
}

function updatePropagationToggleUI() {
  const btn = document.getElementById('propMode');
  if (!btn) return;
  const mode = getPropagationMode();
  btn.textContent = mode;
  btn.className = 'btn prop-toggle prop-toggle--' + mode;
  btn.title = 'Signal propagation: ' + mode + ' (applies on next Run)';
}

function bindInterpErrorHandler(interp) {
  if (!interp) return;
  interp.onRuntimeError = function() {
    globalInterp = interp;
    if (typeof showVars === 'function') showVars();
  };
}

function createInterpreter(funcs, pcbs, registry, chips, boards, probes, watches) {
  const interp = new Interpreter(funcs, [], pcbs, registry, createSignalStrategy(), chips, boards);
  interp.pendingProbeExprs = probes || [];
  interp.pendingWatchExprs = watches || [];
  bindInterpErrorHandler(interp);
  return interp;
}

function getActiveInterp() {
  const ctx = typeof getActiveRunContext === 'function' ? getActiveRunContext() : null;
  if (ctx && ctx.interp) return ctx.interp;
  return globalInterp;
}

function updateStepControlsUI() {
  const interp = typeof getActiveRunContext === 'function' ? getActiveRunContext() : null;
  const enabled = !!(interp && interp.interp);
  ['nextBtn', 'sec', 'secint'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !enabled;
    el.classList.toggle('btn--disabled', !enabled);
  });
}

async function init() {
  initFiles();
  const elCode = document.getElementById('code');
  const defaultCode = elCode.value;

  restoreTabs(defaultCode);

  const elName = document.getElementById("filename");
  const elSave = document.getElementById("filesave");
  const dirSave = document.getElementById("dirsave");

  locationChanged();

  elName.addEventListener('input', (event) => {
    if(elName.value.trim().length == 0) {
      elSave.disabled=1;
      dirSave.disabled=1;
    } else {
      elSave.disabled=0;
      dirSave.disabled=0;
    }
  });

  cmEditor = CodeMirror.fromTextArea(elCode, {
    mode: "logts",
    lineNumbers: true,
    theme: "default",
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: false,
    extraKeys: { "Ctrl-Space": "autocomplete" }
  });

  window.code = {
    get value()  { return cmEditor.getValue(); },
    set value(v) { cmEditor.setValue(v); }
  };

  tabShowCurrent();
  fShowTabs();

  cmEditor.on('beforeChange', function () {
    dismissEditorErrorHighlight();
  });

  cmEditor.on("change", function() {
    if (!codeCheckDisabled) {
      onCodeChange();
    }
  });

  updatePropagationToggleUI();

  if (!openDocViewFromHash()) {
    showEditorView();
  }

  initTimelineAnalyzer();
  if (typeof initSelectionPanel === 'function') initSelectionPanel();
  updateInstSelectorUI();
  updateStepControlsUI();
}

function toggleRunStop() {
  if (typeof isTabLiveOwner === 'function' && isTabLiveOwner(currentTab)) {
    if (typeof stopSimulation === 'function') stopSimulation();
  } else {
    run();
  }
}

function run(){
  let processedCode = '';
  let runInterpAssigned = false;
  const tabInfo = typeof tabs !== 'undefined' ? tabs.get(currentTab) : null;
  const instanceId = tabInfo ? clampInstance(tabInfo.instance) : 1;
  const ctx = getOrCreateRunContext(instanceId);
  setDeviceOperationInstanceId(instanceId);

  try{
  clearOutput();
  clearErrorMarkers();
  editorErrorDismissed = false;

  preemptInstanceForRun(instanceId, currentTab);
  if (typeof mountDevicesPanelForContext === 'function') {
    mountDevicesPanelForContext(ctx);
  }

  tabSave();
  syncLegacyLastKeys();
  persistTabs();
  processedCode = preprocessLoop(code.value);
  ctx.lastProcessedSource = processedCode;
  lastProcessedSource = processedCode;
  const _registry = (typeof createComponentRegistry === 'function') ? createComponentRegistry() : null;
  const p = new Parser(new Tokenizer(processedCode), _registry);
  const stmts = p.parse();
  const astText = JSON.stringify(stmts, null, 2);
  document.getElementById('ast').textContent = astText;
  if (tabInfo) {
    tabInfo.astText = astText;
    tabInfo.panelSnapshot = null;
  }

  prepareTimelineForRun(p.watches, stmts, _registry);

  const interp = createInterpreter(p.funcs, p.pcbs, _registry, p.chips, p.boards, p.probes, p.watches);
  interp.aliases = p.aliases;
  bindInterpToRunContext(interp, ctx);
  runInterpAssigned = true;
  globalInterp = interp;
  bindWatchRecorder(interp);

  if (typeof beginWaveListenRun === 'function') {
    beginWaveListenRun(instanceId, { legacy: getPropagationMode() === 'legacy' });
  }

  for (const s of stmts) {
      const isShow = s.show !== undefined;
    interp.exec(s, !isShow);
  }
  
  if(interp.firstRun){
    interp.firstRun = false;
    interp.vars.set('%', {type: '1bit', value: '0', ref: null});
  }
  interp.postExecSrc();

  if (timelineAnalyzer && interp.watchTargets && interp.watchTargets.length) {
    const labels = interp.watchTargets.map((t) => t.label);
    ctx.timelineLabels = labels.slice();
    timelineAnalyzer.reset(labels);
    interp.seedWatchTimeline();
  }

  captureRunContextDom(ctx);
  render(ctx.out, ctx.outBlocks, ctx);
  buildVarsSnapshot(interp, ctx);
  showVarsDomFromContext(ctx);
  if (typeof publishWindowDeviceAliases === 'function' && ctx.deviceMaps) {
    publishWindowDeviceAliases(ctx.deviceMaps);
  }
  if (typeof markTabHasRun === 'function') {
    markTabHasRun();
  }
  updateStepControlsUI();
  if (typeof endWaveListenRun === 'function') {
    endWaveListenRun(instanceId, 'complete');
  }
  }catch(e){
    if (!lastProcessedSource) {
      try { lastProcessedSource = preprocessLoop(code.value); } catch (_) { /* keep */ }
    }
    const src = processedCode || lastProcessedSource;
    const activeInterp = ctx.interp || globalInterp;
    if (runInterpAssigned && activeInterp && typeof activeInterp.reportRuntimeError === 'function') {
      activeInterp.reportRuntimeError(e);
    } else {
      appendErrorOutput(e, src);
      if (activeInterp) {
        activeInterp.out = [];
      }
    }
    if (activeInterp) showVars(activeInterp);
    if (tabInfo) tabInfo.hasRun = false;
    syncHasRunFromOwners();
    updateRunButtonUI();
    fShowTabs();
    if (typeof endWaveListenRun === 'function') {
      endWaveListenRun(instanceId, 'error');
    }
  }
}

function render(lines, blocks, ctxOptional) {
  const preservePage = { x: window.scrollX || 0, y: window.scrollY || 0 };
  clearOutput();
  if (!lines || !lines.length) return;
  const ctx = ctxOptional || null;
  const interp = ctx && ctx.interp ? ctx.interp : globalInterp;
  if (blocks == null && interp) blocks = interp.outBlocks || [];
  blocks = blocks || [];
  const src = (ctx && ctx.lastProcessedSource) ? ctx.lastProcessedSource : lastProcessedSource;

  let i = 0;
  while (i < lines.length) {
    const block = findOutputBlockAt(blocks, i);
    if (block && block.kind === 'lutOf' && block.end > block.start) {
      appendOutputCopyBlock(lines.slice(block.start, block.end).join('\n'));
      i = block.end;
      continue;
    }
    if (block && block.kind === 'assignPair' && block.end > block.start) {
      appendOutputCopyBlock(lines[block.start]);
      if (block.end > block.start + 1) {
        appendOutputCopyBlock(lines[block.start + 1]);
      }
      i = block.end;
      continue;
    }

    const line = lines[i];
    if (line.startsWith('Error:')) {
      const msg = line.slice(6).trimStart();
      let err = { message: msg };
      if (interp && interp.lastReportedError) {
        const re = interp.lastReportedError;
        const reMsg = (re && re.message) ? re.message : String(re);
        if (reMsg === msg) err = re;
      }
      appendErrorOutput(err, src);
    } else {
      appendOutputLine(line);
    }
    i++;
  }
  scrollOutputToBottom(preservePage);
}

function serializeArray(arr) {
  return JSON.stringify(arr);
}
function serializeMap(map) {
  return JSON.stringify(Object.fromEntries(map));
}

function unserializeArray(str) {
  return JSON.parse(str);
}
function unserializeMap(str) {
  return new Map(Object.entries(JSON.parse(str)));
}

function importVars(datas) {
  const interp = getActiveInterp();
  if(!interp) {
    return 0;
  }
  const data = JSON.parse(datas);
  interp.vars = unserializeMap(data.vars);
  interp.storage = unserializeArray(data.storage);
  interp.cycle = data.cycle;
}

function exportVars() {
  const interp = getActiveInterp();
  if(!interp) {
    return null;
  }
  let data = {vars: [], storage: [], cycle: interp.cycle};
  data.vars = serializeMap(interp.vars);
  data.storage = serializeArray(interp.storage);
  return JSON.stringify(data);
}

function buildVarsSnapshot(interp, ctx) {
  if (!interp) return '';
  let t = '';
  interp.vars.forEach((v, k) => {
    if (k === '~') {
      t += '~ = 1\n';
    } else {
      const typeStr = v.type ? ` (${v.type})` : '';
      let valueStr = v.value;
      if (v.type && valueStr && valueStr !== '-') {
        const bitWidth = interp.getBitWidth(v.type);
        if (bitWidth) {
          valueStr = interp.formatValue(valueStr, bitWidth, true);
        }
      }
      t += `${k}${typeStr} = ${valueStr} (ref: ${v.ref || 'null'})\n`;
    }
  });
  interp.wires.forEach((w, k) => {
    let wireValue = interp.zstate && typeof interp.getWireEffectiveValue === 'function'
      ? interp.getWireEffectiveValue(k)
      : interp.getValueFromRef(w.ref);
    if (wireValue == null) wireValue = interp.getValueFromRef(w.ref);
    let valueStr = wireValue !== null ? wireValue : '-';
    if (w.type && valueStr && valueStr !== '-') {
      const bitWidth = interp.getBitWidth(w.type);
      if (bitWidth) {
        valueStr = interp.formatValue(valueStr, bitWidth, true);
      }
    }
    const typeLabel = typeof interp.getWireTypeLabel === 'function' ? interp.getWireTypeLabel(w) : w.type;
    t += `${k} (${typeLabel}) = ${valueStr} (ref: ${w.ref || 'null'})\n`;
  });
  t += `\nCycle: ${interp.cycle}\n`;
  t += `Storage: ${interp.storage.length} entries\n`;
  if (ctx) {
    ctx.varsSnapshot = t;
    if (interp.out) {
      ctx.out = interp.out.slice();
      ctx.outBlocks = interp.outBlocks ? interp.outBlocks.slice() : [];
    }
    captureRunContextDom(ctx);
  }
  return t;
}

function showVarsDomFromContext(ctx) {
  if (!ctx) return;
  const varsEl = document.getElementById('vars');
  if (varsEl) varsEl.textContent = ctx.varsSnapshot || '';
  if (ctx.out && ctx.out.length) {
    render(ctx.out, ctx.outBlocks, ctx);
  }
}

function showVars(interpOptional){
  const interp = interpOptional
    || (typeof getExecInterp === 'function' ? getExecInterp() : null)
    || globalInterp;
  if (!interp) return;
  const ctx = interp._instanceId != null ? getRunContext(interp._instanceId) : null;
  buildVarsSnapshot(interp, ctx);
  if (ctx && interp.out) {
    ctx.out = interp.out.slice();
    ctx.outBlocks = interp.outBlocks ? interp.outBlocks.slice() : [];
  }
  if (typeof shouldRefreshRunDom === 'function' && !shouldRefreshRunDom(interp)) {
    return;
  }
  if (ctx) {
    showVarsDomFromContext(ctx);
  } else {
    const varsEl = document.getElementById('vars');
    if (varsEl) varsEl.textContent = buildVarsSnapshot(interp, null);
    if (interp.out && interp.out.length) {
      render(interp.out, interp.outBlocks);
    }
  }
}

function toggleAST(){
  const _reg = (typeof createComponentRegistry === 'function') ? createComponentRegistry() : null;
  const p=new Parser(new Tokenizer(preprocessLoop(code.value)), _reg);
  const ast=p.parse();
  const panel=document.getElementById('astPanel');
  panel.style.display=panel.style.display==='none'?'block':'none';
  document.getElementById('ast').textContent=JSON.stringify(ast,null,2);
}

function btnClr()  {
  if(!confirm) {
    showConfirm(2);
    return;
  }
  confirm = false;
  code.value='';
  updateFileNameDisplay('new');
}


const secInterval = [1000, 500, 200, 100, 50, 25];

function getSecContext() {
  return typeof getActiveRunContext === 'function' ? getActiveRunContext() : null;
}

function toggleSEC() {
  const ctx = getSecContext();
  if (!ctx || !ctx.interp) return;
  const sec = document.getElementById('sec');
  if (ctx.secTimerId === null) {
    ctx.secTimerId = setInterval(function () { doNext(1); }, ctx.currentInterval);
    if (sec) sec.classList.add('btn--primary');
  } else {
    clearInterval(ctx.secTimerId);
    ctx.secTimerId = null;
    if (sec) sec.classList.remove('btn--primary');
  }
  if (typeof fShowTabs === 'function') fShowTabs();
}

function changeSECINT() {
  const ctx = getSecContext();
  if (!ctx || !ctx.interp) return;
  ctx.currentIdx++;
  ctx.currentIdx = (ctx.currentIdx in secInterval) ? ctx.currentIdx : 0;
  ctx.currentInterval = secInterval[ctx.currentIdx];
  const el = document.getElementById('secint');
  if (el) el.textContent = String(1000 / ctx.currentInterval);

  if (ctx.secTimerId !== null) {
    clearInterval(ctx.secTimerId);
    ctx.secTimerId = setInterval(function () { doNext(1); }, ctx.currentInterval);
  }
  if (typeof fShowTabs === 'function') fShowTabs();
}

function doNext(count = 1) {
  const interp = getActiveInterp();
  if (!interp) {
    return;
  }
  const ctx = interp._instanceId != null ? getRunContext(interp._instanceId) : null;
  try {
    interp.exec({ next: count }, false);
    interp.postExecNext();
  } catch(e) {
    if (typeof interp.reportRuntimeError === 'function') {
      interp.reportRuntimeError(e);
    } else {
      clearOutput();
      appendErrorOutput(e, ctx ? ctx.lastProcessedSource : lastProcessedSource);
    }
  }
  globalInterp = interp;
  showVars();
}

function goto(param) {
  window.location.href = param + '.html';
  //if(param == 'run_tests') {
  //}
}

const compdown = document.getElementById('comp-dropdown');
const comptrigger = compdown.querySelector('.dropdown-trigger');
const compitems = compdown.querySelectorAll('.dropdown-item');

comptrigger.addEventListener('click', () => {
    compdown.classList.toggle('open');
    comptrigger.setAttribute(
      'aria-expanded',
      compdown.classList.contains('open')
    );
  });

const dropdown = document.getElementById('panel-dropdown');
const trigger = dropdown.querySelector('.dropdown-trigger');
const items = dropdown.querySelectorAll('.dropdown-item');

trigger.addEventListener('click', () => {
  dropdown.classList.toggle('open');
  trigger.setAttribute(
    'aria-expanded',
    dropdown.classList.contains('open')
  );
});

items.forEach(item => {
  item.addEventListener('click', () => {
    item.classList.toggle('active');

    const panelName = item.dataset.panel;
    const isActive = item.classList.contains('active');

    if (panelName === 'timeline') {
        toggleTimeline();
    } else if (panelName === 'networkTraffic') {
        toggleNetworkTraffic();
    } else if (panelName === 'waveListen') {
        toggleWaveListenPanel();
    } else if (panelName === 'output') {
        toggleOutput();
    } else if (panelName === 'variables') {
        toggleVariables();
    } else if (panelName === 'files') {
        toggleFiles();
    } else if (panelName === 'tabs') {
        toggleTabs();
    } else if (panelName === 'devices') {
        toggleDevices();
    } else if (panelName === 'ast') {
        toggleAST();
    } else if (panelName === 'selection') {
        toggleSelection();
    }
  });
});

document.addEventListener('click', e => {
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  }
});

init();
