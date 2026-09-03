/* ================= PANEL TOGGLES ================= */

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

function toggleTimeline() {
  const panel = document.getElementById('timelinePanel');
  if (!panel) return;
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function toggleSelection() {
  if (typeof toggleSelectionPanel === 'function') {
    toggleSelectionPanel();
  }
}

function toggleOutput() {
  const panel = document.getElementById('outputPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
  } else {
    panel.style.display = 'none';
  }
}

function toggleFiles(){
  const panel = document.getElementById('filesPanel');
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    showFiles();
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
