/* ================= DEVICE RENDERERS ================= */

const leds = new Map();
const sevenSegDisplays = new Map();
const dipSwitches = new Map();

function addSwitch({ text, value = false, nl = false, onChange }) {
  const container = document.getElementById("devices");
  if (!container) return;
  showDevices();

  const labelText = text.slice(0, 5);

  const wrapper = document.createElement("label");
  wrapper.className = "switch-wrapper";

  const label = document.createElement("span");
  label.className = "switch-label";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "switch-input";
  input.checked = Boolean(value);

  const switchEl = document.createElement("span");
  switchEl.className = "switch";

  if (typeof onChange === "function") {
    input.addEventListener("change", () => {
      onChange(input.checked);
    });
  }

  wrapper.append(label, input, switchEl);
  container.appendChild(wrapper);
  
  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }
}

function addLed({ id, text = "", color = "#ff0000", value = false, round, nl = false}) {
  const container = document.getElementById("devices");
  if (!container || !id) return;
  showDevices();
  
  const wrapper = document.createElement("label");
  wrapper.className = "led-wrapper";

  if (text) {
    const label = document.createElement("span");
    label.className = "led-label";
    label.textContent = text.slice(0, 5);
    wrapper.appendChild(label);
  } else {
    const label = document.createElement("span");
    label.className = "led-no-label";
    label.textContent = "a";
    wrapper.appendChild(label);
  }

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "led-input";
  input.checked = value;
  input.disabled = true;

  const led = document.createElement("span");
  led.className = "led";
  led.style.setProperty("--led-color", color);
  const ledRadius = (round !== undefined ? round : 50) + "%";
  led.style.setProperty("--led-radius", ledRadius);

  wrapper.append(input, led);
  container.appendChild(wrapper);
  
  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  leds.set(id, input);
}

function setLed(id, state) {
  const led = leds.get(id);
  if (led) {
    led.checked = Boolean(state);
  }
}

function addSevenSegment({ id, text = "", color = "#ff0000", initial = {}, values = "", nl = false, bgColor = "#1a1a1a", lgColor = "#444444", tranSec = 2 }) {
    if(values !== null && typeof(values) === "string" ) {
        values.split('').forEach(function (value, index) {
            const key = String.fromCharCode(97 + index);
            initial[key] = !(value !== "1");
        });
    }
  const container = document.getElementById("devices");
  if (!container || !id) return;
  showDevices();

  const wrapper = document.createElement("div");
  wrapper.className = "sevenseg-wrapper";

    const label = document.createElement("span");
    label.className = "sevenseg-label";
    label.textContent = text ? text.slice(0, 5) : "a";
    if (!text) label.className = "sevenseg-no-label"
    wrapper.appendChild(label);

  const display = document.createElement("div");
  display.className = "sevenseg";
  display.style.setProperty("--seg-color", color);
  display.style.setProperty("--seg-bgcolor", bgColor);
  display.style.setProperty("--seg-lgcolor", lgColor);
  display.style.setProperty("--seg-transec", tranSec);

  const segments = {};

  ["a","b","c","d","e","f","g"].forEach(seg => {
    const segLabel = document.createElement("label");
    segLabel.style.display = "contents";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "seg-input";
    input.checked = Boolean(initial[seg]);

    const segment = document.createElement("span");
    segment.className = `segment seg-${seg}`;

    segLabel.append(input, segment);
    display.appendChild(segLabel);

    segments[seg] = input;
  });

  const dotWrapper = document.createElement("div");
  dotWrapper.className = "sevenseg-dot";

  const dotLabel = document.createElement("label");
  dotLabel.style.display = "contents";

  const dotInput = document.createElement("input");
  dotInput.type = "checkbox";
  dotInput.className = "seg-input";
  dotInput.checked = Boolean(initial.h);

  const dot = document.createElement("span");
  dot.className = "segment seg-h";

  dotLabel.append(dotInput, dot);
  dotWrapper.appendChild(dotLabel);

  display.appendChild(dotWrapper);

  segments.h = dotInput;

  wrapper.appendChild(display);
  container.appendChild(wrapper);

  if (nl) {
      const br = document.createElement('div');
      br.className = 'break';
      container.appendChild(br);
  }
    
  sevenSegDisplays.set(id, segments);
}

function setSegment(displayId, segment, state) {
  const display = sevenSegDisplays.get(displayId);
  if (display && display[segment]) {
    display[segment].checked = Boolean(state);
  }
}

function getSegmentStates(displayId, asString = true) {
  if(!displayId) {
    const keys = Array.from(sevenSegDisplays.entries());
    displayId = keys[0][0];
  }

const display = sevenSegDisplays.get(displayId);
  if (!display) {
    return -1;
  }
  
  const states = {};
  const values = [];
  const segments = ['a','b','c','d','e','f','g1','g2','h','i','j','k','l','m','dp'];
  
  segments.forEach(seg => {
    if(!display[seg]) {
        return;
    }
    states[seg] = (display[seg].checked === true);
    values[values.length] = (display[seg].checked === true) ? 1 : 0;
  });
  
  return (asString) ? values.join(''): states;
}
window.ssd = getSegmentStates;

function addDipSwitch({
  id,
  text = "",
  count = 8,
  initial = [],
  nl = false,
  onChange,
  noLabels = false, 
  visual = 1
}) {
  const getRowSize = function getRowSize(count) {
      if (count >= 16) return 8;
      if (count >= 12) return 4;
      return count;
  }

  const container = document.getElementById("devices");
  if (!container || !id) return;
  showDevices();

  const wrapper = document.createElement("div");
  wrapper.className = "dip-wrapper";

  const label = document.createElement("span");
  label.className = "dip-label";
  label.textContent = text ? text.slice(0, 5) : "";
  if (!text) label.style.visibility = "hidden";
  if(text.length) {
    wrapper.appendChild(label);
  }

  const dip = document.createElement("div");
  dip.className = "dip";
  dip.classList.add(visual === 1 ? "dip-visual-1" : "dip-visual-0");

  if (noLabels) {
    dip.classList.add("dip-no-labels");
  }

  const inputs = [];
  const rowSize = getRowSize(count);

  let row;
  for (let i = 0; i < count; i++) {

    if (i % rowSize === 0) {
      row = document.createElement("div");
      row.className = "dip-row";
      dip.appendChild(row);
    }

    const unit = document.createElement("label");
    unit.className = "dip-unit";

    const num = document.createElement("span");
    num.textContent = i + 1;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "dip-input";
    input.checked = Boolean(initial[i]);

    if (typeof onChange === "function") {
      input.addEventListener("change", () => {
        onChange(i, input.checked);
      });
    }

    const sw = document.createElement("span");
    sw.className = "dip-switch";

    unit.append(num, input, sw);
    row.appendChild(unit);

    inputs.push(input);
  }

  wrapper.appendChild(dip);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  dipSwitches.set(id, inputs);
}

function setDip(id, index, state) {
  const dips = dipSwitches.get(id);
  if (dips && dips[index]) {
    dips[index].checked = Boolean(state);
  }
}

function getDipState(id) {
  const dips = dipSwitches.get(id);
  return dips ? dips.map(d => d.checked) : [];
}

function addFourteenSegment({ id, text = '', color = '#6dff9c', values = '', nl = false, bgColor = "#1a1a1a", lgColor = "#444444", tranSec = 2 }) {
  const container = document.getElementById("devices");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = "fourteenseg-wrapper";

  // Label (reuse 7-seg styles)
  const label = document.createElement("span");
  label.className = text ? "sevenseg-label" : "sevenseg-no-label";
  label.textContent = text || " ";
  wrapper.appendChild(label);

  const display = document.createElement("div");
  display.className = "fourteenseg";
  display.style.setProperty("--seg-color", color);
  display.style.setProperty("--seg-bgcolor", bgColor);
  display.style.setProperty("--seg-lgcolor", lgColor);
  display.style.setProperty("--seg-transec", tranSec);

  const segments = ['a','b','c','d','e','f','g1','g2','h','i','j','k','l','m','dp'];
  const segmentMap = {};

  segments.forEach((segName, index) => {
    const segLabel = document.createElement("label");
    segLabel.style.display = "contents";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "seg-input";
    // Check if current bit in 'values' string is '1'
    input.checked = values[index] === '1';

    const span = document.createElement("span");
    span.className = `fseg fseg-${segName}`;

    // Diagonals need a wrapper to center properly in the grid
    if(['h','i','j','k'].includes(segName)) {
      span.classList.add('fseg-diag');
    }

    segLabel.append(input, span);
    display.appendChild(segLabel);
    segmentMap[segName] = input;
  });

  wrapper.appendChild(display);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement("div");
    br.className = "break";
    container.appendChild(br);
  }

  // Store in your global map (assuming sevenSegDisplays exists)
  if (typeof sevenSegDisplays !== 'undefined') {
    sevenSegDisplays.set(id, segmentMap);
  }
}

function setSegment14(id, seg, state) {
  // We look into the global Map where we stored the input references
  const segments = sevenSegDisplays.get(id);

  if (!segments) {
    // Fallback: If not in Map, try to find it via DOM
    const disp = document.querySelector(`.fourteenseg[data-id="${id}"]`);
    if (!disp || !disp._segments) return;

    const el = disp._segments[seg];
    if (el) el.checked = state;
    return;
  }

  const input = segments[seg];
  if (input) {
    input.checked = state;
  }
}
