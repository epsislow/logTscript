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
  applyErrorEditorHighlight(display);
}

function getOutputLines() {
  const el = document.getElementById('out');
  if (!el) return [];
  return Array.from(el.querySelectorAll('.output-line')).map((n) => n.textContent);
}

function watchLabelsFromExprs(exprs, wireWidths, compPropWidths) {
  const WE = typeof LogTScriptWatchExpand !== 'undefined' ? LogTScriptWatchExpand : null;
  if (WE && (wireWidths || compPropWidths)) {
    return WE.watchLabelsFromExprs(exprs, wireWidths, null, compPropWidths);
  }
  return (exprs || []).map((expr, i) => {
    const a = expr && expr[0];
    if (!a) return 'ch' + i;
    if (a.var) {
      if (a.property) return a.var + ':' + a.property;
      if (a.internalWire) return a.var + '.' + a.internalWire;
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
    timelineAnalyzer.reset(watchLabelsFromExprs(watches, wireWidths, compPropWidths));
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
}

function run(){
  let processedCode = '';
  let runInterpAssigned = false;
  try{
  clearOutput();
  clearErrorMarkers();
  editorErrorDismissed = false;
  
  const devicesContainer = document.getElementById('devices');
  if(devicesContainer){
    devicesContainer.innerHTML = '';
  }
  
  if(typeof leds !== 'undefined' && leds instanceof Map){
    leds.clear();
  }
  
  if(globalInterp && globalInterp.oscTimers){
    for(const tid of globalInterp.oscTimers){
      clearTimeout(tid);
    }
    globalInterp.oscTimers = [];
  }

  if (typeof clearTabHasRun === 'function') {
    clearTabHasRun();
  }

  tabSave();
  syncLegacyLastKeys();
  persistTabs();
  processedCode = preprocessRepeat(code.value);
  lastProcessedSource = processedCode;
  const _registry = (typeof createComponentRegistry === 'function') ? createComponentRegistry() : null;
  const p = new Parser(new Tokenizer(processedCode), _registry);
  const stmts = p.parse();
  document.getElementById('ast').textContent=JSON.stringify(stmts,null,2);

  prepareTimelineForRun(p.watches, stmts, _registry);

  globalInterp = createInterpreter(p.funcs, p.pcbs, _registry, p.chips, p.boards, p.probes, p.watches);
  globalInterp.aliases = p.aliases;
  runInterpAssigned = true;
  bindWatchRecorder(globalInterp);

  for (const s of stmts) {
      const isShow = s.show !== undefined;
    globalInterp.exec(s, !isShow);
  }
  
  if(globalInterp.firstRun){
    globalInterp.firstRun = false;
    globalInterp.vars.set('%', {type: '1bit', value: '0', ref: null});
  }
  globalInterp.postExecSrc();

  if (timelineAnalyzer && globalInterp.watchTargets && globalInterp.watchTargets.length) {
    timelineAnalyzer.reset(globalInterp.watchTargets.map((t) => t.label));
    globalInterp.seedWatchTimeline();
  }

  render(globalInterp.out, globalInterp.outBlocks);
  showVars();
  if (typeof markTabHasRun === 'function') {
    markTabHasRun();
  }
  }catch(e){
    if (!lastProcessedSource) {
      try { lastProcessedSource = preprocessRepeat(code.value); } catch (_) { /* keep */ }
    }
    const src = processedCode || lastProcessedSource;
    if (runInterpAssigned && globalInterp && typeof globalInterp.reportRuntimeError === 'function') {
      globalInterp.reportRuntimeError(e);
    } else {
      appendErrorOutput(e, src);
      if (globalInterp) {
        globalInterp.out = [];
      }
    }
    if(globalInterp) showVars();
    if (typeof clearTabHasRun === 'function') {
      clearTabHasRun();
    }
  }
}

function sendCmd(){
  const cmdInput = document.getElementById('cmdInput');
  const cmdText = cmdInput.value.trim();
  
  if(!cmdText) return;
  
  let cmdProcessed = '';
  try{
    if(!globalInterp){
      const srcProcessed = preprocessRepeat(code.value);
      lastProcessedSource = srcProcessed;
      const _reg = (typeof createComponentRegistry === 'function') ? createComponentRegistry() : null;
      const p = new Parser(new Tokenizer(srcProcessed), _reg);
      const stmts = p.parse();
      globalInterp = createInterpreter(p.funcs, p.pcbs, _reg, p.chips, p.boards, p.probes, p.watches);
      bindWatchRecorder(globalInterp);
      
      for(const s of stmts){
        globalInterp.exec(s, true);
      }
      
      if(globalInterp.firstRun){
        globalInterp.firstRun = false;
        globalInterp.vars.set('%', {type: '1bit', value: '0', ref: null});
      }
      //postExec must be called after interpretting both the code and the cmd
      
    }
    
    const _cmdReg = globalInterp.componentRegistry;
    cmdProcessed = preprocessRepeat(cmdText);
    lastProcessedSource = cmdProcessed;
    const p = new Parser(new Tokenizer(cmdProcessed), _cmdReg);
  const stmts = p.parse();

    for(const [name, fn] of p.funcs.entries()){
    globalInterp.funcs.set(name, fn);
  }

    for(const s of stmts){
      globalInterp.exec(s, true);
    }
    globalInterp.postExecSrc();
    
  render(globalInterp.out, globalInterp.outBlocks);
  showVars();
    
    cmdInput.value = '';
  } catch(e){
    if (!lastProcessedSource) {
      try { lastProcessedSource = preprocessRepeat(cmdText); } catch (_) { /* keep */ }
    }
    if (globalInterp && typeof globalInterp.reportRuntimeError === 'function') {
      globalInterp.reportRuntimeError(e);
    } else {
      clearOutput();
      appendErrorOutput(e, cmdProcessed || lastProcessedSource);
    }
    if(globalInterp) showVars();
  }
}

(function(){
  const cmdInput = document.getElementById('cmdInput');
  if(cmdInput){
    cmdInput.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && (e.ctrlKey || e.shiftKey)){
        e.preventDefault();
        sendCmd();
      }
    });
  }
})();

function render(lines, blocks) {
  clearOutput();
  if (!lines || !lines.length) return;
  if (blocks == null && globalInterp) blocks = globalInterp.outBlocks || [];
  blocks = blocks || [];

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
      if (globalInterp && globalInterp.lastReportedError) {
        const re = globalInterp.lastReportedError;
        const reMsg = (re && re.message) ? re.message : String(re);
        if (reMsg === msg) err = re;
      }
      appendErrorOutput(err, lastProcessedSource);
    } else {
      appendOutputLine(line);
    }
    i++;
  }
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
  if(!globalInterp) {
    return 0;
  }
  const data = JSON.parse(datas);
  globalInterp.vars = unserializeMap(data.vars);
  globalInterp.storage = unserializeArray(data.storage);
  globalInterp.cycle = data.cycle;
}

function exportVars() {
  if(!globalInterp) {
    return null;
  }
  let data = {vars: [], storage: [], cycle: globalInterp.cycle};
  data.vars = serializeMap(globalInterp.vars);
  data.storage = serializeArray(globalInterp.storage);
  return JSON.stringify(data);
}

function showVars(){
  let t='';
  if(globalInterp){
    globalInterp.vars.forEach((v,k)=>{
      if(k === '~'){
        t += `~ = 1\n`;
      } else {
        const typeStr = v.type ? ` (${v.type})` : '';
        let valueStr = v.value;
        if(v.type && valueStr && valueStr !== '-'){
          const bitWidth = globalInterp.getBitWidth(v.type);
          if(bitWidth){
            valueStr = globalInterp.formatValue(valueStr, bitWidth, true);
          }
        }
        t += `${k}${typeStr} = ${valueStr} (ref: ${v.ref || 'null'})\n`;
      }
    });
    globalInterp.wires.forEach((w,k)=>{
      let wireValue = globalInterp.zstate && typeof globalInterp.getWireEffectiveValue === 'function'
        ? globalInterp.getWireEffectiveValue(k)
        : globalInterp.getValueFromRef(w.ref);
      if (wireValue == null) wireValue = globalInterp.getValueFromRef(w.ref);
      let valueStr = wireValue !== null ? wireValue : '-';
      if(w.type && valueStr && valueStr !== '-'){
        const bitWidth = globalInterp.getBitWidth(w.type);
        if(bitWidth){
          valueStr = globalInterp.formatValue(valueStr, bitWidth, true);
        }
      }
      t += `${k} (${w.type}) = ${valueStr} (ref: ${w.ref || 'null'})\n`;
    });
    t += `\nCycle: ${globalInterp.cycle}\n`;
    t += `Storage: ${globalInterp.storage.length} entries\n`;
  }
  document.getElementById('vars').textContent=t;
  if (globalInterp && globalInterp.out && globalInterp.out.length) {
    render(globalInterp.out, globalInterp.outBlocks);
  }
}

function toggleAST(){
  const _reg = (typeof createComponentRegistry === 'function') ? createComponentRegistry() : null;
  const p=new Parser(new Tokenizer(preprocessRepeat(code.value)), _reg);
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

let timerId = null;
let currentInterval = 1000;
let currentIdx = 0;
const secInterval = [1000, 500, 200, 100, 50, 25];

function toggleSEC() {
  const sec = document.getElementById('sec');
    if (timerId === null) {
        timerId = setInterval(doNext, currentInterval);
        sec.classList.toggle('btn--primary');
        console.log("Started at " + currentInterval + "ms");
    } else {
        clearInterval(timerId);
        timerId = null;
        sec.classList.remove('btn--primary');
        console.log("Stopped");
    }
}

function changeSECINT() {
    currentIdx++;
    currentIdx = (currentIdx in secInterval) ? currentIdx :0;
    currentInterval = secInterval[currentIdx];
    const el = document.getElementById('secint');
    el.innerHTML = 1000 / currentInterval;
    console.log("Interval changed to: " + currentInterval + "ms");

    if (timerId !== null) {
        clearInterval(timerId);
        timerId = setInterval(doNext, currentInterval);
    }
}

function doNext(count = 1) {
  if (!globalInterp) {
    throw Error("Program not running");
  }
  try {
    globalInterp.exec({ next: count }, false);
    globalInterp.postExecNext();
  } catch(e) {
    if (globalInterp && typeof globalInterp.reportRuntimeError === 'function') {
      globalInterp.reportRuntimeError(e);
    } else {
      clearOutput();
      appendErrorOutput(e, lastProcessedSource);
    }
  }
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
    } else if (panelName === 'command') {
        toggleCmd();
    } else if (panelName === 'ast') {
        toggleAST();
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
