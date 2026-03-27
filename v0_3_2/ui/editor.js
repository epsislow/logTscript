/* ================= EDITOR & TABS ================= */

const maxTabs = 10;
const tabs = new Map();
let currentTab = 0;
let lastTab = 0;
let originalHash = '';
let codeCheckDisabled = false;
let cmEditor;
let debug = {};

function nameIsValid(name, isDir) {
  fileReg = /^[a-zA-Z0-9._]+$/;
  dirReg  = /^[a-zA-Z0-9_]+$/;
  invalidFileReg = /[^a-zA-Z0-9._]/;
  invalidDirReg = /[^a-zA-Z0-9_]/;
  if(!(isDir ? dirReg: fileReg).test(name)) {
    let invalidMatch = name.match(isDir? invalidFileReg: invalidDirReg);
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
  const codeText = cmEditor.getValue(); 
    
    navigator.clipboard.writeText(codeText).then(() => {
    });
}

function onCodeChange() {
    checkForTabChanged();
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
  fShowTabs();
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
}

function tabAdd(filename, code) {
  if(Array.from(tabs.keys()).length > maxTabs) {
      return;
  }
  const idx = lastTab + 1;
  if(filename===''){
    filename = 'tab '+ idx;
  }
  tabUpdate(idx, filename, code, getHashForStr(''), false);
  currentTab = idx;
  lastTab = idx;
  tabShowCurrent();
  fShowTabs();
}

function closeTab() {
     tabClose();
}

function tabClose() {
  if(Array.from(tabs.keys()).length <= 1) {
    return;
  }
  tabs.delete(currentTab);
  let updateLastTab = false;
  if(currentTab===lastTab) {
    updateLastTab = true;
  }
  currentTab = [...tabs.keys()].at(-1);
  tabShowCurrent();
  fShowTabs();
}

function tabShowCurrent() {
  const tabInfo = tabs.get(currentTab);
  updateFileNameDisplay(tabInfo.filename);
  code.value = tabInfo.code;
  originalHash = getHashForStr(tabInfo.hash);
}

function tabSave(isLoad = false) {
  const fileNameEl = document.getElementById("fileName");
  let isChangedValue = tabGetIsChanged(currentTab);
  hash = false;
  if (isLoad === true) {
      hash = getHashForStr(code.value);
  }
  tabUpdate(currentTab, fileNameEl.textContent, code.value, hash, isChangedValue);
}

function tabUpdate(idx, filename, code, hash = false, isChanged = false) {
  const keys = Array.from(tabs.keys());
  const index = keys.indexOf(idx);
  if (index == -1) {
      if(hash === false) {
          hash = getHashForStr(code);
      }
      tabs.set(idx, {filename, code, hash, isChanged});
      return;
  }
  
  const tabInfo = tabs.get(idx);
  tabInfo.filename = filename;
  tabInfo.code = code;
  tabInfo.isChanged = isChanged;
  if (hash !== false) {
      tabInfo.hash = hash;
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
    const activeClass = (k === currentTab)? ' tab-active':'';
    const isChangedText = tab.isChanged? ' ✎': '';
    tabsActiveEl.innerHTML += '<div class="tab'+activeClass+'" data-key="'+k+'" onClick="tabClick(this)">'+tab.filename+isChangedText+'</div>';
  }
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
  'switch': ``,
  'rotary': ``,
  'adder': ``,
  'subtract': ``,
  'divider': ``,
  'multiplier': ``,
  'counter': ``,
  'shifter': ``,
  'mem': `comp [reg] .|:
    length: 8
    depth: 4
    on:1
    :`,
  'reg': `comp [reg] .|:
    depth: 5
    on:1
    :`,
  'lcd': ``,
  '7seg': ``,
  'osc': `comp [~] .|:
    duration1: 4
    duration0: 4
    length: 4
    freq: 1
    freqIsSec: 0
    eachCycle: 1
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
