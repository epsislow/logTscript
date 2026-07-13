/* ================= EDITOR & TABS ================= */

const maxTabs = 50;
const TABS_STORAGE_KEY = 'prog/tabs';
const TABS_DISPLAY_MODE_KEY = 'prog/tabsDisplayMode';
const TABS_DISPLAY_MODES = ['all', '1line', 'grid'];
const tabs = new Map();
let currentTab = 0;
let lastTab = 0;
let originalHash = '';
let codeCheckDisabled = false;
let cmEditor;
let debug = {};
let persistTabsTimer = null;
let tabsDisplayMode = 'all';

function tabsDisplayModeLabel(mode) {
  if (mode === '1line') return '1-line';
  return mode;
}

function loadTabsDisplayMode() {
  const db = tabsDb();
  if (db.has(TABS_DISPLAY_MODE_KEY)) {
    const v = db.get(TABS_DISPLAY_MODE_KEY);
    if (TABS_DISPLAY_MODES.includes(v)) tabsDisplayMode = v;
  }
}

function cycleTabsDisplayMode() {
  const i = TABS_DISPLAY_MODES.indexOf(tabsDisplayMode);
  tabsDisplayMode = TABS_DISPLAY_MODES[(i + 1) % TABS_DISPLAY_MODES.length];
  tabsDb().set(TABS_DISPLAY_MODE_KEY, tabsDisplayMode);
  applyTabsDisplayMode();
}

function applyTabsDisplayMode() {
  const strip = document.getElementById('tabsStrip');
  const btn = document.getElementById('tabsDisplayModeBtn');
  const prevBtn = document.getElementById('tabsStripScrollPrev');
  const nextBtn = document.getElementById('tabsStripScrollNext');
  const outer = document.getElementById('tabsStripOuter');
  if (strip) strip.dataset.tabsMode = tabsDisplayMode;
  if (outer) outer.classList.toggle('tabs-strip-outer--1line', tabsDisplayMode === '1line');
  if (btn) {
    btn.textContent = tabsDisplayModeLabel(tabsDisplayMode);
    btn.title = 'Tab display (click to cycle): all → 1-line → grid';
  }
  const showScroll = tabsDisplayMode === '1line';
  if (prevBtn) prevBtn.hidden = !showScroll;
  if (nextBtn) nextBtn.hidden = !showScroll;
  scrollActiveTabIntoView();
}

function scrollTabsStrip(direction) {
  const strip = document.getElementById('tabsStrip');
  if (!strip || tabsDisplayMode !== '1line') return;
  const step = Math.max(72, Math.floor(strip.clientWidth * 0.8));
  strip.scrollBy({ left: direction * step, behavior: 'smooth' });
}

function scrollActiveTabIntoView() {
  if (tabsDisplayMode !== '1line' && tabsDisplayMode !== 'grid') return;
  const strip = document.getElementById('tabsStrip');
  if (!strip) return;
  const active = strip.querySelector('.tab-active, .tab-run-current');
  if (active && typeof active.scrollIntoView === 'function') {
    active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function initTabsDisplayPanel() {
  loadTabsDisplayMode();
  const prevBtn = document.getElementById('tabsStripScrollPrev');
  const nextBtn = document.getElementById('tabsStripScrollNext');
  if (prevBtn) {
    prevBtn.addEventListener('click', function () { scrollTabsStrip(-1); });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () { scrollTabsStrip(1); });
  }
  applyTabsDisplayMode();
}

function tabsDb() {
  if (typeof sdb !== 'undefined') return sdb;
  if (!window._tabsDb) window._tabsDb = new DbLocalStorage();
  return window._tabsDb;
}

function serializeTabsSession() {
  if (typeof code !== 'undefined') {
    tabSave();
  }
  const tabList = [];
  for (const id of tabs.keys()) {
    const t = tabs.get(id);
    tabList.push({
      id,
      filename: t.filename,
      code: t.code,
      hash: t.hash,
      isChanged: t.isChanged,
      propagation: t.propagation === 'legacy' ? 'legacy' : 'wave',
      instance: typeof clampInstance === 'function' ? clampInstance(t.instance) : 1
    });
  }
  tabList.sort((a, b) => a.id - b.id);
  return {
    version: 2,
    currentTab,
    lastTab,
    tabs: tabList
  };
}

function persistTabs() {
  tabsDb().set(TABS_STORAGE_KEY, JSON.stringify(serializeTabsSession()));
}

function schedulePersistTabs() {
  if (persistTabsTimer) clearTimeout(persistTabsTimer);
  persistTabsTimer = setTimeout(persistTabs, 500);
}

function restoreTabs(defaultCode) {
  tabs.clear();
  const db = tabsDb();

  if (db.has(TABS_STORAGE_KEY)) {
    try {
      const session = JSON.parse(db.get(TABS_STORAGE_KEY));
      if (session && Array.isArray(session.tabs) && session.tabs.length) {
        const ver = session.version === 2 ? 2 : 1;
        for (const t of session.tabs) {
          tabs.set(t.id, {
            filename: t.filename || ('tab ' + t.id),
            code: t.code || '',
            hash: typeof t.hash === 'number' ? t.hash : getHashForStr(t.code || ''),
            isChanged: !!t.isChanged,
            propagation: t.propagation === 'legacy' ? 'legacy' : 'wave',
            hasRun: false,
            instance: ver === 2 && t.instance != null ? clampInstance(t.instance) : 1,
            astText: null,
            panelSnapshot: null
          });
        }
        currentTab = session.currentTab;
        if (!tabs.has(currentTab)) {
          currentTab = session.tabs[0].id;
        }
        lastTab = session.lastTab;
        if (typeof lastTab !== 'number' || isNaN(lastTab)) {
          lastTab = Math.max(...Array.from(tabs.keys()));
        } else if (lastTab < currentTab) {
          lastTab = Math.max(...Array.from(tabs.keys()));
        }
        return;
      }
    } catch (e) {
      console.warn('restoreTabs: invalid prog/tabs', e);
    }
  }

  let lastName = 'new';
  let last = defaultCode || '';
  let lastHash = getHashForStr(last);
  let isChanged = false;

  if (db.has('prog/last')) {
    last = db.get('prog/last');
    lastHash = getHashForStr(last);
  }
  if (db.has('prog/lastName')) {
    lastName = db.get('prog/lastName');
  }
  if (db.has('prog/lastHash')) {
    lastHash = parseInt(db.get('prog/lastHash'), 10);
  }
  isChanged = isStrChanged(last, lastHash);

  currentTab = 0;
  lastTab = 0;
  tabUpdate(0, lastName, last, lastHash, isChanged, {
    propagation: typeof getPropagationMode === 'function' ? getPropagationMode() : 'wave',
    hasRun: false,
    instance: 1
  });
  persistTabs();
}

function syncLegacyLastKeys() {
  tabSave();
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;
  const db = tabsDb();
  db.set('prog/last', tabInfo.code);
  db.set('prog/lastHash', String(tabInfo.hash));
  db.set('prog/lastName', tabInfo.filename);
}

function nameIsValid(name, isDir) {
  fileReg = /^[a-zA-Z0-9._]+$/;
  dirReg  = /^[a-zA-Z0-9_]+$/;
  invalidFileReg = /[^a-zA-Z0-9._]/;
  invalidDirReg = /[^a-zA-Z0-9_]/;
  if(!(isDir ? dirReg: fileReg).test(name)) {
    let invalidMatch = name.match(isDir ? invalidDirReg : invalidFileReg);
    throw Error('Name contains bad caracter: ' + invalidMatch[0]);
  }
}

function btnundo() {
  cmEditor.undo();
}

function btnredo() {
  cmEditor.redo();
}

function btncopy() {
  const codeText = cmEditor.getValue()
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`"); 
    
    navigator.clipboard.writeText(codeText).then(() => {
    });
}

let tabRenameEscCancel = false;

function beginRenameTab() {
  tabSave();
  const tabInfo = tabs.get(currentTab);
  const wrap = document.getElementById('tabRenameWrap');
  const input = document.getElementById('tabRenameInput');
  if (!tabInfo || !wrap || !input) return;
  tabRenameEscCancel = false;
  input.value = tabInfo.filename;
  wrap.hidden = false;
  input.focus();
  input.select();
}

function tabRenameKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    commitRenameTab();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    cancelRenameTab();
  }
}

function cancelRenameTab() {
  tabRenameEscCancel = true;
  const wrap = document.getElementById('tabRenameWrap');
  const input = document.getElementById('tabRenameInput');
  if (wrap) wrap.hidden = true;
  if (input) input.blur();
}

function commitRenameTab() {
  if (tabRenameEscCancel) {
    tabRenameEscCancel = false;
    return;
  }
  const wrap = document.getElementById('tabRenameWrap');
  const input = document.getElementById('tabRenameInput');
  if (!wrap || !input || wrap.hidden) return;
  const name = input.value.trim();
  wrap.hidden = true;
  if (!name) return;
  tabSave();
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;
  tabUpdate(currentTab, name, tabInfo.code, tabInfo.hash, tabInfo.isChanged);
  updateFileNameDisplay(name);
  fShowTabs();
  syncLegacyLastKeys();
  persistTabs();
}

function onCodeChange() {
    checkForTabChanged();
    schedulePersistTabs();
}

function checkForTabChanged() {
  let messageChanged = tabGetIsChanged(currentTab);
  const tabInfo = tabs.get(currentTab);
  const newMessageChanged = isStrChanged(code.value, tabInfo.hash);
  if (newMessageChanged !== messageChanged) {
    messageChanged = newMessageChanged;
    tabUpdateIsChanged(currentTab, newMessageChanged);
    fShowTabs();
  }
}

function hashDjb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash >>> 0;
}

function getHashForStr(str) {
    return hashDjb2(str);
}

function isStrChanged(str, originalHash) {
  return getHashForStr(str) !== originalHash;
}

function tabSaved() {
  originalHash = getHashForStr(code.value);
  tabUpdateIsChanged(currentTab, false);
  tabSave(true);
  fShowTabs();
  persistTabs();
}

function addTab() {
  tabSave();
  tabAdd('', '');
  fShowTabs();
}

function prevTab() {
  tabSave();
  const keys = Array.from(tabs.keys());
  const index = keys.indexOf(currentTab);
  const previousTab = index > 0 ? keys[index - 1] : null;
  if(previousTab === null) {
    return;
  }
  currentTab = previousTab;
  tabShowCurrent();
  fShowTabs();
}

function nextTab() {
  tabSave();
  const keys = Array.from(tabs.keys());
  const index = keys.indexOf(currentTab);
  const nextTab = index >= 0 ? keys[index + 1] : null;
  
  if(nextTab === null || nextTab === undefined) {
    return;
  }
  currentTab = nextTab;
  tabShowCurrent();
  fShowTabs();
}

function tabSwitch(newTab) {
    tabSave();
    currentTab = parseInt(newTab, 10);
    tabShowCurrent();
    fShowTabs();
    persistTabs();
}

function tabMetaDefaults(meta) {
  const m = meta || {};
  return {
    propagation: m.propagation === 'legacy' ? 'legacy' : 'wave',
    hasRun: !!m.hasRun,
    instance: typeof clampInstance === 'function' ? clampInstance(m.instance) : 1,
    astText: m.astText != null ? m.astText : null,
    panelSnapshot: null
  };
}

function syncHasRunFromOwners() {
  for (const id of tabs.keys()) {
    tabs.get(id).hasRun = isTabLiveOwner(id);
  }
}

function getCurrentTabInstance() {
  const tabInfo = tabs.get(currentTab);
  return tabInfo ? clampInstance(tabInfo.instance) : 1;
}

function updateInstSelectorUI() {
  const btn = document.getElementById('instBtn');
  const label = document.getElementById('instLabel');
  const swatch = document.getElementById('instSwatch');
  if (!btn || !label) return;
  const inst = getCurrentTabInstance();
  label.textContent = 'Inst: ' + inst;
  if (swatch) {
    swatch.className = 'inst-swatch inst-swatch-' + inst;
  }
  const menu = document.getElementById('instMenu');
  if (menu) {
    menu.querySelectorAll('[data-inst]').forEach(function (el) {
      el.classList.toggle('active', parseInt(el.dataset.inst, 10) === inst);
    });
  }
}

function toggleInstMenu() {
  const dd = document.getElementById('inst-dropdown');
  if (!dd) return;
  dd.classList.toggle('open');
  const btn = document.getElementById('instBtn');
  if (btn) {
    btn.setAttribute('aria-expanded', dd.classList.contains('open') ? 'true' : 'false');
  }
}

function closeInstMenu() {
  const dd = document.getElementById('inst-dropdown');
  if (!dd) return;
  dd.classList.remove('open');
  const btn = document.getElementById('instBtn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function selectInstance(n) {
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;
  tabInfo.instance = clampInstance(n);
  closeInstMenu();
  updateInstSelectorUI();
  persistTabs();
}

function updateRunButtonUI() {
  const btn = document.getElementById('runBtn');
  if (!btn) return;
  const isOwner = isTabLiveOwner(currentTab);
  btn.classList.toggle('btn-run-active', isOwner);
  for (let n = 1; n <= 5; n++) btn.classList.remove('btn-run-inst-' + n);
  if (isOwner) {
    const runningInst = getTabRunningInstanceId(currentTab);
    if (runningInst) btn.classList.add('btn-run-inst-' + runningInst);
    btn.textContent = 'Stop';
    btn.title = 'Stop simulation (instance ' + runningInst + ')';
  } else {
    btn.textContent = 'Run';
    btn.title = 'Run script';
  }
}

function clearTabHasRunForInstance(instanceId) {
  const inst = clampInstance(instanceId);
  const owner = getOwnerTabId(inst);
  if (owner != null) {
    const t = tabs.get(owner);
    if (t) t.hasRun = false;
  }
}

function markTabHasRun() {
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;
  setInstanceOwner(clampInstance(tabInfo.instance), currentTab);
  syncHasRunFromOwners();
  updateRunButtonUI();
  fShowTabs();
  persistTabs();
}

function tabAdd(filename, code, meta) {
  if(Array.from(tabs.keys()).length >= maxTabs) {
      return false;
  }
  const idx = lastTab + 1;
  if(filename===''){
    filename = 'tab '+ idx;
  }
  const extra = tabMetaDefaults(meta);
  if (!meta || meta.propagation === undefined) {
    extra.propagation = typeof getPropagationMode === 'function'
      ? getPropagationMode() : 'wave';
  }
  tabUpdate(idx, filename, code, getHashForStr(code || ''), false, extra);
  currentTab = idx;
  lastTab = idx;
  tabShowCurrent();
  fShowTabs();
  persistTabs();
  return true;
}

function closeTab() {
     tabClose();
}

function tabClose() {
  if(Array.from(tabs.keys()).length <= 1) {
    return;
  }
  if (typeof releaseInstanceIfTabClosed === 'function') {
    releaseInstanceIfTabClosed(currentTab);
  }
  tabs.delete(currentTab);
  let updateLastTab = false;
  if(currentTab===lastTab) {
    updateLastTab = true;
  }
  currentTab = [...tabs.keys()].at(-1);
  tabShowCurrent();
  fShowTabs();
  persistTabs();
}

function tabShowCurrent() {
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;
  updateFileNameDisplay(tabInfo.filename);
  if (typeof code !== 'undefined') {
    codeCheckDisabled = true;
    code.value = tabInfo.code;
    codeCheckDisabled = false;
  }
  originalHash = tabInfo.hash;
  if (typeof setPropagationMode === 'function') {
    setPropagationMode(tabInfo.propagation || 'wave');
  }
  updateInstSelectorUI();
  if (typeof mountTabPanels === 'function') mountTabPanels();
  else updateRunButtonUI();
}

function tabSave(isLoad = false) {
  const tabInfo = tabs.get(currentTab);
  if (!tabInfo) return;
  if (!isLoad && typeof getPropagationMode === 'function') {
    tabInfo.propagation = getPropagationMode();
  }
  let isChangedValue = tabGetIsChanged(currentTab);
  let hash = false;
  if (isLoad === true) {
      hash = getHashForStr(code.value);
      isChangedValue = false;
  }
  const fileNameEl = document.getElementById('fileName');
  const filename = (fileNameEl && fileNameEl.textContent)
    ? fileNameEl.textContent
    : tabInfo.filename;
  tabUpdate(currentTab, filename, code.value, hash, isChangedValue);
}

function tabUpdate(idx, filename, code, hash = false, isChanged = false, meta) {
  const keys = Array.from(tabs.keys());
  const index = keys.indexOf(idx);
  if (index == -1) {
      if(hash === false) {
          hash = getHashForStr(code);
      }
      tabs.set(idx, Object.assign(
        { filename, code, hash, isChanged },
        tabMetaDefaults(meta)
      ));
      return;
  }

  const tabInfo = tabs.get(idx);
  tabInfo.filename = filename;
  tabInfo.code = code;
  tabInfo.isChanged = isChanged;
  if (hash !== false) {
      tabInfo.hash = hash;
  }
  if (meta && meta.propagation !== undefined) {
    tabInfo.propagation = meta.propagation === 'legacy' ? 'legacy' : 'wave';
  }
  if (meta && meta.hasRun !== undefined) {
    tabInfo.hasRun = !!meta.hasRun;
  }
  if (meta && meta.instance !== undefined) {
    tabInfo.instance = clampInstance(meta.instance);
  }
  if (meta && meta.astText !== undefined) {
    tabInfo.astText = meta.astText;
  }
  tabs.set(idx, tabInfo);
}

function tabUpdateIsChanged(idx, isChanged) {
    const tabInfo = tabs.get(idx);
    tabInfo.isChanged = isChanged
}

function tabGetIsChanged(idx) {
    const tabInfo = tabs.get(idx);
    return tabInfo.isChanged;
}

function fShowTabs() {
  const tabsActiveEl = document.getElementById("tabsActive");
  tabsActiveEl.innerHTML ='';
  for(const k of tabs.keys()) {
    const tab= tabs.get(k);
    const isActive = k === currentTab;
    let tabClass = 'tab';
    const runningInst = getTabRunningInstanceId(k);
    if (isActive && isTabLiveOwner(k)) {
      tabClass += ' tab-run tab-run-current';
      if (runningInst) tabClass += ' tab-run-inst-' + runningInst;
    } else if (isActive) {
      tabClass += ' tab-active';
    } else if (isTabLiveOwner(k)) {
      tabClass += ' tab-run tab-run-other';
      if (runningInst) tabClass += ' tab-run-inst-' + runningInst;
    }
    if (runningInst != null) {
      const ctx = typeof getRunContext === 'function' ? getRunContext(runningInst) : null;
      if (ctx && ctx.secTimerId != null) tabClass += ' tab-sec-active';
    }
    const isChangedText = tab.isChanged? ' ✎': '';
    const instSuffix = runningInst != null ? ' ·' + runningInst : '';
    tabsActiveEl.innerHTML += '<div class="'+tabClass+'" data-key="'+k+'" onClick="tabClick(this)">'+tab.filename+instSuffix+isChangedText+'</div>';
  }
  scrollActiveTabIntoView();
}

function tabClick(element) {
  const key = element.dataset.key;
  tabSave();
  tabSwitch(key);
}

function insertTextAtCursor(cm, textToInsert) {
  const doc = cm.getDoc();
  const placeholderIndex = textToInsert.indexOf('|');
  const cleanText = textToInsert.replace('|', '');

  const from = doc.getCursor("from");

  doc.replaceSelection(cleanText);

  if (placeholderIndex !== -1) {
    doc.setCursor({
      line: from.line,
      ch: from.ch + placeholderIndex
    });
  }

  cm.focus();
}

function insertTextAtCursor1(cm, textToInsert) {
  const doc = cm.getDoc();
  const cursor = doc.getCursor();
  const selection = doc.getSelection();
  
  const placeholderIndex = textToInsert.indexOf('|');
  let finalCursor;
  
  if (placeholderIndex !== -1) {
    const cleanText = textToInsert.replace('|', '');
    
    doc.replaceSelection(cleanText);
    
    const from = doc.getCursor("from");
    const startPos = {
      line: from.line,
      ch: from.ch - cleanText.length
    };
    
    finalCursor = {
      line: startPos.line,
      ch: startPos.ch + placeholderIndex
    };
  } else {
    doc.replaceSelection(textToInsert);
    finalCursor = doc.getCursor();
  }
  
  cm.focus();
  doc.setCursor(finalCursor);
}

function insertTextAtCursor0(textArea, textToInsert) {
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    
    const placeholderIndex = textToInsert.indexOf('|');
    let finalCursorPos;

    if (placeholderIndex !== -1) {
        const cleanText = textToInsert.replace('|', '');
        textArea.setRangeText(cleanText, start, end, 'end');
        
        finalCursorPos = start + placeholderIndex;
    } else {
        textArea.setRangeText(textToInsert, start, end, 'end');
        finalCursorPos = start + textToInsert.length;
    }

    textArea.focus();
    textArea.setSelectionRange(finalCursorPos, finalCursorPos);
}

const snippets = {
  'led': `comp [led] .|:
    square
    on:1
     :`,
  'key': `comp [key] .|:
    label:'A'
    size: 35
    on:1
    :`,
  'dip': `comp [dip] .|:
    length: 8
    noLabels 
    visual:1
    on:1
    :`,
  'switch': `comp [switch] .|:
    text: 'Pwr'
    :`,
  'rotary': `comp [rotary] .|:
    text: 'R1'
    for.0: '+'
    for.1: '-'
    for.2: 'x'
    for.3: ':'
    states: 4
    :`,
  'adder': `comp [adder] .|:
    depth: 4
    :`,
  'subtract': `comp [-] .|:
    depth: 4
    on:1
    :`,
  'divider': `comp [/] .|:
    depth: 4
    on:1
    :`,
  'multiplier': `comp [*] .|:
    depth: 4
    :`,
  'counter': `comp [counter] .|:
    depth: 4
    on:1
    :`,
  'shifter': `comp [shifter] .|:
    depth: 8
    on:1
    :`,
  'mem': `comp [mem] .|:
    depth: 8
    length: 16
    on:1
    :`,
  'reg': `comp [reg] .|:
    depth: 4
    on:1
    :`,
  'lcd': `comp [lcd] .|:
    row: 8
    cols: 20
    pixelSize: 7
    pixelGap: 1
    glow
    round: 0
    color: ^58f
    bg: ^000
    rgb
    nl
    on:1
    :`,
  'terminal': `comp [terminal] .|:
    rows: 20
    columns: 80
    fontSize: 12
    wordWrap: 1
    lineNumbers: 0
    cursorStyle: 1
    color: ^0f0
    on:1
    :`,
  '7seg': `comp [7seg] .|:
    color: ^9b3
    on:1
    :`,
  'osc': `comp [~] .|:
    duration1: 4
    duration0: 4
    length: 4
    freq: 1
    freqIsSec: 0
    eachCycle: 1
    :`,
  'pcb': `pcb +[|]:
   1pin set
   exec: set
   on:1
   :1bit set

pcb [a] .b::`,
  'board': `board +[|]:
   1pin set
   1pout out
   exec: set
   on: 1
   out = 0
   :1bit out

board [a] .b::`,
  'chip': `chip +[|]:
   1pin set
   1pout out
   exec: set
   on: 1
   out = 0
   :1bit out

chip [a] .b::`,
  'alu': `comp [alu] .|:
    length: 4
    on: 1
    :`
};

function insertComp(name) {
  closeCompDropdown();
  if(!(name in snippets)) {
    return;
  }
  insertTextAtCursor(cmEditor, snippets[name]);
}

function closeCompDropdown() {
    compdown.classList.remove('open');
    comptrigger.setAttribute('aria-expanded', 'false');
}

window.addEventListener('beforeunload', function() {
  persistTabs();
});

document.addEventListener('click', function (e) {
  const dd = document.getElementById('inst-dropdown');
  if (dd && !dd.contains(e.target)) closeInstMenu();
});
