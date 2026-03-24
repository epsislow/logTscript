/* ================= PANEL TOGGLES ================= */

function toggleCmd(){
  const panel = document.getElementById('cmdPanel');
  if(panel.style.display === 'none'){
    panel.style.display = 'block';
    document.getElementById('cmdInput').focus();
  } else {
    panel.style.display = 'none';
  }
}

function toggleTabs() {
  const panel = document.getElementById('tabsPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    fShowTabs();
  } else {
    panel.style.display = 'none';
  }
}

function toggleVariables() {
  const panel = document.getElementById('variablesPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function toggleOutput() {
  const panel = document.getElementById('outputPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    fShowFiles();
  } else {
    panel.style.display = 'none';
  }
}

function toggleFiles(){
  const panel = document.getElementById('filesPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    fShowFiles();
  } else {
    panel.style.display = 'none';
  }
}

function toggleDevices() {
  const panel = document.getElementById('devicesPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function showDevices(param) {
  const panel = document.getElementById('devicesPanel');
  panel.style.display = 'block';
  setPanelState('devices', true);
}

function setPanelState(panelName, enabled) {
  const item = document.querySelector(
    `.dropdown-item[data-panel="${panelName}"]`
  );

  if (!item) return;

  item.classList.toggle('active', enabled);
}
