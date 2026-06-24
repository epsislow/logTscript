/* ================= DEVICE RENDERERS ================= */

function addSwitch({ text, value = false, nl = false, onChange }) {
  const container = getDevicesContainer();
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
  const container = getDevicesContainer();
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

  dm().leds.set(id, input);
}

function setLed(id, state) {
  const led = dm().leds.get(id);
  if (led) {
    led.checked = Boolean(state);
  }
}

function addSevenSegment({
     id,
     text = "",
     color = "#ff0000",
     initial = {},
     values = "",
     nl = false,
     bgColor = "#1a1a1a",
     lgColor = "#444444",
     tranSec = 2,
     scale = .75
}) {
    if(values !== null && typeof(values) === "string" ) {
        values.split('').forEach(function (value, index) {
            const key = String.fromCharCode(97 + index);
            initial[key] = !(value !== "1");
        });
    }
  const container = getDevicesContainer();
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
  display.style.setProperty("--seg-scale", scale);
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
    
  dm().sevenSegDisplays.set(id, segments);
}

function setSegment(displayId, segment, state) {
  const display = dm().sevenSegDisplays.get(displayId);
  if (display && display[segment]) {
    display[segment].checked = Boolean(state);
  }
}

function getSegmentStates(displayId, asString = true) {
  if(!displayId) {
    const keys = Array.from(dm().sevenSegDisplays.entries());
    displayId = keys[0][0];
  }

const display = dm().sevenSegDisplays.get(displayId);
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
  color = '#2ecc71',
  colorFor = {},
  visual = 1,
  noTransition = false
}) {
  const getRowSize = function getRowSize(count) {
      if (count >= 16) return 8;
      if (count >= 12) return 4;
      return count;
  }

  const container = getDevicesContainer();
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
    unit.style.setProperty("--seg-color", colorFor[i] ?? color);

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
    if (noTransition) {
      sw.style.transition = 'none';
    }

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

  dm().dipSwitches.set(id, inputs);
}

function setDip(id, index, state) {
  const dips = dm().dipSwitches.get(id);
  if (dips && dips[index]) {
    dips[index].checked = Boolean(state);
  }
}

function getDipState(id) {
  const dips = dm().dipSwitches.get(id);
  return dips ? dips.map(d => d.checked) : [];
}

function addFourteenSegment({
    id,
    text = '',
    color = '#6dff9c',
    values = '',
    nl = false,
    bgColor = "#1a1a1a",
    lgColor = "#444444",
    tranSec = 2,
    scale = .75
}) {
  const container = getDevicesContainer();
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = "fourteenseg-wrapper";
  wrapper.style.setProperty("--seg-scale", scale);

  // Label (reuse 7-seg styles)
  const label = document.createElement("span");
  label.className = text ? "sevenseg-label" : "sevenseg-no-label";
  label.textContent = text || " ";
  wrapper.appendChild(label);

  const display = document.createElement("div");
  display.className = "fourteenseg";
  display.style.setProperty("--seg-color", color);
  display.style.setProperty("--seg-scale", scale);
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

  // Store in your global map (assuming dm().sevenSegDisplays exists)
  if (typeof dm().sevenSegDisplays !== 'undefined') {
    dm().sevenSegDisplays.set(id, segmentMap);
  }
}

function setSegment14(id, seg, state) {
  // We look into the global Map where we stored the input references
  const segments = dm().sevenSegDisplays.get(id);

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

function addClockDots({
    id,
    color = '#6dff9c',
    values = '11', // Default both dots ON
    nl = false,
    bgColor = "#1a1a1a",
    lgColor = "#444444",
    tranSec = 2,
    scale = .75
}) {
  const container = getDevicesContainer();
  if (!container || !id) return;

  const wrapper = document.createElement("div");
  wrapper.className = "clockdots-wrapper";
  wrapper.style.setProperty("--seg-scale", scale);

  const display = document.createElement("div");
  display.className = "clockdots";
  display.style.setProperty("--seg-color", color);
  display.style.setProperty("--seg-scale", scale);
  display.style.setProperty("--seg-bgcolor", bgColor);
  display.style.setProperty("--seg-lgcolor", lgColor);
  display.style.setProperty("--seg-transec", tranSec);

  const dotNames = ['up', 'down'];
  const segmentMap = {};

  dotNames.forEach((name, index) => {
    const dotLabel = document.createElement("label");
    dotLabel.style.display = "contents";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "seg-input";
    // Check if corresponding bit in 'values' is '1'
    input.checked = values[index] === '1';

    const span = document.createElement("span");
    span.className = `fseg-dot fseg-dot-${name}`;

    dotLabel.append(input, span);
    display.appendChild(dotLabel);
    segmentMap[name] = input;
  });

  wrapper.appendChild(display);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement("div");
    br.className = "break";
    container.appendChild(br);
  }

  if (typeof dm().sevenSegDisplays !== 'undefined') {
    dm().sevenSegDisplays.set(id, segmentMap);
  }
}


function setClockDots(id, dot, state) {
  // dot should be 'up' or 'down'
  const segments = dm().sevenSegDisplays.get(id);

  if (!segments) {
    // Fallback: search DOM if map lookup fails
    const disp = document.querySelector(`.clockdots-wrapper .clockdots[data-id="${id}"]`);
    if (!disp) return;
    
    // Search for the input preceding the specific dot class
    const input = disp.querySelector(`.fseg-dot-${dot}`).previousElementSibling;
    if (input) input.checked = state;
    return;
  }

  const input = segments[dot];
  if (input) {
    input.checked = state;
  }
}

function addBarDevice({ id, length, width = 10, barWidth = 20, gap = 2, color = "#6dff9c", values = "", orientation = 0 }) {
  const container = getDevicesContainer();
  if (!container || !id) return;

  const wrapper = document.createElement("div");
  wrapper.className = "led-bar-wrapper";

  const bar = document.createElement("div");
  bar.className = "led-bar";
  if (parseInt(orientation) === 1) bar.classList.add("vertical");
  
  bar.dataset.id = id;
  // Apply the custom width and gap to the CSS variables
  bar.style.setProperty("--led-width", width + "px");
  bar.style.setProperty("--led-bar-width", barWidth + "px");
  bar.style.setProperty("--led-gap", gap + "px");
  bar.style.setProperty("--seg-color", color);

  const segmentMap = {};

  for (let i = 0; i < length; i++) {
    const label = document.createElement("label");
    label.style.display = "contents";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "seg-input";
    // Check initial state from 'values' string (e.g., "1010")
    input.checked = values[i] === '1';

    const segment = document.createElement("span");
    segment.className = "led-segment";

    label.append(input, segment);
    bar.appendChild(label);
    
    // Key the segments by index for easy lookup
    segmentMap[i] = input;
  }

  wrapper.appendChild(bar);
  container.appendChild(wrapper);

  if (typeof dm().sevenSegDisplays !== 'undefined') {
    dm().sevenSegDisplays.set(id, segmentMap);
  }
}

function setBarState(barId, stateBits) {
  const segments = dm().sevenSegDisplays.get(barId);
  if (!segments) return;

  // Loop through the bits and update the corresponding LED
  for (let i = 0; i < stateBits.length; i++) {
    const input = segments[i];
    if (input) {
      input.checked = stateBits[i] === '1';
    }
  }
}


function addIoportContainer({ id, label = '', nl = false }) {
  const container = getDevicesContainer();
  if (!container || !id) return;
  showDevices();

  const wrapper = document.createElement('div');
  wrapper.className = 'ioport-wrapper';
  wrapper.dataset.ioportId = id;

  const box = document.createElement('div');
  box.className = 'ioport-box';

  const header = document.createElement('div');
  header.className = 'ioport-header';
  header.textContent = label || id;
  box.appendChild(header);

  const body = document.createElement('div');
  body.className = 'ioport-body';
  box.appendChild(body);

  wrapper.appendChild(box);
  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }

  dm().ioportContainers.set(id, body);
}

function mountIoportMember(containerId, memberCompName, kind) {
  const body = dm().ioportContainers.get(containerId);
  if (!body) return;

  const baseId = memberCompName.startsWith('.') ? memberCompName.slice(1) : memberCompName;
  const row = document.createElement('div');
  row.className = 'ioport-member-row ioport-member-' + kind;

  const nameLabel = document.createElement('span');
  nameLabel.className = 'ioport-member-label';
  nameLabel.textContent = baseId;
  row.appendChild(nameLabel);

  const slot = document.createElement('div');
  slot.className = 'ioport-member-slot';
  row.appendChild(slot);

  if (kind === 'in') {
    const dips = dm().dipSwitches.get(baseId);
    if (dips && dips[0]) {
      let el = dips[0];
      while (el && !el.classList?.contains('dip-wrapper')) el = el.parentElement;
      if (el) slot.appendChild(el);
    }
  } else {
    const group = document.createElement('div');
    group.className = 'ioport-led-group';
    let ledInput = dm().leds.get(baseId);
    if (ledInput) {
      const w = ledInput.closest('.led-wrapper');
      if (w) group.appendChild(w);
    } else {
      for (let i = 1; dm().leds.has(baseId + '.' + i); i++) {
        const inp = dm().leds.get(baseId + '.' + i);
        if (inp) {
          const w = inp.closest('.led-wrapper');
          if (w) group.appendChild(w);
        }
      }
    }
    slot.appendChild(group);
  }

  body.appendChild(row);
}

