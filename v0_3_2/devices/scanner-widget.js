/* ================= SCANNER WIDGET ================= */

function addScanner({
  id,
  text = '',
  length = 8,
  width = null,
  scanText = 'Scan',
  color = '#808080',
  bgColor = '#101010',
  focusColor = '#2ecc71',
  focusBgColor = '#181818',
  onlyDigits = false,
  nl = false,
  onCommit = () => {},
}) {
  const container = typeof getDevicesContainer === 'function' ? getDevicesContainer() : null;
  if (!container || !id) return;
  if (typeof showDevices === 'function') showDevices();

  const wrapper = document.createElement('div');
  wrapper.className = 'scanner-wrapper';

  const panel = document.createElement('div');
  panel.className = 'scanner-panel';
  panel.style.borderColor = color;
  panel.style.background = bgColor;

  if (text) {
    const label = document.createElement('span');
    label.className = 'scanner-label';
    label.textContent = String(text).slice(0, 12);
    label.style.color = color;
    panel.appendChild(label);
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'scanner-input';
  input.setAttribute('maxlength', String(length));
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('aria-label', text || 'Scanner');
  if (onlyDigits) input.setAttribute('inputmode', 'numeric');
  else input.setAttribute('inputmode', 'text');
  input.style.borderColor = color;
  input.style.background = bgColor;
  input.style.color = '#ddd';

  // Optional fixed field width (ch). When omitted, CSS flex 6ch…24ch applies (original look).
  if (width != null && width !== '') {
    let fieldCh = parseInt(width, 10);
    if (!isNaN(fieldCh)) {
      fieldCh = Math.max(4, Math.min(40, fieldCh));
      input.style.width = `${fieldCh}ch`;
      input.style.minWidth = `${fieldCh}ch`;
      input.style.maxWidth = `${fieldCh}ch`;
      input.style.flex = '0 0 auto';
    }
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scanner-btn';
  const btnLabel = scanText != null && String(scanText) !== '' ? String(scanText) : 'Scan';
  btn.textContent = btnLabel.slice(0, 12);
  btn.style.borderColor = color;
  btn.style.color = color;
  btn.style.background = bgColor;

  const applyFocus = (on) => {
    if (on) {
      panel.style.borderColor = focusColor;
      panel.style.background = focusBgColor;
      input.style.borderColor = focusColor;
      input.style.background = focusBgColor;
      if (text) {
        const lbl = panel.querySelector('.scanner-label');
        if (lbl) lbl.style.color = focusColor;
      }
      btn.style.borderColor = focusColor;
      btn.style.color = focusColor;
    } else {
      panel.style.borderColor = color;
      panel.style.background = bgColor;
      input.style.borderColor = color;
      input.style.background = bgColor;
      if (text) {
        const lbl = panel.querySelector('.scanner-label');
        if (lbl) lbl.style.color = color;
      }
      btn.style.borderColor = color;
      btn.style.color = color;
    }
  };

  const sanitize = () => {
    let v = input.value;
    if (onlyDigits) v = v.replace(/[^0-9]/g, '');
    if (v.length > length) v = v.slice(0, length);
    if (v !== input.value) input.value = v;
  };

  const doCommit = () => {
    sanitize();
    if (typeof onCommit === 'function') onCommit(input.value);
    input.value = '';
    // Keep focus for rapid successive scans (barcode gun / Enter flow).
    input.focus();
  };

  input.addEventListener('focus', () => {
    if (typeof window !== 'undefined') window.focusedScannerId = id;
    applyFocus(true);
  });
  input.addEventListener('blur', () => {
    if (typeof window !== 'undefined' && window.focusedScannerId === id) {
      window.focusedScannerId = null;
    }
    applyFocus(false);
  });
  input.addEventListener('input', sanitize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doCommit();
    }
  });
  btn.addEventListener('mousedown', (e) => {
    // Prevent button from stealing focus before click (keeps caret in the field).
    e.preventDefault();
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    doCommit();
  });

  panel.appendChild(input);
  panel.appendChild(btn);
  wrapper.appendChild(panel);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  const maps = typeof dm === 'function' ? dm() : null;
  if (maps) {
    if (!maps.scanners) maps.scanners = new Map();
    maps.scanners.set(id, { input, btn, panel, length, onlyDigits, onCommit });
  }
}
