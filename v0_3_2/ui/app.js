/* ================= APP LOGIC ================= */

let prog=null, pc=0;
let globalInterp = null;

let sdb = new DbLocalStorage();
let fss = new FileStorageSystem(sdb);
let currentFilesLocation = '>';
window.lib_files = window.lib_files || {};

async function init() {
  initFiles();
  const elCode = document.getElementById('code');
  let lastName ="new";
  let last = elCode.value;
  let lastHash = getHashForStr(last);
  let isChanged = false;
  if (sdb.has("prog/last")) {
    last = sdb.get("prog/last");
    elCode.value = last;
    lastHash = getHashForStr(last);
  }
  if (sdb.has("prog/lastName")) {
    lastName = sdb.get("prog/lastName");
    updateFileNameDisplay(lastName);
  }
  if (sdb.has("prog/lastHash")) {
    lastHash = parseInt(sdb.get("prog/lastHash"), 10);
  }
  isChanged = isStrChanged(last, lastHash);
  tabUpdate(currentTab, lastName, last, lastHash, isChanged);
  fShowTabs();
  
  const elName = document.getElementById("filename");
  const elSave = document.getElementById("filesave");
  const dirSave = document.getElementById("dirsave");
  
  locationChanged();
  
  elName.addEventListener('input', (event) => {
    if(elName.value.trim().length == 0) {
      elSave.disabled=1;
      dirSave.disable=1;
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

  cmEditor.on("change", function() {
    if (!codeCheckDisabled) {
      onCodeChange();
    }
  });
}

function run(){
  try{
  document.getElementById('out').textContent='';
  
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
  
  let currentFileName = null;
  if(sdb.has("prog/lastName")) {
    currentFileName = sdb.get("prog/lastName");
  }
  saveDb(code.value, currentFileName);
  const processedCode = preprocessRepeat(code.value);
  const p = new Parser(new Tokenizer(processedCode));
  const stmts = p.parse();
  document.getElementById('ast').textContent=JSON.stringify(stmts,null,2);

  console.log('STMTS: ',  stmts);

  globalInterp = new Interpreter(p.funcs, [], p.pcbs);
  globalInterp.aliases = p.aliases;

  for (const s of stmts) {
      const isShow = s.show !== undefined;
    globalInterp.exec(s, !isShow);
  }
  
  if(globalInterp.firstRun){
    globalInterp.firstRun = false;
    globalInterp.vars.set('%', {type: '1bit', value: '0', ref: null});
  }

  render(globalInterp.out);
  showVars();
  }catch(e){ 
    render([e.message ]); 
    console.log(e);
    if(globalInterp) showVars();
  }
}

function sendCmd(){
  const cmdInput = document.getElementById('cmdInput');
  const cmdText = cmdInput.value.trim();
  
  if(!cmdText) return;
  
  try{
    if(!globalInterp){
      const p = new Parser(new Tokenizer(preprocessRepeat(code.value)));
      const stmts = p.parse();
      globalInterp = new Interpreter(p.funcs, [], p.pcbs);
      
      for(const s of stmts){
        globalInterp.exec(s, true);
      }
      
      if(globalInterp.firstRun){
        globalInterp.firstRun = false;
        globalInterp.vars.set('%', {type: '1bit', value: '0', ref: null});
      }
    }
    
    const p = new Parser(new Tokenizer(preprocessRepeat(cmdText)));
  const stmts = p.parse();

    for(const [name, fn] of p.funcs.entries()){
    globalInterp.funcs.set(name, fn);
  }

    for(const s of stmts){
      globalInterp.exec(s, true);
    }
    
  render(globalInterp.out);
  showVars();
    
    cmdInput.value = '';
  } catch(e){
    render([`Error: ${e.message}`]);
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

function render(lines){
  document.getElementById('out').textContent=lines.join('\n');
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
      const wireValue = globalInterp.getValueFromRef(w.ref);
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
}

function toggleAST(){
  const p=new Parser(new Tokenizer(preprocessRepeat(code.value)));
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

  globalInterp.exec({ next: count }, false);

  showVars();
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

    if (panelName === 'output') {
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
