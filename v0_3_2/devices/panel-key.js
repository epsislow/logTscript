/* ================= PANEL KEY ================= */

class PanelKey {
  constructor({
    label = "",
    size = 48,
    onPress = () => {},
    onRelease = () => {},
    pressDuration = 150
  }) {
    this.label = label;
    this.size = size;
    this.onPress = onPress;
    this.onRelease = onRelease;
    this.pressDuration = pressDuration;
    this.pressed = false;
    this._releaseTimer = null;

    this.canvas = document.createElement("canvas");
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext("2d");

    this.canvas.addEventListener("mousedown", () => this.press());
    this.canvas.addEventListener("touchstart", e => {
      e.preventDefault();
      this.press();
    });

    this.draw();
  }

  mount(parent) {
    parent.appendChild(this.canvas);
  }

  press() {
    if (this.pressed) return;

    this.pressed = true;
    this.draw();

    this.onPress(this.label);

    clearTimeout(this._releaseTimer);
    this._releaseTimer = setTimeout(() => {
      this.release();
    }, this.pressDuration);
  }

  release() {
    if (!this.pressed) return;
    this.pressed = false;
    this.draw();
    if(typeof this.onRelease === 'function'){
      this.onRelease();
    }
  }

  draw() {
    const ctx = this.ctx;
    const s = this.size;

    ctx.clearRect(0, 0, s, s);

    ctx.fillStyle = this.pressed ? "#000" : "#1c1c1c";
    ctx.strokeStyle = this.pressed ? "#6dff9c" : "#2a2a2a";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(
      this.pressed ? 3 : 2,
      this.pressed ? 3 : 2,
      s - (this.pressed ? 6 : 4),
      s - (this.pressed ? 6 : 4),
      6
    );
    ctx.fill();
    ctx.stroke();

    if (this.pressed) {
      ctx.shadowColor = "#6dff9c";
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "#6dff9c";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(2, 2, s - 4, s - 4, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = this.pressed ? "#e6fff0" : "#b0ffcc";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      this.label,
      s / 2,
      s / 2 + (this.pressed ? 3 : 1)
    );
  }
}

function addKey({
  id,
  label,
  onPress,
  onRelease,
  size = 36,
  nl = false
}) {
  const container = document.getElementById("devices");
  if (!container) return;
  showDevices();

  const wrapper = document.createElement("span");
  wrapper.className = "key-wrapper";

  const key = new PanelKey({ label, size, onPress, onRelease });
  key.mount(wrapper);

  container.appendChild(wrapper);

  if (nl) {
    const br = document.createElement('div');
    br.className = 'break';
    container.appendChild(br);
  }
  
  if (!window.panelKeys) {
    window.panelKeys = new Map();
  }
  if(id){
    window.panelKeys.set(id, key);
  }
}
